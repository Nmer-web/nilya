-- ============================================================
-- Nilya Admin — operations access (disputes, orders, payments, sellers,
-- reviews, admin users, audit feed)
-- ============================================================
--
-- Principle IV change, approved by the owner, following the pattern of
-- 20260903181808_admin_access_repair.sql. Proven defects, each read as the
-- real admin row under the `authenticated` role:
--
--   * orders, disputes, payments, seller_accounts: every SELECT policy is
--     party-only (`buyer_id/seller_id = auth.uid()`, `is_order_party()`,
--     `profile_id = auth.uid()`). The admin is never a party, so each returns
--     0 rows and the Disputes, Orders and Sellers screens have nothing to show.
--   * disputes has no UPDATE policy and reviews has no UPDATE/DELETE policy,
--     so "resolve" and "remove" cannot be expressed by any client role.
--   * reviews has no column that can record a removal at all (Principle III:
--     the schema could not express it; the owner chose a soft delete).
--   * admin_audit_log is RPC-only by design, so add/remove admin user need an
--     RPC even though owners already hold a write policy on admin_users.
--
-- Design, unchanged from the previous migration:
--   * reads open with is_admin()-gated policies; writes only through
--     SECURITY DEFINER RPCs that write admin_audit_log in the same transaction.
--   * orders and payments get NO write path. The admin observes the payment
--     journey; it never mutates it (constitution: payment state changes only
--     through the verified webhook).
--   * views over auth.users are gated by `where is_admin()` and revoked from
--     anon, as before.

-- ───────────────────────── 1. admin read policies ─────────────────────────

create policy "admins read all orders"
  on public.orders for select to authenticated
  using (public.is_admin((select auth.uid())));

create policy "admins read all disputes"
  on public.disputes for select to authenticated
  using (public.is_admin((select auth.uid())));

create policy "admins read all payments"
  on public.payments for select to authenticated
  using (public.is_admin((select auth.uid())));

create policy "admins read all seller accounts"
  on public.seller_accounts for select to authenticated
  using (public.is_admin((select auth.uid())));

-- ───────────────────── 2. admin_users: writes go via RPC ─────────────────────
-- The owner-level ALL policy let an owner insert or delete a row directly,
-- which would leave no audit entry. Reads stay; writes move to the RPCs below.

drop policy if exists "owners manage admin_users" on public.admin_users;

-- ────────────────────────── 3. review soft delete ──────────────────────────

alter table public.reviews
  add column if not exists removed_at     timestamptz,
  add column if not exists removed_reason text;

comment on column public.reviews.removed_at is
  'Set by admin_remove_review(); null while the review stands. Admin-only, enforced by reviews_guard_removal. NOTE: reviews_read_all still returns removed rows to app clients; filtering them is app work.';
comment on column public.reviews.removed_reason is
  'Operator-typed reason recorded alongside removed_at.';

create or replace function public.reviews_guard_removal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.removed_at     is distinct from old.removed_at
   or new.removed_reason is distinct from old.removed_reason)
   and not public.is_admin(auth.uid()) then
    raise exception 'review removal is admin-only' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.reviews_guard_removal() from public, anon, authenticated;

drop trigger if exists reviews_guard_removal on public.reviews;
create trigger reviews_guard_removal
  before update on public.reviews
  for each row execute function public.reviews_guard_removal();

-- A removed review must stop counting toward the seller's rating. The
-- aggregate previously took every row; now it takes the standing ones. The
-- trigger that calls this fires on insert/delete only, so the removal RPC
-- calls it explicitly after its UPDATE.
create or replace function public.recalculate_profile_rating(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.profiles
  where id = p_profile_id
  for update;

  update public.profiles as profile
  set
    rating_avg = aggregate.rating_avg,
    rating_count = aggregate.rating_count
  from (
    select
      round(avg(review.rating)::numeric, 1) as rating_avg,
      count(*)::integer as rating_count
    from public.reviews as review
    where review.subject_id = p_profile_id
      and review.removed_at is null
  ) as aggregate
  where profile.id = p_profile_id;
end;
$$;

-- CREATE OR REPLACE re-applies the schema's default EXECUTE grant, silently
-- undoing the revoke in 20260827140000. Re-assert it: only the trigger and
-- admin_remove_review (both definer) may call this.
revoke all on function public.recalculate_profile_rating(uuid) from public, anon, authenticated;

-- ───────────────────────── 4. admin read surfaces ─────────────────────────

-- Audit log with the actor's identity. actor_id is auth.users, so email is
-- only reachable through a definer view.
create or replace view public.admin_audit_feed as
select
  l.id,
  l.actor_id,
  l.action,
  l.target_type,
  l.target_id,
  l.before,
  l.after,
  l.note,
  l.created_at,
  u.email::text   as actor_email,
  p.display_name  as actor_name
from public.admin_audit_log l
left join auth.users      u on u.id = l.actor_id
left join public.profiles p on p.id = l.actor_id
where public.is_admin((select auth.uid()));

revoke all on public.admin_audit_feed from anon;
revoke insert, update, delete on public.admin_audit_feed from authenticated;
grant select on public.admin_audit_feed to authenticated;

-- Orders denormalised for the list: PostgREST cannot `or=` across embedded
-- resources, and the spec searches listing title and both usernames at once.
create or replace view public.admin_order_feed as
select
  o.id,
  o.listing_id,
  o.buyer_id,
  o.seller_id,
  o.offer_id,
  o.item_price_cents,
  o.shipping_cents,
  o.protection_fee_cents,
  o.total_cents,
  o.currency,
  o.status,
  o.delivery_kind,
  o.delivery_key,
  o.placed_at,
  o.paid_at,
  o.completed_at,
  o.cancelled_at,
  o.created_at,
  o.updated_at,
  li.title            as listing_title,
  li.status           as listing_status,
  b.display_name      as buyer_name,
  b.avatar_url        as buyer_avatar_url,
  b.avatar_color      as buyer_avatar_color,
  s.display_name      as seller_name,
  s.avatar_url        as seller_avatar_url,
  s.avatar_color      as seller_avatar_color
from public.orders o
left join public.listings li on li.id = o.listing_id
left join public.profiles b  on b.id  = o.buyer_id
left join public.profiles s  on s.id  = o.seller_id
where public.is_admin((select auth.uid()));

revoke all on public.admin_order_feed from anon;
revoke insert, update, delete on public.admin_order_feed from authenticated;
grant select on public.admin_order_feed to authenticated;

-- Disputes with the opener's identity, the order's summary, and — since
-- disputes has no resolved_by column — the admin who resolved it, taken from
-- the audit row the resolve RPC writes.
create or replace view public.admin_dispute_feed as
select
  d.id,
  d.order_id,
  d.opened_by,
  d.reason,
  d.body,
  d.state,
  d.resolved_at,
  d.created_at,
  d.updated_at,
  op.display_name     as opener_name,
  op.avatar_url       as opener_avatar_url,
  op.avatar_color     as opener_avatar_color,
  ou.email::text      as opener_email,
  o.buyer_id,
  o.seller_id,
  o.total_cents       as order_total_cents,
  o.currency          as order_currency,
  o.status            as order_status,
  li.title            as listing_title,
  r.actor_id          as resolved_by,
  ru.email::text      as resolved_by_email,
  r.note              as resolution_note
from public.disputes d
left join public.profiles op on op.id = d.opened_by
left join auth.users      ou on ou.id = d.opened_by
left join public.orders   o  on o.id  = d.order_id
left join public.listings li on li.id = o.listing_id
left join lateral (
  select a.actor_id, a.note
    from public.admin_audit_log a
   where a.target_type = 'dispute'
     and a.target_id   = d.id
     and a.action      like 'dispute.resolved%'
   order by a.id desc
   limit 1
) r on true
left join auth.users ru on ru.id = r.actor_id
where public.is_admin((select auth.uid()));

revoke all on public.admin_dispute_feed from anon;
revoke insert, update, delete on public.admin_dispute_feed from authenticated;
grant select on public.admin_dispute_feed to authenticated;

-- Sellers are seller_accounts rows (Stripe Connect onboarding), joined to the
-- profile and auth identity. Revenue counts only orders that reached a paid
-- state; an unpaid or cancelled order is not revenue.
create or replace view public.admin_seller_directory as
select
  sa.id                       as seller_account_id,
  sa.profile_id,
  sa.stripe_account_id,
  sa.charges_enabled,
  sa.payouts_enabled,
  sa.details_submitted,
  sa.default_currency,
  sa.country_code,
  sa.created_at               as seller_since,
  p.display_name,
  p.avatar_url,
  p.avatar_color,
  p.city,
  p.is_verified,
  p.suspended_at,
  p.suspended_reason,
  p.rating_avg,
  p.rating_count,
  p.created_at                as profile_created_at,
  u.email::text               as email,
  (select count(*) from public.listings l
    where l.seller_id = sa.profile_id)                            as listings_count,
  (select count(*) from public.listings l
    where l.seller_id = sa.profile_id and l.status = 'active')    as active_listings_count,
  (select count(*) from public.orders o
    where o.seller_id = sa.profile_id)                            as orders_count,
  (select coalesce(sum(o.item_price_cents), 0) from public.orders o
    where o.seller_id = sa.profile_id
      and o.status in ('paid','shipped','delivered','completed')) as paid_revenue_cents
from public.seller_accounts sa
left join public.profiles p on p.id = sa.profile_id
left join auth.users      u on u.id = sa.profile_id
where public.is_admin((select auth.uid()));

revoke all on public.admin_seller_directory from anon;
revoke insert, update, delete on public.admin_seller_directory from authenticated;
grant select on public.admin_seller_directory to authenticated;

-- ───────────────────────── 5. privileged mutations ─────────────────────────

-- Resolution records a decision on the dispute row only. It does not touch
-- orders or payments: a refund is a Stripe event that reaches the database
-- through the webhook, never through the admin.
create or replace function public.admin_resolve_dispute(
  p_dispute_id uuid,
  p_state      public.dispute_state,
  p_note       text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor  uuid := auth.uid();
  v_before public.dispute_state;
begin
  if not public.is_admin(v_actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_state not in ('resolved_buyer'::public.dispute_state,
                     'resolved_seller'::public.dispute_state) then
    raise exception 'a dispute is resolved in favour of the buyer or the seller'
      using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_note, ''))) < 10 then
    raise exception 'a note of at least 10 characters is required' using errcode = '22023';
  end if;

  select state into v_before from public.disputes where id = p_dispute_id;
  if v_before is null then
    raise exception 'no such dispute' using errcode = 'P0002';
  end if;
  if v_before in ('resolved_buyer'::public.dispute_state,
                  'resolved_seller'::public.dispute_state,
                  'closed'::public.dispute_state) then
    raise exception 'this dispute is already %', v_before using errcode = '22023';
  end if;

  update public.disputes
     set state       = p_state,
         resolved_at = now(),
         updated_at  = now()
   where id = p_dispute_id;

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, note)
  values
    (v_actor, 'dispute.' || p_state::text, 'dispute', p_dispute_id,
     jsonb_build_object('state', v_before),
     jsonb_build_object('state', p_state),
     btrim(p_note));
end $$;

create or replace function public.admin_remove_review(
  p_review_id uuid,
  p_reason    text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_row   public.reviews%rowtype;
begin
  if not public.is_admin(v_actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception 'a reason of at least 10 characters is required' using errcode = '22023';
  end if;

  select * into v_row from public.reviews where id = p_review_id;
  if v_row.id is null then
    raise exception 'no such review' using errcode = 'P0002';
  end if;
  if v_row.removed_at is not null then
    raise exception 'this review is already removed' using errcode = '22023';
  end if;

  update public.reviews
     set removed_at     = now(),
         removed_reason = btrim(p_reason)
   where id = p_review_id;

  -- The rating trigger fires on insert/delete only; a soft delete is an update.
  perform public.recalculate_profile_rating(v_row.subject_id);

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, note)
  values
    (v_actor, 'review.remove', 'review', p_review_id,
     jsonb_build_object('rating', v_row.rating, 'body', v_row.body,
                        'author_id', v_row.author_id, 'subject_id', v_row.subject_id,
                        'order_id', v_row.order_id, 'removed_at', null),
     jsonb_build_object('removed_at', now()),
     btrim(p_reason));
end $$;

-- Owner-only. Looks the account up by email so the operator never handles a
-- uuid, refuses to mint an owner from the UI, and records the grant.
create or replace function public.admin_add_admin_user(
  p_email text,
  p_role  public.admin_role
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_user  uuid;
begin
  if public.get_admin_role(v_actor) is distinct from 'owner'::public.admin_role then
    raise exception 'only an owner can manage admin users' using errcode = '42501';
  end if;
  if p_role = 'owner'::public.admin_role then
    raise exception 'the owner role cannot be assigned from the dashboard' using errcode = '42501';
  end if;

  select id into v_user from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if v_user is null then
    raise exception 'no account exists with that email' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.admin_users where user_id = v_user) then
    raise exception 'that account is already an admin' using errcode = '23505';
  end if;

  insert into public.admin_users (user_id, role) values (v_user, p_role);

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, note)
  values
    (v_actor, 'admin_user.add', 'admin_user', v_user,
     null, jsonb_build_object('role', p_role, 'email', lower(btrim(p_email))), null);

  return v_user;
end $$;

create or replace function public.admin_remove_admin_user(
  p_user_id uuid,
  p_note    text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_role  public.admin_role;
begin
  if public.get_admin_role(v_actor) is distinct from 'owner'::public.admin_role then
    raise exception 'only an owner can manage admin users' using errcode = '42501';
  end if;
  if p_user_id = v_actor then
    raise exception 'you cannot remove your own admin access' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_note, ''))) < 10 then
    raise exception 'a reason of at least 10 characters is required' using errcode = '22023';
  end if;

  select role into v_role from public.admin_users where user_id = p_user_id;
  if v_role is null then
    raise exception 'that account is not an admin' using errcode = 'P0002';
  end if;
  if v_role = 'owner'::public.admin_role then
    raise exception 'owners cannot be removed from the dashboard' using errcode = '42501';
  end if;

  delete from public.admin_users where user_id = p_user_id;

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, note)
  values
    (v_actor, 'admin_user.remove', 'admin_user', p_user_id,
     jsonb_build_object('role', v_role), null, btrim(p_note));
end $$;

revoke execute on function
  public.admin_resolve_dispute(uuid, public.dispute_state, text),
  public.admin_remove_review(uuid, text),
  public.admin_add_admin_user(text, public.admin_role),
  public.admin_remove_admin_user(uuid, text)
from public, anon;

grant execute on function
  public.admin_resolve_dispute(uuid, public.dispute_state, text),
  public.admin_remove_review(uuid, text),
  public.admin_add_admin_user(text, public.admin_role),
  public.admin_remove_admin_user(uuid, text)
to authenticated;

-- ============================================================
-- Nilya Admin — access repair
-- ============================================================
--
-- Principle IV (Frozen Architecture) change, made against proven defects in
-- 20260903170446_admin_foundation.sql and with explicit owner approval.
-- Each defect below was reproduced by executing the statement as the real
-- admin row in `admin_users` under the `authenticated` role:
--
--   1. `select ... from admin_users`   -> 42P17 infinite recursion detected in
--      policy for relation "admin_users". The policy's USING clause selects
--      from the very table it guards. `reports` and `admin_audit_log` inherit
--      the failure because their policies subquery `admin_users`. Net effect:
--      the admin session can never read its own role, so every admin is
--      redirected to /login?error=unauthorized and the dashboard is
--      unreachable.
--   2. `insert into admin_audit_log`   -> 42501 new row violates row-level
--      security policy. RLS is enabled with a SELECT policy only, so no audit
--      row can ever be written by the app.
--   3. `update listings set status`    -> 0 rows affected, no error. The only
--      UPDATE policy is `listings_update_own` (seller_id = auth.uid()), so
--      moderation silently does nothing while appearing to succeed.
--   4. `update categories`             -> 42501 permission denied for table
--      categories, and `categories_read_active` hides is_active = false rows,
--      so a deactivated category can be neither seen nor restored.
--   5. `select from auth.users`        -> 42501 permission denied. auth.users
--      is not reachable over PostgREST and `profiles` carries no email, so the
--      admin has no source for user identity.
--   6. `profiles` has no suspension column, so Suspend has nothing to write.
--   7. `admin_overview_stats` is granted to `anon` (platform-wide counts
--      readable by anyone holding the public key) and its
--      `listings_under_review` term reads `where status = 'active'` — a copy of
--      `active_listings` that can never report the review queue.
--
-- Design decisions:
--
--   * Reads are opened with RLS policies delegating to the existing
--     SECURITY DEFINER `is_admin()`, which breaks the recursion because a
--     definer function owned by the table owner does not re-enter RLS.
--   * Writes are NOT opened with policies. A blanket admin UPDATE policy on
--     `listings` would let any moderator rewrite a seller's price or title.
--     Instead every privileged mutation is a SECURITY DEFINER RPC that checks
--     `is_admin()`, touches only the columns moderation owns, and writes its
--     own `admin_audit_log` row in the same transaction. The audit log
--     therefore stays unwritable from the client and cannot be forged.
--   * The two views over `auth.users` run with `security_invoker = off` (the
--     default) so they can read the auth schema, and are gated by
--     `where public.is_admin(auth.uid())`, which yields zero rows to everyone
--     else. Both are revoked from `anon`.

-- ─────────────────────── 1. admin_users recursion ───────────────────────

drop policy if exists "admins can read admin_users" on public.admin_users;
drop policy if exists "only owners can manage admin_users" on public.admin_users;

create policy "admins read admin_users"
  on public.admin_users for select to authenticated
  using (public.is_admin((select auth.uid())));

create policy "owners manage admin_users"
  on public.admin_users for all to authenticated
  using (public.get_admin_role((select auth.uid())) = 'owner'::public.admin_role)
  with check (public.get_admin_role((select auth.uid())) = 'owner'::public.admin_role);

revoke all on public.admin_users from anon;

-- ───────────────────── 2. audit log stays append-only ─────────────────────
-- No INSERT policy is added on purpose: only the definer RPCs below write
-- here, so a compromised admin session cannot fabricate or edit history.

revoke all on public.admin_audit_log from anon;
revoke insert, update, delete, truncate on public.admin_audit_log from authenticated;

-- ──────────────────────── 3. admin read access ────────────────────────

create policy "admins read all listings"
  on public.listings for select to authenticated
  using (public.is_admin((select auth.uid())));

-- Without this the thumbnail and gallery are blank for exactly the listings
-- moderation exists to look at: `listing_images_read_visible` resolves through
-- `listing_is_visible()`, which is false for draft/under_review/removed.
create policy "admins read all listing images"
  on public.listing_images for select to authenticated
  using (public.is_admin((select auth.uid())));

create policy "admins read all categories"
  on public.categories for select to authenticated
  using (public.is_admin((select auth.uid())));

-- ──────────────────── 4. suspension state on profiles ────────────────────

alter table public.profiles
  add column if not exists suspended_at     timestamptz,
  add column if not exists suspended_reason text;

comment on column public.profiles.suspended_at is
  'Set by admin_suspend_user(); null while the account is in good standing. Admin-only, enforced by the profiles_guard_suspension trigger.';
comment on column public.profiles.suspended_reason is
  'Operator-typed reason recorded alongside suspended_at.';

-- `profiles_update_own` lets a user write their own row, which would let a
-- suspended seller lift their own suspension. Guard the two columns.
create or replace function public.profiles_guard_suspension()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.suspended_at     is distinct from old.suspended_at
   or new.suspended_reason is distinct from old.suspended_reason)
   and not public.is_admin(auth.uid()) then
    raise exception 'suspension state is admin-only' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_suspension on public.profiles;
create trigger profiles_guard_suspension
  before update on public.profiles
  for each row execute function public.profiles_guard_suspension();

-- ───────────────────────── 5. admin read surfaces ─────────────────────────

-- Identity for the Users pages. `email` is the reason this exists: it lives in
-- auth.users, which PostgREST cannot reach.
create or replace view public.admin_user_directory as
select
  u.id,
  u.email::text                as email,
  u.created_at,
  u.last_sign_in_at,
  p.display_name,
  p.avatar_url,
  p.avatar_color,
  p.city,
  p.country_code,
  p.is_verified,
  p.suspended_at,
  p.suspended_reason,
  a.role                       as admin_role,
  (select count(*) from public.listings l
    where l.seller_id = u.id)  as listings_count,
  (select count(*) from public.reports r
    where r.target_type = 'user' and r.target_id = u.id) as reports_count
from auth.users u
left join public.profiles    p on p.id      = u.id
left join public.admin_users a on a.user_id = u.id
where public.is_admin((select auth.uid()));

revoke all on public.admin_user_directory from anon;
grant select on public.admin_user_directory to authenticated;

-- Reports with their reporter identity and a human label for the target, which
-- lives in a different table per target_type.
create or replace view public.admin_report_feed as
select
  r.id,
  r.reporter_id,
  r.target_type,
  r.target_id,
  r.reason,
  r.detail,
  r.status,
  r.resolved_by,
  r.resolved_at,
  r.created_at,
  ru.email::text   as reporter_email,
  rp.display_name  as reporter_name,
  rp.avatar_url    as reporter_avatar_url,
  case r.target_type
    when 'listing' then (select l.title        from public.listings l where l.id = r.target_id)
    when 'user'    then (select p.display_name from public.profiles p where p.id = r.target_id)
    else null
  end as target_label
from public.reports r
left join auth.users     ru on ru.id = r.reporter_id
left join public.profiles rp on rp.id = r.reporter_id
where public.is_admin((select auth.uid()));

revoke all on public.admin_report_feed from anon;
grant select on public.admin_report_feed to authenticated;

-- Per-category listing counts, so the Categories page can disable the
-- deactivate toggle for a category that still holds active listings.
create or replace view public.admin_category_stats as
select
  c.id,
  c.slug,
  (select count(*) from public.listings l
    where l.category_slug = c.slug and l.status = 'active') as active_listings,
  (select count(*) from public.listings l
    where l.category_slug = c.slug)                          as total_listings
from public.categories c
where public.is_admin((select auth.uid()));

revoke all on public.admin_category_stats from anon;
grant select on public.admin_category_stats to authenticated;

-- ──────────────────── 6. overview stats: fix and close ────────────────────

create or replace view public.admin_overview_stats as
select
  (select count(*) from auth.users)                          as total_users,
  (select count(*) from auth.users
    where created_at > now() - interval '7 days')            as new_users_week,
  (select count(*) from public.listings
    where status = 'active')                                 as active_listings,
  -- was `status = 'active'`, a copy of the line above
  (select count(*) from public.listings
    where status = 'under_review')                           as listings_under_review,
  -- the card reads "Published Today", so measure publication, not row creation
  (select count(*) from public.listings
    where published_at >= date_trunc('day', now()))          as listings_today,
  (select count(*) from public.reports
    where status = 'open')                                   as open_reports
where public.is_admin((select auth.uid()));

revoke all on public.admin_overview_stats from anon;
grant select on public.admin_overview_stats to authenticated;

-- ───────────────────────── 7. privileged mutations ─────────────────────────

-- Moderation owns `status` and nothing else on a listing. Bulk and single use
-- the same path so both are audited identically.
create or replace function public.admin_set_listing_status(
  p_ids    uuid[],
  p_status public.listing_status,
  p_note   text default null
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_count integer := 0;
  r       record;
begin
  if not public.is_admin(v_actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  for r in
    select id, status from public.listings where id = any(p_ids) order by id
  loop
    if r.status = p_status then
      continue;
    end if;

    update public.listings
       set status       = p_status,
           published_at = case
                            when p_status = 'active'::public.listing_status
                             and published_at is null then now()
                            else published_at
                          end,
           updated_at   = now()
     where id = r.id;

    insert into public.admin_audit_log
      (actor_id, action, target_type, target_id, before, after, note)
    values
      (v_actor, 'listing.status', 'listing', r.id,
       jsonb_build_object('status', r.status),
       jsonb_build_object('status', p_status),
       p_note);

    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

create or replace function public.admin_suspend_user(
  p_user_id uuid,
  p_reason  text,
  p_suspend boolean default true
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor  uuid := auth.uid();
  v_before jsonb;
begin
  if not public.is_admin(v_actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_suspend and public.is_admin(p_user_id) then
    raise exception 'cannot suspend an admin account' using errcode = '42501';
  end if;
  if p_suspend and coalesce(btrim(p_reason), '') = '' then
    raise exception 'a reason is required to suspend' using errcode = '22023';
  end if;

  select jsonb_build_object('suspended_at', suspended_at,
                            'suspended_reason', suspended_reason)
    into v_before
    from public.profiles where id = p_user_id;

  if v_before is null then
    raise exception 'no such profile' using errcode = 'P0002';
  end if;

  update public.profiles
     set suspended_at     = case when p_suspend then now() else null end,
         suspended_reason = case when p_suspend then btrim(p_reason) else null end,
         updated_at       = now()
   where id = p_user_id;

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, note)
  select v_actor,
         case when p_suspend then 'user.suspend' else 'user.reinstate' end,
         'user', p_user_id, v_before,
         jsonb_build_object('suspended_at', suspended_at,
                            'suspended_reason', suspended_reason),
         btrim(p_reason)
    from public.profiles where id = p_user_id;
end $$;

create or replace function public.admin_set_report_status(
  p_report_id uuid,
  p_status    public.report_status,
  p_action    text default null,
  p_note      text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor  uuid := auth.uid();
  v_before public.report_status;
begin
  if not public.is_admin(v_actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select status into v_before from public.reports where id = p_report_id;
  if v_before is null then
    raise exception 'no such report' using errcode = 'P0002';
  end if;

  update public.reports
     set status      = p_status,
         resolved_by = case
                         when p_status in ('resolved'::public.report_status,
                                           'dismissed'::public.report_status)
                         then v_actor else null end,
         resolved_at = case
                         when p_status in ('resolved'::public.report_status,
                                           'dismissed'::public.report_status)
                         then now() else null end
   where id = p_report_id;

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, note)
  values
    (v_actor, 'report.' || p_status::text, 'report', p_report_id,
     jsonb_build_object('status', v_before),
     jsonb_build_object('status', p_status, 'action_taken', p_action),
     p_note);
end $$;

-- `slug` is the primary key and `listings.category_slug` references it, so a
-- rename is only safe while nothing points at it. The UI locks the field and
-- says why rather than offering an edit that would fail.
create or replace function public.admin_update_category(
  p_id         uuid,
  p_label      text,
  p_slug       text,
  p_icon_key   text,
  p_sort_order smallint,
  p_is_active  boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor  uuid := auth.uid();
  v_before public.categories%rowtype;
  v_refs   integer;
begin
  if not public.is_admin(v_actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into v_before from public.categories where id = p_id;
  if v_before.id is null then
    raise exception 'no such category' using errcode = 'P0002';
  end if;

  if p_slug is distinct from v_before.slug then
    select count(*) into v_refs
      from public.listings where category_slug = v_before.slug;
    if v_refs > 0 then
      raise exception
        'cannot change the slug of a category with % listing(s)', v_refs
        using errcode = '23503';
    end if;
  end if;

  if not p_is_active and v_before.is_active then
    select count(*) into v_refs
      from public.listings
     where category_slug = v_before.slug and status = 'active';
    if v_refs > 0 then
      raise exception
        'cannot deactivate a category with % active listing(s)', v_refs
        using errcode = '23503';
    end if;
  end if;

  update public.categories
     set label      = btrim(p_label),
         slug       = p_slug,
         icon_key   = nullif(btrim(coalesce(p_icon_key, '')), ''),
         sort_order = p_sort_order,
         is_active  = p_is_active
   where id = p_id;

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, note)
  values
    (v_actor, 'category.update', 'category', p_id,
     jsonb_build_object('label', v_before.label, 'slug', v_before.slug,
                        'icon_key', v_before.icon_key,
                        'sort_order', v_before.sort_order,
                        'is_active', v_before.is_active),
     jsonb_build_object('label', btrim(p_label), 'slug', p_slug,
                        'icon_key', nullif(btrim(coalesce(p_icon_key, '')), ''),
                        'sort_order', p_sort_order,
                        'is_active', p_is_active),
     null);
end $$;

create or replace function public.admin_create_category(
  p_slug       text,
  p_label      text,
  p_parent_id  uuid,
  p_icon_key   text,
  p_sort_order smallint,
  p_is_active  boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_id    uuid;
  v_depth integer;
begin
  if not public.is_admin(v_actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- The Categories page renders a two-level tree; a grandchild would not be
  -- reachable in it, so refuse to create one rather than hide it.
  if p_parent_id is not null then
    select count(*) into v_depth
      from public.categories where id = p_parent_id and parent_id is not null;
    if v_depth > 0 then
      raise exception 'categories are two levels deep' using errcode = '23514';
    end if;
  end if;

  insert into public.categories
    (slug, label, parent_id, icon_key, sort_order, is_active)
  values
    (p_slug, btrim(p_label), p_parent_id,
     nullif(btrim(coalesce(p_icon_key, '')), ''), p_sort_order, p_is_active)
  returning id into v_id;

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, note)
  values
    (v_actor, 'category.create', 'category', v_id, null,
     jsonb_build_object('slug', p_slug, 'label', btrim(p_label),
                        'parent_id', p_parent_id, 'icon_key', p_icon_key,
                        'sort_order', p_sort_order, 'is_active', p_is_active),
     null);

  return v_id;
end $$;

revoke execute on function
  public.admin_set_listing_status(uuid[], public.listing_status, text),
  public.admin_suspend_user(uuid, text, boolean),
  public.admin_set_report_status(uuid, public.report_status, text, text),
  public.admin_update_category(uuid, text, text, text, smallint, boolean),
  public.admin_create_category(text, text, uuid, text, smallint, boolean)
from public, anon;

grant execute on function
  public.admin_set_listing_status(uuid[], public.listing_status, text),
  public.admin_suspend_user(uuid, text, boolean),
  public.admin_set_report_status(uuid, public.report_status, text, text),
  public.admin_update_category(uuid, text, text, text, smallint, boolean),
  public.admin_create_category(text, text, uuid, text, smallint, boolean)
to authenticated;

-- ─────────────────── 8. surface tightening (post-advisor) ───────────────────
-- The trigger function is reachable as /rest/v1/rpc/profiles_guard_suspension
-- by default. Calling a trigger function directly always errors, but it has no
-- business being in the API surface at all.
revoke execute on function public.profiles_guard_suspension() from public, anon, authenticated;

-- None of the four views are auto-updatable, so these writes would fail anyway;
-- revoked so the API surface states the intent rather than relying on that.
revoke insert, update, delete on
  public.admin_overview_stats, public.admin_user_directory,
  public.admin_report_feed, public.admin_category_stats
from authenticated;

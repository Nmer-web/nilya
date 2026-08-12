-- SAWA marketplace — row level security
--
-- Two idioms used throughout, both deliberate:
--
--   1. (select auth.uid()) rather than bare auth.uid(). The subquery form is
--      hoisted into an InitPlan and evaluated once per statement instead of
--      once per row. On a feed query over listings that is the difference
--      between a scan and a seq-scan-with-a-function-call-per-row.
--
--   2. security definer helpers for any policy that has to look at another
--      RLS-protected table. A policy on messages that selects from
--      conversations would otherwise re-enter conversations' own policies.
--      Each helper pins search_path to '' and fully qualifies its references.
--
-- Money-moving tables (orders, payments, webhook_events) grant SELECT to the
-- parties involved and nothing else. They are written by service_role only,
-- from checkout and the Stripe webhook. A client that could insert its own
-- order row could set its own price.

-- ──────────────────────────── helpers ────────────────────────────

create or replace function public.owns_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_listing_id
      and l.seller_id = (select auth.uid())
  );
$$;

create or replace function public.listing_is_visible(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_listing_id
      and (l.status = 'active' or l.seller_id = (select auth.uid()))
  );
$$;

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (select auth.uid()) in (c.buyer_id, c.seller_id)
  );
$$;

create or replace function public.is_order_party(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (select auth.uid()) in (o.buyer_id, o.seller_id)
  );
$$;

create or replace function public.is_order_seller(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and o.seller_id = (select auth.uid())
  );
$$;

-- Did these two people actually complete this trade? Gates review writing.
create or replace function public.can_review_order(p_order_id uuid, p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and o.status in ('delivered', 'completed')
      and (select auth.uid()) in (o.buyer_id, o.seller_id)
      and p_subject_id in (o.buyer_id, o.seller_id)
      and p_subject_id <> (select auth.uid())
  );
$$;

-- ──────────────────────────── profiles ────────────────────────────
-- Public: a marketplace has to render seller pages to logged-out visitors.

create policy profiles_read_all on profiles
  for select to anon, authenticated
  using (true);

create policy profiles_update_own on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert policy: handle_new_user() creates the row. No delete policy:
-- profiles die with their auth.users row.

-- Verification and the denormalised counters are not the owner's to set.
--
-- Note the shape of every column lockdown in this file: revoke UPDATE on the
-- whole table, then grant back the writable columns. Postgres will not carve
-- columns out of an existing table-level grant, so `revoke update (col)` against
-- a role holding table-level UPDATE silently does nothing — and Supabase grants
-- table-level ALL to anon and authenticated by default.
revoke update on profiles from anon, authenticated;
grant update (display_name, avatar_url, avatar_color, bio, city, country_code)
  on profiles to authenticated;

-- ──────────────────────── seller_accounts ────────────────────────
-- Payout state. Owner reads it; only Stripe callbacks write it.

create policy seller_accounts_read_own on seller_accounts
  for select to authenticated
  using (profile_id = (select auth.uid()));

-- ──────────────────────── reference data ────────────────────────

create policy categories_read_all on categories
  for select to anon, authenticated using (true);

create policy delivery_options_read_active on delivery_options
  for select to anon, authenticated using (is_active);

create policy platform_settings_read_all on platform_settings
  for select to anon, authenticated using (true);

-- ──────────────────────────── listings ────────────────────────────

create policy listings_read_active on listings
  for select to anon, authenticated
  using (status = 'active' or seller_id = (select auth.uid()));

create policy listings_insert_own on listings
  for insert to authenticated
  with check (seller_id = (select auth.uid()));

create policy listings_update_own on listings
  for update to authenticated
  using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));

create policy listings_delete_own on listings
  for delete to authenticated
  using (seller_id = (select auth.uid()) and status in ('draft', 'active', 'removed'));

-- ───────────────────────── listing_images ─────────────────────────

create policy listing_images_read_visible on listing_images
  for select to anon, authenticated
  using (public.listing_is_visible(listing_id));

create policy listing_images_write_own on listing_images
  for insert to authenticated
  with check (public.owns_listing(listing_id));

create policy listing_images_update_own on listing_images
  for update to authenticated
  using (public.owns_listing(listing_id))
  with check (public.owns_listing(listing_id));

create policy listing_images_delete_own on listing_images
  for delete to authenticated
  using (public.owns_listing(listing_id));

-- ─────────────────────── favourites and follows ───────────────────────
-- Favourites are private: who saved what is not public information. A public
-- "N saves" badge would need a counter column on listings, not a read policy.

create policy favorites_read_own on favorites
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy favorites_insert_own on favorites
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.listing_is_visible(listing_id));

create policy favorites_delete_own on favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Follows are public — follower counts render on seller pages.
create policy follows_read_all on follows
  for select to anon, authenticated using (true);

create policy follows_insert_own on follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()));

create policy follows_delete_own on follows
  for delete to authenticated
  using (follower_id = (select auth.uid()));

-- ─────────────────────── conversations and messages ───────────────────────

create policy conversations_read_participant on conversations
  for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

-- Only a buyer opens a thread, and only against someone else's live listing.
create policy conversations_insert_as_buyer on conversations
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and seller_id <> (select auth.uid())
    and public.listing_is_visible(listing_id)
  );

create policy conversations_update_participant on conversations
  for update to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id))
  with check ((select auth.uid()) in (buyer_id, seller_id));

-- The WITH CHECK above stops a participant removing themselves, but on its own
-- it would still let them swap the *other* party out. Only the activity stamp
-- is writable.
revoke update on conversations from anon, authenticated;
grant update (last_message_at) on conversations to authenticated;

create policy messages_read_participant on messages
  for select to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy messages_insert_as_self on messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_participant(conversation_id)
  );

-- Recipients mark messages read; nobody edits a sent message body.
create policy messages_update_read_state on messages
  for update to authenticated
  using (public.is_conversation_participant(conversation_id) and sender_id <> (select auth.uid()))
  with check (public.is_conversation_participant(conversation_id) and sender_id <> (select auth.uid()));

revoke update on messages from anon, authenticated;
grant update (read_at) on messages to authenticated;

-- ───────────────────────────── offers ─────────────────────────────

create policy offers_read_participant on offers
  for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

-- Buyers open, sellers counter. Either way the row's author must be the actor.
create policy offers_insert_participant on offers
  for insert to authenticated
  with check (
    (select auth.uid()) in (buyer_id, seller_id)
    and buyer_id <> seller_id
    and public.is_conversation_participant(conversation_id)
  );

-- Accept/decline. The counterparty responds; the author can only withdraw.
create policy offers_update_participant on offers
  for update to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id))
  with check ((select auth.uid()) in (buyer_id, seller_id));

-- Only the state machine moves. Nobody edits an offer's amount after the fact.
revoke update on offers from anon, authenticated;
grant update (state, responded_at) on offers to authenticated;

-- ──────────────────── orders, payments, shipments ────────────────────
-- Read-only to clients. Every write path is service_role.

create policy orders_read_party on orders
  for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

create policy payments_read_party on payments
  for select to authenticated
  using (public.is_order_party(order_id));

create policy shipments_read_party on shipments
  for select to authenticated
  using (public.is_order_party(order_id));

-- The seller attaches their own tracking number; status transitions stay
-- with the carrier webhook.
create policy shipments_update_seller on shipments
  for update to authenticated
  using (public.is_order_seller(order_id))
  with check (public.is_order_seller(order_id));

revoke update on shipments from anon, authenticated;
grant update (carrier, tracking_number, tracking_url, shipped_at) on shipments to authenticated;

-- Defence in depth. RLS already denies these (a command with no policy is
-- denied), but the grants should not be sitting there either — every write to
-- a money-bearing table goes through service_role, which bypasses RLS entirely.
revoke insert, update, delete on orders   from anon, authenticated;
revoke insert, update, delete on payments from anon, authenticated;
revoke all on webhook_events from anon, authenticated;

-- webhook_events gets no policy at all: service_role bypasses RLS, everyone
-- else sees an empty table. That is the intent.

-- ───────────────────────────── reviews ─────────────────────────────

create policy reviews_read_all on reviews
  for select to anon, authenticated using (true);

create policy reviews_insert_after_trade on reviews
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.can_review_order(order_id, subject_id)
  );

-- A 24h edit window would go here as a using() clause on update; until product
-- decides, reviews are immutable once written.

-- ───────────────────────────── disputes ─────────────────────────────

create policy disputes_read_party on disputes
  for select to authenticated
  using (public.is_order_party(order_id));

create policy disputes_insert_party on disputes
  for insert to authenticated
  with check (
    opened_by = (select auth.uid())
    and public.is_order_party(order_id)
  );

-- Resolution is a staff action, not a party action: no update policy.

-- ──────────────────────────── notifications ────────────────────────────

create policy notifications_read_own on notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Marking read is the only client write. Inserts come from triggers/functions.
create policy notifications_mark_read on notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke update on notifications from anon, authenticated;
grant update (read_at) on notifications to authenticated;

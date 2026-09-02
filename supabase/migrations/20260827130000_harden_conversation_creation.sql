-- A conversation seller must be the seller of the active NEW listing.
--
-- The original insert policy authenticated the buyer and required a visible
-- listing, but it did not relate conversations.seller_id back to
-- listings.seller_id. Keep the existing client-facing table contract while
-- closing that cross-user integrity gap at the database boundary.

create or replace function public.conversation_listing_is_openable(
  p_listing_id uuid,
  p_seller_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings l
    where l.id = p_listing_id
      and l.seller_id = p_seller_id
      and l.status = 'active'
      and l.condition = 'new'
  );
$$;

revoke all on function public.conversation_listing_is_openable(uuid, uuid) from public;
grant execute on function public.conversation_listing_is_openable(uuid, uuid) to authenticated;

drop policy if exists conversations_insert_as_buyer on public.conversations;

create policy conversations_insert_as_buyer on public.conversations
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and seller_id <> (select auth.uid())
    and public.conversation_listing_is_openable(listing_id, seller_id)
  );

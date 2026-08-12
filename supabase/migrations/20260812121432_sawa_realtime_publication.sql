-- Realtime for the three tables the mobile app subscribes to:
--   messages      — chat.tsx renders incoming messages live
--   offers        — the offer state machine (open → countered → accepted)
--   notifications — the unread badge on the bottom nav
--
-- supabase_realtime already exists with no tables, so these are additions
-- rather than a redefinition. Guarded so re-running is a no-op.
--
-- Replica identity is left at its default (primary key). That delivers the
-- full NEW row on INSERT and UPDATE, which is everything the app reads. It
-- does mean DELETE events carry only the primary key, so Realtime cannot
-- evaluate RLS against a deleted row and will not forward deletes to clients.
-- None of these three tables is deleted from in normal use; switch the table
-- to REPLICA IDENTITY FULL if that changes, at the cost of extra WAL.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'offers'
  ) then
    alter publication supabase_realtime add table public.offers;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

-- Confirmed referral relationships are immutable and owner-readable through
-- the existing RLS policy. Publishing this table lets the referrer receive an
-- INSERT notification and refetch the authoritative count immediately.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'referrals'
  ) then
    alter publication supabase_realtime add table public.referrals;
  end if;
end;
$$;

-- A seller-owned away state. Listings, orders and conversations are left
-- untouched; marketplace reads and checkout use this profile flag as an
-- availability condition instead of rewriting listing history.

alter table public.profiles
  add column holiday_mode boolean not null default false,
  add column holiday_mode_started_at timestamptz;

alter table public.profiles
  add constraint profiles_holiday_mode_timestamp
  check (
    (holiday_mode and holiday_mode_started_at is not null)
    or (not holiday_mode and holiday_mode_started_at is null)
  );

-- The database, not the app clock, owns the start timestamp. Including
-- holiday_mode_started_at in the trigger columns also prevents a privileged
-- update from drifting it away from the boolean state.
create or replace function public.sync_profile_holiday_mode()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.holiday_mode is distinct from old.holiday_mode then
    new.holiday_mode_started_at := case when new.holiday_mode then now() else null end;
  else
    new.holiday_mode_started_at := old.holiday_mode_started_at;
  end if;

  return new;
end;
$$;

create trigger profiles_sync_holiday_mode
  before update of holiday_mode, holiday_mode_started_at on public.profiles
  for each row execute function public.sync_profile_holiday_mode();

-- profiles_update_own still enforces id = auth.uid(). The existing table-wide
-- UPDATE revoke remains in force; this grants back only the new boolean.
grant update (holiday_mode) on public.profiles to authenticated;

comment on column public.profiles.holiday_mode is
  'When true, the seller is hidden from marketplace discovery and new checkout is unavailable.';
comment on column public.profiles.holiday_mode_started_at is
  'Database-managed timestamp for the current holiday-mode period; null while off.';

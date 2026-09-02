-- Stable invite codes plus immutable joined-user attribution. Referral rewards
-- and payment settlement are deliberately outside this migration.

alter table public.profiles
  add column referral_code text not null
    default upper(encode(extensions.gen_random_bytes(6), 'hex')),
  add constraint profiles_referral_code_format
    check (referral_code ~ '^[A-F0-9]{12}$'),
  add constraint profiles_referral_code_unique unique (referral_code);

comment on column public.profiles.referral_code is
  'Stable public invite code. Non-secret, uppercase, and not client-writable.';

create table public.referrals (
  id                uuid primary key default gen_random_uuid(),
  referrer_id       uuid not null references public.profiles (id) on delete cascade,
  referred_user_id  uuid not null unique references public.profiles (id) on delete cascade,
  created_at        timestamptz not null default now(),
  constraint referrals_no_self_referral check (referrer_id <> referred_user_id)
);

create index referrals_referrer_created
  on public.referrals (referrer_id, created_at desc);

alter table public.referrals enable row level security;

-- Both people may inspect their own relationship. The current UI counts only
-- rows where auth.uid() is the referrer and exposes no other member identity.
create policy referrals_read_own_activity
  on public.referrals
  for select to authenticated
  using ((select auth.uid()) in (referrer_id, referred_user_id));

-- Attribution is trigger-owned. App roles can neither manufacture, rewrite,
-- nor erase a relationship after account creation.
revoke all on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;

-- Invite codes are intentionally shareable, but signup should learn only
-- whether one normalized code exists rather than receiving another profile.
create or replace function public.referral_code_exists(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_code is null or upper(btrim(p_code)) !~ '^[A-F0-9]{12}$' then false
    else exists (
      select 1
      from public.profiles p
      where p.referral_code = upper(btrim(p_code))
    )
  end;
$$;

revoke all on function public.referral_code_exists(text) from public;
grant execute on function public.referral_code_exists(text) to anon, authenticated;

create or replace function public.attribute_new_user_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text;
  resolved_referrer uuid;
begin
  -- Only confirmed email accounts become successful referrals. With email
  -- confirmation disabled, email_confirmed_at is already populated at insert;
  -- with this project's current flow, the update trigger handles confirmation.
  if new.email_confirmed_at is null then
    return new;
  end if;

  normalized_code := upper(btrim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));

  if normalized_code !~ '^[A-F0-9]{12}$' then
    return new;
  end if;

  select p.id
    into resolved_referrer
    from public.profiles p
    where p.referral_code = normalized_code;

  if resolved_referrer is null or resolved_referrer = new.id then
    return new;
  end if;

  insert into public.referrals (referrer_id, referred_user_id)
  values (resolved_referrer, new.id)
  on conflict (referred_user_id) do nothing;

  return new;
end;
$$;

-- PostgreSQL fires same-event triggers in name order. The existing
-- on_auth_user_created trigger runs first and creates the profile row required
-- by both referral foreign keys; this referral trigger then records attribution
-- in the same auth-user transaction.
create trigger on_auth_user_referral_attribution
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.attribute_new_user_referral();

create trigger on_auth_user_referral_confirmation
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.attribute_new_user_referral();

revoke all on function public.attribute_new_user_referral() from public;

comment on table public.referrals is
  'Immutable joined-account referral attribution; no reward or payment state.';

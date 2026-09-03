-- ============================================================
-- Nilya Admin Foundation
-- ============================================================

-- Admin roles
create type admin_role as enum ('owner','admin','moderator','support');

-- Admin users
create table public.admin_users (
  user_id    uuid primary key references auth.users on delete cascade,
  role       admin_role not null default 'moderator',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "admins can read admin_users"
  on public.admin_users for select
  using (
    exists (
      select 1 from public.admin_users a
      where a.user_id = auth.uid()
    )
  );

create policy "only owners can manage admin_users"
  on public.admin_users for all
  using (
    exists (
      select 1 from public.admin_users a
      where a.user_id = auth.uid()
      and a.role = 'owner'
    )
  );

-- Reports
create type report_reason as enum (
  'prohibited_item','counterfeit','spam',
  'inappropriate_content','wrong_category','fraud','other'
);

create type report_status as enum (
  'open','reviewing','resolved','dismissed'
);

create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references auth.users on delete cascade,
  target_type   text not null check (target_type in ('listing','user','review')),
  target_id     uuid not null,
  reason        report_reason not null,
  detail        text,
  status        report_status not null default 'open',
  resolved_by   uuid references auth.users,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "users can file reports"
  on public.reports for insert
  with check (reporter_id = auth.uid());

create policy "reporters can read own reports"
  on public.reports for select
  using (reporter_id = auth.uid());

create policy "admins can read all reports"
  on public.reports for select
  using (
    exists (select 1 from public.admin_users a where a.user_id = auth.uid())
  );

create policy "admins can update reports"
  on public.reports for update
  using (
    exists (select 1 from public.admin_users a where a.user_id = auth.uid())
  );

-- Audit log
create table public.admin_audit_log (
  id          bigserial primary key,
  actor_id    uuid not null references auth.users,
  action      text not null,
  target_type text not null,
  target_id   uuid not null,
  before      jsonb,
  after       jsonb,
  note        text,
  created_at  timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create policy "admins can read audit log"
  on public.admin_audit_log for select
  using (
    exists (select 1 from public.admin_users a where a.user_id = auth.uid())
  );

-- Helper functions
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = uid);
$$;

create or replace function public.get_admin_role(uid uuid)
returns admin_role language sql security definer set search_path = ''
as $$
  select role from public.admin_users where user_id = uid limit 1;
$$;

-- Admin overview stats view
create or replace view public.admin_overview_stats as
select
  (select count(*) from auth.users) as total_users,
  (select count(*) from auth.users
   where created_at > now() - interval '7 days') as new_users_week,
  (select count(*) from public.listings
   where status = 'active') as active_listings,
  (select count(*) from public.listings
   where status = 'active') as listings_under_review,
  (select count(*) from public.listings
   where created_at::date = current_date) as listings_today,
  (select count(*) from public.reports
   where status = 'open') as open_reports;

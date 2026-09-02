-- Public-safe badge definitions and private, database-awarded seller milestones.
-- No sale-count, payment, payout, or reward badge is defined here.

create table public.badges (
  key              text primary key
                     check (key ~ '^[a-z][a-z0-9_]{2,39}$'),
  title            text not null check (length(btrim(title)) between 1 and 60),
  description      text not null check (length(btrim(description)) between 1 and 180),
  requirement      text not null check (length(btrim(requirement)) between 1 and 180),
  icon_key         text not null
                     check (icon_key in ('package', 'grid', 'star', 'badgeCheck', 'person', 'send')),
  progress_target  integer check (progress_target > 0),
  sort_order       integer not null unique check (sort_order >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table public.user_badges (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  badge_key   text not null references public.badges (key) on delete restrict,
  earned_at   timestamptz not null default now(),
  primary key (user_id, badge_key)
);

create index user_badges_user_earned
  on public.user_badges (user_id, earned_at desc);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create policy badges_read_active
  on public.badges
  for select to anon, authenticated
  using (is_active);

create policy user_badges_read_own
  on public.user_badges
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Definitions are public product copy. Earned rows remain private and no app
-- role receives a write privilege on either table.
revoke all on public.badges from anon, authenticated;
revoke all on public.user_badges from anon, authenticated;
grant select on public.badges to anon, authenticated;
grant select on public.user_badges to authenticated;

insert into public.badges (
  key,
  title,
  description,
  requirement,
  icon_key,
  progress_target,
  sort_order
)
values
  (
    'first_listing',
    'First product',
    'Published a first NEW product on SAWA.',
    'Publish your first NEW product.',
    'package',
    1,
    10
  ),
  (
    'five_active_listings',
    'Five active products',
    'Had five active NEW products at the same time.',
    'Have five active NEW products at the same time.',
    'grid',
    5,
    20
  ),
  (
    'first_seller_review',
    'First seller review',
    'Received a first review as a seller.',
    'Receive your first seller review from a delivered or completed order.',
    'star',
    1,
    30
  ),
  (
    'highly_rated',
    'Highly rated',
    'Reached at least a 4.5 average across five seller reviews.',
    'Reach a 4.5 average from at least five seller reviews.',
    'badgeCheck',
    null,
    40
  ),
  (
    'profile_complete',
    'Profile complete',
    'Completed every public profile essential.',
    'Add your name, photo, bio, city, and country.',
    'person',
    null,
    50
  ),
  (
    'first_referral',
    'First referral',
    'Invited a confirmed SAWA member.',
    'Invite a friend who confirms their SAWA account.',
    'send',
    1,
    60
  );

-- One authoritative calculation for backfill, triggers, and page refreshes.
-- Seller reviews deliberately join orders so reviews received as a buyer do
-- not count toward seller achievements.
create or replace function public.calculate_user_badge_eligibility(p_user_id uuid)
returns table (
  badge_key text,
  eligible boolean,
  progress_current integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with listing_counts as (
    select
      count(*) filter (
        where listing.condition = 'new'
          and listing.published_at is not null
      )::integer as published_count,
      count(*) filter (
        where listing.condition = 'new'
          and listing.status = 'active'
          and listing.published_at is not null
      )::integer as active_count
    from public.listings as listing
    where listing.seller_id = p_user_id
  ),
  seller_reviews as (
    select
      count(*)::integer as review_count,
      coalesce(avg(review.rating), 0)::numeric as average_rating
    from public.reviews as review
    join public.orders as seller_order
      on seller_order.id = review.order_id
     and seller_order.seller_id = p_user_id
     and seller_order.status in ('delivered', 'completed')
    where review.subject_id = p_user_id
  ),
  profile_state as (
    select
      btrim(profile.display_name) <> ''
      and nullif(btrim(coalesce(profile.avatar_url, '')), '') is not null
      and nullif(btrim(coalesce(profile.bio, '')), '') is not null
      and nullif(btrim(coalesce(profile.city, '')), '') is not null
      and nullif(btrim(coalesce(profile.country_code::text, '')), '') is not null as is_complete
    from public.profiles as profile
    where profile.id = p_user_id
  ),
  referral_counts as (
    select count(*)::integer as referral_count
    from public.referrals as referral
    where referral.referrer_id = p_user_id
  )
  select eligibility.badge_key, eligibility.eligible, eligibility.progress_current
  from listing_counts
  cross join seller_reviews
  cross join profile_state
  cross join referral_counts
  cross join lateral (
    values
      (
        'first_listing'::text,
        listing_counts.published_count >= 1,
        least(listing_counts.published_count, 1)
      ),
      (
        'five_active_listings'::text,
        listing_counts.active_count >= 5,
        least(listing_counts.active_count, 5)
      ),
      (
        'first_seller_review'::text,
        seller_reviews.review_count >= 1,
        least(seller_reviews.review_count, 1)
      ),
      (
        'highly_rated'::text,
        seller_reviews.review_count >= 5
          and seller_reviews.average_rating >= 4.5,
        null::integer
      ),
      (
        'profile_complete'::text,
        profile_state.is_complete,
        null::integer
      ),
      (
        'first_referral'::text,
        referral_counts.referral_count >= 1,
        least(referral_counts.referral_count, 1)
      )
  ) as eligibility (badge_key, eligible, progress_current);
$$;

create or replace function public.award_eligible_user_badges(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_badges (user_id, badge_key)
  select p_user_id, eligibility.badge_key
  from public.calculate_user_badge_eligibility(p_user_id) as eligibility
  join public.badges as badge
    on badge.key = eligibility.badge_key
   and badge.is_active
  where eligibility.eligible
  on conflict (user_id, badge_key) do nothing;
$$;

-- The client can request only its own view. Calling this also reconciles any
-- eligible milestone that predates its trigger or was present at migration.
create or replace function public.get_my_badges()
returns table (
  badge_key text,
  title text,
  description text,
  requirement text,
  icon_key text,
  sort_order integer,
  earned_at timestamptz,
  progress_current integer,
  progress_target integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
begin
  if requesting_user is null then
    raise insufficient_privilege using message = 'Authentication required';
  end if;

  perform public.award_eligible_user_badges(requesting_user);

  return query
  select
    badge.key,
    badge.title,
    badge.description,
    badge.requirement,
    badge.icon_key,
    badge.sort_order,
    earned.earned_at,
    eligibility.progress_current,
    badge.progress_target
  from public.badges as badge
  join public.calculate_user_badge_eligibility(requesting_user) as eligibility
    on eligibility.badge_key = badge.key
  left join public.user_badges as earned
    on earned.user_id = requesting_user
   and earned.badge_key = badge.key
  where badge.is_active
  order by badge.sort_order, badge.key;
end;
$$;

create or replace function public.award_badges_after_listing_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_eligible_user_badges(new.seller_id);
  if tg_op = 'UPDATE' and old.seller_id is distinct from new.seller_id then
    perform public.award_eligible_user_badges(old.seller_id);
  end if;
  return new;
end;
$$;

create or replace function public.award_badges_after_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_eligible_user_badges(new.id);
  return new;
end;
$$;

create or replace function public.award_badges_after_review_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_eligible_user_badges(new.subject_id);
  return new;
end;
$$;

create or replace function public.award_badges_after_referral_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_eligible_user_badges(new.referrer_id);
  return new;
end;
$$;

create trigger listings_award_seller_badges
  after insert or update of seller_id, status, published_at, condition
  on public.listings
  for each row execute function public.award_badges_after_listing_change();

create trigger profiles_award_seller_badges
  after update of display_name, avatar_url, bio, city, country_code
  on public.profiles
  for each row execute function public.award_badges_after_profile_change();

create trigger reviews_award_seller_badges
  after insert on public.reviews
  for each row execute function public.award_badges_after_review_insert();

create trigger referrals_award_seller_badges
  after insert on public.referrals
  for each row execute function public.award_badges_after_referral_insert();

-- Award existing truthful milestones. earned_at records when SAWA first
-- recorded the badge; it is not presented as the historical event timestamp.
do $$
declare
  profile_id uuid;
begin
  for profile_id in select profile.id from public.profiles as profile loop
    perform public.award_eligible_user_badges(profile_id);
  end loop;
end;
$$;

revoke all on function public.calculate_user_badge_eligibility(uuid)
  from public, anon, authenticated;
revoke all on function public.award_eligible_user_badges(uuid)
  from public, anon, authenticated;
revoke all on function public.award_badges_after_listing_change()
  from public, anon, authenticated;
revoke all on function public.award_badges_after_profile_change()
  from public, anon, authenticated;
revoke all on function public.award_badges_after_review_insert()
  from public, anon, authenticated;
revoke all on function public.award_badges_after_referral_insert()
  from public, anon, authenticated;
revoke all on function public.get_my_badges() from public, anon;
grant execute on function public.get_my_badges() to authenticated;

comment on table public.badges is
  'Public-safe seller achievement definitions with explicit deterministic requirements.';
comment on table public.user_badges is
  'Private, immutable badge awards inserted only by database-owned eligibility logic.';
comment on column public.user_badges.earned_at is
  'When SAWA first recorded the earned badge; not necessarily the source event timestamp.';

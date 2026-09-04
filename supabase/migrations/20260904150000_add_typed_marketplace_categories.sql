-- Nilya typed marketplace expansion.
--
-- Owner-approved constitution amendment: 2026-09-04. Existing category slugs
-- and listing identifiers are preserved. Purchasable goods remain NEW-only;
-- jobs and services are conditionless and cannot enter checkout.

do $$
begin
  create type public.listing_type as enum ('product', 'food', 'job', 'service');
exception
  when duplicate_object then null;
end
$$;

alter table public.categories
  add column if not exists listing_type public.listing_type not null default 'product',
  add column if not exists requires_perfume_details boolean not null default false;

alter table public.listings
  add column if not exists listing_type public.listing_type not null default 'product';

alter table public.listings alter column condition drop not null;
alter table public.listings alter column price_cents drop not null;

alter table public.listings
  drop constraint if exists listings_typed_core_fields;

alter table public.listings
  add constraint listings_typed_core_fields check (
    (
      listing_type in ('product', 'food')
      and condition = 'new'
      and price_cents is not null
      and price_cents > 0
    )
    or (
      listing_type = 'job'
      and condition is null
      and price_cents is null
      and original_price_cents is null
    )
    or (
      listing_type = 'service'
      and condition is null
      and original_price_cents is null
      and (price_cents is null or price_cents > 0)
    )
  );

create index if not exists listings_type_feed
  on public.listings (listing_type, published_at desc)
  where status = 'active';

create index if not exists categories_listing_type
  on public.categories (listing_type, sort_order)
  where is_active;

-- Reference taxonomy only. These are not marketplace listings or fabricated
-- activity. ON CONFLICT DO NOTHING preserves every existing record verbatim.
insert into public.categories
  (slug, label, parent_id, icon_key, sort_order, is_active, in_home, in_explore,
   listing_type, requires_perfume_details)
values
  ('food-groceries',     'Food & Groceries',    null, 'food',       130, true, true, true, 'food',    false),
  ('perfumes-incense',   'Perfumes & Incense',  null, 'fragrance',  140, true, true, true, 'product', true),
  ('jobs',               'Jobs',                null, 'briefcase',  150, true, true, true, 'job',     false),
  ('services',           'Services',            null, 'services',   160, true, true, true, 'service', false)
on conflict (slug) do nothing;

with child_seed (slug, label, parent_slug, icon_key, sort_order, listing_type, perfume) as (
  values
    ('food-fresh-produce',       'Fresh produce',       'food-groceries',   'food',       10, 'food'::public.listing_type, false),
    ('food-pantry',              'Pantry',              'food-groceries',   'package',    20, 'food'::public.listing_type, false),
    ('food-bakery',              'Bakery',              'food-groceries',   'food',       30, 'food'::public.listing_type, false),
    ('food-dairy-eggs',          'Dairy & eggs',        'food-groceries',   'food',       40, 'food'::public.listing_type, false),
    ('food-meat-seafood',        'Meat & seafood',      'food-groceries',   'food',       50, 'food'::public.listing_type, false),
    ('food-beverages',           'Beverages',           'food-groceries',   'food',       60, 'food'::public.listing_type, false),
    ('food-snacks-sweets',       'Snacks & sweets',     'food-groceries',   'food',       70, 'food'::public.listing_type, false),
    ('food-prepared-meals',      'Prepared meals',      'food-groceries',   'food',       80, 'food'::public.listing_type, false),

    ('perfumes-fragrance',       'Perfumes',            'perfumes-incense', 'fragrance',  10, 'product'::public.listing_type, true),
    ('perfumes-oud',             'Oud',                 'perfumes-incense', 'fragrance',  20, 'product'::public.listing_type, true),
    ('perfumes-incense-bakhoor', 'Incense & bakhoor',   'perfumes-incense', 'fragrance',  30, 'product'::public.listing_type, true),
    ('perfumes-oils-attar',      'Perfume oils & attar','perfumes-incense', 'fragrance',  40, 'product'::public.listing_type, true),
    ('perfumes-body-fragrance',  'Body fragrance',      'perfumes-incense', 'fragrance',  50, 'product'::public.listing_type, true),
    ('perfumes-gift-sets',       'Gift sets',           'perfumes-incense', 'fragrance',  60, 'product'::public.listing_type, true),

    ('jobs-retail-sales',        'Retail & sales',      'jobs',             'briefcase',  10, 'job'::public.listing_type, false),
    ('jobs-hospitality',         'Hospitality',         'jobs',             'briefcase',  20, 'job'::public.listing_type, false),
    ('jobs-logistics-delivery',  'Logistics & delivery','jobs',             'briefcase',  30, 'job'::public.listing_type, false),
    ('jobs-office-admin',        'Office & admin',      'jobs',             'briefcase',  40, 'job'::public.listing_type, false),
    ('jobs-technology',          'Technology',          'jobs',             'briefcase',  50, 'job'::public.listing_type, false),
    ('jobs-healthcare',          'Healthcare',          'jobs',             'briefcase',  60, 'job'::public.listing_type, false),
    ('jobs-education',           'Education',           'jobs',             'briefcase',  70, 'job'::public.listing_type, false),
    ('jobs-skilled-trades',      'Skilled trades',      'jobs',             'briefcase',  80, 'job'::public.listing_type, false),

    ('services-home',            'Home services',       'services',         'services',   10, 'service'::public.listing_type, false),
    ('services-beauty-wellness', 'Beauty & wellness',   'services',         'services',   20, 'service'::public.listing_type, false),
    ('services-repairs',         'Repairs & maintenance','services',        'services',   30, 'service'::public.listing_type, false),
    ('services-events',          'Events',              'services',         'services',   40, 'service'::public.listing_type, false),
    ('services-tutoring',        'Tutoring',            'services',         'services',   50, 'service'::public.listing_type, false),
    ('services-transport',       'Transport & delivery','services',         'services',   60, 'service'::public.listing_type, false),
    ('services-business',        'Business services',   'services',         'services',   70, 'service'::public.listing_type, false),
    ('services-digital',         'Digital services',    'services',         'services',   80, 'service'::public.listing_type, false)
)
insert into public.categories
  (slug, label, parent_id, icon_key, sort_order, is_active, in_home, in_explore,
   listing_type, requires_perfume_details)
select seed.slug, seed.label, parent.id, seed.icon_key, seed.sort_order,
       true, true, true, seed.listing_type, seed.perfume
from child_seed seed
join public.categories parent on parent.slug = seed.parent_slug
on conflict (slug) do nothing;

create table if not exists public.food_details (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  price_unit text not null check (price_unit in ('item', 'kg', 'g', 'litre', 'ml', 'pack', 'dozen')),
  quantity numeric(12,3) not null check (quantity > 0),
  ingredients text not null check (length(trim(ingredients)) between 1 and 4000),
  allergens text not null check (length(trim(allergens)) between 1 and 1000),
  expiry_date date not null,
  halal_status text not null check (halal_status in ('halal', 'not_halal', 'not_specified')),
  preparation_type text not null check (preparation_type in ('homemade', 'packaged')),
  storage_requirements text not null check (length(trim(storage_requirements)) between 1 and 1000),
  delivery_requirements text not null check (length(trim(delivery_requirements)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.perfume_details (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  brand text not null check (length(trim(brand)) between 1 and 120),
  fragrance_name text not null check (length(trim(fragrance_name)) between 1 and 160),
  fragrance_type text not null check (fragrance_type in (
    'parfum', 'eau_de_parfum', 'eau_de_toilette', 'cologne',
    'perfume_oil', 'attar', 'oud', 'incense', 'bakhoor', 'other'
  )),
  volume_ml numeric(10,2) not null check (volume_ml > 0),
  sealed boolean not null,
  authenticity_declared boolean not null check (authenticity_declared),
  fragrance_notes text not null check (length(trim(fragrance_notes)) between 1 and 2000),
  target_audience text not null check (target_audience in ('women', 'men', 'unisex', 'kids')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_details (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  employer text not null check (length(trim(employer)) between 1 and 160),
  sector text not null check (length(trim(sector)) between 1 and 120),
  contract_type text not null check (contract_type in (
    'full_time', 'part_time', 'fixed_term', 'temporary', 'freelance', 'internship'
  )),
  schedule text not null check (length(trim(schedule)) between 1 and 500),
  work_mode text not null check (work_mode in ('onsite', 'hybrid', 'remote')),
  location text not null check (length(trim(location)) between 1 and 240),
  salary_min_cents integer not null check (salary_min_cents > 0),
  salary_max_cents integer not null check (salary_max_cents >= salary_min_cents),
  salary_currency char(3) not null,
  required_experience text not null check (length(trim(required_experience)) between 1 and 2000),
  application_method text not null check (application_method in ('in_app', 'external_url', 'email', 'phone')),
  application_value text,
  application_deadline date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_application_target_matches_method check (
    (application_method = 'in_app' and application_value is null)
    or (application_method <> 'in_app' and length(trim(application_value)) between 1 and 500)
  )
);

create table if not exists public.service_details (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  pricing_mode text not null check (pricing_mode in ('fixed', 'hourly', 'daily', 'quote')),
  service_area text not null check (length(trim(service_area)) between 1 and 500),
  delivery_mode text not null check (delivery_mode in ('onsite', 'remote', 'either')),
  availability text not null check (length(trim(availability)) between 1 and 1000),
  experience text not null check (length(trim(experience)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_details_filters
  on public.food_details (halal_status, preparation_type, price_unit, expiry_date);
create index if not exists perfume_details_filters
  on public.perfume_details (fragrance_type, target_audience, sealed, volume_ml);
create index if not exists job_details_filters
  on public.job_details (contract_type, work_mode, sector, application_deadline);
create index if not exists service_details_filters
  on public.service_details (pricing_mode, delivery_mode);

create trigger food_details_touch before update on public.food_details
  for each row execute function public.touch_updated_at();
create trigger perfume_details_touch before update on public.perfume_details
  for each row execute function public.touch_updated_at();
create trigger job_details_touch before update on public.job_details
  for each row execute function public.touch_updated_at();
create trigger service_details_touch before update on public.service_details
  for each row execute function public.touch_updated_at();

create or replace function public.validate_typed_detail_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  listing_kind public.listing_type;
  perfume_required boolean;
begin
  select listing.listing_type, category.requires_perfume_details
    into listing_kind, perfume_required
  from public.listings listing
  join public.categories category on category.slug = listing.category_slug
  where listing.id = new.listing_id;

  if listing_kind is null then
    raise exception using errcode = '23503', message = 'listing does not exist';
  end if;

  if (tg_table_name = 'food_details' and listing_kind <> 'food')
    or (tg_table_name = 'perfume_details' and (listing_kind <> 'product' or not perfume_required))
    or (tg_table_name = 'job_details' and listing_kind <> 'job')
    or (tg_table_name = 'service_details' and listing_kind <> 'service') then
    raise exception using errcode = '23514', message = 'detail record does not match listing type';
  end if;

  if tg_table_name = 'food_details' and new.expiry_date < current_date then
    raise exception using errcode = '23514', message = 'food expiry date cannot be in the past';
  end if;

  if tg_table_name = 'job_details' and new.application_deadline < current_date then
    raise exception using errcode = '23514', message = 'job application deadline cannot be in the past';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_typed_detail_owner() from public;

create trigger food_details_validate before insert or update on public.food_details
  for each row execute function public.validate_typed_detail_owner();
create trigger perfume_details_validate before insert or update on public.perfume_details
  for each row execute function public.validate_typed_detail_owner();
create trigger job_details_validate before insert or update on public.job_details
  for each row execute function public.validate_typed_detail_owner();
create trigger service_details_validate before insert or update on public.service_details
  for each row execute function public.validate_typed_detail_owner();

create or replace function public.enforce_listing_category_type()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  expected_type public.listing_type;
begin
  if tg_op = 'UPDATE' and new.listing_type is distinct from old.listing_type then
    raise exception using errcode = '23514', message = 'listing type cannot be changed after creation';
  end if;

  select category.listing_type into expected_type
  from public.categories category
  where category.slug = new.category_slug and category.is_active;

  if expected_type is null or new.listing_type <> expected_type then
    raise exception using errcode = '23514', message = 'listing type must match its category';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_listing_category_type() from public;

create trigger listings_require_category_type
  before insert or update of category_slug, listing_type on public.listings
  for each row execute function public.enforce_listing_category_type();

create or replace function public.validate_typed_listing_activation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  perfume_required boolean;
begin
  if new.status <> 'active' then return new; end if;

  select category.requires_perfume_details into perfume_required
  from public.categories category where category.slug = new.category_slug;

  if new.listing_type = 'food' and not exists (
    select 1 from public.food_details details where details.listing_id = new.id
  ) then
    raise exception using errcode = '23514', message = 'food details are required before publication';
  elsif new.listing_type = 'product' and perfume_required and not exists (
    select 1 from public.perfume_details details where details.listing_id = new.id
  ) then
    raise exception using errcode = '23514', message = 'perfume details are required before publication';
  elsif new.listing_type = 'job' and not exists (
    select 1 from public.job_details details where details.listing_id = new.id
  ) then
    raise exception using errcode = '23514', message = 'job details are required before publication';
  elsif new.listing_type = 'service' and not exists (
    select 1 from public.service_details details where details.listing_id = new.id
  ) then
    raise exception using errcode = '23514', message = 'service details are required before publication';
  end if;

  if new.listing_type = 'service' and exists (
    select 1 from public.service_details details
    where details.listing_id = new.id
      and ((details.pricing_mode = 'quote' and new.price_cents is not null)
        or (details.pricing_mode <> 'quote' and new.price_cents is null))
  ) then
    raise exception using errcode = '23514', message = 'service price must match its pricing mode';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_typed_listing_activation() from public;

create trigger listings_validate_typed_activation
  before insert or update of status, category_slug, listing_type, price_cents on public.listings
  for each row execute function public.validate_typed_listing_activation();

-- Canonical public visibility is now enforced at RLS as well as in client
-- queries. Owners retain access to their private or historical rows.
create or replace function public.listing_is_canonical(
  p_listing_type public.listing_type,
  p_condition public.listing_condition
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_listing_type in ('product', 'food') and p_condition = 'new')
      or (p_listing_type in ('job', 'service') and p_condition is null);
$$;

revoke all on function public.listing_is_canonical(public.listing_type, public.listing_condition) from public;
grant execute on function public.listing_is_canonical(public.listing_type, public.listing_condition)
  to anon, authenticated;

create or replace function public.listing_is_visible(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.listings listing
    where listing.id = p_listing_id
      and (
        (listing.status = 'active' and public.listing_is_canonical(listing.listing_type, listing.condition))
        or listing.seller_id = (select auth.uid())
      )
  );
$$;

drop policy if exists listings_read_active on public.listings;
create policy listings_read_active on public.listings
  for select to anon, authenticated
  using (
    (status = 'active' and public.listing_is_canonical(listing_type, condition))
    or seller_id = (select auth.uid())
  );

alter table public.food_details enable row level security;
alter table public.perfume_details enable row level security;
alter table public.job_details enable row level security;
alter table public.service_details enable row level security;

drop policy if exists food_details_read_visible on public.food_details;
create policy food_details_read_visible on public.food_details
  for select to anon, authenticated using (public.listing_is_visible(listing_id));
drop policy if exists food_details_write_own on public.food_details;
create policy food_details_write_own on public.food_details
  for insert to authenticated with check (public.owns_listing(listing_id));
drop policy if exists food_details_update_own on public.food_details;
create policy food_details_update_own on public.food_details
  for update to authenticated using (public.owns_listing(listing_id))
  with check (public.owns_listing(listing_id));

drop policy if exists perfume_details_read_visible on public.perfume_details;
create policy perfume_details_read_visible on public.perfume_details
  for select to anon, authenticated using (public.listing_is_visible(listing_id));
drop policy if exists perfume_details_write_own on public.perfume_details;
create policy perfume_details_write_own on public.perfume_details
  for insert to authenticated with check (public.owns_listing(listing_id));
drop policy if exists perfume_details_update_own on public.perfume_details;
create policy perfume_details_update_own on public.perfume_details
  for update to authenticated using (public.owns_listing(listing_id))
  with check (public.owns_listing(listing_id));

drop policy if exists job_details_read_visible on public.job_details;
create policy job_details_read_visible on public.job_details
  for select to anon, authenticated using (public.listing_is_visible(listing_id));
drop policy if exists job_details_write_own on public.job_details;
create policy job_details_write_own on public.job_details
  for insert to authenticated with check (public.owns_listing(listing_id));
drop policy if exists job_details_update_own on public.job_details;
create policy job_details_update_own on public.job_details
  for update to authenticated using (public.owns_listing(listing_id))
  with check (public.owns_listing(listing_id));

drop policy if exists service_details_read_visible on public.service_details;
create policy service_details_read_visible on public.service_details
  for select to anon, authenticated using (public.listing_is_visible(listing_id));
drop policy if exists service_details_write_own on public.service_details;
create policy service_details_write_own on public.service_details
  for insert to authenticated with check (public.owns_listing(listing_id));
drop policy if exists service_details_update_own on public.service_details;
create policy service_details_update_own on public.service_details
  for update to authenticated using (public.owns_listing(listing_id))
  with check (public.owns_listing(listing_id));

revoke all on public.food_details, public.perfume_details, public.job_details, public.service_details
  from anon, authenticated;
grant select on public.food_details, public.perfume_details, public.job_details, public.service_details
  to anon, authenticated;
grant insert, update on public.food_details, public.perfume_details, public.job_details, public.service_details
  to authenticated;

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'submitted' check (status = 'submitted'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, applicant_id)
);

create table if not exists public.service_quote_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  message text check (message is null or length(trim(message)) between 1 and 2000),
  status text not null default 'requested' check (status = 'requested'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, requester_id)
);

create table if not exists public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  requested_for timestamptz,
  note text check (note is null or length(trim(note)) between 1 and 2000),
  status text not null default 'requested' check (status = 'requested'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, customer_id)
);

create index if not exists job_applications_owner
  on public.job_applications (applicant_id, created_at desc);
create index if not exists job_applications_listing
  on public.job_applications (listing_id, created_at desc);
create index if not exists service_quote_requests_owner
  on public.service_quote_requests (requester_id, created_at desc);
create index if not exists service_quote_requests_listing
  on public.service_quote_requests (listing_id, created_at desc);
create index if not exists service_bookings_owner
  on public.service_bookings (customer_id, created_at desc);
create index if not exists service_bookings_listing
  on public.service_bookings (listing_id, created_at desc);

create trigger job_applications_touch before update on public.job_applications
  for each row execute function public.touch_updated_at();
create trigger service_quote_requests_touch before update on public.service_quote_requests
  for each row execute function public.touch_updated_at();
create trigger service_bookings_touch before update on public.service_bookings
  for each row execute function public.touch_updated_at();

create or replace function public.can_create_typed_action(
  p_listing_id uuid,
  p_expected_type public.listing_type
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.listings listing
    where listing.id = p_listing_id
      and listing.listing_type = p_expected_type
      and listing.status = 'active'
      and listing.condition is null
      and listing.seller_id <> (select auth.uid())
      and (
        p_expected_type <> 'job'
        or exists (
          select 1 from public.job_details details
          where details.listing_id = listing.id
            and details.application_deadline >= current_date
        )
      )
  );
$$;

revoke all on function public.can_create_typed_action(uuid, public.listing_type) from public;
grant execute on function public.can_create_typed_action(uuid, public.listing_type) to authenticated;

alter table public.job_applications enable row level security;
alter table public.service_quote_requests enable row level security;
alter table public.service_bookings enable row level security;

drop policy if exists job_applications_read_party on public.job_applications;
create policy job_applications_read_party on public.job_applications
  for select to authenticated
  using (applicant_id = (select auth.uid()) or public.owns_listing(listing_id));
drop policy if exists job_applications_insert_own on public.job_applications;
create policy job_applications_insert_own on public.job_applications
  for insert to authenticated
  with check (
    applicant_id = (select auth.uid())
    and public.can_create_typed_action(listing_id, 'job')
  );

drop policy if exists service_quote_requests_read_party on public.service_quote_requests;
create policy service_quote_requests_read_party on public.service_quote_requests
  for select to authenticated
  using (requester_id = (select auth.uid()) or public.owns_listing(listing_id));
drop policy if exists service_quote_requests_insert_own on public.service_quote_requests;
create policy service_quote_requests_insert_own on public.service_quote_requests
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and public.can_create_typed_action(listing_id, 'service')
  );

drop policy if exists service_bookings_read_party on public.service_bookings;
create policy service_bookings_read_party on public.service_bookings
  for select to authenticated
  using (customer_id = (select auth.uid()) or public.owns_listing(listing_id));
drop policy if exists service_bookings_insert_own on public.service_bookings;
create policy service_bookings_insert_own on public.service_bookings
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and public.can_create_typed_action(listing_id, 'service')
  );

revoke all on public.job_applications, public.service_quote_requests, public.service_bookings
  from anon, authenticated;
grant select, insert on public.job_applications, public.service_quote_requests, public.service_bookings
  to authenticated;

-- Messaging is not commerce: active canonical job and service posts may open
-- conversations, but offers and checkout remain guarded by NEW condition.
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
    from public.listings listing
    where listing.id = p_listing_id
      and listing.seller_id = p_seller_id
      and listing.status = 'active'
      and public.listing_is_canonical(listing.listing_type, listing.condition)
  );
$$;

revoke all on function public.conversation_listing_is_openable(uuid, uuid) from public;
grant execute on function public.conversation_listing_is_openable(uuid, uuid) to authenticated;

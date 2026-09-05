-- Seller location, and the nearby read the map discovery screen needs.
--
-- Owner-approved amendment (2026-09-04) to the frozen schema under Principle
-- IV. Recorded in .specify/memory/constitution.md in the same change.
--
-- NO location_label COLUMN. public.listings and public.profiles already carry
-- `city` and `country_code`, and listings.city is part of the search tsvector.
-- A third column holding "Khartoum, Sudan" would be a second source for a fact
-- the schema already states, and the two would drift apart the first time one
-- was edited. The label the UI shows is composed from the existing columns;
-- reverse geocoding writes into those, not beside them.

alter table public.listings
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists show_location boolean not null default true;

-- A half-set coordinate is meaningless, and an out-of-range one is a bug
-- rather than data. Both are rejected at the column rather than in the client.
alter table public.listings drop constraint if exists listings_coordinates_valid;
alter table public.listings add constraint listings_coordinates_valid check (
  num_nonnulls(latitude, longitude) <> 1
  and (latitude is null or latitude between -90 and 90)
  and (longitude is null or longitude between -180 and 180)
);

alter table public.profiles drop constraint if exists profiles_coordinates_valid;
alter table public.profiles add constraint profiles_coordinates_valid check (
  num_nonnulls(latitude, longitude) <> 1
  and (latitude is null or latitude between -90 and 90)
  and (longitude is null or longitude between -180 and 180)
);

create index if not exists listings_location_idx
  on public.listings (latitude, longitude)
  where latitude is not null and longitude is not null;

-- Great-circle distance in kilometres.
--
-- The cosine is clamped before acos: for two identical coordinates the
-- expression evaluates to a hair above 1.0 in floating point, and acos then
-- raises "input is out of range" — a listing at the caller's own position
-- would fail the whole query.
create or replace function public.distance_km(
  lat_a double precision,
  lng_a double precision,
  lat_b double precision,
  lng_b double precision
)
returns double precision
language sql
immutable
parallel safe
set search_path = ''
as $$
  select 6371 * acos(least(1, greatest(-1,
    cos(radians(lat_a)) * cos(radians(lat_b)) * cos(radians(lng_b) - radians(lng_a))
    + sin(radians(lat_a)) * sin(radians(lat_b))
  )));
$$;

-- Listings within `radius_km`, nearest first.
--
-- SECURITY INVOKER — deliberately not `security definer`. The definer form
-- would run as the owner and bypass `listings_read_active`, so a caller would
-- receive draft, removed and non-canonical rows, and every column of them.
-- Running as the invoker keeps RLS in force; the predicates below then narrow
-- the result to the canonical public set (Principle I) rather than trusting
-- `status = 'active'` alone.
--
-- Coordinates are rounded to two decimal places (~1.1 km) on the way out. The
-- map needs a position to draw a pin at; a buyer does not need a seller's
-- doorstep, and the exact value never leaves the database.
create or replace function public.listings_nearby(
  lat double precision,
  lng double precision,
  radius_km double precision default 50,
  max_rows integer default 200
)
returns table (
  id uuid,
  title text,
  price_cents integer,
  currency text,
  listing_type public.listing_type,
  category_slug text,
  city text,
  country_code text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  seller_id uuid,
  cover_path text
)
language sql
stable
parallel safe
set search_path = ''
as $$
  select
    l.id,
    l.title,
    l.price_cents,
    l.currency::text,
    l.listing_type,
    l.category_slug,
    l.city,
    l.country_code::text,
    round(l.latitude::numeric, 2)::double precision,
    round(l.longitude::numeric, 2)::double precision,
    round(public.distance_km(lat, lng, l.latitude, l.longitude)::numeric, 1)::double precision,
    l.seller_id,
    (
      select i.storage_path
      from public.listing_images i
      where i.listing_id = l.id
      order by i.position
      limit 1
    )
  from public.listings l
  join public.profiles p on p.id = l.seller_id
  where l.status = 'active'
    and public.listing_is_canonical(l.listing_type, l.condition)
    and p.show_location
    and l.latitude is not null
    and l.longitude is not null
    and public.distance_km(lat, lng, l.latitude, l.longitude) <= radius_km
  order by public.distance_km(lat, lng, l.latitude, l.longitude)
  limit least(greatest(coalesce(max_rows, 200), 1), 500);
$$;

revoke all on function public.distance_km(
  double precision, double precision, double precision, double precision
) from public;
grant execute on function public.distance_km(
  double precision, double precision, double precision, double precision
) to anon, authenticated;

revoke all on function public.listings_nearby(
  double precision, double precision, double precision, integer
) from public;
grant execute on function public.listings_nearby(
  double precision, double precision, double precision, integer
) to anon, authenticated;

comment on column public.listings.latitude is
  'Where the seller offers this listing from. Paired with longitude; exact value never leaves the database — listings_nearby rounds it.';
comment on column public.profiles.show_location is
  'Seller consent to appear on the map. False hides every one of their listings from listings_nearby.';
comment on function public.listings_nearby(double precision, double precision, double precision, integer) is
  'Canonical active listings within a radius, nearest first, with coarsened coordinates. Security invoker so RLS still applies.';

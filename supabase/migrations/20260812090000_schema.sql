-- SAWA marketplace — core schema
--
-- Conventions:
--   * Money is integer minor units (cents). The client currently carries floats
--     (€4.99, €2.50); those convert on the way in, never round-trip as float.
--   * Every listing is one unique physical item. There is deliberately no
--     order_items table — an order references exactly one listing, and a partial
--     unique index makes double-selling impossible at the database level.
--   * RLS is enabled on every table here. Policies live in the next migration,
--     so between the two the tables are readable by no one but service_role.

-- Supabase keeps extensions in the `extensions` schema, which is on the default
-- search_path. Installing into public trips the extension_in_public advisor.
create extension if not exists pgcrypto with schema extensions;  -- gen_random_uuid()
create extension if not exists pg_trgm  with schema extensions;  -- fuzzy title/brand search

-- ─────────────────────────────── enums ───────────────────────────────

create type listing_condition as enum ('new', 'very_good', 'good');
create type listing_status    as enum ('draft', 'active', 'reserved', 'sold', 'removed');
create type delivery_kind     as enum ('local', 'dom', 'intl');
create type offer_state       as enum ('open', 'countered', 'accepted', 'declined', 'withdrawn', 'expired');
create type order_status      as enum ('pending_payment', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'disputed');
create type payment_status    as enum ('requires_payment_method', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded');
create type shipment_status   as enum ('label_created', 'in_transit', 'out_for_delivery', 'delivered', 'failed');
create type dispute_reason    as enum ('not_received', 'not_as_described', 'damaged', 'other');
create type dispute_state     as enum ('open', 'under_review', 'resolved_buyer', 'resolved_seller', 'closed');

-- ──────────────────────────── shared bits ────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ───────────────────────────── profiles ─────────────────────────────

create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (length(trim(display_name)) between 1 and 60),
  avatar_url    text,
  avatar_color  text,                       -- mirrors theme/tokens avatarColor
  bio           text check (length(bio) <= 500),
  city          text,
  country_code  char(2),                    -- drives which delivery ladder applies
  is_verified   boolean not null default false,
  verified_at   timestamptz,
  -- denormalised counters, maintained by triggers in a later migration
  lifetime_sales integer not null default 0 check (lifetime_sales >= 0),
  rating_avg    numeric(2,1) check (rating_avg between 1 and 5),
  rating_count  integer not null default 0 check (rating_count >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint verified_has_timestamp check (is_verified = false or verified_at is not null)
);

-- Operator class qualified: it lives in `extensions`, and migrations should not
-- depend on search_path happening to include it.
create index profiles_display_name_trgm
  on profiles using gin (display_name extensions.gin_trgm_ops);
create trigger profiles_touch before update on profiles
  for each row execute function public.touch_updated_at();

-- Every auth user gets a profile row. security definer so it can write past RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(coalesce(new.email, 'member'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────── seller_accounts ───────────────────────────
-- Stripe Connect payout state. Never publicly readable.

create table seller_accounts (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null unique references profiles (id) on delete cascade,
  stripe_account_id text unique,
  charges_enabled   boolean not null default false,
  payouts_enabled   boolean not null default false,
  details_submitted boolean not null default false,
  default_currency  char(3) not null default 'EUR',
  country_code      char(2),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger seller_accounts_touch before update on seller_accounts
  for each row execute function public.touch_updated_at();

-- ──────────────────────────── reference data ────────────────────────────

create table categories (
  slug        text primary key,
  label       text not null,
  sort_order  smallint not null default 0,
  in_explore  boolean not null default true,   -- EXCATS is a superset of CATS
  in_home     boolean not null default true
);

-- The ladders currently hardcoded in deliveryFor(). '**' is the fallback row,
-- matching the client's `intl` branch for everything that is neither FR nor SD.
-- A sentinel rather than NULL so the uniqueness constraint is a plain column
-- pair: a partial/expression index here makes ON CONFLICT inference fragile.
-- Lookup is `where country_code in ($1, '**') order by country_code desc`.
create table delivery_options (
  id                     uuid primary key default gen_random_uuid(),
  country_code           char(2) not null default '**',
  key                    text not null,          -- 'point' | 'home' | 'moto'
  kind                   delivery_kind not null,
  name                   text not null,
  subtitle               text,
  price_cents            integer not null check (price_cents >= 0),
  eta_label              text not null,
  -- cash at handover: the buyer-protection fee is waived on these
  waives_protection_fee  boolean not null default false,
  sort_order             smallint not null default 0,
  is_active              boolean not null default true
);

create unique index delivery_options_country_key
  on delivery_options (country_code, key);

-- Single-row knobs. protection_fee_cents is PROTECTION_FEE (€2.50) from the client.
create table platform_settings (
  id                    boolean primary key default true check (id),
  protection_fee_cents  integer not null default 250 check (protection_fee_cents >= 0),
  base_currency         char(3) not null default 'EUR',
  updated_at            timestamptz not null default now()
);
insert into platform_settings (id) values (true);

-- ───────────────────────────── listings ─────────────────────────────

create table listings (
  id                    uuid primary key default gen_random_uuid(),
  seller_id             uuid not null references profiles (id) on delete cascade,
  title                 text not null check (length(trim(title)) between 1 and 120),
  brand                 text,
  description           text check (length(description) <= 4000),
  price_cents           integer not null check (price_cents > 0),
  original_price_cents  integer check (original_price_cents > 0),
  currency              char(3) not null default 'EUR',
  condition             listing_condition not null,
  size                  text,
  color                 text,
  category_slug         text not null references categories (slug),
  city                  text,
  country_code          char(2) not null,
  status                listing_status not null default 'draft',
  tagline               text,                    -- the "Price dropped" spotlight
  published_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- 'simple' rather than a language config: the catalog mixes FR, EN and AR
  search_tsv tsvector generated always as (
    to_tsvector('simple',
      coalesce(title, '') || ' ' || coalesce(brand, '') || ' ' ||
      coalesce(city, '')  || ' ' || coalesce(description, ''))
  ) stored,
  constraint price_drop_is_a_drop
    check (original_price_cents is null or original_price_cents > price_cents),
  constraint active_listings_are_published
    check (status <> 'active' or published_at is not null)
);

create index listings_feed on listings (status, published_at desc) where status = 'active';
create index listings_seller on listings (seller_id);
create index listings_category on listings (category_slug) where status = 'active';
create index listings_country on listings (country_code) where status = 'active';
create index listings_price on listings (price_cents) where status = 'active';
create index listings_search on listings using gin (search_tsv);
create trigger listings_touch before update on listings
  for each row execute function public.touch_updated_at();

create table listing_images (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references listings (id) on delete cascade,
  storage_path text not null,                -- object path inside the listing-images bucket
  position     smallint not null default 0 check (position between 0 and 19),
  width        integer,
  height       integer,
  created_at   timestamptz not null default now(),
  unique (listing_id, position)
);

create index listing_images_listing on listing_images (listing_id);

-- ─────────────────────── favourites and follows ───────────────────────

create table favorites (
  user_id    uuid not null references profiles (id) on delete cascade,
  listing_id uuid not null references listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index favorites_listing on favorites (listing_id);

create table follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  followee_id uuid not null references profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint no_self_follow check (follower_id <> followee_id)
);

create index follows_followee on follows (followee_id);

-- ─────────────────────── conversations and messages ───────────────────────

create table conversations (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references listings (id) on delete cascade,
  buyer_id        uuid not null references profiles (id) on delete cascade,
  seller_id       uuid not null references profiles (id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (listing_id, buyer_id),
  constraint no_self_conversation check (buyer_id <> seller_id)
);

create index conversations_buyer on conversations (buyer_id, last_message_at desc);
create index conversations_seller on conversations (seller_id, last_message_at desc);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id       uuid not null references profiles (id) on delete cascade,
  body            text not null check (length(trim(body)) between 1 and 2000),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index messages_conversation on messages (conversation_id, created_at desc);

-- ────────────────────────────── offers ──────────────────────────────

create table offers (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  listing_id      uuid not null references listings (id) on delete cascade,
  buyer_id        uuid not null references profiles (id) on delete cascade,
  seller_id       uuid not null references profiles (id) on delete cascade,
  amount_cents    integer not null check (amount_cents > 0),
  state           offer_state not null default 'open',
  counter_of      uuid references offers (id) on delete set null,
  expires_at      timestamptz,
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),
  constraint no_self_offer check (buyer_id <> seller_id)
);

create index offers_conversation on offers (conversation_id, created_at desc);
create index offers_listing on offers (listing_id) where state in ('open', 'countered');

-- ────────────────────────────── orders ──────────────────────────────
-- Orders are never written by the client. Checkout and the Stripe webhook
-- move them through their states using the service role; RLS grants read only.

create table orders (
  id                    uuid primary key default gen_random_uuid(),
  listing_id            uuid not null references listings (id) on delete restrict,
  buyer_id              uuid not null references profiles (id) on delete restrict,
  seller_id             uuid not null references profiles (id) on delete restrict,
  offer_id              uuid references offers (id) on delete set null,
  item_price_cents      integer not null check (item_price_cents > 0),
  shipping_cents        integer not null default 0 check (shipping_cents >= 0),
  protection_fee_cents  integer not null default 0 check (protection_fee_cents >= 0),
  total_cents           integer generated always as
                          (item_price_cents + shipping_cents + protection_fee_cents) stored,
  currency              char(3) not null default 'EUR',
  delivery_kind         delivery_kind not null,
  delivery_key          text not null,             -- 'point' | 'home' | 'moto'
  ship_to               jsonb,                     -- null for cash-at-handover pickups
  status                order_status not null default 'pending_payment',
  placed_at             timestamptz not null default now(),
  paid_at               timestamptz,
  completed_at          timestamptz,
  cancelled_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint no_self_purchase check (buyer_id <> seller_id)
);

-- One live sale per listing. This is the constraint an order_items table costs you.
create unique index orders_one_live_per_listing
  on orders (listing_id)
  where status not in ('cancelled', 'refunded');

create index orders_buyer on orders (buyer_id, placed_at desc);
create index orders_seller on orders (seller_id, placed_at desc);
create trigger orders_touch before update on orders
  for each row execute function public.touch_updated_at();

-- ───────────────────────────── payments ─────────────────────────────
-- Thin mirror of the Stripe PaymentIntent, not a ledger. Written by the
-- webhook only; no client role has any grant on it.

create table payments (
  id                       uuid primary key default gen_random_uuid(),
  order_id                 uuid not null unique references orders (id) on delete cascade,
  stripe_payment_intent_id text not null unique,
  stripe_charge_id         text,
  amount_cents             integer not null check (amount_cents >= 0),
  amount_refunded_cents    integer not null default 0 check (amount_refunded_cents >= 0),
  currency                 char(3) not null default 'EUR',
  status                   payment_status not null default 'requires_payment_method',
  last_error               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint refund_within_amount check (amount_refunded_cents <= amount_cents)
);

create trigger payments_touch before update on payments
  for each row execute function public.touch_updated_at();

-- Stripe delivers at-least-once. This is the idempotency ledger the webhook
-- checks before doing any work.
create table webhook_events (
  id              text primary key,          -- Stripe event id, evt_...
  type            text not null,
  processed_at    timestamptz not null default now()
);

-- ───────────────────────────── shipments ─────────────────────────────

create table shipments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null unique references orders (id) on delete cascade,
  carrier         text,
  tracking_number text,
  tracking_url    text,
  status          shipment_status not null default 'label_created',
  eta_min_days    smallint check (eta_min_days >= 0),
  eta_max_days    smallint check (eta_max_days >= 0),
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint eta_range_ordered check (eta_min_days is null or eta_max_days is null or eta_min_days <= eta_max_days)
);

create trigger shipments_touch before update on shipments
  for each row execute function public.touch_updated_at();

-- ────────────────────────────── reviews ──────────────────────────────
-- One review per author per order, so a completed sale yields at most one
-- buyer→seller and one seller→buyer review.

create table reviews (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders (id) on delete cascade,
  author_id  uuid not null references profiles (id) on delete cascade,
  subject_id uuid not null references profiles (id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  body       text check (length(body) <= 2000),
  created_at timestamptz not null default now(),
  unique (order_id, author_id),
  constraint no_self_review check (author_id <> subject_id)
);

create index reviews_subject on reviews (subject_id, created_at desc);

-- ────────────────────────────── disputes ──────────────────────────────

create table disputes (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders (id) on delete cascade,
  opened_by   uuid not null references profiles (id) on delete cascade,
  reason      dispute_reason not null,
  body        text check (length(body) <= 4000),
  state       dispute_state not null default 'open',
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index disputes_order on disputes (order_id);
create trigger disputes_touch before update on disputes
  for each row execute function public.touch_updated_at();

-- ──────────────────────────── notifications ────────────────────────────

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  kind       text not null,     -- offer_received | message | order_placed | shipped | ...
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_inbox on notifications (user_id, created_at desc);
create index notifications_unread on notifications (user_id) where read_at is null;

-- ─────────────────────────── enable RLS ───────────────────────────
-- Deny-by-default until the policy migration runs.

alter table profiles          enable row level security;
alter table seller_accounts   enable row level security;
alter table categories        enable row level security;
alter table delivery_options  enable row level security;
alter table platform_settings enable row level security;
alter table listings          enable row level security;
alter table listing_images    enable row level security;
alter table favorites         enable row level security;
alter table follows           enable row level security;
alter table conversations     enable row level security;
alter table messages          enable row level security;
alter table offers            enable row level security;
alter table orders            enable row level security;
alter table payments          enable row level security;
alter table webhook_events    enable row level security;
alter table shipments         enable row level security;
alter table reviews           enable row level security;
alter table disputes          enable row level security;
alter table notifications     enable row level security;

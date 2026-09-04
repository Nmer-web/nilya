-- Complete Nilya bundle discounts with real, server-priced multi-item orders.
-- The existing orders.id remains the payment/webhook anchor. Normalized item
-- rows preserve each listing and price snapshot, while a claim table provides
-- one live checkout owner per listing across single and bundle purchases.

-- The original settings migration is present in migration history on the live
-- project, but the relation is absent there. Reassert the exact schema and API
-- contract here so this migration repairs that drift without changing sellers'
-- identifiers or touching any existing rows where the table does exist.
create table if not exists public.seller_bundle_discounts (
  seller_id             uuid primary key references public.profiles (id) on delete cascade,
  is_enabled            boolean not null default false,
  min_items_1           smallint,
  discount_percent_1    smallint,
  min_items_2           smallint,
  discount_percent_2    smallint,
  min_items_3           smallint,
  discount_percent_3    smallint,
  updated_at            timestamptz not null default now(),
  constraint seller_bundle_tier_1_complete check (
    (min_items_1 is null) = (discount_percent_1 is null)
  ),
  constraint seller_bundle_tier_2_complete check (
    (min_items_2 is null) = (discount_percent_2 is null)
  ),
  constraint seller_bundle_tier_3_complete check (
    (min_items_3 is null) = (discount_percent_3 is null)
  ),
  constraint seller_bundle_min_items_valid check (
    (min_items_1 is null or min_items_1 >= 2)
    and (min_items_2 is null or min_items_2 >= 2)
    and (min_items_3 is null or min_items_3 >= 2)
  ),
  constraint seller_bundle_discounts_valid check (
    (discount_percent_1 is null or discount_percent_1 between 1 and 50)
    and (discount_percent_2 is null or discount_percent_2 between 1 and 50)
    and (discount_percent_3 is null or discount_percent_3 between 1 and 50)
  ),
  constraint seller_bundle_tiers_contiguous_and_ordered check (
    (min_items_2 is null or (min_items_1 is not null and min_items_2 > min_items_1))
    and (min_items_3 is null or (min_items_2 is not null and min_items_3 > min_items_2))
  ),
  constraint seller_bundle_enabled_has_rule check (
    not is_enabled or min_items_1 is not null
  )
);

drop trigger if exists seller_bundle_discounts_touch
  on public.seller_bundle_discounts;
create trigger seller_bundle_discounts_touch
  before update on public.seller_bundle_discounts
  for each row execute function public.touch_updated_at();

alter table public.seller_bundle_discounts enable row level security;

drop policy if exists seller_bundle_discounts_read_public_or_own
  on public.seller_bundle_discounts;
create policy seller_bundle_discounts_read_public_or_own
  on public.seller_bundle_discounts for select to anon, authenticated
  using (is_enabled or seller_id = (select auth.uid()));

drop policy if exists seller_bundle_discounts_insert_own
  on public.seller_bundle_discounts;
create policy seller_bundle_discounts_insert_own
  on public.seller_bundle_discounts for insert to authenticated
  with check (seller_id = (select auth.uid()));

drop policy if exists seller_bundle_discounts_update_own
  on public.seller_bundle_discounts;
create policy seller_bundle_discounts_update_own
  on public.seller_bundle_discounts for update to authenticated
  using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));

revoke all on public.seller_bundle_discounts from anon, authenticated;
grant select on public.seller_bundle_discounts to anon, authenticated;
grant insert (
  seller_id, is_enabled, min_items_1, discount_percent_1,
  min_items_2, discount_percent_2, min_items_3, discount_percent_3
) on public.seller_bundle_discounts to authenticated;
grant update (
  is_enabled, min_items_1, discount_percent_1,
  min_items_2, discount_percent_2, min_items_3, discount_percent_3
) on public.seller_bundle_discounts to authenticated;

alter table public.orders
  add column if not exists item_count smallint not null default 1,
  add column if not exists list_subtotal_cents integer,
  add column if not exists bundle_discount_percent smallint,
  add column if not exists bundle_discount_cents integer not null default 0;

update public.orders
set list_subtotal_cents = item_price_cents
where list_subtotal_cents is null;

alter table public.orders
  alter column list_subtotal_cents set not null;

alter table public.orders
  drop constraint if exists orders_bundle_snapshot_valid;
alter table public.orders
  add constraint orders_bundle_snapshot_valid check (
    item_count between 1 and 20
    and list_subtotal_cents >= item_price_cents
    and bundle_discount_cents = list_subtotal_cents - item_price_cents
    and (
      (item_count = 1 and bundle_discount_percent is null and bundle_discount_cents = 0)
      or
      (item_count >= 2 and bundle_discount_percent between 1 and 50
       and bundle_discount_cents > 0)
    )
  );

create table if not exists public.order_items (
  order_id uuid not null references public.orders (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete restrict,
  position smallint not null check (position between 0 and 19),
  list_price_cents integer not null check (list_price_cents > 0),
  item_price_cents integer not null check (
    item_price_cents > 0 and item_price_cents <= list_price_cents
  ),
  created_at timestamptz not null default now(),
  primary key (order_id, listing_id),
  unique (order_id, position)
);

create index if not exists order_items_listing
  on public.order_items (listing_id, order_id);

-- Current claims are deliberately separate from historical order_items. A
-- cancelled/refunded order releases its claim without deleting its receipt.
create table if not exists public.listing_checkout_claims (
  listing_id uuid primary key references public.listings (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists listing_checkout_claims_order
  on public.listing_checkout_claims (order_id);

insert into public.order_items
  (order_id, listing_id, position, list_price_cents, item_price_cents)
select order_row.id, order_row.listing_id, 0,
       greatest(order_row.item_price_cents, 1),
       greatest(order_row.item_price_cents, 1)
from public.orders order_row
on conflict (order_id, listing_id) do nothing;

insert into public.listing_checkout_claims (listing_id, order_id)
select order_row.listing_id, order_row.id
from public.orders order_row
where order_row.status not in ('cancelled', 'refunded')
on conflict (listing_id) do nothing;

create or replace function public.prepare_order_bundle_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.item_count = 1 then
    new.list_subtotal_cents := new.item_price_cents;
    new.bundle_discount_percent := null;
    new.bundle_discount_cents := 0;
  elsif new.list_subtotal_cents is null then
    raise exception 'bundle list subtotal is required' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.prepare_order_bundle_snapshot() from public;

drop trigger if exists orders_prepare_bundle_snapshot on public.orders;
create trigger orders_prepare_bundle_snapshot
  before insert or update of item_price_cents, item_count, list_subtotal_cents,
    bundle_discount_percent, bundle_discount_cents
  on public.orders
  for each row execute function public.prepare_order_bundle_snapshot();

create or replace function public.maintain_order_checkout_claims()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_list_price integer;
begin
  if tg_op = 'INSERT' then
    select listing.price_cents into v_list_price
    from public.listings listing
    where listing.id = new.listing_id;

    if new.item_count = 1 then
      insert into public.order_items
        (order_id, listing_id, position, list_price_cents, item_price_cents)
      values
        (new.id, new.listing_id, 0,
         greatest(coalesce(v_list_price, new.item_price_cents), new.item_price_cents),
         new.item_price_cents)
      on conflict (order_id, listing_id) do nothing;
    end if;

    if new.status not in ('cancelled', 'refunded') then
      insert into public.listing_checkout_claims (listing_id, order_id)
      values (new.listing_id, new.id);
    end if;
  elsif new.status in ('cancelled', 'refunded')
    and old.status not in ('cancelled', 'refunded') then
    delete from public.listing_checkout_claims claim
    where claim.order_id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.maintain_order_checkout_claims() from public;

drop trigger if exists orders_maintain_checkout_claims on public.orders;
create trigger orders_maintain_checkout_claims
  after insert or update of status on public.orders
  for each row execute function public.maintain_order_checkout_claims();

alter table public.order_items enable row level security;
alter table public.listing_checkout_claims enable row level security;

drop policy if exists order_items_read_party on public.order_items;
create policy order_items_read_party on public.order_items
  for select to authenticated
  using (public.is_order_party(order_id));

drop policy if exists "admins read all order items" on public.order_items;
create policy "admins read all order items" on public.order_items
  for select to authenticated
  using (public.is_admin((select auth.uid())));

revoke all on public.order_items, public.listing_checkout_claims
  from anon, authenticated;
grant select on public.order_items to authenticated;

create or replace function public.is_listing_order_party(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.order_items item
    join public.orders order_row on order_row.id = item.order_id
    where item.listing_id = p_listing_id
      and (select auth.uid()) in (order_row.buyer_id, order_row.seller_id)
  );
$$;

revoke all on function public.is_listing_order_party(uuid) from public, anon;
grant execute on function public.is_listing_order_party(uuid) to authenticated;

drop policy if exists listings_read_order_party on public.listings;
create policy listings_read_order_party on public.listings
  for select to authenticated
  using (public.is_listing_order_party(id));

drop policy if exists listing_images_read_order_party on public.listing_images;
create policy listing_images_read_order_party on public.listing_images
  for select to authenticated
  using (public.is_listing_order_party(listing_id));

-- Trusted checkout primitive. The Edge Function supplies identity and the
-- requested listing ids, but PostgreSQL locks and validates every listing,
-- resolves the seller tier, snapshots prices, and creates the order atomically.
create or replace function public.create_bundle_order(
  p_buyer_id uuid,
  p_listing_ids uuid[],
  p_delivery_key text
)
returns table (
  order_id uuid,
  seller_id uuid,
  item_count smallint,
  list_subtotal_cents integer,
  item_price_cents integer,
  bundle_discount_percent smallint,
  bundle_discount_cents integer,
  shipping_cents integer,
  protection_fee_cents integer,
  total_cents integer,
  currency text,
  delivery_kind public.delivery_kind,
  delivery_name text,
  items jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count                  integer;
  v_distinct_count         integer;
  v_found_count            integer;
  v_seller_count           integer;
  v_currency_count         integer;
  v_country_count          integer;
  v_seller_id              uuid;
  v_primary_listing_id     uuid;
  v_country_code           text;
  v_currency               text;
  v_discount_percent       smallint;
  v_list_subtotal          integer;
  v_discounted_subtotal    integer;
  v_discount_cents         integer;
  v_shipping_cents         integer;
  v_protection_fee_cents   integer;
  v_delivery_kind          public.delivery_kind;
  v_delivery_name          text;
  v_waives_protection      boolean;
  v_base_currency          text;
  v_order_id               uuid;
  v_claim_count            integer;
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_count := cardinality(p_listing_ids);
  if v_count is null or v_count < 2 or v_count > 20 then
    raise exception 'a bundle must contain between 2 and 20 listings'
      using errcode = '22023';
  end if;

  select count(distinct requested.id)
    into v_distinct_count
  from unnest(p_listing_ids) requested(id);
  if v_distinct_count <> v_count then
    raise exception 'bundle listing references must be unique'
      using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_delivery_key, '')), '') is null then
    raise exception 'a delivery option is required' using errcode = '22023';
  end if;

  v_primary_listing_id := p_listing_ids[1];

  -- An identical pending order is the idempotent retry path after a timeout or
  -- double tap. Its persisted price snapshot wins over later tier edits.
  select order_row.id into v_order_id
  from public.orders order_row
  where order_row.buyer_id = p_buyer_id
    and order_row.status = 'pending_payment'
    and order_row.offer_id is null
    and order_row.item_count = v_count
    and order_row.delivery_key = btrim(p_delivery_key)
    and (select count(*) from public.order_items item
         where item.order_id = order_row.id
           and item.listing_id = any(p_listing_ids)) = v_count
    and not exists (
      select 1 from public.order_items item
      where item.order_id = order_row.id
        and not (item.listing_id = any(p_listing_ids))
    )
  order by order_row.created_at desc
  limit 1;

  if v_order_id is not null then
    return query
    select order_row.id, order_row.seller_id, order_row.item_count,
           order_row.list_subtotal_cents, order_row.item_price_cents,
           order_row.bundle_discount_percent, order_row.bundle_discount_cents,
           order_row.shipping_cents, order_row.protection_fee_cents,
           order_row.total_cents, btrim(order_row.currency)::text,
           order_row.delivery_kind, delivery.name,
           (select jsonb_agg(jsonb_build_object(
              'listing_id', item.listing_id,
              'title', listing.title,
              'list_price_cents', item.list_price_cents,
              'item_price_cents', item.item_price_cents,
              'position', item.position
            ) order by item.position)
            from public.order_items item
            join public.listings listing on listing.id = item.listing_id
            where item.order_id = order_row.id)
    from public.orders order_row
    left join public.delivery_options delivery
      on delivery.key = order_row.delivery_key
     and delivery.kind = order_row.delivery_kind
    where order_row.id = v_order_id
    limit 1;
    return;
  end if;

  perform 1
  from public.listings listing
  where listing.id = any(p_listing_ids)
  order by listing.id
  for update;

  select count(*), count(distinct listing.seller_id),
         count(distinct btrim(listing.currency)),
         count(distinct listing.country_code)
    into v_found_count, v_seller_count, v_currency_count, v_country_count
  from public.listings listing
  where listing.id = any(p_listing_ids);

  if v_found_count <> v_count then
    raise exception 'one or more bundle listings no longer exist'
      using errcode = 'P0002';
  end if;
  if v_seller_count <> 1 then
    raise exception 'bundle listings must belong to one seller'
      using errcode = '23514';
  end if;
  if v_currency_count <> 1 or v_country_count <> 1 then
    raise exception 'bundle listings must use one currency and country'
      using errcode = '23514';
  end if;
  if exists (
    select 1 from public.listings listing
    where listing.id = any(p_listing_ids)
      and (
        listing.status <> 'active'
        or listing.listing_type not in ('product', 'food')
        or listing.condition is distinct from 'new'
        or listing.price_cents is null
        or listing.price_cents <= 0
      )
  ) then
    raise exception 'every bundle item must be an active new Nilya product or food listing'
      using errcode = '23514';
  end if;

  select listing.seller_id, btrim(listing.currency), listing.country_code
    into v_seller_id, v_currency, v_country_code
  from public.listings listing
  where listing.id = v_primary_listing_id;

  if v_seller_id = p_buyer_id then
    raise exception 'you cannot buy your own listings' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.profiles profile
    where profile.id = v_seller_id and profile.holiday_mode
  ) then
    raise exception 'seller is currently away' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.seller_accounts account
    where account.profile_id = v_seller_id
      and account.stripe_account_id is not null
      and account.charges_enabled
      and account.payouts_enabled
      and account.details_submitted
  ) then
    raise exception 'these products are not available for checkout right now'
      using errcode = '23514';
  end if;

  select case
      when settings.min_items_3 is not null and settings.min_items_3 <= v_count
        then settings.discount_percent_3
      when settings.min_items_2 is not null and settings.min_items_2 <= v_count
        then settings.discount_percent_2
      when settings.min_items_1 is not null and settings.min_items_1 <= v_count
        then settings.discount_percent_1
      else null
    end
    into v_discount_percent
  from public.seller_bundle_discounts settings
  where settings.seller_id = v_seller_id
    and settings.is_enabled;

  if v_discount_percent is null then
    raise exception 'this bundle does not qualify for a seller discount'
      using errcode = '23514';
  end if;

  select option.kind, option.name, option.price_cents,
         option.waives_protection_fee
    into v_delivery_kind, v_delivery_name, v_shipping_cents,
         v_waives_protection
  from public.delivery_options option
  where option.key = btrim(p_delivery_key)
    and option.is_active
    and option.country_code in (v_country_code, '**')
  order by (option.country_code = v_country_code) desc
  limit 1;

  if v_delivery_kind is null then
    raise exception 'that delivery option is not available for this bundle'
      using errcode = '23514';
  end if;

  select btrim(settings.base_currency),
         case when v_waives_protection then 0 else settings.protection_fee_cents end
    into v_base_currency, v_protection_fee_cents
  from public.platform_settings settings
  where settings.id = true;

  if v_base_currency is null or upper(v_currency) <> upper(v_base_currency) then
    raise exception 'that listing currency is not supported for checkout'
      using errcode = '23514';
  end if;

  select sum(listing.price_cents)::integer,
         sum(greatest(
           1,
           floor(listing.price_cents::numeric * (100 - v_discount_percent) / 100)::integer
         ))::integer
    into v_list_subtotal, v_discounted_subtotal
  from public.listings listing
  where listing.id = any(p_listing_ids);

  v_discount_cents := v_list_subtotal - v_discounted_subtotal;
  if v_discount_cents <= 0 then
    raise exception 'these item prices are too low to apply the bundle discount'
      using errcode = '23514';
  end if;

  insert into public.orders (
    listing_id, buyer_id, seller_id, offer_id, item_price_cents,
    shipping_cents, protection_fee_cents, currency, delivery_kind,
    delivery_key, status, item_count, list_subtotal_cents,
    bundle_discount_percent, bundle_discount_cents
  ) values (
    v_primary_listing_id, p_buyer_id, v_seller_id, null,
    v_discounted_subtotal, v_shipping_cents, v_protection_fee_cents,
    upper(v_currency), v_delivery_kind, btrim(p_delivery_key),
    'pending_payment', v_count, v_list_subtotal,
    v_discount_percent, v_discount_cents
  )
  returning id into v_order_id;

  insert into public.order_items
    (order_id, listing_id, position, list_price_cents, item_price_cents)
  select v_order_id, listing.id, (requested.position - 1)::smallint,
         listing.price_cents,
         greatest(
           1,
           floor(listing.price_cents::numeric * (100 - v_discount_percent) / 100)::integer
         )
  from unnest(p_listing_ids) with ordinality requested(id, position)
  join public.listings listing on listing.id = requested.id;

  insert into public.listing_checkout_claims (listing_id, order_id)
  select requested.id, v_order_id
  from unnest(p_listing_ids) requested(id)
  on conflict (listing_id) do nothing;

  select count(*) into v_claim_count
  from public.listing_checkout_claims claim
  where claim.order_id = v_order_id
    and claim.listing_id = any(p_listing_ids);

  if v_claim_count <> v_count then
    raise exception 'someone else is already buying one of these items'
      using errcode = '23505';
  end if;

  return query
  select order_row.id, order_row.seller_id, order_row.item_count,
         order_row.list_subtotal_cents, order_row.item_price_cents,
         order_row.bundle_discount_percent, order_row.bundle_discount_cents,
         order_row.shipping_cents, order_row.protection_fee_cents,
         order_row.total_cents, btrim(order_row.currency)::text,
         order_row.delivery_kind, v_delivery_name,
         (select jsonb_agg(jsonb_build_object(
            'listing_id', item.listing_id,
            'title', listing.title,
            'list_price_cents', item.list_price_cents,
            'item_price_cents', item.item_price_cents,
            'position', item.position
          ) order by item.position)
          from public.order_items item
          join public.listings listing on listing.id = item.listing_id
          where item.order_id = order_row.id)
  from public.orders order_row
  where order_row.id = v_order_id;
exception
  when unique_violation then
    raise exception 'someone else is already buying one of these items'
      using errcode = '23505';
end;
$$;

revoke all on function public.create_bundle_order(uuid, uuid[], text)
  from public, anon, authenticated;
grant execute on function public.create_bundle_order(uuid, uuid[], text)
  to service_role;

-- Preserve every existing admin_order_feed column in place and append bundle
-- snapshots so the dashboard can distinguish a multi-item order without
-- weakening its read-only, admin-only contract.
create or replace view public.admin_order_feed as
select
  o.id,
  o.listing_id,
  o.buyer_id,
  o.seller_id,
  o.offer_id,
  o.item_price_cents,
  o.shipping_cents,
  o.protection_fee_cents,
  o.total_cents,
  o.currency,
  o.status,
  o.delivery_kind,
  o.delivery_key,
  o.placed_at,
  o.paid_at,
  o.completed_at,
  o.cancelled_at,
  o.created_at,
  o.updated_at,
  li.title            as listing_title,
  li.status           as listing_status,
  b.display_name      as buyer_name,
  b.avatar_url        as buyer_avatar_url,
  b.avatar_color      as buyer_avatar_color,
  s.display_name      as seller_name,
  s.avatar_url        as seller_avatar_url,
  s.avatar_color      as seller_avatar_color,
  o.item_count,
  o.list_subtotal_cents,
  o.bundle_discount_percent,
  o.bundle_discount_cents
from public.orders o
left join public.listings li on li.id = o.listing_id
left join public.profiles b  on b.id  = o.buyer_id
left join public.profiles s  on s.id  = o.seller_id
where public.is_admin((select auth.uid()));

revoke all on public.admin_order_feed from anon;
revoke insert, update, delete on public.admin_order_feed from authenticated;
grant select on public.admin_order_feed to authenticated;

comment on table public.order_items is
  'Immutable listing and price snapshots for single-item and bundle orders.';
comment on table public.listing_checkout_claims is
  'Current one-order-per-listing checkout claims; released on cancellation or refund.';
comment on function public.create_bundle_order(uuid, uuid[], text) is
  'Service-role-only atomic Nilya bundle pricing and order creation.';
comment on table public.seller_bundle_discounts is
  'Public-safe seller bundle rules applied authoritatively by create_bundle_order.';
comment on column public.seller_bundle_discounts.discount_percent_1 is
  'Whole-number percentage from 1 through 50, applied server-side during eligible bundle checkout.';

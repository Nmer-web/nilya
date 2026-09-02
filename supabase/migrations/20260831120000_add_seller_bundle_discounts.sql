-- Seller-configured bundle discounts. This is intentionally separate from
-- seller_accounts: payout state stays private, while enabled bundle rules are
-- public marketplace information.

create table public.seller_bundle_discounts (
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

create trigger seller_bundle_discounts_touch
  before update on public.seller_bundle_discounts
  for each row execute function public.touch_updated_at();

alter table public.seller_bundle_discounts enable row level security;

-- An enabled row contains only the offer configuration a buyer may need.
-- Owners can also read their disabled row so the editor can restore real
-- persisted tiers without exposing any unrelated seller or payout settings.
create policy seller_bundle_discounts_read_public_or_own
  on public.seller_bundle_discounts
  for select to anon, authenticated
  using (is_enabled or seller_id = (select auth.uid()));

create policy seller_bundle_discounts_insert_own
  on public.seller_bundle_discounts
  for insert to authenticated
  with check (seller_id = (select auth.uid()));

create policy seller_bundle_discounts_update_own
  on public.seller_bundle_discounts
  for update to authenticated
  using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));

-- Make the intended API surface explicit. Sellers cannot change ownership or
-- the database-managed timestamp, and clients cannot delete settings rows.
revoke all on public.seller_bundle_discounts from anon, authenticated;
grant select on public.seller_bundle_discounts to anon, authenticated;
grant insert (
  seller_id,
  is_enabled,
  min_items_1,
  discount_percent_1,
  min_items_2,
  discount_percent_2,
  min_items_3,
  discount_percent_3
) on public.seller_bundle_discounts to authenticated;
grant update (
  is_enabled,
  min_items_1,
  discount_percent_1,
  min_items_2,
  discount_percent_2,
  min_items_3,
  discount_percent_3
) on public.seller_bundle_discounts to authenticated;

comment on table public.seller_bundle_discounts is
  'Public-safe seller bundle offer configuration; payment application is deferred.';
comment on column public.seller_bundle_discounts.discount_percent_1 is
  'Whole-number percentage from 1 through 50; informational until backend checkout support is added.';

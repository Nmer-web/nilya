import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  actionsForListingType,
  CANONICAL_LISTING_FILTER,
  conditionForListingType,
  detailKindForCategory,
  isCanonicalListing,
} from '../src/lib/listing-types.ts';
import {
  calculateBundlePricing,
  resolveBundleDiscountPercent,
} from '../src/lib/bundle-discounts.ts';

function loadLocalEnv(): void {
  const contents = fs.readFileSync('.env', 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function publicClient(): SupabaseClient {
  loadLocalEnv();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.ok(url, 'EXPO_PUBLIC_SUPABASE_URL is required for the integration tests');
  assert.ok(key, 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for the integration tests');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

test('typed listing rules keep commerce and non-commerce records separate', () => {
  assert.equal(conditionForListingType('product'), 'new');
  assert.equal(conditionForListingType('food'), 'new');
  assert.equal(conditionForListingType('job'), null);
  assert.equal(conditionForListingType('service'), null);
  assert.equal(isCanonicalListing('job', 'new'), false);
  assert.equal(isCanonicalListing('service', null), true);
  assert.match(CANONICAL_LISTING_FILTER, /product,food/);
  assert.match(CANONICAL_LISTING_FILTER, /job,service/);
});

test('specialised categories map to their required normalized detail row', () => {
  assert.equal(detailKindForCategory({ listing_type: 'food', requires_perfume_details: false }), 'food');
  assert.equal(detailKindForCategory({ listing_type: 'product', requires_perfume_details: true }), 'perfume');
  assert.equal(detailKindForCategory({ listing_type: 'job', requires_perfume_details: false }), 'job');
  assert.equal(detailKindForCategory({ listing_type: 'service', requires_perfume_details: false }), 'service');
});

test('specialised CTA matrices never put commerce controls on jobs or services', () => {
  assert.deepEqual(actionsForListingType('product'), ['buy_now', 'message_seller']);
  assert.deepEqual(actionsForListingType('food'), ['buy_now', 'message_seller']);
  assert.deepEqual(actionsForListingType('job'), ['apply_now', 'contact_employer', 'save_job']);
  assert.deepEqual(actionsForListingType('service'), ['request_quote', 'book_service', 'message_provider']);
  assert.equal(actionsForListingType('job').includes('buy_now'), false);
  assert.equal(actionsForListingType('service').includes('buy_now'), false);
});

test('bundle discounts select the highest qualified persisted tier', () => {
  const settings = {
    seller_id: '00000000-0000-0000-0000-000000000001',
    is_enabled: true,
    min_items_1: 2,
    discount_percent_1: 10,
    min_items_2: 3,
    discount_percent_2: 15,
    min_items_3: 5,
    discount_percent_3: 25,
    updated_at: '2026-09-04T00:00:00.000Z',
  } as const;

  assert.equal(resolveBundleDiscountPercent(settings, 1), null);
  assert.equal(resolveBundleDiscountPercent(settings, 2), 10);
  assert.equal(resolveBundleDiscountPercent(settings, 4), 15);
  assert.equal(resolveBundleDiscountPercent(settings, 5), 25);
});

test('bundle price preview mirrors server floor rounding without trusting a client total', () => {
  const settings = {
    seller_id: '00000000-0000-0000-0000-000000000001',
    is_enabled: true,
    min_items_1: 2,
    discount_percent_1: 10,
    min_items_2: null,
    discount_percent_2: null,
    min_items_3: null,
    discount_percent_3: null,
    updated_at: '2026-09-04T00:00:00.000Z',
  } as const;

  assert.deepEqual(calculateBundlePricing([999, 501], settings), {
    itemCount: 2,
    discountPercent: 10,
    listSubtotalCents: 1500,
    discountedSubtotalCents: 1349,
    discountCents: 151,
    itemPricesCents: [899, 450],
  });
  assert.equal(calculateBundlePricing([999], settings), null);
  assert.equal(
    calculateBundlePricing([999, 501], { ...settings, is_enabled: false }),
    null
  );
  assert.equal(calculateBundlePricing(Array(21).fill(100), settings), null);
});

test('live bundle settings are public-safe while order creation and snapshots stay private', async () => {
  const client = publicClient();
  const impossibleBuyer = '00000000-0000-0000-0000-000000000001';
  const impossibleListings = [
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
  ];

  const settings = await client
    .from('seller_bundle_discounts')
    .select('seller_id,is_enabled')
    .limit(1);
  assert.ifError(settings.error);

  const snapshots = await client.from('order_items').select('order_id').limit(1);
  assert.ok(snapshots.error, 'anonymous order item reads must be denied');

  const order = await client.rpc('create_bundle_order', {
    p_buyer_id: impossibleBuyer,
    p_listing_ids: impossibleListings,
    p_delivery_key: 'home',
  });
  assert.ok(order.error, 'anonymous bundle order creation must be denied');
  assert.equal(order.error.code, '42501');
});

test('the live Supabase taxonomy contains every Nilya root and typed children', async () => {
  const client = publicClient();
  const roots = await client
    .from('categories')
    .select('id,slug,label,listing_type,requires_perfume_details')
    .in('slug', ['food-groceries', 'perfumes-incense', 'jobs', 'services']);
  assert.ifError(roots.error);
  assert.equal(roots.data?.length, 4);

  const bySlug = new Map((roots.data ?? []).map((row) => [row.slug, row]));
  assert.equal(bySlug.get('food-groceries')?.listing_type, 'food');
  assert.equal(bySlug.get('perfumes-incense')?.requires_perfume_details, true);
  assert.equal(bySlug.get('jobs')?.listing_type, 'job');
  assert.equal(bySlug.get('services')?.listing_type, 'service');

  const rootIds = [...bySlug.values()].map((row) => row.id);
  const children = await client
    .from('categories')
    .select('id,parent_id,listing_type')
    .in('parent_id', rootIds);
  assert.ifError(children.error);
  for (const rootId of rootIds) {
    assert.ok(children.data?.some((row) => row.parent_id === rootId), `root ${rootId} needs children`);
  }
});

test('all specialised PostgREST filter paths are accepted by the live backend', async () => {
  const client = publicClient();
  const cases = [
    ['food_details!inner(halal_status)', 'food_details.halal_status', 'halal'],
    ['perfume_details!inner(fragrance_type)', 'perfume_details.fragrance_type', 'parfum'],
    ['job_details!inner(contract_type)', 'job_details.contract_type', 'full_time'],
    ['service_details!inner(pricing_mode)', 'service_details.pricing_mode', 'quote'],
  ] as const;

  for (const [relation, column, value] of cases) {
    const result = await client
      .from('listings')
      .select(`id,${relation}`)
      .eq(column, value)
      .limit(1);
    assert.ifError(result.error);
  }
});

test('anonymous callers cannot write typed actions or invoke owner edits', async () => {
  const client = publicClient();
  const impossibleId = '00000000-0000-0000-0000-000000000000';

  const application = await client.from('job_applications').insert({
    listing_id: impossibleId,
    applicant_id: impossibleId,
  });
  assert.ok(application.error, 'anonymous job application insert must be denied');

  const update = await client.rpc('update_own_typed_listing', {
    p_listing_id: impossibleId,
    p_title: 'Permission probe',
    p_description: null,
    p_brand: null,
    p_color: null,
    p_size: null,
    p_category_slug: 'jobs-technology',
    p_listing_type: 'job',
    p_price_cents: null,
    p_original_price_cents: null,
    p_currency: 'EUR',
    p_city: null,
    p_country_code: 'FR',
    p_details: { kind: 'job', values: {} },
  });
  assert.ok(update.error, 'anonymous owner edit RPC must be denied');
});

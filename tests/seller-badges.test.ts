import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  earnedSellerBadgeCount,
  lockedBadgeProgress,
  sellerBadgeCopy,
} from '../src/lib/badges.ts';
import type { SellerBadgeRow } from '../src/lib/database.types.ts';

function badge(overrides: Partial<SellerBadgeRow> = {}): SellerBadgeRow {
  return {
    badge_key: 'first_listing',
    title: 'First product',
    description: 'Published a first NEW product on SAWA.',
    requirement: 'Publish your first NEW product.',
    icon_key: 'package',
    sort_order: 10,
    earned_at: null,
    progress_current: 0,
    progress_target: 1,
    ...overrides,
  };
}

test('seller badge presentation is derived only from RPC rows', () => {
  const rows = [badge(), badge({ badge_key: 'profile_complete', earned_at: '2026-09-04T12:00:00Z' })];
  assert.equal(earnedSellerBadgeCount(rows), 1);
  assert.equal(sellerBadgeCopy(rows[0].description), 'Published a first NEW product on NILYA.');
});

test('locked seller badge progress is bounded and disappears after award', () => {
  assert.deepEqual(lockedBadgeProgress(badge({ progress_current: 8, progress_target: 5 })), {
    current: 5,
    target: 5,
    ratio: 1,
  });
  assert.equal(lockedBadgeProgress(badge({ earned_at: '2026-09-04T12:00:00Z' })), null);
});

test('seller badge realtime migration publishes only the private award table', () => {
  const sql = fs.readFileSync(
    'supabase/migrations/20260904200000_repair_seller_badges_realtime.sql',
    'utf8'
  );
  assert.match(sql, /alter publication supabase_realtime add table public\.user_badges/i);
  assert.match(sql, /pg_publication_tables/i);
  assert.doesNotMatch(sql, /add table public\.(listings|profiles|reviews|referrals)/i);
});

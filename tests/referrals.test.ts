import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  normalizeReferralCode,
  referralCodeError,
  referralInviteShareContent,
} from '../src/lib/referrals.ts';

test('referral codes normalize and validate without inventing account state', () => {
  assert.equal(normalizeReferralCode(' ab12cd34ef56 '), 'AB12CD34EF56');
  assert.equal(referralCodeError('ab12cd34ef56'), null);
  assert.match(referralCodeError('short') ?? '', /12-character/);
});

test('referral share content uses the Nilya name and normalized persisted code', () => {
  assert.deepEqual(referralInviteShareContent('ab12cd34ef56'), {
    title: 'Invite friends to NILYA',
    message: 'Join me on NILYA. Use my referral code: AB12CD34EF56',
  });
});

test('referral realtime migration publishes only confirmed referrals', () => {
  const sql = fs.readFileSync(
    'supabase/migrations/20260904210000_enable_referrals_realtime.sql',
    'utf8'
  );
  assert.match(sql, /alter publication supabase_realtime add table public\.referrals/i);
  assert.match(sql, /pg_publication_tables/i);
  assert.doesNotMatch(sql, /add table public\.(profiles|listings|reviews)/i);
});

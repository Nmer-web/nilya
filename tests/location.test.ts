import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_CENTER,
  distanceKm,
  formatDistance,
  formatDistanceBadge,
  groupByPosition,
  isCoordinates,
  regionForRadius,
} from '../src/features/location/geo.ts';

const KHARTOUM = DEFAULT_CENTER;
const OMDURMAN = { latitude: 15.6445, longitude: 32.4777 };

test('client distance matches the figure PostgreSQL returned for the same pair', () => {
  /* public.distance_km(15.5007, 32.5599, 15.6445, 32.4777) returned
     18.2536922840606 from the live database on 2026-09-04. The two formulas
     have to agree, or a listing's distance would change depending on which
     screen asked for it. */
  assert.ok(Math.abs(distanceKm(KHARTOUM, OMDURMAN) - 18.2536922840606) < 1e-9);
});

test('identical coordinates measure zero rather than failing the acos domain', () => {
  /* Without clamping, the cosine of a point against itself lands a hair above
     1 in floating point and Math.acos returns NaN — the client mirror of the
     database bug the migration's `least(1, greatest(-1, ...))` prevents. */
  assert.equal(distanceKm(KHARTOUM, { ...KHARTOUM }), 0);
  assert.ok(Number.isFinite(distanceKm(OMDURMAN, { ...OMDURMAN })));
});

test('distance is only ever stated approximately, and never in metres', () => {
  assert.equal(formatDistance(0.4), 'Under 1 km away');
  assert.equal(formatDistance(2.34), '~2 km away');
  assert.equal(formatDistance(17.6), '~18 km away');
  assert.equal(formatDistanceBadge(0.2), '<1 km');
  assert.equal(formatDistanceBadge(2.34), '~2 km');
});

test('an unmeasured distance produces no text at all', () => {
  /* Principle II: a screen shows nothing rather than guessing how far away
     something is. */
  assert.equal(formatDistance(null), null);
  assert.equal(formatDistance(Number.NaN), null);
  assert.equal(formatDistance(-3), null);
  assert.equal(formatDistanceBadge(null), null);
});

test('only real in-range coordinate pairs are accepted', () => {
  assert.equal(isCoordinates(KHARTOUM), true);
  assert.equal(isCoordinates({ latitude: 91, longitude: 0 }), false);
  assert.equal(isCoordinates({ latitude: 0, longitude: 181 }), false);
  assert.equal(isCoordinates({ latitude: 0 }), false);
  assert.equal(isCoordinates({ latitude: Number.NaN, longitude: 0 }), false);
  assert.equal(isCoordinates(null), false);
});

test('listings sharing a coarsened position become one pin with a count', () => {
  const rows = [
    { id: 'a', latitude: 15.5, longitude: 32.56 },
    { id: 'b', latitude: 15.5, longitude: 32.56 },
    { id: 'c', latitude: 15.64, longitude: 32.48 },
  ];
  const groups = groupByPosition(rows);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].items.length, 2);
  assert.equal(groups[1].items.length, 1);
  assert.deepEqual(groups[1].coordinate, { latitude: 15.64, longitude: 32.48 });
});

test('the viewport widens with the radius and stays within the globe', () => {
  const small = regionForRadius(KHARTOUM, 5);
  const large = regionForRadius(KHARTOUM, 100);

  assert.ok(large.latitudeDelta > small.latitudeDelta);
  assert.ok(small.latitudeDelta > 0);
  /* Longitude degrees are shorter away from the equator, so the span has to be
     at least as wide as the latitude span. */
  assert.ok(large.longitudeDelta >= large.latitudeDelta);
  assert.ok(regionForRadius({ latitude: 84, longitude: 0 }, 100).longitudeDelta <= 320);
});

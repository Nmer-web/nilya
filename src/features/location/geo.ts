/**
 * Location arithmetic and the vocabulary the map screens share.
 *
 * Pure and free of both `react-native-maps` and `expo-location`, so the web
 * bundle and the Node prerender can import it without pulling a native module
 * behind it. Everything here is a calculation over values that came from the
 * device or from Supabase; nothing invents a position.
 */

export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Khartoum. Where the map opens when the buyer's own position is unknown —
 * a starting viewport, never presented as the buyer's location, and never
 * used to compute a distance (Principle II: an assumed position would make
 * every "km away" a fabricated number).
 */
export const DEFAULT_CENTER: Coordinates = { latitude: 15.5007, longitude: 32.5599 };

export const RADIUS_CHOICES = [5, 20, 50, 100] as const;
export type RadiusKm = (typeof RADIUS_CHOICES)[number];
export const DEFAULT_RADIUS: RadiusKm = 50;

const EARTH_RADIUS_KM = 6371;
/** One degree of latitude, near enough anywhere on the globe. */
const KM_PER_DEGREE = 111;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function isCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Coordinates>;
  return (
    typeof candidate.latitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    Math.abs(candidate.latitude) <= 90 &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.longitude) &&
    Math.abs(candidate.longitude) <= 180
  );
}

/**
 * Great-circle distance in kilometres — the same formula as `public.distance_km`,
 * clamp included, so a listing's distance reads the same whether the server
 * computed it for the map or the client computed it on a detail screen.
 */
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const cosine =
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.cos(toRadians(to.longitude) - toRadians(from.longitude)) +
    Math.sin(toRadians(from.latitude)) * Math.sin(toRadians(to.latitude));

  return EARTH_RADIUS_KM * Math.acos(Math.min(1, Math.max(-1, cosine)));
}

/**
 * Distance as the interface says it.
 *
 * Always approximate, and never in metres: stored coordinates are rounded to
 * roughly a kilometre before they leave the database, so a precise-looking
 * "2.34 km" would claim an accuracy that does not exist.
 */
export function formatDistance(km: number | null): string | null {
  if (km === null || !Number.isFinite(km) || km < 0) return null;
  if (km < 1) return 'Under 1 km away';
  return `~${Math.round(km)} km away`;
}

/** The same figure with no trailing words, for a badge on a card. */
export function formatDistanceBadge(km: number | null): string | null {
  if (km === null || !Number.isFinite(km) || km < 0) return null;
  if (km < 1) return '<1 km';
  return `~${Math.round(km)} km`;
}

/**
 * A viewport that shows the whole search radius with a little air around it.
 * Longitude degrees shrink towards the poles, hence the cosine.
 */
export function regionForRadius(
  center: Coordinates,
  radiusKm: number
): Coordinates & { latitudeDelta: number; longitudeDelta: number } {
  const latitudeDelta = Math.min(160, (radiusKm * 2.4) / KM_PER_DEGREE);
  const shrink = Math.max(0.15, Math.cos(toRadians(center.latitude)));

  return {
    ...center,
    latitudeDelta,
    longitudeDelta: Math.min(320, latitudeDelta / shrink),
  };
}

/**
 * Listings that sit on the same coarsened coordinate, grouped so the map shows
 * one marker with a count instead of a stack of identical pins. Coordinates
 * arrive rounded to two decimals, so "same place" is an exact key match.
 */
export function groupByPosition<T extends { latitude: number; longitude: number }>(
  items: readonly T[]
): { key: string; coordinate: Coordinates; items: T[] }[] {
  const groups = new Map<string, { key: string; coordinate: Coordinates; items: T[] }>();

  for (const item of items) {
    const key = `${item.latitude.toFixed(2)},${item.longitude.toFixed(2)}`;
    const existing = groups.get(key);
    if (existing) existing.items.push(item);
    else {
      groups.set(key, {
        key,
        coordinate: { latitude: item.latitude, longitude: item.longitude },
        items: [item],
      });
    }
  }

  return [...groups.values()];
}

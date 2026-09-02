import { countryName } from '@/lib/countries';

export type ProfileRatingPresentation = {
  label: string;
  accessibleLabel: string;
};

export function formatProfileRating(
  average: number | null,
  count: number
): ProfileRatingPresentation | null {
  const value = Number(average);
  if (
    !Number.isInteger(count) ||
    count <= 0 ||
    !Number.isFinite(value) ||
    value < 1 ||
    value > 5
  ) {
    return null;
  }

  return {
    label: `${value.toFixed(1)} (${count})`,
    accessibleLabel: `Rated ${value.toFixed(1)} out of 5 from ${count} ${count === 1 ? 'review' : 'reviews'}`,
  };
}

export function formatMemberSinceYear(value: string): string | null {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;

  return `Member since ${new Date(timestamp).getUTCFullYear()}`;
}

export function formatProfileLocation(
  city: string | null,
  countryCode: string | null
): string | null {
  const cityLabel = city?.trim() || null;
  const code = countryCode?.trim().toUpperCase() || null;
  const parts = [cityLabel, code ? countryName(code) : null].filter(
    (part): part is string => Boolean(part)
  );

  return parts.length > 0 ? parts.join(', ') : null;
}

export function profileInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
}

/**
 * Countries, without a bundled country dataset.
 *
 * There is no runtime source for the *set* of ISO country codes:
 * `Intl.supportedValuesOf` accepts calendar, collation, currency,
 * numberingSystem, timeZone and unit — `region` throws "Invalid key". And
 * `Intl.DisplayNames` is one-directional: it names a code you already hold and
 * offers neither enumeration nor reverse lookup. No installed dependency
 * carries region data either.
 *
 * So this file holds codes and nothing else. Every display string is resolved
 * at runtime:
 *
 *   name — `Intl.DisplayNames`, in the reader's own language
 *   flag — arithmetic on the code, not a table (see `flagOf`)
 *
 * The consequence, stated plainly: a country can be found by name only if it is
 * in the suggested set or already present in the project's own data. Anything
 * else is reachable by typing its two-letter code, which `Intl` then names. A
 * full name search would need the enumeration that no API provides.
 */

/**
 * The suggested set, as specified for the onboarding screen.
 *
 * These are ISO 3166-1 alpha-2 codes, not names — the names below them on
 * screen come from `Intl`, so this list carries no country data of its own.
 */
export const SUGGESTED_COUNTRIES = ['SD', 'FR', 'US', 'GB', 'DE', 'AE', 'SA', 'CA'] as const;

/** What `Intl.DisplayNames` returns for a code it does not recognise. */
const UNKNOWN = 'Unknown Region';

let displayNames: Intl.DisplayNames | null | undefined;

/**
 * The platform's region namer, or null where it does not exist.
 *
 * Resolved once and cached. Hermes builds without full ICU may not provide
 * `Intl.DisplayNames`, so every caller has to cope with null rather than
 * assume — which is why `countryName` falls back to the code itself.
 */
function namer(locale?: string): Intl.DisplayNames | null {
  if (locale) {
    try {
      return new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
      return null;
    }
  }
  if (displayNames === undefined) {
    try {
      displayNames =
        typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
          ? new Intl.DisplayNames(undefined, { type: 'region' })
          : null;
    } catch {
      displayNames = null;
    }
  }
  return displayNames;
}

/** True when the platform can name regions at all. */
export function canNameCountries(): boolean {
  return namer() !== null;
}

/**
 * The country's name in the reader's language, or the bare code as a fallback.
 *
 * Returning the code is deliberate: "SD" is honest and recognisable, whereas a
 * hard-coded English name would be this file inventing the data it was built to
 * avoid holding.
 */
export function countryName(code: string, locale?: string): string {
  const upper = code.trim().toUpperCase();
  const dn = namer(locale);
  if (!dn) return upper;
  try {
    const name = dn.of(upper);
    return !name || name === UNKNOWN || name === upper ? upper : name;
  } catch {
    return upper;
  }
}

/**
 * Whether a two-letter code names a real region.
 *
 * This is the only way to reach a country outside the suggested set without an
 * enumeration: the reader types the code and `Intl` either names it or does
 * not. `of()` answers "Unknown Region" rather than throwing, which is what
 * makes the check possible.
 */
export function isRealCountryCode(code: string): boolean {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return false;
  const dn = namer();
  if (!dn) return false;
  try {
    const name = dn.of(upper);
    return !!name && name !== UNKNOWN && name !== upper;
  } catch {
    return false;
  }
}

/**
 * The flag for a country code, by arithmetic rather than lookup.
 *
 * A regional indicator symbol sits at U+1F1E6 + (letter - 'A'), so two of them
 * spell the flag. No table, no images, and it stays correct for codes this file
 * has never heard of. Platforms without flag glyphs render the two letters,
 * which is a reasonable thing to show.
 */
export function flagOf(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '';
  return String.fromCodePoint(
    ...[...upper].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65))
  );
}

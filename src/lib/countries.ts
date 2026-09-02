/**
 * Countries, without authoring a country dataset.
 *
 * The split matters. This file holds *codes* — the ISO 3166-1 officially
 * assigned alpha-2 set, a published standard. It holds no country **names**:
 * those come from the platform's own locale data through `Intl.DisplayNames`,
 * so they are correct, translated, and none of them written here.
 *
 * Why a shipped code list at all: nothing in the runtime can enumerate
 * countries. `Intl.supportedValuesOf` accepts only 'calendar', 'collation',
 * 'currency', 'numberingSystem', 'timeZone' and 'unit' — 'region' is not a
 * valid key and never will be, so the earlier "Invalid key" failure was the
 * specification working as designed rather than a gap in the platform. A code
 * list is the only way to offer a picker; the choice is where the *names* come
 * from, and they come from ICU.
 *
 * If `Intl.DisplayNames` is missing (Hermes builds vary), `NAMES_AVAILABLE` is
 * false and every entry falls back to its own code. A bare "SD" is a poor
 * label, but it is true — inventing "Sudan" here is exactly the fabrication
 * this arrangement exists to avoid. Callers should surface the degraded state
 * rather than hide it.
 */

/**
 * ISO 3166-1 alpha-2, officially assigned. Uninhabited territories (AQ, BV, HM,
 * GS, TF, UM) are included because they are part of the standard; filtering
 * them would be an editorial judgement, which is the thing being avoided.
 */
export const ISO_3166_1_ALPHA_2: readonly string[] = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ',
  'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW',
  'CX', 'CY', 'CZ',
  'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET',
  'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT',
  'GU', 'GW', 'GY',
  'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT',
  'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS',
  'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
  'OM',
  'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
  'QA',
  'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ',
  'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
  'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU',
  'WF', 'WS',
  'YE', 'YT',
  'ZA', 'ZM', 'ZW',
];

export type Country = {
  /** ISO 3166-1 alpha-2, and what `profiles.country_code` stores. */
  code: string;
  /** From the platform's locale data, or the code itself when unavailable. */
  name: string;
};

/**
 * Whether the platform can name a region.
 *
 * Probed once, against a code whose name is stable and unmistakable. A runtime
 * that returns the input unchanged is treated as unable — some engines stub
 * `DisplayNames` and echo the key rather than throwing.
 */
export const NAMES_AVAILABLE: boolean = (() => {
  try {
    if (typeof Intl === 'undefined' || typeof Intl.DisplayNames !== 'function') return false;
    const probe = new Intl.DisplayNames(['en'], { type: 'region' }).of('FR');
    return typeof probe === 'string' && probe !== 'FR' && probe.length > 0;
  } catch {
    return false;
  }
})();

/** Cached per locale — building a DisplayNames instance per row is wasteful. */
const cache = new Map<string, Intl.DisplayNames | null>();

function namer(locale: string): Intl.DisplayNames | null {
  if (!NAMES_AVAILABLE) return null;
  if (!cache.has(locale)) {
    try {
      cache.set(locale, new Intl.DisplayNames([locale], { type: 'region' }));
    } catch {
      /* An unsupported locale tag should degrade to codes, not throw into the
         first screen of the app. */
      cache.set(locale, null);
    }
  }
  return cache.get(locale) ?? null;
}

/** The display name for a code, or the code itself — never an invented name. */
export function countryName(code: string, locale = 'en'): string {
  try {
    return namer(locale)?.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Every country, named and sorted for the given locale.
 *
 * Sorted with `localeCompare` so accented names land where a reader of that
 * language expects them, rather than after Z.
 */
export function listCountries(locale = 'en'): Country[] {
  return ISO_3166_1_ALPHA_2
    .map((code) => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Case-insensitive match on name or exact code. */
export function searchCountries(list: Country[], query: string): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q);
}

/**
 * Splits the list into the countries NILYA delivers to domestically and the
 * rest.
 *
 * `covered` comes from the real `delivery_options` table, so the ordering is a
 * projection of what the platform actually does rather than an editorial
 * ranking. An empty `covered` yields one undivided list, which is the correct
 * behaviour when the query has not resolved yet.
 */
export function partitionByCoverage(
  list: Country[],
  covered: readonly string[]
): { local: Country[]; rest: Country[] } {
  if (covered.length === 0) return { local: [], rest: list };
  const set = new Set(covered.map((c) => c.toUpperCase()));
  return {
    local: list.filter((c) => set.has(c.code)),
    rest: list.filter((c) => !set.has(c.code)),
  };
}

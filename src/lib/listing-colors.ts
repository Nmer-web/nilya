/**
 * The wash behind a product photograph, taken from the colour the seller typed.
 *
 * `listings.color` is free text — a seller writes "navy blue" or "Cream" or
 * leaves it empty — so this recognises the colour rather than assuming it. What
 * it will not do is guess: an unrecognised value returns null and the caller
 * falls back to the brand's own wash, because a listing described as "patterned"
 * has no one colour and inventing one would state something the seller did not.
 *
 * The swatches are muted on purpose. They sit behind a photograph at low
 * opacity, so they read as the product's colour rather than competing with it.
 */
const COLOR_SWATCHES: readonly (readonly [string, string])[] = [
  /* Longest names first: "navy blue" must not be read as plain "blue". */
  ['turquoise', '#3FB5AE'],
  ['burgundy', '#7B1E3A'],
  ['charcoal', '#4A4A46'],
  ['magenta', '#B5359C'],
  ['mustard', '#D2A32C'],
  ['crimson', '#B02A3A'],
  ['lavender', '#B9A7D6'],
  ['maroon', '#7B241C'],
  ['orange', '#E08A2E'],
  ['purple', '#6B4E8C'],
  ['silver', '#C8C8C4'],
  ['yellow', '#E3B93B'],
  ['violet', '#7A5AA8'],
  ['indigo', '#4B4E8C'],
  ['salmon', '#E08A7E'],
  ['bronze', '#A9743C'],
  ['cream', '#EDE3D0'],
  ['beige', '#D8C4A6'],
  ['brown', '#8B5E3C'],
  ['camel', '#C19A6B'],
  ['khaki', '#B5A642'],
  ['olive', '#6B7A3A'],
  ['green', '#2E7D5B'],
  ['black', '#141413'],
  ['white', '#F1F1EE'],
  ['ivory', '#EFE8DA'],
  ['lilac', '#A992C4'],
  ['peach', '#E8B79A'],
  ['coral', '#E0785F'],
  ['navy', '#26364F'],
  ['blue', '#2F5D8C'],
  ['teal', '#2C7A7B'],
  ['mint', '#8FC7AE'],
  ['grey', '#9A9A95'],
  ['gray', '#9A9A95'],
  ['pink', '#E48BA8'],
  ['gold', '#C9A227'],
  ['rust', '#A6512F'],
  ['sand', '#D9C9A8'],
  ['plum', '#6E3B58'],
  ['wine', '#6E2438'],
  ['red', '#C0392B'],
  ['tan', '#C89F6E'],
];

/**
 * The swatch for a listing's colour, or null when it is absent or not a colour
 * this recognises. Matches a whole word inside the value, so "light blue" and
 * "blue / white" both resolve, while "bluetooth speaker" does not.
 */
export function listingTintColor(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;

  /* Multi-coloured items have no single colour to wash the background with. */
  if (/\bmulti/.test(normalized)) return null;

  for (const [name, swatch] of COLOR_SWATCHES) {
    if (new RegExp(`\\b${name}\\b`).test(normalized)) return swatch;
  }

  return null;
}

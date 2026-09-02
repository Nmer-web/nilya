import { listingTintColor } from '@/lib/listing-colors';
import { color as C } from '@/theme/tokens';

/**
 * Which product attributes each category asks for, and with which options.
 *
 * This is the only place that decides what step 4 of the Sell wizard shows.
 * The screen maps over the resolved field list and renders each field by its
 * `type`; adding or changing a category means editing this file and nothing
 * else.
 *
 * The keys are deliberately narrow. `listings` stores exactly two attribute
 * columns, `size text` and `color text`, so those are the only keys a field
 * may carry — the type will not admit a "material" or "measurements" field,
 * because there is no column for the answer to land in and a JSON blob
 * standing in for one is forbidden. Each column holds one value, so every
 * field is a single selection; the seller can always type their own.
 */
export type ColorOption = { name: string; hex: string };

export type SizeGroup = { label: string; options: readonly string[] };

export type AttributeField =
  | {
      key: 'size';
      label: string;
      type: 'singleSelect';
      options: readonly string[];
      /** Alternative option sets behind a unit toggle — EU / UK / US for shoes. */
      groups?: readonly SizeGroup[];
      required?: boolean;
      /** Lets the seller type a size the options do not cover, such as "EU 38". */
      allowCustom?: boolean;
      hint?: string;
    }
  | {
      key: 'color';
      label: string;
      type: 'colorSingle';
      options: readonly ColorOption[];
      required?: boolean;
      /** Lets the seller name a colour the swatches do not cover. */
      allowCustom?: boolean;
    };

/** The real listing columns an attribute may write to. */
export type AttributeKey = AttributeField['key'];

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const KIDS_SIZES = ['0–3 m', '3–6 m', '6–12 m', '1 y', '2 y', '3 y', '4 y', '6 y', '8 y', '10 y', '12 y', '14 y'] as const;
const range = (prefix: string, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => `${prefix} ${from + index}`);
const SHOE_SIZE_GROUPS: readonly SizeGroup[] = [
  { label: 'EU', options: range('EU', 36, 46) },
  { label: 'UK', options: range('UK', 3, 12) },
  { label: 'US', options: range('US', 4, 13) },
];

/* Swatches are named in the vocabulary `listingTintColor` recognises, so the
   colour a seller picks here is the colour the rest of the app can show. */
const COLOR_NAMES = [
  'Black', 'White', 'Grey', 'Cream', 'Beige', 'Brown', 'Navy', 'Blue', 'Green',
  'Olive', 'Red', 'Burgundy', 'Pink', 'Purple', 'Yellow', 'Orange', 'Gold', 'Silver',
] as const;
export const COLOR_OPTIONS: readonly ColorOption[] = COLOR_NAMES.map((name) => ({
  name,
  hex: listingTintColor(name.toLowerCase()) ?? C.inkFaint,
}));

const clothingSize = (options: readonly string[], hint?: string): AttributeField => ({
  key: 'size',
  label: 'Size',
  type: 'singleSelect',
  options,
  required: true,
  allowCustom: true,
  hint,
});

const colour = (required: boolean): AttributeField => ({
  key: 'color',
  label: 'Colour',
  type: 'colorSingle',
  options: COLOR_OPTIONS,
  required,
  allowCustom: true,
});

/**
 * Keyed by the `categories.slug` primary key. `*` is the fallback for a
 * category with no entry of its own: colour only, optional, and no size.
 */
export const categoryAttributes: Record<string, readonly AttributeField[]> = {
  women: [clothingSize(CLOTHING_SIZES, 'Pick the label size, or add your own such as "EU 38".'), colour(true)],
  men: [clothingSize(CLOTHING_SIZES, 'Pick the label size, or add your own such as "W32 L34".'), colour(true)],
  kids: [clothingSize(KIDS_SIZES, 'Age range as printed on the label.'), colour(true)],
  shoes: [
    {
      key: 'size',
      label: 'Size',
      type: 'singleSelect',
      options: SHOE_SIZE_GROUPS[0].options,
      groups: SHOE_SIZE_GROUPS,
      required: true,
      allowCustom: true,
      hint: 'Switch the scale to match the box.',
    },
    colour(true),
  ],
  sports: [clothingSize(CLOTHING_SIZES), colour(true)],
  bags: [colour(true)],
  home: [colour(false)],
  electronics: [colour(false)],
  /* Beauty products have no size and rarely a colour worth filtering on. */
  beauty: [],
  sudanese: [colour(false)],
  '*': [colour(false)],
};

/** The fields step 4 shows for a category, or the fallback set. */
export function attributeFieldsFor(slug: string | null): readonly AttributeField[] {
  if (!slug) return [];
  const direct = categoryAttributes[slug];
  if (direct) return direct;

  /* Leaf slugs are namespaced by their real parent. This maps attribute
     behavior, not the category tree itself: the hierarchy remains entirely in
     Supabase, while validation and the attribute screen share this one resolver. */
  if (slug.endsWith('-shoes') || slug.startsWith('shoes-')) return categoryAttributes.shoes;
  if (slug === 'kids-clothing') return categoryAttributes.kids;
  if (slug === 'women-clothing') return categoryAttributes.women;
  if (slug === 'men-clothing') return categoryAttributes.men;
  if (slug === 'sports-sportswear') return categoryAttributes.sports;
  if (slug.includes('-bags') || slug.startsWith('bags-')) return categoryAttributes.bags;
  if (slug.startsWith('beauty-') || slug.endsWith('-beauty')) return categoryAttributes.beauty;
  if (slug.startsWith('home-') || slug.endsWith('-home')) return categoryAttributes.home;
  if (slug.startsWith('electronics-')) return categoryAttributes.electronics;
  if (slug.startsWith('sudanese-')) return categoryAttributes.sudanese;
  return categoryAttributes['*'];
}

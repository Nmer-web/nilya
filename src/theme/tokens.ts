/**
 * The SAWA design system.
 *
 * The palette is deliberately monochrome: white canvas, near-black ink, one
 * warm accent held in reserve. The intended balance is roughly 90% white and
 * neutral, 8% black, 2% accent — so `accent` belongs on unread badges, counts
 * and the occasional editorial tag, and nowhere else. Anything that wants to
 * "stand out" should reach for `text` on `bg` first; contrast, not colour, is
 * what carries hierarchy here.
 */

export const color = {
  /** App canvas */
  bg: '#FFFFFF',
  /** Cards, inputs, raised rows */
  surface: '#F7F7F5',
  /** Image wells, skeletons */
  well: '#F2F2EF',
  /** Segmented-control track, icon circles */
  track: '#F2F2EF',

  border: '#E5E5E2',
  borderStrong: '#D8D8D5',

  text: '#111111',
  textSecondary: '#666666',
  textTertiary: '#8A8A8A',
  onDark: '#FFFFFF',

  /**
   * Warm orange, rationed. Dark enough to clear 4.5:1 against white text,
   * which unread badges depend on.
   */
  accent: '#B84E1C',
  accentDark: '#8F3B14',
  accentBg: '#FCF1EA',
  accentBorder: '#F0DACB',

  /** Trust / success */
  green: '#16835B',
  greenBg: '#E8F4EF',
  greenBorder: '#CDE7DC',

  error: '#D64545',
  errorBg: '#FBECEC',
  warning: '#C58A20',

  /** Favourite heart — state is carried by fill, not hue. */
  favOn: '#111111',
  favOff: '#777777',

  /** Chat bubbles */
  bubbleIn: '#F2F2F0',
  bubbleOut: '#111111',

  /** Sheet backdrop — the spec's 20–30% black. */
  scrim: 'rgba(17,17,17,0.28)',
} as const;

/**
 * Seller avatar backgrounds. Muted on purpose: six saturated circles in a feed
 * would spend the colour budget the accent needs.
 */
export const avatarColor = {
  yousif: '#6B4A3A',
  ahmed: '#33414F',
  nour: '#5A5068',
  amal: '#3F5148',
  sara: '#4A5560',
  huda: '#6B4F45',
} as const;

/** 4pt rhythm. `gutter` is the screen inset every full-bleed row aligns to. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  gutter: 16,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  /** Product imagery and other primary surfaces. */
  xl: 14,
  '2xl': 16,
  '3xl': 20,
  sheet: 24,
  pill: 999,
} as const;

/**
 * Three shadows, all of them quiet. A marketplace grid reads as clutter the
 * moment its cards start casting; elevation here is for things that genuinely
 * float above content — the heart on an image, a sheet, a toast.
 */
export const shadow = {
  /** Heart button, toggle knob. */
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  /** Toast. */
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  /** Bottom sheet. */
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -10 },
    elevation: 24,
  },
} as const;

/**
 * The type ramp. Sizes and weights are paired here so a "price" is the same
 * price everywhere; screens should reach for these rather than inventing a
 * size. Prices sit heavier than titles by design — in a marketplace the number
 * is the thing being scanned.
 */
export const type = {
  screenTitle: { size: 29, weight: 700, tracking: -0.6 },
  sectionTitle: { size: 21, weight: 700, tracking: -0.4 },
  productTitle: { size: 15, weight: 500, tracking: -0.1 },
  price: { size: 18, weight: 700, tracking: -0.4 },
  body: { size: 14.5, weight: 400, tracking: 0 },
  meta: { size: 12.5, weight: 400, tracking: 0 },
} as const;

/**
 * Instrument Serif is kept for the SAWA wordmark only — it is the one place
 * the brand speaks in its own voice. Everything else runs on the platform's
 * own sans (SF Pro on iOS, Roboto on Android), which `T` selects by leaving
 * `fontFamily` unset and setting a real `fontWeight`.
 */
export const font = {
  sans: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
  serif: 'InstrumentSerif_400Regular',
} as const;

/** Shared motion timings, so animations across the app stay in step. */
export const motion = {
  /** Presses, chips, taps. */
  fast: 140,
  /** Fades, cross-dissolves. */
  base: 220,
  /** Sheets and anything travelling a long distance. */
  slow: 330,
  /** The one spring used for favourite/press pops. */
  spring: { tension: 320, friction: 12 },
} as const;

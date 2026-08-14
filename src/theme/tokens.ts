/**
 * The SAWA design system.
 *
 * The palette is deliberately monochrome: white canvas, near-black ink, one
 * warm accent held in reserve. The intended balance is roughly 90% white and
 * neutral, 8% black, 2% accent — so `accent` belongs on unread badges, counts
 * and the occasional editorial tag, and nowhere else. Anything that wants to
 * "stand out" should reach for `text` on `background` first; contrast, not
 * colour, is what carries hierarchy here.
 *
 * Nothing outside this file should contain a colour literal. Translucent
 * values are as much a part of the system as opaque ones, so the `alpha` group
 * exists to stop `rgba(…)` being retyped into screens — that is exactly how
 * the previous palette's cream and terracotta survived a full reskin.
 */

export const color = {
  /* ── canvas ── */
  background: '#FFFFFF',
  /** Cards, inputs, raised rows. */
  surface: '#F7F7F5',
  /** Image wells, skeletons, segmented tracks. */
  surfaceSecondary: '#F2F2EF',

  /* ── ink ── */
  text: '#111111',
  textSecondary: '#717171',
  textMuted: '#8A8A8A',

  border: '#E5E5E5',
  borderStrong: '#D8D8D5',

  /* ── actions ── */
  primary: '#111111',
  primaryText: '#FFFFFF',

  /* ── status ── */
  success: '#16835B',
  successBg: '#E8F4EF',
  successBorder: '#CDE7DC',
  error: '#D64545',
  errorBg: '#FBECEC',
  errorBorder: '#F0D2D2',
  /** Declared by the system; nothing warrants it yet. */
  warning: '#C58A20',

  /**
   * Warm orange, rationed. Dark enough to clear 4.5:1 against white text,
   * which unread badges depend on.
   */
  accent: '#B84E1C',
  accentDark: '#8F3B14',
  accentBg: '#FCF1EA',
  accentBorder: '#F0DACB',

  /**
   * Favourite heart. One colour, both states: saved and unsaved differ by fill
   * alone. A greyed-out unsaved heart would encode state in hue, which fails
   * for anyone who cannot separate the two — and on a white card the outline
   * reads as the stronger affordance anyway.
   */
  favourite: '#111111',

  /** Chat bubbles. */
  bubbleIn: '#F2F2F0',
  bubbleOut: '#111111',

  /** The face of the saved payment card on checkout. */
  cardFace: '#33414F',

} as const;

/**
 * Translucent values.
 *
 * Every one of these is a tint of a colour above; they are spelled out rather
 * than computed so the module stays a plain lookup table with no runtime.
 */
export const alpha = {
  /** Sheet backdrop — the spec's 20–30% black. */
  scrim: 'rgba(17,17,17,0.28)',
  /** Ink chips laid over photography: "Cover" tags, gallery page dots. */
  inkStrong: 'rgba(17,17,17,0.80)',
  inkMedium: 'rgba(17,17,17,0.75)',
  inkFaint: 'rgba(17,17,17,0.28)',
  /** Hairlines drawn over a surface, such as the delivery map grid. */
  hairline: 'rgba(138,138,138,0.35)',
  /** Halo around the active step of the order timeline. */
  accentRing: 'rgba(184,78,28,0.16)',
  /** Frosted bars: the blurred iOS tint and the near-opaque Android fallback. */
  barBlur: 'rgba(255,255,255,0.72)',
  barSolid: 'rgba(255,255,255,0.97)',
  /** Floating controls over imagery — back and favourite on a gallery. */
  floatingControl: 'rgba(255,255,255,0.92)',
  /** The unfilled portion of a spinner ring on a dark fill. */
  spinnerTrack: 'rgba(255,255,255,0.30)',
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

/**
 * Corner radii, restricted to five steps.
 *
 * Constraining the ladder is the point: it is what stops a card ending up at
 * 14 next to a field at 13. Product imagery and controls sit at `lg` (16) —
 * the top of what still reads as a crisp marketplace card. Going rounder makes
 * a grid look like a toy, so `xl` and above are reserved for sheets and other
 * large surfaces.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  /** Semantic alias — bottom sheets pin to the top of the ladder. */
  sheet: 24,
  pill: 999,
} as const;

/**
 * Three shadows, all of them quiet. A marketplace grid reads as clutter the
 * moment its cards start casting; elevation here is for things that genuinely
 * float above content — the heart on an image, a sheet, a toast.
 */
export const shadow = {
  /** Heart button, toggle knob, floating gallery controls. */
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  /** Toast. */
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  /** Bottom sheet. */
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
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

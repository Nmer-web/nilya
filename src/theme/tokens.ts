/**
 * Design tokens transcribed from the SudanSouq design source.
 * Every literal here maps 1:1 to a value used in the prototype.
 */

export const color = {
  /** App canvas */
  bg: '#F0EEE6',
  /** Cards, inputs, raised rows */
  surface: '#FAF9F5',
  /** Image wells */
  well: '#E4E1D6',
  /** Segmented-control track, icon circles */
  track: '#E7E4DA',

  border: '#D9D6CC',
  borderStrong: '#C6C2B4',

  text: '#171717',
  textSecondary: '#6B6B6B',
  textTertiary: '#9A968A',
  onDark: '#FAF9F5',

  /** Terracotta — the brand accent */
  accent: '#B2451F',
  accentDark: '#8C3415',
  accentBg: '#F8EAE2',
  accentBorder: '#E8CDBF',

  /** Trust / success green */
  green: '#1E6B4E',
  greenBg: '#E3EFE9',
  greenBorder: '#C9DED4',
} as const;

/** Seller avatar backgrounds, keyed off the product data. */
export const avatarColor = {
  yousif: '#8C3415',
  ahmed: '#2F3E4E',
  nour: '#6B5B8C',
  amal: '#3F5B4A',
  sara: '#4A5A6B',
  huda: '#7A4A3A',
} as const;

export const radius = {
  sm: 5,
  md: 8,
  lg: 11,
  xl: 12,
  '2xl': 14,
  '3xl': 16,
  sheet: 22,
  pill: 999,
} as const;

export const font = {
  sans: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
  serif: 'InstrumentSerif_400Regular',
} as const;



/**
 * The single canonical NILYA design and motion foundation.
 *
 * Keep semantic values here and component structure in shared components.
 * Screens may compose these roles, but they must not create a second palette,
 * type ramp, spacing ladder, elevation, or motion preset.
 */

import palette from './palette.json';

export const color = {
  background: palette.background,
  primary: palette.primary,
  primaryDark: palette.primaryDark,
  primarySoft: palette.primarySoft,
  accent: palette.accent,
  textPrimary: palette.textPrimary,
  textInverse: palette.background,
  textSecondary: palette.textSecondary,
  /** Decoration and non-essential disabled treatment only; never readable copy. */
  textMuted: palette.textSecondary,
  surface: palette.surface,
  surfaceSecondary: palette.primarySoft,
  /** Search bars, inactive chips, category discs — the quiet warm grey. */
  bgMuted: palette.bgMuted,
  /** Placeholders and struck-through prices; never the only copy on a row. */
  inkFaint: palette.inkFaint,
  /** The two ends of the Home hero wash. */
  heroFrom: palette.heroFrom,
  heroTo: palette.heroTo,
  skeletonBase: palette.border,
  skeletonHighlight: palette.surface,
  border: palette.border,
  borderStrong: palette.border,
  success: palette.success,
  error: palette.error,
  errorText: palette.errorText,
  warning: palette.warning,
  warningText: palette.warningText,
  overlay: `${palette.primaryDark}52`,
  floatingSurface: `${palette.background}F0`,
  successSurface: palette.successSurface,
  errorSurface: palette.background,
  warningSurface: palette.warningSurface,
} as const;

/**
 * New profile colors use restrained NILYA brand roles. Existing stored avatar colors remain real
 * profile data and are displayed unchanged; this palette only controls future
 * local selection before that value is persisted.
 */
export const avatarPalette = [color.primary, color.accent] as const;

export const space = {
  space4: 4,
  space8: 8,
  space12: 12,
  space16: 16,
  space20: 20,
  space24: 24,
  space32: 32,
  space40: 40,
  space48: 48,
  gutterCompact: 20,
  gutterRegular: 24,
} as const;

export function screenGutter(width: number): number {
  return width < 390 ? space.gutterCompact : space.gutterRegular;
}

export const radius = {
  radiusSmall: 8,
  radiusMedium: 12,
  radiusLarge: 16,
  radiusXLarge: 20,
  radiusSheet: 24,
  /** The product sheet that climbs over the hero photograph. */
  radiusHero: 28,
  radiusPill: 999,
} as const;

/** `boxShadow` is supported by the New Architecture used by RN 0.86. */
export const elevation = {
  raised: { boxShadow: `0 1px 4px ${palette.primaryDark}14` },
  floating: { boxShadow: `0 6px 18px ${palette.primaryDark}1F` },
  sheet: { boxShadow: `0 -10px 32px ${palette.primaryDark}1F` },
  /** Soft and low: the heart over a product photo, a badge, a card at rest. */
  card: { boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)' },
  /** The floating bottom navigation. */
  nav: { boxShadow: '0 8px 24px rgba(0, 0, 0, 0.10)' },
} as const;

export const opacity = {
  disabled: 0.44,
  pressed: 0.82,
  scrim: 0.28,
  skeletonLow: 0.55,
  skeletonHigh: 1,
} as const;

export const layer = {
  base: 0,
  contentOverlay: 2,
  sticky: 10,
  floating: 20,
  overlay: 40,
  modal: 50,
  toast: 60,
} as const;

export const touch = {
  minimum: 44,
  standard: 48,
  large: 56,
} as const;

/** Exact font faces specified by the Nilya wordmark and tagline lockup. */
export const font = {
  wordmark: 'Inter_500Medium',
  tagline: 'Inter_400Regular',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/**
 * The type ramp, set in Inter. Each role names the face for its weight as well
 * as the weight itself, so the loaded font is used on every platform and a
 * role never silently drops back to the system face. Anything 20px and up
 * tightens its tracking.
 */
export const type = {
  display: { fontFamily: font.semibold, fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: -0.4 },
  screenTitle: { fontFamily: font.semibold, fontSize: 29, lineHeight: 35, fontWeight: '600', letterSpacing: -0.4 },
  productTitle: { fontFamily: font.semibold, fontSize: 24, lineHeight: 30, fontWeight: '600', letterSpacing: -0.4 },
  sectionTitle: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.4 },
  cardTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.1 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, fontWeight: '400', letterSpacing: 0 },
  bodyMedium: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, fontWeight: '600', letterSpacing: 0 },
  metadata: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
  metadataMedium: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, fontWeight: '500', letterSpacing: 0 },
  price: { fontFamily: font.semibold, fontSize: 18, lineHeight: 23, fontWeight: '600', letterSpacing: -0.3 },
  detailPrice: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.4 },
  button: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: 0 },
  caption: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
} as const;

export const icon = {
  metadata: { size: 16, strokeWidth: 1.75 },
  inline: { size: 20, strokeWidth: 1.75 },
  navigation: { size: 24, strokeWidth: 2 },
  action: { size: 24, strokeWidth: 2 },
  hero: { size: 28, strokeWidth: 2.25 },
} as const;

export const image = {
  listing: { aspectRatio: 0.8, radius: radius.radiusMedium },
  detail: {
    aspectRatio: 393 / 430,
    radius: 0,
    portraitViewportRatio: 0.6,
    landscapeViewportRatio: 0.72,
    maxHeight: 560,
  },
  conversation: { aspectRatio: 3 / 4, radius: radius.radiusSmall },
  category: { aspectRatio: 1, radius: radius.radiusMedium },
  avatar: { aspectRatio: 1, radius: radius.radiusPill },
  sell: { aspectRatio: 3 / 4, radius: radius.radiusMedium },
} as const;

export const duration = {
  instant: 120,
  fast: 180,
  standard: 240,
  slow: 340,
} as const;

export const easing = {
  standard: [0.2, 0, 0, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
} as const;

const clamped = { overshootClamping: true } as const;

export const spring = {
  buttonPress: { mass: 0.7, stiffness: 420, damping: 30, ...clamped },
  selection: { mass: 0.8, stiffness: 360, damping: 28, ...clamped },
  cardPress: { mass: 0.8, stiffness: 320, damping: 28, ...clamped },
  favorite: { mass: 0.65, stiffness: 500, damping: 24, ...clamped },
  sheet: { mass: 1, stiffness: 320, damping: 32, ...clamped },
  modal: { mass: 0.9, stiffness: 300, damping: 30, ...clamped },
} as const;

export const scale = {
  buttonPressed: 0.97,
  cardPressed: 0.98,
  favoritePeak: 1.15,
  tabSelected: 1.05,
} as const;

export type ColorRole = keyof typeof color;
export type TypographyRole = keyof typeof type;
export type IconRole = keyof typeof icon;

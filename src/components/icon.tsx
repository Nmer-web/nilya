import React from 'react';
import Svg, { Circle, Path, Rect, type NumberProp } from 'react-native-svg';

import { color as C } from '@/theme/tokens';

/**
 * The design's icon set, transcribed path-for-path from the source SVGs.
 *
 * Most glyphs are drawn on a 24×24 grid as round-capped strokes; the handful
 * that are solid (star, sparkle, overflow dots) declare `solid` so `Icon`
 * paints them with `color` instead of stroking.
 */

type Parts = (p: { c: string; sw: number; fill: string }) => React.ReactNode;

type Def = { d: Parts; sw?: number; solid?: boolean; join?: 'round' | 'miter' };

const DEFS = {
  heart: {
    sw: 1.9,
    d: ({ c, sw, fill }) => (
      <Path
        d="M19.3 5.7a5 5 0 0 0-7.3.3 5 5 0 0 0-7.3-.3 5.4 5.4 0 0 0 0 7.5L12 20.5l7.3-7.3a5.4 5.4 0 0 0 0-7.5z"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        fill={fill}
      />
    ),
  },

  bell: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path
          d="M18 8a6 6 0 0 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8z"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
        />
        <Path d="M10.3 20a2 2 0 0 0 3.4 0" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },

  search: {
    sw: 1.9,
    d: ({ c, sw }) => (
      <>
        <Circle cx={11} cy={11} r={7} stroke={c} strokeWidth={sw} fill="none" />
        <Path d="m16.5 16.5 4.5 4.5" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },

  pin: {
    sw: 2,
    d: ({ c, sw }) => (
      <>
        <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" stroke={c} strokeWidth={sw} fill="none" />
        <Circle cx={12} cy={10} r={2.6} stroke={c} strokeWidth={sw} fill="none" />
      </>
    ),
  },

  close: {
    sw: 2.6,
    d: ({ c, sw }) => (
      <Path d="M6 6l12 12M18 6 6 18" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
    ),
  },

  sliders: {
    sw: 1.9,
    d: ({ c, sw }) => (
      <>
        <Path
          d="M4 7h10M18 7h2M4 17h4M12 17h8"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={16} cy={7} r={2.2} stroke={c} strokeWidth={sw} fill="none" />
        <Circle cx={10} cy={17} r={2.2} stroke={c} strokeWidth={sw} fill="none" />
      </>
    ),
  },

  chevronDown: {
    sw: 2,
    d: ({ c, sw }) => (
      <Path d="m6 9 6 6 6-6" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
    ),
  },
  chevronLeft: {
    sw: 2,
    d: ({ c, sw }) => (
      <Path d="m14 6-6 6 6 6" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
    ),
  },
  chevronRight: {
    sw: 2,
    d: ({ c, sw }) => (
      <Path d="m10 6 6 6-6 6" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
    ),
  },

  truck: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M2 7h11v10H2z" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Path d="M13 10h4l3 3v4h-7z" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Circle cx={6} cy={18} r={1.8} stroke={c} strokeWidth={sw} fill="none" />
        <Circle cx={16.5} cy={18} r={1.8} stroke={c} strokeWidth={sw} fill="none" />
      </>
    ),
  },

  star: {
    solid: true,
    d: ({ c }) => <Path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" fill={c} />,
  },

  /** Scalloped verification badge used next to a seller's name. */
  badgeCheck: {
    solid: true,
    d: ({ c }) => (
      <>
        <Path
          d="M12 2 9.8 4.4l-3.2-.4-.5 3.2L3.3 8.9l1.5 2.9-1.5 2.9 2.8 1.7.5 3.2 3.2-.4L12 22l2.2-2.4 3.2.4.5-3.2 2.8-1.7-1.5-2.9 1.5-2.9-2.8-1.7-.5-3.2-3.2.4z"
          fill={c}
          opacity={0.18}
        />
        <Path
          d="M12 2.6 10.1 4.7l-2.8-.3-.4 2.8-2.5 1.5 1.3 2.5-1.3 2.5 2.5 1.5.4 2.8 2.8-.3 1.9 2.1 1.9-2.1 2.8.3.4-2.8 2.5-1.5-1.3-2.5 1.3-2.5-2.5-1.5-.4-2.8-2.8.3z"
          fill={c}
        />
        <Path
          d="m8.7 12.2 2 2 4.4-4.4"
          stroke={C.primaryText}
          strokeWidth={1.9}
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },

  /** Outline shield with a tick — buyer protection. */
  shieldCheck: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path
          d="M12 2.9 5.4 5.7v5.8c0 4.2 2.8 7.7 6.6 9.3 3.8-1.6 6.6-5.1 6.6-9.3V5.7z"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
        />
        <Path d="m8.8 12.2 2.1 2.1 4.3-4.4" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },

  /** Outline shield, no tick — the small print on Checkout. */
  shield: {
    sw: 1.8,
    d: ({ c, sw }) => (
      <Path
        d="M12 2.9 5.4 5.7v5.8c0 4.2 2.8 7.7 6.6 9.3 3.8-1.6 6.6-5.1 6.6-9.3V5.7z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
      />
    ),
  },

  /** Solid shield with tick — the "Verified seller" banner. */
  shieldSolid: {
    solid: true,
    d: ({ c }) => (
      <>
        <Path d="M12 2 4.5 5.2v6.3c0 4.7 3.2 8.6 7.5 10.3 4.3-1.7 7.5-5.6 7.5-10.3V5.2z" fill={c} opacity={0.2} />
        <Path d="M12 2.9 5.4 5.7v5.8c0 4.2 2.8 7.7 6.6 9.3 3.8-1.6 6.6-5.1 6.6-9.3V5.7z" fill={c} />
        <Path
          d="m8.8 12.2 2.1 2.1 4.3-4.4"
          stroke={C.primaryText}
          strokeWidth={1.9}
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },

  camera: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Circle cx={12} cy={13} r={3.4} stroke={c} strokeWidth={sw} fill="none" />
      </>
    ),
  },

  plus: {
    sw: 1.9,
    d: ({ c, sw }) => (
      <Path d="M12 5v14M5 12h14" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
    ),
  },
  minus: {
    sw: 2.2,
    d: ({ c, sw }) => <Path d="M5 12h14" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />,
  },

  sparkle: {
    solid: true,
    d: ({ c }) => (
      <>
        <Path d="m12 2 1.9 5.6L19.5 9l-5.6 1.9L12 16.5l-1.9-5.6L4.5 9l5.6-1.4z" fill={c} />
        <Path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill={c} />
      </>
    ),
  },

  /** Ticket-style glyph for the empty Offers tab. */
  offerTicket: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M4 8h16v9H4z" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Path d="M8 8V6h8v2M9 13h6" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },

  /** Banknote glyph — an incoming offer notification. */
  offerNote: {
    sw: 1.8,
    d: ({ c, sw }) => (
      <>
        <Path d="M3 7h18v10H3z" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Circle cx={12} cy={12} r={2.6} stroke={c} strokeWidth={sw} fill="none" />
      </>
    ),
  },

  /** Wider banknote used on the cash-on-collect payment row. */
  cash: {
    sw: 1.8,
    d: ({ c, sw }) => (
      <>
        <Path d="M2.5 7.5h19v9h-19z" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Circle cx={12} cy={12} r={2.6} stroke={c} strokeWidth={sw} fill="none" />
        <Path d="M5.5 12h.01M18.5 12h.01" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },

  chat: {
    sw: 1.8,
    d: ({ c, sw }) => (
      <Path
        d="M21 11.5A8.4 8.4 0 0 1 12.5 20a9 9 0 0 1-4-.9L3 21l1.9-5.5a8.4 8.4 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        fill="none"
      />
    ),
  },

  package: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Path d="M4 7.5 12 12l8-4.5M12 12v9" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },

  bag: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M4 7h16l-1.4 13H5.4z" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Path d="M9 7V5.5a3 3 0 0 1 6 0V7" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },

  card: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M4 8.5h16v10H4z" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Path d="M4 12h16M7.5 15.5h3" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },

  check: {
    sw: 2.6,
    d: ({ c, sw }) => (
      <Path d="m5 12.5 4.5 4.5L19 7" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
    ),
  },

  gear: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Circle cx={12} cy={12} r={3} stroke={c} strokeWidth={sw} fill="none" />
        <Path
          d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },

  home: {
    sw: 1.75,
    join: 'round',
    d: ({ c, sw }) => (
      <Path
        d="M3.5 10.6 12 3.6l8.5 7v9.4h-6v-6h-5v6h-6z"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },

  person: {
    sw: 1.75,
    d: ({ c, sw }) => (
      <>
        <Circle cx={12} cy={8} r={3.8} stroke={c} strokeWidth={sw} fill="none" />
        <Path d="M4.8 20.5a7.2 7.2 0 0 1 14.4 0" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },

  send: {
    sw: 2,
    d: ({ c, sw }) => (
      <Path
        d="M4 12 20 4l-7 16-2.4-6.2z"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },

  dotsVertical: {
    solid: true,
    d: ({ c }) => (
      <>
        <Circle cx={12} cy={5} r={1.7} fill={c} />
        <Circle cx={12} cy={12} r={1.7} fill={c} />
        <Circle cx={12} cy={19} r={1.7} fill={c} />
      </>
    ),
  },

  /** Downward arrow on the "Price dropped" banner. */
  arrowDown: {
    sw: 2.2,
    d: ({ c, sw }) => (
      <Path d="M12 5v13M6.5 12.5 12 18l5.5-5.5" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
    ),
  },

  /** Photo glyph shown in an unfilled image slot. */
  image: {
    sw: 1.6,
    d: ({ c, sw }) => (
      <>
        <Rect
          x={3}
          y={3}
          width={18}
          height={18}
          rx={2}
          stroke={c}
          strokeWidth={sw}
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx={8.5} cy={8.5} r={1.5} stroke={c} strokeWidth={sw} fill="none" />
        <Path
          d="m21 15-5-5L5 21"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },

  /** Right arrow between the two country codes on the delivery route strip. */
  arrowRight: {
    sw: 2,
    d: ({ c, sw }) => (
      <Path d="M4 12h15M14 7l5 5-5 5" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
    ),
  },
} satisfies Record<string, Def>;

export type IconName = keyof typeof DEFS;

type IconProps = {
  name: IconName;
  size?: number;
  /** Stroke colour for outline icons, fill colour for solid ones. */
  color?: string;
  /** Interior fill for outline icons — used to toggle the heart. */
  fill?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
};

export function Icon({
  name,
  size = 20,
  color = C.text,
  fill = 'none',
  strokeWidth,
  width,
  height,
}: IconProps) {
  const def = DEFS[name] as Def;
  return (
    <Svg
      width={(width ?? size) as NumberProp}
      height={(height ?? size) as NumberProp}
      viewBox="0 0 24 24"
      fill="none"
    >
      {def.d({ c: color, sw: strokeWidth ?? def.sw ?? 2, fill: def.solid ? color : fill })}
    </Svg>
  );
}

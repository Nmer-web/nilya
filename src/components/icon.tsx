import React from 'react';
import Svg, { Circle, Path, Rect, type NumberProp } from 'react-native-svg';

import { color as C, icon as iconToken, type IconRole } from '@/theme/tokens';

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
  info: {
    sw: 1.8,
    d: ({ c, sw }) => (
      <>
        <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={sw} fill="none" />
        <Path d="M12 10.5v6" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Circle cx={12} cy={7.5} r={1} fill={c} />
      </>
    ),
  },

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

  /** Four-cell Browse mark; deliberately neutral and distinct from Search. */
  grid: {
    sw: 1.8,
    d: ({ c, sw, fill }) => (
      <>
        <Rect x={3.5} y={3.5} width={6.5} height={6.5} rx={1.4} stroke={c} strokeWidth={sw} fill={fill} />
        <Rect x={14} y={3.5} width={6.5} height={6.5} rx={1.4} stroke={c} strokeWidth={sw} fill={fill} />
        <Rect x={3.5} y={14} width={6.5} height={6.5} rx={1.4} stroke={c} strokeWidth={sw} fill={fill} />
        <Rect x={14} y={14} width={6.5} height={6.5} rx={1.4} stroke={c} strokeWidth={sw} fill={fill} />
      </>
    ),
  },

  /** Compact category glyphs used by the Browse hierarchy. */
  categoryAll: {
    solid: true,
    d: ({ c }) => (
      <>
        {[4, 12, 20].flatMap((y) =>
          [4, 12, 20].map((x) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.55} fill={c} />)
        )}
      </>
    ),
  },
  clothing: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path
        d="M9 3h6l1.2 3.3L19 8l-1.5 3-2-1v11h-7V10l-2 1L5 8l2.8-1.7z"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  shoe: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path
        d="M3.5 15.5c3.8-.3 6.2-2.4 7.6-6.2l2.5 3.2c1 .9 2.1 1.4 3.5 1.6l3.4.5v3.1H3.5z"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  necklace: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M4 5c.7 6 3.6 9 8 9s7.3-3 8-9" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Path d="m12 14 3 3-3 4-3-4z" stroke={c} strokeWidth={sw} strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  beauty: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M5 9h6v11H5zM6.5 6h3v3M6 4h4" stroke={c} strokeWidth={sw} strokeLinejoin="round" fill="none" />
        <Path d="M14 7h5v13h-5zM15 4h3v3" stroke={c} strokeWidth={sw} strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  furniture: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M6 4h12v9H6zM4 10v8h16v-8M6 18v3M18 18v3" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
  },
  decor: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M8 3h8M9 3c0 4-2 5-2 9 0 5 2.2 9 5 9s5-4 5-9c0-4-2-5-2-9" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
    ),
  },
  cookware: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M5 9h14v9H5zM3 11h2M19 11h2M8 6h8M10 4h4v2" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  bed: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M3 6v15M21 11v10M3 17h18M5 9h6v5H5zM11 11h8a2 2 0 0 1 2 2v4H11z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
  },
  lamp: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M8 4h8l2 8H6zM12 12v7M8 20h8" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
  },
  storage: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Rect x={4} y={3} width={16} height={18} rx={1.5} stroke={c} strokeWidth={sw} fill="none" />
        <Path d="M4 9h16M4 15h16M11 6h2M11 12h2M11 18h2" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },
  appliance: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M8 3h8l-1 9H9zM10 12h4l2 4v5H8v-5z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Circle cx={12} cy={17.5} r={1.2} stroke={c} strokeWidth={sw} fill="none" />
      </>
    ),
  },
  kitchenTools: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M5 3v6M8 3v6M3 3v4c0 2 1 3 3 3v11M15 3v18M15 3c4 2 5 6 5 9h-5" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  tableware: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M6 4h12v4H6zM4 10h16v4H4zM3 16h18c-.7 3-3 5-6 5H9c-3 0-5.3-2-6-5z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
  },
  householdCare: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M9 3h6v4l3 3v11H6V10l3-3zM9 7h6M12 3v4M9 13h6" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
  },
  textiles: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M6 5h11a2 2 0 0 1 0 4H8v10h10M6 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2V7a2 2 0 0 0-2-2z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
  },
  office: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M3 7h7l2 2h9l-2 11H4zM3 7V4h7l2 3h7v2" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
  },
  celebration: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="m4 20 3-11 8 8zM8 10l6 6" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M14 4v3M19 7l-2 2M9 5l2 2M18 13h3" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },
  tools: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="m4 20 7-7M14 4l6 6M16 2l6 6-2 2-6-6zM13 12l7 7-2 2-7-7M4 4l4 1 2 4-2 2-4-2-1-4z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
  },
  phone: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Rect x={7} y={2.5} width={10} height={19} rx={2} stroke={c} strokeWidth={sw} fill="none" />
        <Path d="M10 5h4M11 18.5h2" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
    ),
  },
  computer: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M3 4h18v13H3zM8 21h8M12 17v4" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
  },
  headphones: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M4 13a8 8 0 0 1 16 0v6h-4v-7h4M4 12h4v7H4z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
  },
  gamepad: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M7 8h10c2 0 3 1.3 3.5 3.5l1 5c.4 2-1.8 3.2-3.2 1.8L16 16H8l-2.3 2.3c-1.4 1.4-3.6.2-3.2-1.8l1-5C4 9.3 5 8 7 8z" stroke={c} strokeWidth={sw} strokeLinejoin="round" fill="none" />
        <Path d="M7 11v4M5 13h4" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <Circle cx={16} cy={12} r={0.8} fill={c} />
        <Circle cx={18} cy={14} r={0.8} fill={c} />
      </>
    ),
  },
  book: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M4 4h6a2 2 0 0 1 2 2v15a3 3 0 0 0-3-3H4zM20 4h-6a2 2 0 0 0-2 2v15a3 3 0 0 1 3-3h5z" stroke={c} strokeWidth={sw} strokeLinejoin="round" fill="none" />
    ),
  },
  palette: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Path d="M12 3a9 9 0 1 0 0 18h1.5a1.8 1.8 0 0 0 0-3.6H12a2 2 0 0 1-2-2c0-1.1.9-2 2-2h4a5 5 0 0 0 5-5C21 5.4 17 3 12 3z" stroke={c} strokeWidth={sw} fill="none" />
        <Circle cx={7.5} cy={9} r={1} fill={c} /><Circle cx={11} cy={6.5} r={1} fill={c} /><Circle cx={16} cy={7.5} r={1} fill={c} />
      </>
    ),
  },
  dumbbell: {
    sw: 1.8,
    d: ({ c, sw }) => (
      <Path d="M3 9v6M6 7v10M6 12h12M18 7v10M21 9v6" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
    ),
  },
  musicNote: {
    sw: 1.8,
    d: ({ c, sw }) => (
      <>
        <Path d="M10 18V6l9-2v12" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Circle cx={7} cy={18} r={3} stroke={c} strokeWidth={sw} fill="none" />
        <Circle cx={16} cy={16} r={3} stroke={c} strokeWidth={sw} fill="none" />
      </>
    ),
  },
  outdoor: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <Path d="M20 4C11 4 5 8 5 14c0 3 2 5 5 5 6 0 10-6 10-15zM5 20c3-5 6-8 11-11" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
          stroke={C.textInverse}
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
          stroke={C.textInverse}
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
  plusCircle: {
    sw: 1.8,
    d: ({ c, sw }) => (
      <>
        <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={sw} fill="none" />
        <Path d="M12 8v8M8 12h8" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
      </>
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
  inbox: {
    sw: 1.7,
    d: ({ c, sw }) => (
      <>
        <Rect x={3} y={5} width={18} height={14} rx={2} stroke={c} strokeWidth={sw} fill="none" />
        <Path d="m4 7 8 6 8-6" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
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
  arrowLeft: {
    sw: 2,
    d: ({ c, sw }) => (
      <Path d="M20 12H5M10 7l-5 5 5 5" stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none" />
    ),
  },
} satisfies Record<string, Def>;

export type IconName = keyof typeof DEFS;

type IconProps = {
  name: IconName;
  role?: IconRole;
  size?: number;
  /** Stroke colour for outline icons, fill colour for solid ones. */
  color?: string;
  /** Interior fill for outline icons — used to toggle the heart. */
  fill?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
  decorative?: boolean;
  accessibilityLabel?: string;
};

export function Icon({
  name,
  role = 'inline',
  size,
  color = C.textPrimary,
  fill = 'none',
  strokeWidth,
  width,
  height,
  decorative = true,
  accessibilityLabel,
}: IconProps) {
  const def = DEFS[name] as Def;
  const metrics = iconToken[role];
  const glyphSize = size ?? metrics.size;
  return (
    <Svg
      width={(width ?? glyphSize) as NumberProp}
      height={(height ?? glyphSize) as NumberProp}
      viewBox="0 0 24 24"
      fill="none"
      accessible={decorative ? undefined : true}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
    >
      {def.d({ c: color, sw: strokeWidth ?? metrics.strokeWidth, fill: def.solid ? color : fill })}
    </Svg>
  );
}

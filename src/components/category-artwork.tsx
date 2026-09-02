import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { color as C } from '@/theme/tokens';

/**
 * Decorative artwork for the categories NILYA owns an illustration for.
 *
 * `categories` has no image column, so this is static, brand-drawn UI mapped
 * by slug — never a photograph presented as the category's own. A slug with
 * no illustration gets `null`, and the caller shows its neutral fallback.
 */
export type ArtworkKind =
  | 'women'
  | 'men'
  | 'kids'
  | 'home'
  | 'electronics'
  | 'beauty'
  | 'shoes'
  | 'bags'
  | 'sports'
  | 'sudanese';

const ARTWORK_BY_SLUG: Partial<Record<string, ArtworkKind>> = {
  women: 'women',
  men: 'men',
  kids: 'kids',
  home: 'home',
  electronics: 'electronics',
  beauty: 'beauty',
  shoes: 'shoes',
  bags: 'bags',
  sports: 'sports',
  sudanese: 'sudanese',
};

export function artworkFor(slug: string): ArtworkKind | null {
  const key = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return ARTWORK_BY_SLUG[key] ?? null;
}

export function CategoryArtwork({ kind, size }: { kind: ArtworkKind; size: number }) {
  const stroke = C.textPrimary;
  const soft = C.primarySoft;
  const muted = C.borderStrong;
  const quiet = C.skeletonBase;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {kind === 'women' ? (
        <>
          <Path d="M58 22c11 13 17 30 18 52H30c2-22 8-39 18-52h10z" fill={soft} />
          <Path d="M38 29h28M47 22v18M58 22v18M34 74h45" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
          <Path d="M30 74c2-22 8-39 18-52h10c11 13 17 30 18 52" stroke={stroke} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : kind === 'men' ? (
        <>
          <Path d="M28 38 50 24l22 14-8 39H36z" fill={soft} />
          <Path d="M28 38 50 24l22 14-8 39H36z" stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
          <Path d="m41 31 9 12 9-12M50 43v33M27 39l-9 16 12 7M73 39l9 16-12 7" stroke={stroke} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : kind === 'kids' ? (
        <>
          <Circle cx={50} cy={45} r={24} fill={soft} stroke={stroke} strokeWidth={4} />
          <Circle cx={34} cy={24} r={10} fill={quiet} stroke={stroke} strokeWidth={4} />
          <Circle cx={66} cy={24} r={10} fill={quiet} stroke={stroke} strokeWidth={4} />
          <Circle cx={42} cy={44} r={3} fill={stroke} />
          <Circle cx={58} cy={44} r={3} fill={stroke} />
          <Path d="M42 58c5 4 11 4 16 0" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
        </>
      ) : kind === 'home' ? (
        <>
          <Path d="M25 58h50l-7 20H32z" fill={soft} stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M37 35h26l8 23H29z" fill={quiet} stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M50 58v20M42 82h16" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
        </>
      ) : kind === 'electronics' ? (
        <>
          <Rect x={34} y={18} width={35} height={62} rx={8} fill={soft} stroke={stroke} strokeWidth={4} />
          <Path d="M45 25h13M45 72h13" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
          <Circle cx={66} cy={65} r={11} fill={quiet} stroke={stroke} strokeWidth={4} />
          <Path d="m61 65 4 4 8-9" stroke={stroke} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : kind === 'beauty' ? (
        <>
          <Path d="M32 44h17v39H32z" fill={soft} stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M35 30h11l3 14H32z" fill={quiet} stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M64 21c10 8 11 20 1 28-10-8-11-20-1-28z" fill={soft} stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M65 49v33M56 82h18" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
        </>
      ) : kind === 'shoes' ? (
        <>
          <Path d="M20 61c17 2 30-5 39-21 3 10 10 16 21 19 5 1 8 5 8 10v4H22c-3 0-5-2-5-5 0-3 1-5 3-7z" fill={soft} stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M38 58h15M48 52l8 6M57 45l8 9" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
        </>
      ) : kind === 'bags' ? (
        <>
          <Path d="M25 39h50l-4 42H29z" fill={soft} stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M38 39c0-12 24-12 24 0M36 53h28" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
          <Circle cx={38} cy={51} r={3} fill={stroke} />
          <Circle cx={62} cy={51} r={3} fill={stroke} />
        </>
      ) : kind === 'sports' ? (
        <>
          <Circle cx={50} cy={50} r={30} fill={soft} stroke={stroke} strokeWidth={4} />
          <Path d="M28 39c12 7 31 8 44 0M28 61c12-7 31-8 44 0M50 20c-8 17-8 43 0 60M50 20c8 17 8 43 0 60" stroke={stroke} strokeWidth={3.5} strokeLinecap="round" />
        </>
      ) : (
        <>
          <Path d="M24 68c10-18 21-32 36-45 8 18 9 36 2 55-12 1-25-2-38-10z" fill={soft} stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M40 60c7-12 15-22 25-31M29 69c12 5 25 8 39 8" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
          <Ellipse cx={69} cy={29} rx={8} ry={13} fill={quiet} stroke={stroke} strokeWidth={4} />
          <Circle cx={28} cy={30} r={6} fill={muted} />
        </>
      )}
    </Svg>
  );
}

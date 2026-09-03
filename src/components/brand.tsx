import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { color as C, font } from '@/theme/tokens';

const ICON_CORNER_RATIO = 230 / 1024;
const MIN_ICON_SIZE = 24;

type NilyaIconProps = {
  size?: number;
  mono?: boolean;
  decorative?: boolean;
  accessibilityLabel?: string;
};

/** The canonical Nilya icon. The amber dot is inseparable from the brand-color mark. */
export function NilyaIcon({
  size = 32,
  mono = false,
  decorative = true,
  accessibilityLabel = 'Nilya',
}: NilyaIconProps) {
  const resolvedSize = Math.max(size, MIN_ICON_SIZE);
  const tile = mono ? '#111111' : C.primary;
  const dot = mono ? C.textInverse : C.accent;

  return (
    <Svg
      width={resolvedSize}
      height={resolvedSize}
      viewBox="0 0 1024 1024"
      accessible={decorative ? undefined : true}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
    >
      <Rect width={1024} height={1024} rx={230} fill={tile} />
      <Path
        d="M354 700V370L670 700V370"
        fill="none"
        stroke={C.textInverse}
        strokeWidth={80}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={670} cy={315} r={43} fill={dot} />
    </Svg>
  );
}

type NilyaLockupProps = {
  iconSize?: number;
  showTagline?: boolean;
  onDark?: boolean;
  mono?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Responsive horizontal lockup with the required clear space. A tagline request
 * is ignored below a 32px icon, matching the small-size brand rule.
 */
export function NilyaLockup({
  iconSize = 40,
  showTagline = false,
  onDark = false,
  mono = false,
  style,
}: NilyaLockupProps) {
  const resolvedSize = Math.max(iconSize, MIN_ICON_SIZE);
  const withTagline = showTagline && resolvedSize >= 32;
  const clearSpace = Math.ceil(resolvedSize * ICON_CORNER_RATIO);
  const wordmarkColor = onDark ? C.textInverse : C.textPrimary;
  const wordmarkSize = resolvedSize * (72 / 140);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={withTagline ? 'Nilya Marketplace' : 'Nilya'}
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: resolvedSize * (36 / 140),
          padding: clearSpace,
        },
        style,
      ]}
    >
      <NilyaIcon size={resolvedSize} mono={mono} decorative />
      <View style={{ justifyContent: 'center' }}>
        <Text
          style={{
            color: wordmarkColor,
            fontFamily: font.wordmark,
            fontSize: wordmarkSize,
            lineHeight: wordmarkSize * 1.05,
            fontWeight: '500',
            letterSpacing: -2,
          }}
        >
          nilya
        </Text>
        {withTagline ? (
          <Text
            style={{
              color: onDark ? C.textInverse : C.textSecondary,
              fontFamily: font.tagline,
              fontSize: Math.max(8, resolvedSize * (15 / 140)),
              lineHeight: Math.max(11, resolvedSize * (24 / 140)),
              fontWeight: '400',
              letterSpacing: Math.max(3, resolvedSize * (8 / 140)),
              marginLeft: resolvedSize * (4 / 140),
            }}
          >
            MARKETPLACE
          </Text>
        ) : null}
      </View>
    </View>
  );
}

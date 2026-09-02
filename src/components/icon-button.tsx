import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/ui';
import { color as C, elevation, radius, scale, touch, type } from '@/theme/tokens';

export type IconButtonVariant = 'muted' | 'solid' | 'surface';

/**
 * The circular 44×44 icon control used by every header and hero: back, heart,
 * bag, share, filter.
 *
 * Three fills. `muted` sits on a page (warm grey disc, ink glyph), `solid` is
 * the one emphatic control in a row (ink disc, white glyph), and `surface` is
 * a white disc with a soft shadow for floating over a photograph.
 */
export function IconButton({
  icon,
  label,
  onPress,
  variant = 'muted',
  badge,
  fill = 'none',
  color,
  accessibilityState,
  style,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  variant?: IconButtonVariant;
  /** A real count, shown only when above zero. */
  badge?: number;
  /** Fill for the glyph — the filled heart when something is saved. */
  fill?: string;
  /** Glyph colour override; defaults follow the variant. */
  color?: string;
  accessibilityState?: {
    selected?: boolean;
    disabled?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };
  style?: StyleProp<ViewStyle>;
}) {
  const solid = variant === 'solid';
  const glyph = color ?? (solid ? C.textInverse : C.textPrimary);
  const showBadge = typeof badge === 'number' && badge > 0;

  return (
    <View style={style}>
      <PressableScale
        onPress={onPress}
        scale={scale.buttonPressed}
        motionRole="selection"
        accessibilityRole="button"
        accessibilityLabel={showBadge ? `${label}, ${badge}` : label}
        accessibilityState={accessibilityState}
        style={{
          width: touch.minimum,
          height: touch.minimum,
          borderRadius: radius.radiusPill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: solid ? C.textPrimary : variant === 'surface' ? C.surface : C.bgMuted,
          ...(variant === 'surface' ? elevation.card : null),
        }}
      >
        <Icon name={icon} role="inline" color={glyph} fill={fill} decorative />
      </PressableScale>
      {showBadge ? (
        <View
          accessible={false}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: radius.radiusPill,
            backgroundColor: C.error,
            borderWidth: 2,
            borderColor: C.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              ...type.caption,
              fontSize: 10,
              lineHeight: 12,
              fontFamily: type.metadataMedium.fontFamily,
              color: C.textInverse,
              fontVariant: ['tabular-nums'],
            }}
          >
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

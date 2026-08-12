import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { color as C } from '@/theme/tokens';

/**
 * Translucent bar with a hairline edge — the design's
 * `rgba(240,238,230,.96) + backdrop-filter: blur()` treatment.
 *
 * Android's BlurView is expensive and lands inconsistently, so it falls back to
 * a near-opaque tint there; the design's alpha is high enough that the
 * difference is not visible in practice.
 */
export function FrostedBar({
  children,
  edge = 'top',
  intensity = 24,
  style,
}: {
  children?: React.ReactNode;
  /** Which side gets the hairline separator. */
  edge?: 'top' | 'bottom' | 'none';
  intensity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const border: ViewStyle =
    edge === 'top'
      ? { borderTopWidth: 1, borderTopColor: C.border }
      : edge === 'bottom'
        ? { borderBottomWidth: 1, borderBottomColor: C.border }
        : {};

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint="light" style={[border, style]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(240,238,230,0.72)' }]} />
        {children}
      </BlurView>
    );
  }

  return <View style={[{ backgroundColor: 'rgba(240,238,230,0.97)' }, border, style]}>{children}</View>;
}

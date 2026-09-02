import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { color as C } from '@/theme/tokens';

/**
 * Translucent bar with a hairline edge.
 *
 * Android's BlurView is expensive and lands inconsistently, so it falls back to
 * a near-opaque tint there; the alpha is high enough that the difference is not
 * visible in practice.
 */
export function FrostedBar({
  children,
  edge = 'top',
  intensity = 24,
  opaque = false,
  style,
}: {
  children?: React.ReactNode;
  /** Which side gets the hairline separator. */
  edge?: 'top' | 'bottom' | 'none';
  intensity?: number;
  /** Primary navigation is deliberately solid Warm Ivory; sticky task bars may blur. */
  opaque?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const border: ViewStyle =
    edge === 'top'
      ? { borderTopWidth: 1, borderTopColor: C.border }
      : edge === 'bottom'
        ? { borderBottomWidth: 1, borderBottomColor: C.border }
        : {};

  if (Platform.OS === 'ios' && !opaque) {
    return (
      <BlurView intensity={intensity} tint="light" style={[border, style]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: C.floatingSurface }]} />
        {children}
      </BlurView>
    );
  }

  return <View style={[{ backgroundColor: C.background }, border, style]}>{children}</View>;
}

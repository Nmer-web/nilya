import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { color as C, radius, space } from '@/theme/tokens';

/**
 * Segmented progress used across onboarding — the three story slides, and
 * the two post-auth steps (profile setup, notifications). One shape, reused
 * rather than redrawn per screen: a row of rounded bars, filled left to
 * right, with a color pair so it can sit on both light and dark story
 * backgrounds.
 */
export function StepProgress({
  count,
  filled,
  color = C.primary,
  trackColor = 'rgba(20,20,19,.12)',
  style,
}: {
  count: number;
  filled: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${filled} of ${count}`}
      style={[{ flexDirection: 'row', gap: space.space4 }, style]}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: radius.radiusSmall,
            backgroundColor: i < filled ? color : trackColor,
          }}
        />
      ))}
    </View>
  );
}

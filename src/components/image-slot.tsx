import { Image, type ImageContentFit, type ImageSource } from 'expo-image';
import React, { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { T } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { color as C, duration, easing, image as imageToken, space } from '@/theme/tokens';

type ImageRole = keyof typeof imageToken;

/**
 * Canonical real-image surface. A missing or failed source stays a neutral
 * non-product well; no bundled or generated product image is substituted.
 */
export function ImageSlot({
  source,
  label,
  role = 'listing',
  tiny,
  glyph,
  contentFit = 'cover',
  style,
}: {
  source?: ImageSource | string | null;
  label?: string;
  role?: ImageRole;
  tiny?: boolean;
  glyph?: number;
  contentFit?: ImageContentFit;
  style?: StyleProp<ViewStyle>;
}) {
  const { reduceMotion } = useReducedMotion();
  const sourceKey = typeof source === 'string' ? source : source ? JSON.stringify(source) : '';
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showImage = Boolean(source && sourceKey !== failedSource);
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  const revealStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));

  React.useEffect(() => {
    cancelAnimation(reveal);
    reveal.set(reduceMotion ? 1 : 0);
  }, [reduceMotion, reveal, sourceKey]);

  return (
    <View
      style={[
        {
          flex: 1,
          overflow: 'hidden',
          backgroundColor: C.surface,
          borderRadius: imageToken[role].radius,
          borderCurve: 'continuous',
        },
        style,
      ]}
    >
      {showImage ? (
        <Animated.View style={[{ width: '100%', height: '100%' }, revealStyle]}>
          <Image
            source={source}
            contentFit={contentFit}
            cachePolicy="memory-disk"
            transition={0}
            accessibilityLabel={label}
            accessible={Boolean(label)}
            onLoad={() => {
              cancelAnimation(reveal);
              reveal.set(reduceMotion ? 1 : withTiming(1, {
                duration: duration.standard,
                easing: Easing.bezier(...easing.standard),
              }));
            }}
            onError={() => {
              cancelAnimation(reveal);
              reveal.set(0);
              setFailedSource(sourceKey);
            }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>
      ) : (
        <View
          accessibilityLabel={label ? `Image unavailable for ${label}` : 'Image unavailable'}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: space.space8,
            gap: space.space4,
          }}
        >
          <Icon name="image" role={tiny ? 'metadata' : 'hero'} size={glyph} color={C.textSecondary} decorative />
          {!tiny && label ? (
            <T variant="caption" color={C.textSecondary} numberOfLines={2} style={{ textAlign: 'center' }}>
              Image unavailable
            </T>
          ) : null}
        </View>
      )}
    </View>
  );
}

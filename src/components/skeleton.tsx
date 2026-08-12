import React, { useEffect } from 'react';
import { Animated, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { color as C, radius, space } from '@/theme/tokens';

/**
 * Shimmer as an opacity pulse rather than a travelling highlight.
 *
 * A sweeping gradient would need a gradient library and, more to the point, it
 * animates a property the native driver cannot take — so a screenful of them
 * competes with the scroll for the JS thread, which is exactly when a skeleton
 * is on screen. Opacity is native-driver-safe and, at this amplitude, reads the
 * same at a glance.
 */
function useShimmer() {
  const v = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 0, duration: 700, useNativeDriver: NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  return v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });
}

/** A single shimmering block. Compose these into screen-shaped skeletons. */
export function Skeleton({
  width,
  height,
  round = radius.sm,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  round?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useShimmer();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: round, backgroundColor: C.well, opacity }, style]}
    />
  );
}

/**
 * Placeholder matching a real `ProductCard`'s metrics, so nothing shifts when
 * the content arrives — the image well, title, price and two metadata lines
 * occupy exactly the space the loaded card will.
 */
function CardSkeleton({ width }: { width: number }) {
  return (
    <View style={{ width }}>
      <Skeleton width={width} height={width * (4 / 3)} round={radius.xl} />
      <Skeleton width="70%" height={12} style={{ marginTop: 10 }} />
      <Skeleton width="38%" height={15} style={{ marginTop: 7 }} />
      <Skeleton width="52%" height={10} style={{ marginTop: 8 }} />
    </View>
  );
}

/** Grid of card skeletons laid out on the same gutters as `ProductGrid`. */
export function ProductGridSkeleton({ count = 6, columns = 2 }: { count?: number; columns?: number }) {
  const { width: screen } = useWindowDimensions();
  const width = (screen - space.gutter * 2 - 10 * (columns - 1)) / columns;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading items"
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 20,
        columnGap: 10,
        paddingHorizontal: space.gutter,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} width={width} />
      ))}
    </View>
  );
}

/**
 * Cross-fade from skeleton to content.
 *
 * Mounting the children behind the fade rather than swapping trees means the
 * real layout is measured before it becomes visible, so the fade never lands
 * on a reflow.
 */
export function FadeIn({
  children,
  duration = 260,
  delay = 0,
  /** Horizontal travel, in points, that the content slides in from. */
  x = 0,
  /** Vertical travel, in points. Used by the chat bubbles. */
  y = 0,
  style,
}: {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  x?: number;
  y?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useAnimatedValue(0);

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [p, duration, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: p,
          transform: [
            { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [x, 0] }) },
            { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

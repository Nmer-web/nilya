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
        Animated.timing(v, { toValue: 1, duration: 850, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 0, duration: 850, useNativeDriver: NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  /**
   * A shallow pulse, and deliberately in unison across the screen. Staggering
   * the phase makes a grid twinkle, which is the flashing to avoid; every block
   * breathing together reads as one surface waiting rather than many parts
   * blinking.
   */
  return v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
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
      style={[{ width, height, borderRadius: round, backgroundColor: C.surfaceSecondary, opacity }, style]}
    />
  );
}

/**
 * One product card, unloaded — image, title, price, metadata.
 *
 * Every measurement is taken from the real `ProductCard` so that nothing shifts
 * when content replaces it: the 3:4 well, the 8pt gap under it, and the same
 * four stacked lines. A skeleton whose geometry only approximates the card
 * produces a jump at the very moment the user starts reading.
 */
export function ProductSkeleton({ width }: { width: number }) {
  return (
    <View style={{ width }}>
      <Skeleton width={width} height={width * (4 / 3)} round={radius.lg} />
      <Skeleton width="70%" height={12} style={{ marginTop: 10 }} />
      <Skeleton width="38%" height={15} style={{ marginTop: 7 }} />
      <Skeleton width="52%" height={10} style={{ marginTop: 8 }} />
    </View>
  );
}

/** Grid of product skeletons laid out on the same gutters as `ProductGrid`. */
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
        <ProductSkeleton key={i} width={width} />
      ))}
    </View>
  );
}

/**
 * One row of a list — the shape shared by orders, inbox threads and any other
 * surface built from `ListingThumb` plus a stack of lines.
 *
 * Sized against the real row: a 54pt thumb at the card's 3:4 crop, then title,
 * price and one metadata line.
 */
export function ListingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ paddingHorizontal: space.gutter, gap: 10 }}
    >
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            gap: 12,
            padding: 14,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
          }}
        >
          <Skeleton width={54} height={72} round={radius.sm} />
          <View style={{ flex: 1, paddingTop: 2 }}>
            <Skeleton width="72%" height={13} />
            <Skeleton width="30%" height={16} style={{ marginTop: 8 }} />
            <Skeleton width="56%" height={10} style={{ marginTop: 9 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * The profile header — avatar, name, rating line, stats — followed by the
 * three-up listing grid beneath it.
 *
 * The grid maths mirrors `PriceTileGrid` rather than restating it loosely, so
 * the tiles land on the same columns the real ones will.
 */
export function ProfileSkeleton() {
  const { width: screen } = useWindowDimensions();
  const tile = (screen - space.gutter * 2 - 8 * 2) / 3;

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading profile">
      <View style={{ flexDirection: 'row', gap: 14, padding: space.gutter }}>
        <Skeleton width={64} height={64} round={radius.pill} />
        <View style={{ flex: 1, paddingTop: 6 }}>
          <Skeleton width="58%" height={20} />
          <Skeleton width="44%" height={12} style={{ marginTop: 10 }} />
          <Skeleton width="66%" height={11} style={{ marginTop: 8 }} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.gutter, paddingBottom: space.lg }}>
        <Skeleton width="48%" height={40} round={radius.md} />
        <Skeleton width="48%" height={40} round={radius.md} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          paddingHorizontal: space.gutter,
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={{ width: tile }}>
            <Skeleton width={tile} height={tile * (4 / 3)} round={radius.lg} />
            <Skeleton width="52%" height={12} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
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
  /**
   * Starting scale. Keep it close to 1 — imagery settling from 0.98 reads as
   * the photo arriving, while anything lower reads as a zoom.
   */
  scale = 1,
  style,
}: {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  x?: number;
  y?: number;
  scale?: number;
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
            { scale: p.interpolate({ inputRange: [0, 1], outputRange: [scale, 1] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

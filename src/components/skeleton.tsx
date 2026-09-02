import React, { useEffect } from 'react';
import { useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { color as C, duration as durationToken, easing, elevation, opacity as opacityToken, radius, screenGutter, space } from '@/theme/tokens';

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
  const value = useSharedValue<number>(opacityToken.skeletonHigh);
  const { allowRepeat } = useReducedMotion();

  useEffect(() => {
    cancelAnimation(value);
    if (!allowRepeat) {
      value.set(opacityToken.skeletonHigh);
      return;
    }
    value.set(withRepeat(
      withSequence(
        withTiming(opacityToken.skeletonLow, { duration: durationToken.slow }),
        withTiming(opacityToken.skeletonHigh, { duration: durationToken.slow })
      ),
      -1,
      false
    ));
    return () => cancelAnimation(value);
  }, [allowRepeat, value]);

  /**
   * A shallow pulse, and deliberately in unison across the screen. Staggering
   * the phase makes a grid twinkle, which is the flashing to avoid; every block
   * breathing together reads as one surface waiting rather than many parts
   * blinking.
   */
  return useAnimatedStyle(() => ({ opacity: value.value }));
}

/** A single shimmering block. Compose these into screen-shaped skeletons. */
export function Skeleton({
  width,
  height,
  round = radius.radiusSmall,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  round?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const animatedStyle = useShimmer();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: round, backgroundColor: C.skeletonBase }, animatedStyle, style]}
    />
  );
}

/**
 * One product card, unloaded — image, title, price, metadata.
 *
 * Every measurement is taken from the real `ListingCard`'s framed treatment so
 * that nothing shifts when content replaces it: the same bordered/raised
 * frame, the 3:4 well, the 12pt inner padding, and the same core text stack.
 * A skeleton whose geometry only approximates the card produces a jump at the
 * very moment the user starts reading.
 */
export function ProductSkeleton({ width }: { width: number }) {
  return (
    <View
      style={{
        width,
        overflow: 'hidden',
        borderRadius: radius.radiusXLarge,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
        ...elevation.raised,
      }}
    >
      <Skeleton width={width} height={width * (4 / 3)} round={0} />
      <View style={{ padding: space.space12 }}>
        <Skeleton width="70%" height={12} />
        <Skeleton width="38%" height={15} style={{ marginTop: space.space8 }} />
        <Skeleton width="52%" height={10} style={{ marginTop: space.space8 }} />
      </View>
    </View>
  );
}

/** Grid of listing skeletons laid out on the same gutters as `ListingGrid`. */
export function ProductGridSkeleton({ count = 6, columns = 2 }: { count?: number; columns?: number }) {
  const { width: screen } = useWindowDimensions();
  const gutter = screenGutter(screen);
  const width = (screen - gutter * 2 - space.space12 * (columns - 1)) / columns;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading items"
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: space.space20,
        columnGap: space.space12,
        paddingHorizontal: gutter,
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
      style={{ paddingHorizontal: space.gutterCompact, gap: space.space12 }}
    >
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            gap: space.space12,
            padding: space.space16,
            borderRadius: radius.radiusLarge,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
          }}
        >
          <Skeleton width={54} height={72} round={radius.radiusSmall} />
          <View style={{ flex: 1, paddingTop: space.space4 }}>
            <Skeleton width="72%" height={13} />
            <Skeleton width="30%" height={16} style={{ marginTop: space.space8 }} />
            <Skeleton width="56%" height={10} style={{ marginTop: space.space8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Compact chip rows used while real category records are loading. */
export function CategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading categories"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.space8 }}
    >
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} width={index % 3 === 0 ? 112 : 88} height={44} round={radius.radiusMedium} />
      ))}
    </View>
  );
}

/** Search suggestions/results: one field-shaped block and real-row-shaped lines. */
export function SearchSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading search results" style={{ gap: space.space12 }}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: space.space12, minHeight: 44 }}>
          <Skeleton width={20} height={20} round={radius.radiusSmall} />
          <View style={{ flex: 1, gap: space.space8 }}>
            <Skeleton width={index % 2 === 0 ? '68%' : '52%'} height={13} />
            <Skeleton width="36%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Inbox rows with participant, preview, timestamp, and listing thumbnail. */
export function ConversationSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading conversations">
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: space.space12, paddingVertical: space.space12, paddingHorizontal: space.gutterCompact }}>
          <Skeleton width={44} height={44} round={radius.radiusPill} />
          <View style={{ flex: 1, paddingTop: space.space4, gap: space.space8 }}>
            <Skeleton width="42%" height={13} />
            <Skeleton width="76%" height={12} />
          </View>
          <Skeleton width={40} height={53} round={radius.radiusSmall} />
        </View>
      ))}
    </View>
  );
}

/** Chat transcript with alternating bubble geometry. */
export function MessageSkeleton() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading messages" style={{ gap: space.space12 }}>
      <Skeleton width="58%" height={44} round={radius.radiusXLarge} />
      <Skeleton width="42%" height={44} round={radius.radiusXLarge} style={{ alignSelf: 'flex-end' }} />
      <Skeleton width="66%" height={64} round={radius.radiusXLarge} />
    </View>
  );
}

/** Notification rows with status glyph and two text lines. */
export function NotificationSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading notifications" style={{ paddingHorizontal: space.gutterCompact, gap: space.space16 }}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: space.space12 }}>
          <Skeleton width={38} height={38} round={radius.radiusPill} />
          <View style={{ flex: 1, paddingTop: space.space4, gap: space.space8 }}>
            <Skeleton width="64%" height={13} />
            <Skeleton width="40%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Order-card rows, shared by the orders route and commerce loading states. */
export function OrderSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading orders" style={{ gap: space.space12 }}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} width="100%" height={96} round={radius.radiusLarge} />
      ))}
    </View>
  );
}

/** Profile editor geometry: avatar followed by growing field shells. */
export function ProfileFormSkeleton() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading profile" style={{ gap: space.space16 }}>
      <Skeleton width={88} height={88} round={radius.radiusPill} style={{ alignSelf: 'center' }} />
      <Skeleton width="100%" height={52} round={radius.radiusMedium} />
      <Skeleton width="100%" height={88} round={radius.radiusMedium} />
      <Skeleton width="100%" height={52} round={radius.radiusMedium} />
    </View>
  );
}

/**
 * The profile header — avatar, name, rating line, stats — followed by the
 * three-up listing grid beneath it.
 *
 * Currently unused: the seller profile carries a skeleton matching its own
 * two-column layout, and the account profile has not been converted yet. Kept
 * as the three-up shape for whichever surface adopts it.
 */
export function ProfileSkeleton() {
  const { width: screen } = useWindowDimensions();
  const gutter = screenGutter(screen);
  const tile = (screen - gutter * 2 - space.space8 * 2) / 3;

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading profile">
      <View style={{ flexDirection: 'row', gap: space.space16, padding: gutter }}>
        <Skeleton width={64} height={64} round={radius.radiusPill} />
        <View style={{ flex: 1, paddingTop: space.space8 }}>
          <Skeleton width="58%" height={20} />
          <Skeleton width="44%" height={12} style={{ marginTop: space.space8 }} />
          <Skeleton width="66%" height={11} style={{ marginTop: space.space8 }} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.space8, paddingHorizontal: gutter, paddingBottom: space.space16 }}>
        <Skeleton width="48%" height={40} round={radius.radiusMedium} />
        <Skeleton width="48%" height={40} round={radius.radiusMedium} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: space.space8,
          paddingHorizontal: gutter,
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={{ width: tile }}>
            <Skeleton width={tile} height={tile * (4 / 3)} round={radius.radiusLarge} />
            <Skeleton width="52%" height={12} style={{ marginTop: space.space8 }} />
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
  duration = durationToken.standard,
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
  const progress = useSharedValue(0);
  const { reduceMotion } = useReducedMotion();

  useEffect(() => {
    cancelAnimation(progress);
    progress.set(0);
    progress.set(withDelay(reduceMotion ? 0 : delay, withTiming(1, {
      duration: reduceMotion ? Math.min(duration, durationToken.instant) : duration,
      easing: Easing.bezier(...easing.standard),
    })));
    return () => cancelAnimation(progress);
  }, [progress, duration, delay, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: reduceMotion ? 0 : (1 - progress.value) * x },
      { translateY: reduceMotion ? 0 : (1 - progress.value) * y },
      { scale: reduceMotion ? 1 : scale + (1 - scale) * progress.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavHeight } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { T, Tap } from '@/components/ui';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { alpha, color as C, radius, shadow } from '@/theme/tokens';

/** Dimmed backdrop; tapping it dismisses, matching the design's scrim. */
export function Scrim({ onPress, closing }: { onPress: () => void; closing?: boolean }) {
  const o = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(o, {
      toValue: closing ? 0 : 1,
      // Leaving is quicker than arriving: the backdrop should be gone before
      // the sheet has finished travelling, not lingering over the screen.
      duration: closing ? 170 : 200,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [o, closing]);

  return (
    /*
     * Inert once closing. The backdrop fades but stays mounted until the sheet
     * has finished travelling, and a full-screen pressable at zero opacity is
     * an invisible tap-blocker — this also stops a second tap re-triggering a
     * dismissal that is already under way.
     */
    <Animated.View
      pointerEvents={closing ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, { opacity: o }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onPress}
        style={[StyleSheet.absoluteFill, { backgroundColor: alpha.scrim }]}
      />
    </Animated.View>
  );
}

/**
 * Bottom sheet that springs up on mount.
 *
 * The spring is critically damped — `friction` high enough that it settles
 * without a visible bounce. A sheet carrying a form should arrive and stop; the
 * overshoot that suits a heart tap reads as instability under a column of
 * inputs.
 */
export function Sheet({
  children,
  /** Pin the sheet's top edge, as the full-height Filters sheet does. */
  top,
  style,
  /** Play the exit. The sheet stays mounted until `onExited` fires. */
  closing,
  onExited,
}: {
  children: React.ReactNode;
  top?: number;
  style?: StyleProp<ViewStyle>;
  closing?: boolean;
  onExited?: () => void;
}) {
  const { height: screen } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const p = useAnimatedValue(1);

  useEffect(() => {
    Animated.spring(p, {
      toValue: 0,
      tension: 90,
      friction: 18,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [p]);

  /**
   * The exit.
   *
   * `overshootClamping` is what keeps this from bouncing at the bottom of its
   * travel — a sheet that rebounds off the screen edge on the way out reads as
   * a glitch rather than as physics. The raised rest thresholds stop the spring
   * asymptotically creeping toward its target: once it is within a point of the
   * edge it is off-screen anyway, and waiting for a true rest would leave the
   * overlay mounted for a few hundred milliseconds after it is invisible.
   *
   * `onExited` is what unmounts it, so the animation's own completion drives
   * teardown rather than a timeout guessing at the duration.
   */
  useEffect(() => {
    if (!closing) return;
    Animated.spring(p, {
      toValue: 1,
      tension: 140,
      friction: 22,
      overshootClamping: true,
      restDisplacementThreshold: 1,
      restSpeedThreshold: 100,
      useNativeDriver: NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished) onExited?.();
    });
  }, [closing, p, onExited]);

  const translateY = p.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height || screen],
  });

  const opacity = p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          ...(top !== undefined && { top: Math.max(top, insets.top + 16) }),
          backgroundColor: C.background,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          ...shadow.sheet,
          opacity,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** The short grab bar at the top of every sheet. */
export function SheetGrabber({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: C.borderStrong,
          alignSelf: 'center',
        },
        style,
      ]}
    />
  );
}

/** Circular close affordance used in sheet headers. */
export function SheetClose({ onPress }: { onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={8}
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: C.surfaceSecondary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="close" size={13} color={C.text} strokeWidth={2.6} />
    </Tap>
  );
}

/**
 * Toast pill that lifts into place just above the nav.
 *
 * White on white, so it earns its edge from a hairline border plus a soft
 * shadow rather than from a dark fill — a black slab sliding in reads as an
 * error even when the message is a success.
 */
export function Toast({ message }: { message: string }) {
  const navHeight = useNavHeight();
  const p = useAnimatedValue(0);

  useEffect(() => {
    p.setValue(0);
    Animated.timing(p, {
      toValue: 1,
      duration: 260,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [p, message]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: navHeight + 16,
        backgroundColor: C.background,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: C.border,
        paddingVertical: 13,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        opacity: p,
        transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        ...shadow.floating,
      }}
    >
      <Icon name="check" size={15} color={C.success} strokeWidth={2.6} />
      <T w={500} size={13.5} style={{ flex: 1 }}>
        {message}
      </T>
    </Animated.View>
  );
}

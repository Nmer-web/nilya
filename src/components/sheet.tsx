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
import { useAnimatedValue } from '@/hooks/use-animated-value';
import { color as C, radius } from '@/theme/tokens';

/** Dimmed backdrop; tapping it dismisses, matching the design's scrim. */
export function Scrim({ onPress }: { onPress: () => void }) {
  const o = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(o, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [o]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: o }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onPress}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(23,23,23,0.4)' }]}
      />
    </Animated.View>
  );
}

/**
 * Bottom sheet that rises on mount with the design's
 * `cubic-bezier(.32,.72,0,1)` curve.
 */
export function Sheet({
  children,
  /** Pin the sheet's top edge, as the full-height Filters sheet does. */
  top,
  style,
}: {
  children: React.ReactNode;
  top?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { height: screen } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const p = useAnimatedValue(1);

  useEffect(() => {
    Animated.timing(p, {
      toValue: 0,
      duration: 330,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      useNativeDriver: true,
    }).start();
  }, [p]);

  const translateY = p.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height || screen],
  });

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
          backgroundColor: C.bg,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          borderTopWidth: 1,
          borderTopColor: C.border,
          shadowColor: '#000',
          shadowOpacity: 0.14,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: -12 },
          elevation: 24,
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
          width: 38,
          height: 4,
          borderRadius: 2,
          backgroundColor: C.border,
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
        backgroundColor: C.well,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="close" size={13} color={C.textSecondary} strokeWidth={2.6} />
    </Tap>
  );
}

/** Toast pill that lifts into place just above the nav. */
export function Toast({ message }: { message: string }) {
  const navHeight = useNavHeight();
  const p = useAnimatedValue(0);

  useEffect(() => {
    p.setValue(0);
    Animated.timing(p, {
      toValue: 1,
      duration: 260,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
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
        backgroundColor: C.text,
        borderRadius: 13,
        paddingVertical: 13,
        paddingHorizontal: 16,
        opacity: p,
        transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
      }}
    >
      <T w={500} size={13.5} color={C.onDark}>
        {message}
      </T>
    </Animated.View>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useNavHeight } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { T, Tap } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  color as C,
  duration,
  easing,
  elevation,
  layer,
  radius,
  space,
  spring,
  touch,
} from '@/theme/tokens';

export function Scrim({ onPress, closing }: { onPress: () => void; closing?: boolean }) {
  const value = useSharedValue(0);
  const { reduceMotion } = useReducedMotion();

  useEffect(() => {
    cancelAnimation(value);
    value.set(withTiming(closing ? 0 : 1, {
      duration: reduceMotion ? duration.instant : duration.standard,
      easing: closing
        ? Easing.bezier(easing.exit[0], easing.exit[1], easing.exit[2], easing.exit[3])
        : Easing.bezier(easing.standard[0], easing.standard[1], easing.standard[2], easing.standard[3]),
    }));
  }, [closing, reduceMotion, value]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: value.value }));

  return (
    <Animated.View
      pointerEvents={closing ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, { zIndex: layer.overlay }, animatedStyle]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss sheet"
        onPress={onPress}
        style={[StyleSheet.absoluteFill, { backgroundColor: C.overlay }]}
      />
    </Animated.View>
  );
}

export function Sheet({
  children,
  top,
  style,
  closing,
  onExited,
  accessibilityLabel = 'Sheet',
}: {
  children: React.ReactNode;
  top?: number;
  style?: StyleProp<ViewStyle>;
  closing?: boolean;
  onExited?: () => void;
  accessibilityLabel?: string;
}) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useReducedMotion();
  const [height, setHeight] = useState(0);
  const progress = useSharedValue(reduceMotion ? 0 : 1);
  const sheetRef = useRef<View>(null);
  const previousWebFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      previousWebFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    const node = findNodeHandle(sheetRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
    return () => {
      previousWebFocus.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(progress);
      progress.set(closing ? 1 : 0);
      if (closing) onExited?.();
      return;
    }

    cancelAnimation(progress);
    progress.set(withSpring(closing ? 1 : 0, spring.sheet, (finished) => {
      if (finished && closing && onExited) runOnJS(onExited)();
    }));
  }, [closing, onExited, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 1 : 1 - progress.value,
    transform: [{ translateY: reduceMotion ? 0 : progress.value * (height || screenHeight) }],
  }));

  return (
    <Animated.View
      ref={sheetRef}
      accessibilityLabel={accessibilityLabel}
      accessibilityViewIsModal
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={[
        {
          position: 'absolute',
          zIndex: layer.modal,
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: screenHeight - Math.max(insets.top, space.space16),
          ...(top !== undefined ? { top: Math.max(top, insets.top + space.space16) } : {}),
          paddingBottom: insets.bottom,
          backgroundColor: C.background,
          borderTopLeftRadius: radius.radiusSheet,
          borderTopRightRadius: radius.radiusSheet,
          borderCurve: 'continuous',
          ...elevation.sheet,
        },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function SheetGrabber({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible={false}
      style={[
        {
          width: space.space40,
          height: space.space4,
          borderRadius: radius.radiusPill,
          backgroundColor: C.borderStrong,
          alignSelf: 'center',
        },
        style,
      ]}
    />
  );
}

export function SheetClose({ onPress }: { onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Close"
      style={{
        width: touch.minimum,
        height: touch.minimum,
        borderRadius: radius.radiusPill,
        backgroundColor: C.surfaceSecondary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="close" role="inline" color={C.textPrimary} decorative />
    </Tap>
  );
}

export function Toast({ message, tone = 'neutral' }: { message: string; tone?: 'neutral' | 'success' | 'error' }) {
  const navHeight = useNavHeight();
  const progress = useSharedValue(0);
  const { reduceMotion } = useReducedMotion();
  const backgroundColor = tone === 'success' ? C.success : tone === 'error' ? C.error : C.primary;

  useEffect(() => {
    cancelAnimation(progress);
    progress.set(0);
    progress.set(withTiming(1, {
      duration: reduceMotion ? duration.instant : duration.standard,
      easing: Easing.bezier(...easing.standard),
    }));
  }, [message, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * space.space12 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[{
        position: 'absolute',
        zIndex: layer.toast,
        alignSelf: 'center',
        width: '100%',
        maxWidth: 360,
        left: space.space16,
        right: space.space16,
        bottom: navHeight + space.space16,
        backgroundColor,
        borderRadius: radius.radiusLarge,
        borderCurve: 'continuous',
        paddingVertical: space.space12,
        paddingHorizontal: space.space16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space8,
        ...elevation.floating,
      }, animatedStyle]}
    >
      {tone === 'success' ? <Icon name="check" role="metadata" color={C.textInverse} decorative /> : null}
      <T variant="cardTitle" color={C.textInverse} style={{ flex: 1 }}>
        {message}
      </T>
    </Animated.View>
  );
}

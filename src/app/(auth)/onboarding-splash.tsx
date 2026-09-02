import { Redirect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { NilyaIcon } from '@/components/brand';
import { T } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useOnboarding } from '@/store/onboarding-store';
import { color as C, duration, easing } from '@/theme/tokens';

const AUTO_ADVANCE_MS = 1150;

/**
 * The onboarding entry point, and the new fallback screen for the (auth)
 * group (declared first in its layout, replacing sign-in in that role).
 *
 * A returning member whose device already finished onboarding must never
 * see this again — the redirect below sends them straight to sign-in.
 * Nothing else in the flow redirects back here, so that hand-off is one-way:
 * "Log in" from welcome, a story's "I already have an account", or the
 * auth-choice sheet all push straight to the real sign-in screen without
 * looping through splash.
 */
export default function OnboardingSplash() {
  const router = useRouter();
  const { completed, loading } = useOnboarding();
  const { reduceMotion } = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    progress.set(
      withTiming(1, {
        duration: reduceMotion ? duration.instant : duration.slow,
        easing: Easing.bezier(...easing.standard),
      })
    );
  }, [progress, reduceMotion]);

  const advance = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    router.replace({ pathname: '/onboarding-story', params: { step: 'discover' } });
  }, [router]);

  useEffect(() => {
    if (loading || completed) return;
    timer.current = setTimeout(advance, AUTO_ADVANCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [loading, completed, advance]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));

  if (!loading && completed) return <Redirect href="/sign-in" />;

  return (
    <Pressable
      onPress={advance}
      accessibilityRole="button"
      accessibilityLabel="Skip"
      style={{ flex: 1, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={animatedStyle}>
        <NilyaIcon size={112} decorative />
      </Animated.View>
      <T
        variant="caption"
        color="rgba(255,255,255,0.55)"
        style={{ position: 'absolute', bottom: 44, left: 0, right: 0, textAlign: 'center' }}
      >
        Loading Nilya…
      </T>
    </Pressable>
  );
}

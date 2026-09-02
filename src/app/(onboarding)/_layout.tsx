import { Stack } from 'expo-router';
import React from 'react';

import { renderHiddenStackHeader } from '@/components/hidden-stack-header';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { color as C, duration } from '@/theme/tokens';

/**
 * The post-auth half of onboarding — profile setup through complete.
 * Reachable only once signed in with the on-device record still
 * incomplete; the guard lives in the root layout, so no screen here needs
 * its own check. No bottom nav and no overlay host: this group is not part
 * of the app shell, it is a one-time detour on the way into it.
 */
export default function OnboardingLayout() {
  const { reduceMotion } = useReducedMotion();

  return (
    <Stack
      screenOptions={{
        header: renderHiddenStackHeader,
        headerShown: false,
        contentStyle: { backgroundColor: C.background },
        animation: reduceMotion ? 'none' : 'slide_from_right',
        animationDuration: duration.standard,
      }}
    >
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="complete" options={{ animation: reduceMotion ? 'none' : 'fade' }} />
    </Stack>
  );
}

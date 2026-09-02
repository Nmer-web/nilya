import { Stack } from 'expo-router';
import React from 'react';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { renderHiddenStackHeader } from '@/components/hidden-stack-header';
import { useAuth } from '@/store/auth-store';
import { color as C, duration } from '@/theme/tokens';

/**
 * The logged-out half of the app — and, now, the entire pre-account half of
 * onboarding. Onboarding's post-auth steps (profile setup through complete)
 * live in the separate `(onboarding)` group, reachable only once signed in;
 * everything before an account exists belongs here, because this is the only
 * group ever reachable while signed out.
 *
 * `onboarding-splash` is declared first so it is the screen the router falls
 * back to when the signed-in guard fails — replacing `sign-in` in that role.
 * It carries its own declarative redirect to `sign-in` once onboarding is
 * already complete (see that file), so the fallback is correct either way
 * and no other screen here needs to know about onboarding state at all:
 * `sign-in` itself has no redirect, so "Log in" reachable from welcome, a
 * story's "I already have an account", or the auth-choice sheet never loops
 * back through splash.
 *
 * Recovery is handled with a second guard rather than an imperative
 * router.replace: when a recovery deep link arrives, reset-password becomes
 * the only navigable screen and the router moves there on its own. Pushing
 * manually from an effect would race the redirect the root layout is already
 * performing.
 */
export default function AuthLayout() {
  const { recovering } = useAuth();
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
      <Stack.Protected guard={!recovering}>
        <Stack.Screen name="onboarding-splash" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="onboarding-story" />
        <Stack.Screen name="onboarding-welcome" />
        <Stack.Screen name="onboarding-language" />
        <Stack.Screen name="onboarding-country" />
        <Stack.Screen name="onboarding-auth-choice" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="check-email" />
      </Stack.Protected>

      <Stack.Protected guard={recovering}>
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
    </Stack>
  );
}

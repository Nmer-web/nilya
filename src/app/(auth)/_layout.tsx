import { Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/store/auth-store';
import { color as C } from '@/theme/tokens';

/**
 * The logged-out half of the app.
 *
 * `sign-in` is declared first so it is the screen the router falls back to
 * when the signed-in guard fails.
 *
 * Recovery is handled with a second guard rather than an imperative
 * router.replace: when a recovery deep link arrives, reset-password becomes
 * the only navigable screen and the router moves there on its own. Pushing
 * manually from an effect would race the redirect the root layout is already
 * performing.
 */
export default function AuthLayout() {
  const { recovering } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Protected guard={!recovering}>
        <Stack.Screen name="sign-in" />
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

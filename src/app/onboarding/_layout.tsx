import { Stack } from 'expo-router';
import React from 'react';

import { color as C } from '@/theme/tokens';

/**
 * The onboarding stack.
 *
 * It sits outside both auth guards in the root navigator, because the flow
 * crosses the sign-in boundary: welcome, language and country happen before an
 * account exists, profile and preferences after it. Each screen that needs a
 * session checks for one itself rather than the group asserting a state that is
 * only true for half of it.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.background },
        animation: 'slide_from_right',
      }}
    />
  );
}

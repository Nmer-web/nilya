import { Stack, usePathname } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { BottomNav, NAV_ROUTES } from '@/components/bottom-nav';
import { Overlays } from '@/components/overlays';
import { color as C } from '@/theme/tokens';

/**
 * The signed-in half of the app. Everything under this group is unreachable
 * without a session — the guard lives in the root layout, so no screen here
 * needs its own check and none can be forgotten.
 */
export default function AppLayout() {
  const pathname = usePathname();
  const showNav = NAV_ROUTES.includes(pathname);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: 'slide_from_right',
        }}
      >
        {/* Tab destinations cross-fade; the design uses `fdIn` for these. */}
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="explore" options={{ animation: 'fade' }} />
        <Stack.Screen name="sell" options={{ animation: 'fade' }} />
        <Stack.Screen name="inbox" options={{ animation: 'fade' }} />
        <Stack.Screen name="profile" options={{ animation: 'fade' }} />
      </Stack>

      {showNav && <BottomNav pathname={pathname} />}
      <Overlays />
    </View>
  );
}

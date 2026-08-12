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
      {/*
        Two transition families, and the distinction carries meaning: lateral
        moves between peers cross-fade, while going deeper slides in from the
        right so the back gesture has somewhere to come from. Checkout is the
        exception — it arrives from the bottom, because a payment step is a
        commitment the user should feel they can back out of rather than
        another rung on the same ladder.
      */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: 'slide_from_right',
          animationDuration: 260,
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="explore" options={{ animation: 'fade' }} />
        <Stack.Screen name="sell" options={{ animation: 'fade' }} />
        <Stack.Screen name="inbox" options={{ animation: 'fade' }} />
        <Stack.Screen name="profile" options={{ animation: 'fade' }} />

        <Stack.Screen name="checkout" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="verify" options={{ animation: 'slide_from_bottom' }} />
      </Stack>

      {showNav && <BottomNav pathname={pathname} />}
      <Overlays />
    </View>
  );
}

import { Stack, usePathname } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { BottomNav, NAV_ROUTES } from '@/components/bottom-nav';
import { renderHiddenStackHeader } from '@/components/hidden-stack-header';
import { Overlays } from '@/components/overlays';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { color as C, duration } from '@/theme/tokens';

/**
 * The signed-in half of the app. Everything under this group is unreachable
 * without a session — the guard lives in the root layout, so no screen here
 * needs its own check and none can be forgotten.
 */
export default function AppLayout() {
  const pathname = usePathname();
  const showNav = NAV_ROUTES.includes(pathname) || pathname.startsWith('/category/');
  const { reduceMotion } = useReducedMotion();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
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
          header: renderHiddenStackHeader,
          headerShown: false,
          contentStyle: { backgroundColor: C.background },
          animation: reduceMotion ? 'none' : 'slide_from_right',
          animationDuration: duration.standard,
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="explore" options={{ animation: 'none' }} />
        <Stack.Screen name="sell" options={{ animation: 'none' }} />
        <Stack.Screen name="inbox" options={{ animation: 'none' }} />
        <Stack.Screen name="profile" options={{ animation: 'none' }} />

        <Stack.Screen name="checkout" options={{ animation: reduceMotion ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="verify" options={{ animation: reduceMotion ? 'none' : 'slide_from_bottom' }} />

        {/*
          Search fades rather than sliding. It is not a place you travel to —
          it is the search field growing to fill the screen, and a lateral slide
          would contradict that by implying somewhere new.
        */}
        <Stack.Screen name="search" options={{ animation: reduceMotion ? 'none' : 'fade', animationDuration: duration.fast }} />
      </Stack>

      {showNav && <BottomNav pathname={pathname} />}
      <Overlays />
    </View>
  );
}

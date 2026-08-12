import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomNav, NAV_ROUTES } from '@/components/bottom-nav';
import { Overlays } from '@/components/overlays';
import { AppProvider } from '@/store/app-store';
import { color as C } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    InstrumentSerif_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Shell />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Shell() {
  const pathname = usePathname();
  const showNav = NAV_ROUTES.includes(pathname);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
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

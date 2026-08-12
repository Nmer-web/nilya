import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '@/store/app-store';
import { AuthProvider, useAuth } from '@/store/auth-store';
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppProvider>
            <SplashGate fontsLoaded={fontsLoaded} />
            <View style={{ flex: 1, backgroundColor: C.bg }}>
              <StatusBar style="dark" />
              {fontsLoaded && <RootNavigator />}
            </View>
          </AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Holds the splash until BOTH the fonts and the stored session have resolved.
 *
 * Reading the session off AsyncStorage is asynchronous, so for the first frame
 * or two a returning user looks signed out. Hiding the splash on fonts alone
 * would show them the sign-in screen and then yank it away — and worse, the
 * router would have already committed that navigation.
 */
function SplashGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status } = useAuth();

  useEffect(() => {
    if (fontsLoaded && status !== 'loading') void SplashScreen.hideAsync();
  }, [fontsLoaded, status]);

  return null;
}

function RootNavigator() {
  const { status, recovering } = useAuth();

  // Mount no navigator at all until the session is known. Rendering the Stack
  // early is what causes the sign-in flash: the guards would evaluate against
  // a null session and the redirect would already have happened.
  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';

  /**
   * A recovery link signs the user in before they choose a new password, so
   * `signedIn` alone would drop them into the app with the old password still
   * valid. `recovering` keeps them in the auth group until the update lands.
   *
   * The two guards are mutually exclusive and cover every case, so exactly one
   * group is always navigable.
   */
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Protected guard={signedIn && !recovering}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn || recovering}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

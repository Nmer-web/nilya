import '../../global.css';

import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { renderHiddenStackHeader } from '@/components/hidden-stack-header';
import { AppProvider } from '@/store/app-store';
import { AuthProvider, useAuth } from '@/store/auth-store';
import { OnboardingProvider, useOnboarding } from '@/store/onboarding-store';
import { color as C } from '@/theme/tokens';

/*
 * TEMPORARY DIAGNOSTIC — remove once the GO_BACK warning is traced.
 *
 * React Navigation reports an unhandled action with console.error and no
 * stack, so the log says what happened but never who did it. Nothing in
 * `src` dispatches GO_BACK unguarded any more, which leaves the framework's
 * own back handling — and the only way to tell which press reaches it is to
 * capture a real stack at the moment the warning is written.
 */
if (__DEV__) {
  const writeError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('was not handled by any navigator')) {
      writeError('[nav-trace] unhandled action dispatched from:', new Error().stack);
    }
    writeError(...args);
  };
}

SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(C.background);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <AppProvider>
              <SplashGate fontsLoaded={fontsLoaded} />
              <View style={{ flex: 1, backgroundColor: C.background }}>
                <StatusBar style="dark" />
                {fontsLoaded && <RootNavigator />}
              </View>
            </AppProvider>
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Holds the splash until the fonts, the stored session, and the on-device
 * onboarding record have all resolved. Waiting for the asynchronous reads
 * prevents a returning member from seeing a signed-out (or wrong-onboarding)
 * screen before the correct route becomes available.
 */
function SplashGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status } = useAuth();
  const { loading: onboardingLoading } = useOnboarding();

  useEffect(() => {
    if (fontsLoaded && status !== 'loading' && !onboardingLoading) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, status, onboardingLoading]);

  return null;
}

function RootNavigator() {
  const { status, recovering } = useAuth();
  const { completed, loading: onboardingLoading } = useOnboarding();

  // Rendering the navigator before the stored session or the on-device
  // onboarding record resolves would evaluate the guards against temporary
  // defaults and flash the wrong screen.
  if (status === 'loading' || onboardingLoading) return null;

  const signedIn = status === 'signedIn';

  /**
   * A recovery link signs the member in before a new password is chosen.
   * `recovering` therefore keeps reset-password available and both the app
   * and onboarding groups protected until the password update finishes —
   * a password reset must never be routed into onboarding, even for a
   * signed-in member on a fresh reinstall whose device record is empty.
   *
   * Onboarding is a three-way split alongside (app) and (auth), not a step
   * inside either: it needs to be reachable both signed out (splash through
   * the auth-choice sheet, which live inside the (auth) group itself — see
   * its layout) and signed in (profile setup through complete, which live
   * here as their own group). `completed` is the only thing that decides
   * whether a signed-in member sees (app) or (onboarding).
   */
  const showApp = signedIn && !recovering && completed;
  const showPostAuthOnboarding = signedIn && !recovering && !completed;

  return (
    <Stack
      screenOptions={{
        header: renderHiddenStackHeader,
        headerShown: false,
        contentStyle: { backgroundColor: C.background },
      }}
    >
      <Stack.Protected guard={showApp}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={showPostAuthOnboarding}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn || recovering}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

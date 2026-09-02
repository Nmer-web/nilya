import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NilyaLockup } from '@/components/brand';
import { Button, T } from '@/components/ui';
import { color as C, space } from '@/theme/tokens';

export default function OnboardingWelcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.background,
        paddingTop: insets.top + space.space32,
        paddingBottom: insets.bottom + space.space24,
        paddingHorizontal: space.gutterRegular,
      }}
    >
      <NilyaLockup iconSize={56} showTagline />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.space12 }}>
        <T variant="display" align="center">
          Welcome to Nilya
        </T>
        <T variant="body" color={C.textSecondary} align="center" style={{ maxWidth: 320 }}>
          Buy. Sell. New.
        </T>
      </View>

      <View style={{ gap: space.space12 }}>
        <Button label="Create an account" onPress={() => router.push('/onboarding-language')} />
        <Button label="Log in" variant="secondary" onPress={() => router.push('/sign-in')} />
      </View>
    </View>
  );
}

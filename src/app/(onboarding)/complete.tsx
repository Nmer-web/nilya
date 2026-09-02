import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NilyaIcon } from '@/components/brand';
import { Button, T } from '@/components/ui';
import { useOnboarding } from '@/store/onboarding-store';
import { color as C, space } from '@/theme/tokens';

export default function OnboardingComplete() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { complete } = useOnboarding();

  const finish = () => {
    complete();
    router.replace('/');
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: space.gutterRegular,
        paddingBottom: insets.bottom + space.space24,
      }}
    >
      <NilyaIcon size={104} decorative />
      <T variant="display" color={C.textInverse} align="center" style={{ marginTop: space.space32 }}>
        You&apos;re ready.
      </T>
      <T
        variant="body"
        color="rgba(255,255,255,0.82)"
        align="center"
        style={{ marginTop: space.space12, maxWidth: 290 }}
      >
        Start discovering new products on Nilya.
      </T>

      <View style={{ position: 'absolute', left: space.gutterRegular, right: space.gutterRegular, bottom: insets.bottom + space.space24 }}>
        <Button label="Explore Nilya" variant="secondary" onPress={finish} style={{ borderWidth: 0 }} />
      </View>
    </View>
  );
}

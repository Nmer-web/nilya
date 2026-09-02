import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Scrim, Sheet, SheetGrabber } from '@/components/sheet';
import { Button, T, Tap } from '@/components/ui';
import { useGoBack } from '@/hooks/use-go-back';
import { color as C, space, touch } from '@/theme/tokens';

export default function OnboardingAuthChoice() {
  const router = useRouter();
  const dismiss = useGoBack('/onboarding-country');

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Scrim onPress={dismiss} />
      <Sheet accessibilityLabel="Join Nilya">
        <View style={{ paddingTop: space.space12, paddingHorizontal: space.gutterRegular, gap: space.space8 }}>
          <SheetGrabber style={{ marginBottom: space.space8 }} />
          <T variant="screenTitle">Join Nilya</T>
          <T variant="body" color={C.textSecondary} style={{ marginBottom: space.space8 }}>
            Create an account to buy, sell, save products, and message sellers.
          </T>

          <Button
            label="Continue with email"
            onPress={() => router.push('/sign-up')}
            style={{ marginTop: space.space8 }}
          >
            <Icon name="send" role="inline" color={C.textInverse} decorative />
          </Button>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.space4, marginTop: space.space12 }}>
            <T variant="metadata" color={C.textSecondary}>
              Already have an account?
            </T>
            <Tap
              onPress={() => router.push('/sign-in')}
              accessibilityRole="button"
              hitSlop={6}
              style={{ minHeight: touch.minimum, justifyContent: 'center' }}
            >
              <T variant="button" color={C.primary}>
                Log in
              </T>
            </Tap>
          </View>

          <T
            variant="caption"
            color={C.textSecondary}
            align="center"
            style={{ marginTop: space.space8, paddingBottom: space.space16 }}
          >
            By continuing, you agree to Nilya&apos;s Terms and Privacy Policy.
          </T>
        </View>
      </Sheet>
    </View>
  );
}

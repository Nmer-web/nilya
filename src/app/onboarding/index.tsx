import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingBottomAction } from '@/components/onboarding-ui';
import { T, Tap } from '@/components/ui';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { useAuth } from '@/store/auth-store';
import { color as C, space } from '@/theme/tokens';

/**
 * Welcome.
 *
 * No photograph. SAWA has no product imagery of its own and the database has no
 * listings, so an "editorial hero" would have to be a stock picture of someone
 * else's goods presented as this marketplace's — the exact fabrication the rest
 * of this app has been stripped of. The type carries the screen instead, which
 * is the more durable choice: it works on any device, in any locale, at any
 * connection speed, and stops being a placeholder the moment real listings
 * exist to photograph.
 */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();

  const v = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, useNativeDriver: NATIVE_DRIVER }).start();
  }, [v]);

  const rise = (from: number) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1, paddingTop: insets.top + 24, paddingHorizontal: space.gutter, justifyContent: 'center' }}>
        <Animated.View style={rise(14)}>
          <T w={700} size={17} tracking={2.5} color={C.textSecondary}>
            SAWA
          </T>
        </Animated.View>

        <Animated.View style={[rise(18), { paddingTop: space['3xl'] }]}>
          <T w={600} size={40} tracking={-1.2} lh={46}>
            Discover{'\n'}something new.
          </T>
        </Animated.View>

        <Animated.View style={[rise(22), { paddingTop: space.lg }]}>
          <T size={16.5} color={C.textSecondary} lh={25}>
            Shop new products from trusted sellers and discover what matters to you.
          </T>
        </Animated.View>
      </View>

      <OnboardingBottomAction
        label="Get started"
        onPress={() => router.push('/onboarding/language')}
        secondary={
          <Tap
            onPress={() => router.push(status === 'signedIn' ? '/' : '/sign-in')}
            accessibilityRole="button"
            style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <T w={500} size={14.5} color={C.textSecondary}>
              {status === 'signedIn' ? 'Continue to SAWA' : 'I already have an account'}
            </T>
          </Tap>
        }
      />
    </View>
  );
}

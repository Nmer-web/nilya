import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { color as C, radius, space, spring, type } from '@/theme/tokens';

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/** The confirmation after a real publication; the listing id is the new row's. */
export default function SellSuccess() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useReducedMotion();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const listingId = Array.isArray(id) ? id[0] : id;
  const valid = Boolean(listingId && UUID_PATTERN.test(listingId));
  const pop = useSharedValue(reduceMotion ? 1 : 0.6);

  useEffect(() => {
    pop.set(reduceMotion ? 1 : withSpring(1, spring.modal));
  }, [pop, reduceMotion]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }], opacity: Math.min(1, pop.value) }));

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel="Your listing is live"
      style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.space32, paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Animated.View style={[{ alignItems: 'center' }, style]}>
        <View style={{ width: 80, height: 80, borderRadius: radius.radiusPill, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={36} color={C.textInverse} decorative />
        </View>
        <Text style={{ ...type.display, color: C.textPrimary, marginTop: space.space24, textAlign: 'center' }}>Your listing is live</Text>
        <Text style={{ ...type.body, color: C.textSecondary, marginTop: space.space8, textAlign: 'center' }}>
          Buyers can find it on NILYA right now.
        </Text>
      </Animated.View>

      <View style={{ alignSelf: 'stretch', marginTop: space.space40, gap: space.space12 }}>
        {valid && listingId ? (
          <Button label="View listing" onPress={() => router.replace({ pathname: '/listing/[id]', params: { id: listingId } })} />
        ) : null}
        <Button label="Sell another" variant="secondary" onPress={() => router.replace('/sell/photos')} />
        <Button label="Back to Home" variant="ghost" onPress={() => router.dismissTo('/')} />
      </View>
    </View>
  );
}

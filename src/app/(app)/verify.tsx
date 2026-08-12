import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrostedBar } from '@/components/frosted-bar';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Button, T } from '@/components/ui';
import { useAnimatedValue } from '@/hooks/use-animated-value';
import { useApp } from '@/store/app-store';
import { color as C, radius } from '@/theme/tokens';

const REQUIREMENTS = [
  { title: 'Identity verification', sub: 'Passport or national ID' },
  { title: 'Bank account', sub: 'Where your payouts land' },
  { title: 'Secure payouts', sub: 'Paid out 2 days after delivery' },
];

export default function Verify() {
  const insets = useSafeAreaInsets();
  const { flash } = useApp();
  const [verifying, setVerifying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const start = () => {
    if (verifying) return;
    setVerifying(true);
    timer.current = setTimeout(() => {
      setVerifying(false);
      flash('Stripe onboarding would open here');
    }, 1500);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader dismiss border={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 120 + insets.bottom }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius['3xl'],
            backgroundColor: C.text,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="shieldCheck" size={27} color={C.onDark} strokeWidth={1.7} />
        </View>

        <T w={600} size={27} tracking={-0.6} lh={32.4} style={{ marginTop: 20 }}>
          Become a verified seller
        </T>
        <T size={14.5} color={C.textSecondary} lh={22.5} style={{ marginTop: 10 }}>
          To receive payouts from your sales, you&apos;ll need to complete secure seller verification. It takes about
          three minutes.
        </T>

        <View style={{ marginTop: 26 }}>
          {REQUIREMENTS.map((r) => (
            <View
              key={r.title}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 13,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
              }}
            >
              <Icon name="check" size={19} color={C.green} strokeWidth={2.2} />
              <View style={{ flex: 1 }}>
                <T w={600} size={14.5}>
                  {r.title}
                </T>
                <T size={12.5} color={C.textSecondary} style={{ marginTop: 1 }}>
                  {r.sub}
                </T>
              </View>
            </View>
          ))}
        </View>

        <T size={12.5} color={C.textSecondary} lh={18.75} style={{ marginTop: 22 }}>
          Verification is handled securely by Stripe. SudanSouq never sees or stores your documents.
        </T>
      </ScrollView>

      <FrostedBar
        edge="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 22,
          paddingTop: 11,
          paddingBottom: Math.max(insets.bottom, 14),
        }}
      >
        <Button label={verifying ? 'Opening Stripe…' : 'Continue'} onPress={start}>
          {verifying && <ButtonSpinner />}
        </Button>
      </FrostedBar>
    </View>
  );
}

/** Small ring inside the CTA while Stripe onboarding is being reached. */
function ButtonSpinner() {
  const spin = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  return (
    <Animated.View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(250,249,245,0.3)',
        borderTopColor: C.onDark,
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    />
  );
}

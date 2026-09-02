import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { StepProgress } from '@/components/onboarding-ui';
import { Button, Note, T } from '@/components/ui';
import { color as C, radius, space } from '@/theme/tokens';

const POINTS = [
  'Messages from buyers and sellers',
  'Offers and order updates',
  'Important account activity',
];

/**
 * An honest stand-in for the design's OS permission prompt: the app has no
 * push infrastructure yet (no device-token storage, no send pipeline), so
 * asking for that permission here would grant access nothing uses. This
 * points people at the real place to turn notifications on once there is
 * something to receive.
 */
export default function OnboardingNotifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.gutterRegular,
          paddingTop: insets.top + space.space24,
          paddingBottom: insets.bottom + space.space32,
        }}
      >
        <StepProgress count={2} filled={2} style={{ marginBottom: space.space24 }} />

        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.radiusXLarge,
            backgroundColor: C.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space.space20,
          }}
        >
          <Icon name="bell" size={28} color={C.primary} decorative />
        </View>

        <T variant="screenTitle">Stay up to date</T>
        <T variant="body" color={C.textSecondary} style={{ marginTop: space.space8, marginBottom: space.space20 }}>
          When notifications are on, you&apos;ll hear about messages, offers, and order updates.
        </T>

        <View style={{ gap: space.space8, marginBottom: space.space20 }}>
          {POINTS.map((point) => (
            <View key={point} style={{ flexDirection: 'row', alignItems: 'center', gap: space.space12 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary }} />
              <T variant="body" style={{ flex: 1 }}>
                {point}
              </T>
            </View>
          ))}
        </View>

        <Note tone="neutral">
          <T variant="cardTitle">Notifications are off</T>
          <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4, marginBottom: space.space8 }}>
            Turn them on any time in your device Settings.
          </T>
          <Button
            label="Open Settings"
            variant="secondary"
            buttonSize="compact"
            onPress={() => Linking.openSettings()}
          />
        </Note>

        <View style={{ flex: 1 }} />

        <Button label="Continue" onPress={() => router.push('/complete')} style={{ marginTop: space.space24 }} />
      </ScrollView>
    </View>
  );
}

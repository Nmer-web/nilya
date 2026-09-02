import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Note, ScreenError, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { fetchProfile } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space } from '@/theme/tokens';

export default function Verify() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const profile = useAsync(
    async () => (user ? fetchProfile(user.id) : null),
    `seller-verification:${user?.id ?? 'none'}`
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader dismiss border={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: space.gutterRegular,
          paddingTop: space.space12,
          paddingBottom: insets.bottom + space.space40,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.radiusXLarge,
            backgroundColor: profile.data?.is_verified ? C.primary : C.textPrimary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="shieldCheck" role="hero" color={C.textInverse} decorative />
        </View>

        <T variant="screenTitle" style={{ marginTop: space.space20 }}>
          Seller verification
        </T>

        {profile.loading ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Loading seller verification status"
            style={{ gap: space.space12, marginTop: space.space20 }}
          >
            <Skeleton width="36%" height={22} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="84%" height={14} />
          </View>
        ) : profile.error || !profile.data ? (
          <ScreenError
            error={profile.error}
            title="Verification status unavailable"
            fallback="Your seller status could not be loaded."
            onRetry={profile.refetch}
          />
        ) : profile.data.is_verified ? (
          <>
            <T variant="sectionTitle" color={C.primary} style={{ marginTop: space.space20 }}>
              Verified
            </T>
            <T variant="body" color={C.textSecondary} style={{ marginTop: space.space8 }}>
              Your seller profile is currently marked as verified.
            </T>
            <Note tone="success" style={{ marginTop: space.space20 }}>
              <T variant="metadata" color={C.textSecondary}>
                This status comes from your Nilya profile and is refreshed from the backend.
              </T>
            </Note>
          </>
        ) : (
          <>
            <T variant="sectionTitle" style={{ marginTop: space.space20 }}>
              Not available yet
            </T>
            <T variant="body" color={C.textSecondary} style={{ marginTop: space.space8 }}>
              Seller verification onboarding is not available in this build. Nilya will show a real action here only
              when the existing Stripe flow can return a secure hosted onboarding session.
            </T>
            <Note tone="neutral" style={{ marginTop: space.space20 }}>
              <T variant="metadata" color={C.textSecondary}>
                No verification request has been started and your seller status has not changed.
              </T>
            </Note>
          </>
        )}
      </ScrollView>
    </View>
  );
}

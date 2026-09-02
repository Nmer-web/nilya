import { Host, Switch } from '@expo/ui';
import React from 'react';
import { AccessibilityInfo, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SettingsSection } from '@/components/settings-row';
import { Skeleton } from '@/components/skeleton';
import { InlineError, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { retryableReadMessage } from '@/lib/errors';
import { setHolidayMode } from '@/lib/mutations';
import { fetchProfile } from '@/lib/queries';
import { useApp } from '@/store/app-store';
import { useAuth } from '@/store/auth-store';
import { color as C, space } from '@/theme/tokens';

export default function HolidayModeRoute() {
  const { user } = useAuth();

  /* The authenticated layout normally guarantees this. Keeping the query in a
     keyed child also prevents an in-flight state from one account being shown
     if the auth session changes during development. */
  if (!user) return null;
  return <HolidayModeScreen key={user.id} userId={user.id} />;
}

function HolidayModeScreen({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const { flash } = useApp();
  const profile = useAsync(() => fetchProfile(userId), `holiday-mode:${userId}`);
  const [override, setOverride] = React.useState<boolean | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [writeError, setWriteError] = React.useState<string | null>(null);
  const [retryValue, setRetryValue] = React.useState<boolean | null>(null);
  const current = override ?? profile.data?.holiday_mode;

  const changeHolidayMode = React.useCallback((next: boolean) => {
    if (saving || current === undefined) return;

    const previous = current;
    setOverride(next);
    setSaving(true);
    setWriteError(null);
    setRetryValue(null);

    void setHolidayMode(next)
      .then((confirmed) => {
        setOverride(confirmed.holiday_mode);
        profile.refresh();
        const confirmation = confirmed.holiday_mode
          ? 'Holiday mode is on'
          : 'Holiday mode is off';
        flash(confirmation);
        AccessibilityInfo.announceForAccessibility(confirmation);
      })
      .catch((error) => {
        setOverride(previous);
        setRetryValue(next);
        setWriteError(retryableReadMessage(error, 'Holiday mode could not be updated.'));
        AccessibilityInfo.announceForAccessibility(
          'Holiday mode was not changed. Try again.'
        );
      })
      .finally(() => setSaving(false));
  }, [current, flash, profile, saving]);

  const unavailable = !profile.loading && current === undefined;

  return (
    <View className="flex-1 bg-nilya-background">
      <ScreenHeader title="Holiday mode" />

      <ScrollView
        className="flex-1 bg-nilya-background"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.space40 }}
      >
        <View className="px-5 pb-2 pt-6">
          <T variant="sectionTitle" accessibilityRole="header">
            Pause new sales
          </T>
          <T variant="body" color={C.textSecondary} className="mt-2" selectable>
            Turn this on while you&apos;re away. Your products stay saved, but they
            won&apos;t appear in marketplace discovery and buyers can&apos;t start checkout.
          </T>
        </View>

        <SettingsSection
          title="Availability"
          footer={
            profile.error ? (
              <InlineError
                message="Your Holiday mode status could not be loaded."
                actionLabel="Retry"
                onAction={profile.refetch}
              />
            ) : writeError ? (
              <InlineError
                message={writeError}
                actionLabel={retryValue === null ? undefined : 'Retry'}
                onAction={retryValue === null ? undefined : () => changeHolidayMode(retryValue)}
              />
            ) : undefined
          }
        >
          {profile.loading ? (
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Loading Holiday mode status"
              className="min-h-20 flex-row items-center justify-between px-4 py-4"
            >
              <Skeleton width="46%" height={16} />
              <Skeleton width={52} height={32} />
            </View>
          ) : unavailable ? (
            <View className="min-h-20 justify-center px-4 py-4">
              <T variant="bodyMedium">Holiday mode unavailable</T>
            </View>
          ) : (
            <View className="px-4 py-4">
              <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
                <Switch
                  label="Holiday mode"
                  value={Boolean(current)}
                  disabled={saving}
                  onValueChange={changeHolidayMode}
                  testID="holiday-mode-switch"
                />
              </Host>
              <T
                variant="metadata"
                color={C.textSecondary}
                className="mt-3"
                accessibilityLiveRegion="polite"
                selectable
              >
                {saving
                  ? 'Saving…'
                  : current
                    ? 'On — new purchases are paused.'
                    : 'Off — your active products can appear in discovery.'}
              </T>
            </View>
          )}
        </SettingsSection>

        <View className="px-5 pt-6">
          <T variant="body" color={C.textSecondary} selectable>
            Existing listings, drafts, sold history, orders, and conversations are not
            changed. Product pages and your seller profile remain readable, and turning
            Holiday mode off restores marketplace availability without recreating listings.
          </T>
        </View>
      </ScrollView>
    </View>
  );
}

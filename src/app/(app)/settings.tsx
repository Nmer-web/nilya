import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { AccessibilityInfo, Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { SettingsRow, SettingsSection } from '@/components/settings-row';
import { Skeleton } from '@/components/skeleton';
import { Button, InlineError, Note, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { countryName, NAMES_AVAILABLE } from '@/lib/countries';
import { LANGUAGES, type LanguageCode } from '@/lib/onboarding';
import { fetchProfile } from '@/lib/queries';
import { useApp } from '@/store/app-store';
import { useAuth } from '@/store/auth-store';
import { useOnboarding } from '@/store/onboarding-store';
import { color as C, space } from '@/theme/tokens';

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flash } = useApp();
  const { user, requestPasswordReset, signOut } = useAuth();
  const onboarding = useOnboarding();

  const profile = useAsync(
    async () => (user ? fetchProfile(user.id) : null),
    `settings-profile:${user?.id ?? 'none'}`
  );

  const [languageOpen, setLanguageOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const language = useMemo(
    () => LANGUAGES.find((item) => item.code === onboarding.language) ?? null,
    [onboarding.language]
  );
  const countryCode = profile.data?.country_code?.trim().toUpperCase() ?? null;
  const country = countryCode
    ? NAMES_AVAILABLE
      ? countryName(countryCode, onboarding.language ?? 'en')
      : 'Country saved'
    : 'Not set';
  const email = user?.email?.trim() || null;

  const sendPasswordReset = async () => {
    if (!email || passwordBusy) return;
    setPasswordBusy(true);
    setPasswordError(null);
    const result = await requestPasswordReset(email);
    setPasswordBusy(false);

    if (result.error) {
      setPasswordError('Could not send the reset email. Check your connection and try again.');
      return;
    }

    setPasswordSent(true);
    AccessibilityInfo.announceForAccessibility('Password reset email sent');
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    // The root auth guard reacts to the cleared session. No manual navigation
    // competes with that single source of truth.
  };

  const chooseLanguage = (code: LanguageCode) => {
    onboarding.setLanguage(code);
    setLanguageOpen(false);
    flash('Language preference updated');
    AccessibilityInfo.announceForAccessibility('Language preference updated');
  };

  return (
    <View className="flex-1 bg-nilya-background">
      <ScreenHeader title="Settings" />

      <ScrollView
        className="flex-1 bg-nilya-background"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.space40 }}
      >
        <SettingsSection title="Account">
          <SettingsRow
            icon="person"
            label="Edit profile"
            onPress={() => router.push('/edit-profile')}
            accessibilityHint="Opens your existing profile editor"
          />
          <SettingsRow
            icon="person"
            label="Email"
            value={email ?? 'No email on this account'}
          />
          {email ? (
            <>
              <SettingsRow
                icon="shieldCheck"
                label="Change password"
                value={passwordSent ? 'Email sent' : undefined}
                onPress={() => setPasswordOpen((open) => !open)}
                disclosure={false}
                accessibilityLabel={passwordOpen ? 'Close password management' : 'Change password'}
                accessibilityHint="Shows the secure password reset email action"
              />
              {passwordOpen ? (
                <View className="border-b border-nilya-border bg-nilya-surface px-4 py-4">
                  <T variant="body" color={C.textSecondary}>
                    We&apos;ll send a secure link to {email}. Open it on this device to choose a new password.
                  </T>
                  {passwordError ? (
                    <InlineError
                      message={passwordError}
                      actionLabel="Retry"
                      onAction={() => void sendPasswordReset()}
                      style={{ marginTop: space.space12 }}
                    />
                  ) : null}
                  {passwordSent ? (
                    <Note tone="success" style={{ marginTop: space.space12 }}>
                      <T variant="bodyMedium" color={C.success}>
                        Check your inbox
                      </T>
                      <T variant="metadata" color={C.success} style={{ marginTop: space.space4 }}>
                        If this account can use password recovery, the reset link is on its way.
                      </T>
                    </Note>
                  ) : (
                    <Button
                      label="Send reset link"
                      loading={passwordBusy}
                      loadingLabel="Sending…"
                      disabled={passwordBusy}
                      onPress={() => void sendPasswordReset()}
                      style={{ marginTop: space.space12 }}
                    />
                  )}
                </View>
              ) : null}
            </>
          ) : null}
          <SettingsRow
            icon="person"
            label="Sign out"
            onPress={() => void handleSignOut()}
            busy={signingOut}
            disclosure={false}
            last
          />
        </SettingsSection>

        <SettingsSection
          title="Preferences"
          footer={
            profile.error ? (
              <InlineError
                message="Your saved country could not be loaded."
                actionLabel="Retry"
                onAction={profile.refetch}
              />
            ) : undefined
          }
        >
          <SettingsRow
            icon="gear"
            label="Language"
            value={language?.label ?? 'Not set'}
            onPress={() => setLanguageOpen(true)}
            accessibilityHint="Opens language selection"
          />
          <SettingsRow
            icon="pin"
            label="Country / region"
            value={profile.loading ? undefined : profile.error ? 'Unavailable' : country}
            right={profile.loading ? <Skeleton width={92} height={12} /> : undefined}
            onPress={() => router.push('/edit-profile')}
            accessibilityHint="Opens your existing profile editor"
            last
          />
        </SettingsSection>

        {/* There is no personalisation relation/page, notification preference
            storage, privacy control, or legal-content route in the current
            schema and app. Rendering those sections would create dead controls. */}
      </ScrollView>

      <Modal
        visible={languageOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLanguageOpen(false)}
      >
        <View className="flex-1 bg-nilya-background" style={{ paddingTop: insets.top }}>
          <View className="min-h-14 flex-row items-center border-b border-nilya-border px-5 py-2">
            <T variant="sectionTitle" accessibilityRole="header" style={{ flex: 1 }}>
              Language
            </T>
            <Tap
              onPress={() => setLanguageOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close language selection"
              className="h-11 w-11 items-center justify-center"
            >
              <Icon name="close" role="inline" color={C.textPrimary} decorative />
            </Tap>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + space.space24 }}
          >
            <View className="px-5 pb-4 pt-6">
              <T variant="body" color={C.textSecondary}>
                This preference is saved on this device. NILYA does not apply interface translations yet.
              </T>
            </View>
            <View className="border-y border-nilya-border">
              {LANGUAGES.map((item, index) => {
                const selected = item.code === onboarding.language;
                return (
                  <SettingsRow
                    key={item.code}
                    label={item.native}
                    value={item.native === item.label ? undefined : item.label}
                    onPress={() => chooseLanguage(item.code)}
                    disclosure={false}
                    selected={selected}
                    right={selected ? <Icon name="check" role="inline" color={C.textPrimary} decorative /> : undefined}
                    last={index === LANGUAGES.length - 1}
                  />
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

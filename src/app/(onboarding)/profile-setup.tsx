import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field } from '@/components/field';
import { StepProgress } from '@/components/onboarding-ui';
import { ProfileFormSkeleton } from '@/components/skeleton';
import { Avatar, Button, InlineError, ScreenError, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { updateProfile, uploadAvatar } from '@/lib/mutations';
import { fetchProfile } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { useOnboarding } from '@/store/onboarding-store';
import { color as C, space } from '@/theme/tokens';

/**
 * The onboarding profile step — the same fields and the same
 * `updateProfile`/`uploadAvatar` calls as `(app)/edit-profile.tsx`, because
 * this is that same form, run once before the account has any content yet.
 *
 * Country defaults to the value staged by the pre-auth onboarding-country
 * step when the fresh profile has none — the hand-off `lib/onboarding.ts`
 * describes: held on-device until a session exists, committed here.
 */
export default function ProfileSetup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { country: stagedCountry } = useOnboarding();

  const profile = useAsync(
    async () => (user ? fetchProfile(user.id) : null),
    `onboarding-profile-setup:${user?.id ?? 'none'}`
  );
  const row = profile.data;

  const [name, setName] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameValue = name ?? row?.display_name ?? '';
  const cityValue = city ?? row?.city ?? '';
  const countryValue = (country ?? row?.country_code ?? stagedCountry ?? '').toUpperCase();
  const avatarValue = avatarUrl ?? row?.avatar_url ?? null;

  const nameOk = nameValue.trim().length >= 1 && nameValue.trim().length <= 60;

  const pickAvatar = async () => {
    if (uploading) return;
    let res: ImagePicker.ImagePickerResult;
    try {
      res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.85,
      });
    } catch {
      setError('Could not open your photo library. Try again.');
      return;
    }

    if (res.canceled) return;
    const asset = res.assets.find((a) => typeof a.uri === 'string' && a.uri.length > 0);
    if (!asset) {
      setError('That photo could not be read. Try choosing a different one.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const url = await uploadAvatar({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
      setAvatarUrl(url);
    } catch {
      setError('Could not upload that photo. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (saving || !nameOk) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        displayName: nameValue,
        city: cityValue || null,
        countryCode: countryValue || null,
      });
      router.push('/notifications');
    } catch {
      setError('Could not save your profile. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (profile.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top + space.space32 }}>
        <View style={{ paddingHorizontal: space.gutterRegular }}>
          <ProfileFormSkeleton />
        </View>
      </View>
    );
  }

  if (profile.error && !row) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenError error={profile.error} title="Could not load your profile" onRetry={profile.refetch} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.gutterRegular,
          paddingTop: insets.top + space.space24,
          paddingBottom: insets.bottom + space.space32,
        }}
      >
        <StepProgress count={2} filled={1} style={{ marginBottom: space.space24 }} />

        <T variant="screenTitle">Make Nilya yours</T>
        <T variant="body" color={C.textSecondary} style={{ marginTop: space.space8, marginBottom: space.space24 }}>
          Add the details people will see when you sell products.
        </T>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space16, marginBottom: space.space24 }}>
          <Tap
            onPress={pickAvatar}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Add a profile photo"
            accessibilityState={{ busy: uploading, disabled: uploading }}
          >
            <Avatar
              initials={(nameValue || '?').slice(0, 2).toUpperCase()}
              bg={row?.avatar_color ?? C.textPrimary}
              size={76}
              imageUrl={avatarValue}
            />
          </Tap>
          <View style={{ flex: 1, gap: 2 }}>
            <Tap
              onPress={pickAvatar}
              disabled={uploading}
              accessibilityRole="button"
              style={{ alignSelf: 'flex-start' }}
            >
              <T variant="button" color={C.primary}>
                {uploading ? 'Uploading…' : avatarValue ? 'Change photo' : 'Add photo'}
              </T>
            </Tap>
            <T variant="metadata" color={C.textSecondary}>
              Optional — your initials work too
            </T>
          </View>
        </View>

        <Field
          label="Display name"
          value={nameValue}
          onChangeText={setName}
          placeholder="Your name or store name"
          error={!nameOk && nameValue.length > 0 ? 'Between 1 and 60 characters.' : undefined}
        />
        <Field label="City" value={cityValue} onChangeText={setCity} placeholder="Where you ship from" />
        <Field
          label="Country"
          value={countryValue}
          onChangeText={(v) => setCountry(v.toUpperCase().slice(0, 2))}
          placeholder="Two-letter code, e.g. FR"
          autoCapitalize="characters"
        />

        {error ? <InlineError message={error} style={{ marginBottom: space.space16 }} /> : null}

        <View style={{ flex: 1 }} />

        <Button
          label={saving ? 'Saving…' : 'Continue'}
          loading={saving}
          disabled={!nameOk}
          onPress={submit}
          style={{ marginTop: space.space16 }}
        />
      </ScrollView>
    </View>
  );
}

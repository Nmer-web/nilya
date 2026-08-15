import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Avatar, Button, EmptyState, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { tapSuccess } from '@/lib/haptics';
import { updateProfile, uploadAvatar } from '@/lib/mutations';
import { fetchProfile } from '@/lib/queries';
import { useApp } from '@/store/app-store';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space } from '@/theme/tokens';

/**
 * Profile setup, and the same screen for editing it later.
 *
 * Every field here is a column on `profiles` that `profiles_update_own` lets
 * the account holder write: display name, bio, city, country and avatar. The
 * things a profile also carries — rating, lifetime sales, verification — are
 * deliberately absent, because they are not the holder's to set and a form
 * field for them would imply otherwise.
 *
 * No language or notification preferences: there is no column for either, and
 * a control that persists nowhere is a promise the app cannot keep.
 */
export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { flash } = useApp();

  const profile = useAsync(
    async () => (user ? fetchProfile(user.id) : null),
    `edit-profile:${user?.id ?? 'none'}`
  );

  const row = profile.data;

  /* Null until touched, so the loaded row remains the source until edited —
     copying it into state on load would be a write from an effect. */
  const [name, setName] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameValue = name ?? row?.display_name ?? '';
  const bioValue = bio ?? row?.bio ?? '';
  const cityValue = city ?? row?.city ?? '';
  const countryValue = (country ?? row?.country_code ?? '').toUpperCase();
  const avatarValue = avatarUrl ?? row?.avatar_url ?? null;

  const nameOk = nameValue.trim().length >= 1 && nameValue.trim().length <= 60;
  const countryOk = countryValue.length === 0 || countryValue.length === 2;

  const pickAvatar = async () => {
    if (uploading) return;
    let res: ImagePicker.ImagePickerResult;
    try {
      res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.85,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your photo library.');
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
      tapSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that photo.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (saving || !nameOk || !countryOk) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        displayName: nameValue,
        bio: bioValue,
        city: cityValue,
        countryCode: countryValue || null,
      });
      tapSuccess();
      flash('Profile updated');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Your profile" />
        <EmptyState
          icon="person"
          title="Sign in to edit your profile"
          body="Your details are kept to your account."
          style={{ paddingVertical: 60 }}
          action={
            <Button label="Sign in" height={48} onPress={() => router.push('/sign-in')} style={{ marginTop: 20 }} />
          }
        />
      </View>
    );
  }

  if (profile.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Your profile" />
        <View style={{ padding: space.gutter, gap: 16 }}>
          <Skeleton width={88} height={88} round={44} />
          <Skeleton width="100%" height={52} round={radius.lg} />
          <Skeleton width="100%" height={52} round={radius.lg} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader title="Your profile" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.gutter, paddingBottom: insets.bottom + 120 }}
      >
        <View style={{ alignItems: 'center', paddingBottom: space.xl }}>
          <Tap
            onPress={pickAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change your profile photo"
            style={{ alignItems: 'center' }}
          >
            {avatarValue ? (
              <Image
                source={{ uri: avatarValue }}
                style={{ width: 88, height: 88, borderRadius: 44 }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Avatar
                initials={(nameValue || '?').slice(0, 2).toUpperCase()}
                bg={row?.avatar_color ?? C.text}
                size={88}
                fontSize={30}
              />
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10 }}>
              <Icon name="camera" size={15} color={C.textSecondary} strokeWidth={1.8} />
              <T w={500} size={13.5} color={C.textSecondary}>
                {uploading ? 'Uploading…' : avatarValue ? 'Change photo' : 'Add a photo'}
              </T>
            </View>
          </Tap>
        </View>

        <Field label="Name" value={nameValue} onChange={setName} placeholder="Your name" />
        {!nameOk && (
          <T size={12} color={C.error} style={{ paddingTop: 4 }}>
            Between 1 and 60 characters.
          </T>
        )}

        <Field
          label="Bio"
          value={bioValue}
          onChange={setBio}
          placeholder="A line about what you sell"
          multiline
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2 }}>
            <Field label="City" value={cityValue} onChange={setCity} placeholder="Where you are" />
          </View>
          <View style={{ flex: 1 }}>
            {/* Two letters, because `country_code` is `char(2)` and the delivery
                ladder is looked up by it. */}
            <Field
              label="Country"
              value={countryValue}
              onChange={(v) => setCountry(v.toUpperCase().slice(0, 2))}
              placeholder="FR"
              autoCapitalize="characters"
            />
          </View>
        </View>

        {!!error && (
          <T size={12.5} color={C.error} style={{ paddingTop: space.md }}>
            {error}
          </T>
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: space.gutter,
          paddingBottom: Math.max(insets.bottom, 12) + 8,
          backgroundColor: C.background,
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        <Button
          label={saving ? 'Saving…' : 'Save'}
          height={52}
          disabled={saving || !nameOk || !countryOk}
          onPress={save}
        />
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
}) {
  return (
    <View style={{ paddingBottom: space.lg }}>
      <T w={500} size={13} color={C.textSecondary} style={{ paddingBottom: 7 }}>
        {label}
      </T>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        style={{
          minHeight: multiline ? 88 : 50,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: C.border,
          backgroundColor: C.surface,
          paddingHorizontal: 15,
          paddingTop: multiline ? 13 : 0,
          paddingBottom: multiline ? 13 : 0,
          fontSize: 15,
          color: C.text,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

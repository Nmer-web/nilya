import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Avatar, T } from '@/components/ui';
import type { Profile } from '@/lib/queries';
import { color as C, space } from '@/theme/tokens';

/** First letters of the first two words, which is all an initials disc needs. */
function initialsOf(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('');
  return (letters || name[0] || '?').slice(0, 2).toUpperCase();
}

/**
 * The identity block: photograph, name, and the figures underneath it.
 *
 * Shared by the seller's public page and the signed-in user's own account
 * screen so one rule governs what is shown. Every value is a column on
 * `profiles`, and each is omitted rather than substituted when it is absent —
 * a profile with no reviews shows no stars, not an invented five, and one with
 * no city shows no place. Nothing here is computed to look plausible.
 */
export function ProfileIdentity({
  profile,
  size = 66,
  nameSize = 19,
}: {
  profile: Profile;
  size?: number;
  nameSize?: number;
}) {
  const place = [profile.city, profile.country_code].filter(Boolean).join(', ');
  const rated = profile.rating_count > 0 && profile.rating_avg != null;

  /*
   * Read as a year rather than a full date: `created_at` is exact, but "Joined
   * 2026" is the claim the screen actually needs, and the precise timestamp of
   * someone's sign-up is not the reader's business.
   */
  const joined = new Date(profile.created_at).getFullYear();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View>
        {profile.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
            transition={200}
            accessible={false}
          />
        ) : (
          <Avatar
            initials={initialsOf(profile.display_name)}
            bg={profile.avatar_color ?? C.text}
            size={size}
            fontSize={size * 0.33}
          />
        )}

        {/* The tick is the `is_verified` column, not decoration. */}
        {profile.is_verified && (
          <View
            style={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: C.success,
              borderWidth: 2.5,
              borderColor: C.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={11} color={C.primaryText} strokeWidth={3.2} />
          </View>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <T w={600} size={nameSize} tracking={-0.4} numberOfLines={1}>
          {profile.display_name}
        </T>

        <T size={12.5} color={C.textSecondary} style={{ marginTop: 3 }}>
          {rated ? `★ ${profile.rating_avg!.toFixed(1)} (${profile.rating_count}) · ` : ''}
          {profile.lifetime_sales === 1 ? '1 sale' : `${profile.lifetime_sales} sales`}
          {` · Joined ${joined}`}
        </T>

        {!!place && (
          <T size={12.5} color={C.textSecondary} style={{ marginTop: 1 }} numberOfLines={1}>
            {place}
          </T>
        )}
      </View>
    </View>
  );
}

/** The profile's own words, when it has any. */
export function ProfileBio({ bio }: { bio: string | null }) {
  if (!bio) return null;
  return (
    <T size={13.5} color={C.textSecondary} lh={20} style={{ paddingTop: space.md }}>
      {bio}
    </T>
  );
}

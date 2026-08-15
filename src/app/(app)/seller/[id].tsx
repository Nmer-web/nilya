import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ListingFeedGrid } from '@/components/listing-feed-grid';
import { ScreenHeader } from '@/components/screen-header';
import { ProductGridSkeleton } from '@/components/skeleton';
import { Avatar, EmptyState, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useFavorites } from '@/hooks/use-favorites';
import { useListingFeed } from '@/hooks/use-listing-feed';
import { fetchSellerProfile } from '@/lib/queries';
import { color as C, space } from '@/theme/tokens';

/**
 * A seller's public profile.
 *
 * Keyed on the profile id rather than a display name: names are neither unique
 * nor stable, and the id is what `listings.seller_id` and every RLS policy
 * actually use. The route this replaces took a name and matched it against a
 * fixed array, which had no equivalent once the data became real.
 */
export default function SellerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const profile = useAsync(() => fetchSellerProfile(id), `seller:${id}`);
  const favorites = useFavorites();
  const feed = useListingFeed({ sellerId: id }, `seller-listings:${id}`);

  const seller = profile.data;

  if (profile.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader />
        <ProductGridSkeleton />
      </View>
    );
  }

  if (profile.error || !seller) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader />
        <EmptyState
          icon="person"
          title={profile.error ? 'Could not load this seller' : 'Seller not found'}
          body={profile.error ? profile.error.message : 'This profile may have been removed.'}
          style={{ paddingVertical: 44 }}
        />
      </View>
    );
  }

  const initials = seller.display_name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const place = [seller.city, seller.country_code].filter(Boolean).join(', ');
  const joined = new Date(seller.created_at).getFullYear();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader title={seller.display_name} titleSize={15.5} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: space.gutter, paddingTop: 20 }}>
        {seller.avatar_url ? (
          <Image
            source={{ uri: seller.avatar_url }}
            style={{ width: 66, height: 66, borderRadius: 33 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Avatar initials={initials} bg={C.text} size={66} fontSize={22} />
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <T w={600} size={19} tracking={-0.3} numberOfLines={1} style={{ flexShrink: 1 }}>
              {seller.display_name}
            </T>
            {seller.is_verified && <Icon name="badgeCheck" size={16} color={C.success} />}
          </View>

          {/*
            Every figure here is a column on the profile. A seller with no
            reviews shows no rating rather than a placeholder five stars, and
            nothing claims a response time the app does not measure.
          */}
          <T size={13} color={C.textSecondary} style={{ marginTop: 3 }}>
            {seller.rating_count > 0 && seller.rating_avg != null
              ? `★ ${seller.rating_avg.toFixed(1)} (${seller.rating_count}) · `
              : ''}
            {seller.lifetime_sales === 1 ? '1 sale' : `${seller.lifetime_sales} sales`}
            {` · Joined ${joined}`}
          </T>

          {!!place && (
            <T size={13} color={C.textSecondary} style={{ marginTop: 1 }}>
              {place}
            </T>
          )}
        </View>
      </View>

      {!!seller.bio && (
        <T size={13.5} color={C.textSecondary} lh={20} style={{ paddingHorizontal: space.gutter, paddingBottom: 4 }}>
          {seller.bio}
        </T>
      )}

      {/*
        No Message or Follow button. Neither is built — there is no thread to
        open against a real profile and no follow table to write to — and a
        button that only raises a toast is a claim the app cannot honour.
      */}

      <View
        style={{
          height: 1,
          backgroundColor: C.border,
          marginHorizontal: space.gutter,
          marginTop: space.lg,
          marginBottom: space.lg,
        }}
      />

      <ListingFeedGrid
        feed={feed}
        savedIds={favorites.saved}
        onToggleSave={favorites.toggle}
        contentPaddingBottom={insets.bottom + space['3xl']}
        onRefresh={() => {
          feed.refresh();
          profile.refresh();
          favorites.refresh();
        }}
        empty={{
          icon: 'bag',
          title: 'Nothing listed right now',
          body: `${seller.display_name} has no active listings.`,
        }}
      />
    </View>
  );
}

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListingFeedGrid } from '@/components/listing-feed-grid';
import { ProfileBio, ProfileIdentity } from '@/components/profile-identity';
import { ScreenHeader } from '@/components/screen-header';
import { ProductGridSkeleton, Skeleton } from '@/components/skeleton';
import { Button, EmptyState } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useFavorites } from '@/hooks/use-favorites';
import { useListingFeed } from '@/hooks/use-listing-feed';
import { fetchProfile } from '@/lib/queries';
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

  const profile = useAsync(() => fetchProfile(id), `seller:${id}`);
  const favorites = useFavorites();
  const feed = useListingFeed({ sellerId: id }, `seller-listings:${id}`);

  const seller = profile.data;

  /* The skeleton mirrors this screen's own layout — an identity block over a
     two-column grid — rather than the three-up profile one, so nothing shifts
     or is promised that does not arrive. */
  if (profile.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader />
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Loading seller"
          style={{ flexDirection: 'row', gap: 14, padding: space.gutter, paddingTop: 20 }}
        >
          <Skeleton width={66} height={66} round={33} />
          <View style={{ flex: 1, paddingTop: 6 }}>
            <Skeleton width="56%" height={20} />
            <Skeleton width="70%" height={12} style={{ marginTop: 10 }} />
            <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
          </View>
        </View>
        <ProductGridSkeleton count={4} />
      </View>
    );
  }

  /* A failed request and a missing profile are different facts and are worded
     differently; only the failure offers a retry. */
  if (profile.error || !seller) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader />
        <EmptyState
          icon="person"
          title={profile.error ? 'Could not load this seller' : 'Seller not found'}
          body={profile.error ? profile.error.message : 'This profile may have been removed.'}
          style={{ paddingVertical: 44 }}
          action={
            profile.error ? (
              <Button
                label="Try again"
                height={44}
                size={14}
                onPress={profile.refetch}
                style={{ marginTop: 18 }}
              />
            ) : undefined
          }
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader title={seller.display_name} titleSize={15.5} />

      <View style={{ padding: space.gutter, paddingTop: 20 }}>
        <ProfileIdentity profile={seller} />
        <ProfileBio bio={seller.bio} />
      </View>

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
          title: 'No listings yet',
          body: "This seller hasn't listed anything yet.",
        }}
      />
    </View>
  );
}

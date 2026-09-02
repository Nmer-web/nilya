import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useNavClearance } from '@/components/bottom-nav';
import { ListingFeedGrid } from '@/components/listing-feed-grid';
import { ScreenHeader } from '@/components/screen-header';
import { Button, T } from '@/components/ui';
import { useFavoriteListingsFeed } from '@/hooks/use-favorite-listings-feed';
import { useFavorites } from '@/hooks/use-favorites';
import { useAuth } from '@/store/auth-store';
import { color as C, space } from '@/theme/tokens';

export default function Favorites() {
  const router = useRouter();
  const navClearance = useNavClearance();
  const { status, user } = useAuth();
  const signedIn = status === 'signedIn';

  const favorites = useFavorites();
  const feed = useFavoriteListingsFeed(signedIn, `favorite-listings:${user?.id ?? 'signed-out'}`);

  const empty = signedIn
    ? {
        icon: 'heart' as const,
        title: 'No favorites yet',
        body: 'Save products you love and find them here later.',
        action: <Button label="Start exploring" onPress={() => router.dismissTo('/')} style={{ marginTop: space.space20 }} />,
      }
    : {
        icon: 'person' as const,
        title: 'Sign in to see your favorites',
        body: 'Saved items are kept to your account.',
        action: <Button label="Sign in" onPress={() => router.push('/sign-in')} style={{ marginTop: space.space20 }} />,
      };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader
        title="Favorites"
        right={feed.listings.length > 0 ? (
          <T variant="metadata" color={C.textSecondary} style={{ paddingRight: space.space12 }}>
            {feed.listings.length}{feed.hasMore ? '+' : ''} saved
          </T>
        ) : undefined}
      />

      <ListingFeedGrid
        feed={feed}
        savedIds={favorites.saved}
        onToggleSave={favorites.toggle}
        empty={{
          icon: empty.icon,
          title: empty.title,
          body: empty.body,
          action: empty.action,
        }}
        error={{ title: 'Could not load your favorites', body: 'Try again.' }}
        contentPaddingTop={space.space16}
        contentPaddingBottom={navClearance}
        onRefresh={() => {
          feed.refresh();
          favorites.refresh();
        }}
      />
    </View>
  );
}

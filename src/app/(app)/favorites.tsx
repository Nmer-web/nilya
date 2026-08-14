import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { useNavClearance } from '@/components/bottom-nav';
import { ListingGrid } from '@/components/listing-card';
import { ScreenHeader } from '@/components/screen-header';
import { ProductGridSkeleton } from '@/components/skeleton';
import { Button, EmptyState, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useFavorites } from '@/hooks/use-favorites';
import { fetchFavoriteListings } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, space } from '@/theme/tokens';

export default function Favorites() {
  const router = useRouter();
  const navClearance = useNavClearance();
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  const favorites = useFavorites();
  const saved = useAsync(
    async () => (signedIn ? fetchFavoriteListings() : []),
    `favorite-listings:${signedIn}`
  );

  const items = saved.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader
        title="Favorites"
        right={
          items.length > 0 ? (
            <T size={13} color={C.textSecondary} style={{ paddingRight: 10 }}>
              {items.length} saved
            </T>
          ) : undefined
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: space.lg, paddingBottom: navClearance }}
        refreshControl={
          <RefreshControl
            refreshing={saved.refreshing}
            onRefresh={() => {
              saved.refresh();
              favorites.refresh();
            }}
            tintColor={C.textMuted}
          />
        }
      >
        {!signedIn ? (
          <EmptyState
            icon="person"
            title="Sign in to see your favorites"
            body="Saved items are kept to your account."
            action={
              <Button label="Sign in" height={48} onPress={() => router.push('/sign-in')} style={{ marginTop: 20 }} />
            }
          />
        ) : saved.loading ? (
          <ProductGridSkeleton count={4} />
        ) : saved.error ? (
          <EmptyState
            icon="close"
            title="Could not load your favorites"
            body={saved.error.message}
            action={
              <Button label="Try again" height={44} size={14} onPress={saved.refetch} style={{ marginTop: 18 }} />
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="heart"
            title="No favorites yet"
            body="Save items you love and find them here later."
            action={
              <Button
                label="Start exploring"
                height={48}
                onPress={() => router.dismissTo('/')}
                style={{ marginTop: 20 }}
              />
            }
          />
        ) : (
          /*
           * Unsaving here removes the heart but leaves the card until the next
           * refresh — pulling a row out from under the thumb that just tapped
           * it makes the list feel unstable, and the state is already correct.
           */
          <ListingGrid listings={items} savedIds={favorites.saved} onToggleSave={favorites.toggle} />
        )}
      </ScrollView>
    </View>
  );
}

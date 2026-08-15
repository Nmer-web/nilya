import React, { useCallback, useState } from 'react';
import { Animated, FlatList, RefreshControl, View, type FlatListProps } from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { ProductGridSkeleton } from '@/components/skeleton';
import { Button, EmptyState, Spinner, T } from '@/components/ui';
import type { useListingFeed } from '@/hooks/use-listing-feed';
import type { ListingRow } from '@/lib/database.types';
import type { IconName } from '@/components/icon';
import { color as C, space } from '@/theme/tokens';

const COLUMN_GAP = 10;

/**
 * A FlatList that accepts a native-driven `Animated.event`.
 *
 * Built once at module scope: creating an animated component during render
 * remounts the list every pass, losing scroll position and windowing state.
 *
 * It must be this and not a plain FlatList — with `useNativeDriver: true`,
 * `Animated.event` returns an AnimatedEvent object rather than a function, and
 * only an Animated component unwraps it. A plain list calls the object and
 * throws on the first scroll frame, and web cannot catch it because
 * NATIVE_DRIVER is false there.
 */
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList as unknown as React.ComponentType<FlatListProps<ListingRow>>
);

export type FeedEmpty = { icon: IconName; title: string; body: string; action?: React.ReactNode };

/**
 * The two-column listing grid shared by Home, Explore and Search.
 *
 * Home, Explore and Search differ in their headers and their filters, not in
 * how a page of listings is rendered, paginated or emptied — so that part lives
 * here once rather than three times.
 */
export function ListingFeedGrid({
  feed,
  savedIds,
  onToggleSave,
  empty,
  onScroll,
  contentPaddingTop = 0,
  contentPaddingBottom = 0,
  refreshOffset = 0,
  onRefresh,
  listHeader,
}: {
  feed: ReturnType<typeof useListingFeed>;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  empty: FeedEmpty;
  onScroll?: FlatListProps<ListingRow>['onScroll'];
  contentPaddingTop?: number;
  contentPaddingBottom?: number;
  refreshOffset?: number;
  onRefresh?: () => void;
  /**
   * Rendered above the grid and scrolling with it. Home puts its section rails
   * here rather than in a wrapping ScrollView — nesting a FlatList inside one
   * gives it unbounded height and forfeits recycling entirely.
   */
  listHeader?: React.ReactElement | null;
}) {
  const renderItem = useCallback(
    ({ item }: { item: ListingRow }) => (
      <View style={{ flex: 1 / 2, paddingHorizontal: COLUMN_GAP / 2 }}>
        <Cell listing={item} saved={savedIds.has(item.id)} onToggle={onToggleSave} />
      </View>
    ),
    [savedIds, onToggleSave]
  );

  /**
   * Loading, failed and empty are three different states and never collapse
   * into one another: a request that failed must not look like an empty shelf.
   */
  const emptyBody = feed.loading ? (
    <ProductGridSkeleton />
  ) : feed.error ? (
    <EmptyState
      icon="close"
      title="Could not load listings"
      body={feed.error.message}
      action={<Button label="Try again" height={44} size={14} onPress={feed.retry} style={{ marginTop: 18 }} />}
    />
  ) : (
    <EmptyState icon={empty.icon} title={empty.title} body={empty.body} action={empty.action} />
  );

  return (
    <AnimatedFlatList
      data={feed.listings}
      keyExtractor={(l) => l.id}
      renderItem={renderItem}
      numColumns={2}
      ListHeaderComponent={listHeader}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEventThrottle={16}
      onScroll={onScroll}
      columnWrapperStyle={{ paddingHorizontal: space.gutter - COLUMN_GAP / 2 }}
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
        rowGap: 20,
      }}
      ListEmptyComponent={emptyBody}
      onEndReachedThreshold={0.6}
      onEndReached={feed.loadMore}
      ListFooterComponent={
        feed.loadingMore ? (
          <View style={{ paddingVertical: space.xl, alignItems: 'center' }}>
            <Spinner color={C.textMuted} />
          </View>
        ) : !feed.hasMore && feed.listings.length > 0 ? (
          <T variant="meta" color={C.textMuted} style={{ textAlign: 'center', paddingTop: space.xl }}>
            That is everything for now
          </T>
        ) : null
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={feed.refreshing}
            onRefresh={onRefresh}
            progressViewOffset={refreshOffset}
            tintColor={C.textMuted}
          />
        ) : undefined
      }
    />
  );
}

/**
 * A grid cell. Measures the column it is given rather than recomputing the
 * screen width per card.
 */
function Cell({
  listing,
  saved,
  onToggle,
}: {
  listing: ListingRow;
  saved: boolean;
  onToggle: (id: string) => void;
}) {
  const [width, setWidth] = useState(0);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && <ListingCard listing={listing} width={width} saved={saved} onToggleSave={onToggle} />}
    </View>
  );
}

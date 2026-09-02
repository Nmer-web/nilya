import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  Text,
  useWindowDimensions,
  View,
  type FlatListProps,
} from 'react-native';

import { ListingCard, ShowcaseListingCard } from '@/components/listing-card';
import { ProductCard } from '@/components/product-card';
import { ProductGridSkeleton, Skeleton } from '@/components/skeleton';
import { Button, EmptyState, RefreshNotice, Spinner } from '@/components/ui';
import type { useListingFeed } from '@/hooks/use-listing-feed';
import type { ListingRow } from '@/lib/database.types';
import { isLikelyConnectionError, retryableReadMessage } from '@/lib/errors';
import type { IconName } from '@/components/icon';
import { color as C, radius, space } from '@/theme/tokens';

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
const NativeWindFlatList = React.forwardRef<FlatList<ListingRow>, FlatListProps<ListingRow>>(
  function NativeWindFlatList(props, ref) {
    return <FlatList ref={ref} {...props} />;
  }
);
const AnimatedFlatList = Animated.createAnimatedComponent(NativeWindFlatList);

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
  error,
  onScroll,
  contentPaddingTop = 0,
  contentPaddingBottom = 0,
  refreshOffset = 0,
  onRefresh,
  listHeader,
  listFooter,
  showAttributes = true,
  showPhotoCount = true,
  showSellerVerification = true,
  showDiscountBadge = true,
  framedCards = true,
  compactColumns = false,
  cardHorizontalInset,
  imageAspectRatio,
  cardVariant = 'catalogue',
  endMessage = 'That is everything for now',
}: {
  feed: ReturnType<typeof useListingFeed>;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  empty: FeedEmpty;
  error?: { title: string; body: string };
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
  /** Rendered after the paginated grid; seller profiles place real reviews here. */
  listFooter?: React.ReactElement | null;
  /** Home can omit the compact attribute row without changing listing data or query invariants. */
  showAttributes?: boolean;
  /** Home can keep imagery quiet while other listing grids retain the real photo count. */
  showPhotoCount?: boolean;
  /** Screens without a real verification workflow can suppress that presentation. */
  showSellerVerification?: boolean;
  /** Derived only from real current and original prices when both are present. */
  showDiscountBadge?: boolean;
  /** The shared raised catalogue card treatment, on by default everywhere. */
  framedCards?: boolean;
  /** Matches the tighter edge and column spacing of the approved Home reference. */
  compactColumns?: boolean;
  /** Exact outer edge for listing imagery while retaining the selected column gap. */
  cardHorizontalInset?: number;
  /** Allows Home to use its reference-specific portrait frame without changing other grids. */
  imageAspectRatio?: number;
  /** Home renders the showcase card; every other grid keeps the catalogue card. */
  cardVariant?: 'catalogue' | 'showcase' | 'editorial';
  /** Set to null when a screen has meaningful content after the grid. */
  endMessage?: string | null;
}) {
  const { width: viewportWidth } = useWindowDimensions();
  const router = useRouter();
  const cellInset = compactColumns ? 4 : 6;
  const rowInset = cardHorizontalInset == null
    ? (compactColumns ? 4 : 10)
    : Math.max(cardHorizontalInset - cellInset, 0);
  const cardWidth = (viewportWidth - rowInset * 2) / 2 - cellInset * 2;

  const renderItem = useCallback(
    ({ item }: { item: ListingRow }) => (
      <View className={`w-1/2 flex-none ${compactColumns ? 'px-1' : 'px-1.5'}`}>
        {cardVariant === 'editorial' ? (
          <ProductCard
            listing={item}
            width={cardWidth}
            saved={savedIds.has(item.id)}
            onToggleSave={onToggleSave}
            onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
          />
        ) : cardVariant === 'showcase' ? (
          <ShowcaseListingCard
            listing={item}
            width={cardWidth}
            saved={savedIds.has(item.id)}
            onToggleSave={onToggleSave}
          />
        ) : (
          <ListingCard
            listing={item}
            width={cardWidth}
            saved={savedIds.has(item.id)}
            onToggleSave={onToggleSave}
            showAttributes={showAttributes}
            showPhotoCount={showPhotoCount}
            showSellerVerification={showSellerVerification}
            showDiscountBadge={showDiscountBadge}
            framed={framedCards}
            imageAspectRatio={imageAspectRatio}
          />
        )}
      </View>
    ),
    [
      cardVariant,
      cardWidth,
      compactColumns,
      framedCards,
      imageAspectRatio,
      onToggleSave,
      router,
      savedIds,
      showAttributes,
      showDiscountBadge,
      showPhotoCount,
      showSellerVerification,
    ]
  );

  /**
   * Loading, failed and empty are three different states and never collapse
   * into one another: a request that failed must not look like an empty shelf.
   */
  const emptyBody = feed.loading ? (
    cardVariant === 'showcase' ? (
      <ShowcaseGridSkeleton cardWidth={cardWidth} rowInset={rowInset} cellInset={cellInset} />
    ) : cardVariant === 'editorial' ? (
      <EditorialGridSkeleton cardWidth={cardWidth} rowInset={rowInset} cellInset={cellInset} />
    ) : (
      <ProductGridSkeleton />
    )
  ) : feed.error ? (
    <EmptyState
      icon="close"
      title={error?.title ?? (isLikelyConnectionError(feed.error) ? 'NILYA could not connect' : 'Could not load listings')}
      body={error?.body ?? retryableReadMessage(feed.error, 'Live listings could not be loaded.')}
      action={
        <View className="mt-5">
          <Button label="Try again" onPress={feed.retry} />
        </View>
      }
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
      ListHeaderComponent={
        listHeader || (feed.error && feed.listings.length > 0) ? (
          <>
            {listHeader}
            {feed.error && feed.listings.length > 0 ? (
              <RefreshNotice onRetry={feed.retry} />
            ) : null}
          </>
        ) : null
      }
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEventThrottle={16}
      onScroll={onScroll}
      columnWrapperStyle={{ paddingHorizontal: rowInset }}
      contentContainerClassName={compactColumns ? 'gap-y-4' : 'gap-y-[18px]'}
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
      }}
      ListEmptyComponent={emptyBody}
      onEndReachedThreshold={0.6}
      onEndReached={feed.loadMore}
      ListFooterComponent={
        feed.loadingMore || (endMessage && !feed.hasMore && feed.listings.length > 0) || listFooter ? (
          <>
            {feed.loadingMore ? (
              <View className="items-center py-5">
                <Spinner color={C.textSecondary} />
              </View>
            ) : endMessage && !feed.hasMore && feed.listings.length > 0 ? (
              <Text className="py-8 text-center text-sm text-nilya-secondary">
                {endMessage}
              </Text>
            ) : null}
            {listFooter}
          </>
        ) : null
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={feed.refreshing}
            onRefresh={onRefresh}
            progressViewOffset={refreshOffset}
            tintColor={C.textSecondary}
          />
        ) : undefined
      }
    />
  );
}

/**
 * Loading state for the showcase grid, sized from the same insets the real
 * cards use so nothing shifts when content replaces it: the square well, the
 * lead and support lines, then the price row.
 */
function ShowcaseGridSkeleton({
  cardWidth,
  rowInset,
  cellInset,
  count = 6,
}: {
  cardWidth: number;
  rowInset: number;
  cellInset: number;
  count?: number;
}) {
  const wellWidth = cardWidth - space.space12 * 2;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading products"
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: space.space16,
        paddingHorizontal: rowInset,
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={{ width: '50%', paddingHorizontal: cellInset }}>
          <View
            style={{
              width: cardWidth,
              borderRadius: radius.radiusXLarge,
              borderCurve: 'continuous',
              backgroundColor: C.surface,
              padding: space.space12,
            }}
          >
            <Skeleton width={wellWidth} height={wellWidth} round={radius.radiusLarge} />
            <Skeleton width="62%" height={14} style={{ marginTop: space.space12 }} />
            <Skeleton width="80%" height={11} style={{ marginTop: space.space8 }} />
            <Skeleton width="46%" height={16} style={{ marginTop: space.space12 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Loading state for the catalogue grid: the 3:4 well, a title line, a price. */
function EditorialGridSkeleton({
  cardWidth,
  rowInset,
  cellInset,
  count = 6,
}: {
  cardWidth: number;
  rowInset: number;
  cellInset: number;
  count?: number;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading products"
      style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.space20, paddingHorizontal: rowInset }}
    >
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={{ width: '50%', paddingHorizontal: cellInset }}>
          <Skeleton width={cardWidth} height={cardWidth / (3 / 4)} round={radius.radiusXLarge} />
          <Skeleton width="72%" height={12} style={{ marginTop: space.space12 }} />
          <Skeleton width="40%" height={14} style={{ marginTop: space.space8 }} />
        </View>
      ))}
    </View>
  );
}

import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { IconButton } from '@/components/icon-button';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/skeleton';
import { InlineError, Spinner, Tap } from '@/components/ui';
import type { useListingFeed } from '@/hooks/use-listing-feed';
import type { ListingRow } from '@/lib/database.types';
import { retryableReadMessage } from '@/lib/errors';
import { color as C, radius, space, touch, type } from '@/theme/tokens';

const GAP = space.space12;

/** Just over two cards fit the viewport, so the third peeks in and says "swipe". */
export function newArrivalsCardWidth(viewportWidth: number, edge: number): number {
  return Math.floor((viewportWidth - edge * 2 - GAP * 2) / 2.3);
}

const Separator = () => <View style={{ width: GAP }} />;

/**
 * "New arrivals": a horizontal row of the newest listings.
 *
 * The row moves two ways. A finger swipes it left and right, snapping a card
 * at a time; the chevrons beside the title page it a screen of cards at a
 * time, for the web, where a mouse cannot drag a list, and for anyone who
 * prefers a button. Reaching the end asks the feed for its next page, so the
 * row keeps going for as long as sellers have published. The feed is ordered
 * by publication date only: nothing in the schema measures popularity, so
 * there is no other order to offer.
 *
 * With nothing published yet the section removes itself: an empty "New
 * arrivals" row is a promise the marketplace cannot keep today.
 */
export function NewArrivalsRail({
  feed,
  savedIds,
  onToggleSave,
  onSeeAll,
  edge,
  style,
}: {
  feed: ReturnType<typeof useListingFeed>;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  onSeeAll?: () => void;
  /** Horizontal inset the first and last card align to. */
  edge: number;
  style?: { marginTop?: number };
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = newArrivalsCardWidth(width, edge);
  const stride = cardWidth + GAP;
  /* Whole cards visible at once; a chevron press moves by this many. */
  const cardsPerScreen = Math.max(1, Math.floor((width - edge * 2 + GAP) / stride));
  const { listings, loading, loadingMore, hasMore, error, retry, loadMore } = feed;

  const list = useRef<FlatList<ListingRow>>(null);
  const offset = useRef(0);
  const contentWidth = useRef(0);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);

  const syncControls = useCallback(() => {
    const maxOffset = Math.max(0, contentWidth.current - width);
    setCanBack(offset.current > 1);
    setCanForward(offset.current < maxOffset - 1);
  }, [width]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = event.nativeEvent.contentOffset.x;
      contentWidth.current = event.nativeEvent.contentSize.width;
      syncControls();
    },
    [syncControls]
  );

  const onContentSizeChange = useCallback(
    (contentW: number) => {
      contentWidth.current = contentW;
      syncControls();
    },
    [syncControls]
  );

  const page = (direction: -1 | 1) => {
    const maxOffset = Math.max(0, contentWidth.current - width);
    /* Land on a card boundary: round the current position to a stride first,
       so a row left mid-swipe does not carry its slop into the next page. */
    const current = Math.round(offset.current / stride) * stride;
    const target = Math.min(maxOffset, Math.max(0, current + direction * stride * cardsPerScreen));
    list.current?.scrollToOffset({ offset: target, animated: true });
    /* Ask for the next page early when the press lands on the last screen,
       so the row has grown by the time the seller presses again. */
    if (direction === 1 && target >= maxOffset - stride && hasMore) loadMore();
  };

  const renderItem = useCallback<ListRenderItem<ListingRow>>(
    ({ item }) => (
      <ProductCard
        listing={item}
        width={cardWidth}
        saved={savedIds.has(item.id)}
        onToggleSave={onToggleSave}
        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
      />
    ),
    [cardWidth, onToggleSave, router, savedIds]
  );

  const empty = !loading && listings.length === 0;
  if (empty && !error) return null;

  const showControls = !loading && !empty;
  const forwardEnabled = canForward || hasMore;

  return (
    <View style={style}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.space8,
          minHeight: touch.minimum,
          marginHorizontal: edge,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...type.sectionTitle, color: C.textPrimary }} numberOfLines={1} accessibilityRole="header">
            New arrivals
          </Text>
          <Text style={{ ...type.metadata, color: C.textSecondary, marginTop: space.space4 }} numberOfLines={1}>
            Newest first. Swipe to see more.
          </Text>
        </View>
        {onSeeAll ? (
          <Tap
            onPress={onSeeAll}
            accessibilityRole="button"
            accessibilityLabel="See all, New arrivals"
            hitSlop={8}
            style={{ minHeight: touch.minimum, justifyContent: 'center', marginRight: space.space4 }}
          >
            <Text style={{ ...type.metadataMedium, color: C.textPrimary }}>See all</Text>
          </Tap>
        ) : null}
        {showControls ? (
          <>
            <IconButton
              icon="chevronLeft"
              label="Previous new arrivals"
              onPress={canBack ? () => page(-1) : undefined}
              color={canBack ? C.textPrimary : C.inkFaint}
              accessibilityState={{ disabled: !canBack }}
            />
            <IconButton
              icon="chevronRight"
              label="Next new arrivals"
              onPress={forwardEnabled ? () => page(1) : undefined}
              color={forwardEnabled ? C.textPrimary : C.inkFaint}
              accessibilityState={{ disabled: !forwardEnabled }}
            />
          </>
        ) : null}
      </View>

      {loading ? (
        <View
          accessibilityLabel="Loading new arrivals"
          style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: edge, marginTop: space.space12 }}
        >
          {[0, 1, 2].map((index) => (
            <View key={index} style={{ width: cardWidth }}>
              <Skeleton width={cardWidth} height={Math.round(cardWidth / (3 / 4))} round={radius.radiusXLarge} />
              <Skeleton width="70%" height={12} style={{ marginTop: space.space12 }} />
              <Skeleton width="40%" height={14} style={{ marginTop: space.space8 }} />
            </View>
          ))}
        </View>
      ) : empty ? (
        <InlineError
          message={retryableReadMessage(error, 'New arrivals could not be loaded.')}
          actionLabel="Retry"
          onAction={retry}
          style={{ marginTop: space.space12, marginHorizontal: edge }}
        />
      ) : (
        <FlatList
          ref={list}
          horizontal
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={Separator}
          showsHorizontalScrollIndicator={false}
          /* Snap card by card: each swipe lands on a whole card, never a sliver. */
          snapToInterval={stride}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          getItemLayout={(_, index) => ({ length: stride, offset: stride * index, index })}
          contentContainerStyle={{ paddingHorizontal: edge, paddingTop: space.space12 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onContentSizeChange={onContentSizeChange}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          initialNumToRender={4}
          windowSize={5}
          ListFooterComponent={
            loadingMore ? (
              <View
                style={{
                  width: cardWidth,
                  height: Math.round(cardWidth / (3 / 4)),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: GAP,
                }}
              >
                <Spinner color={C.textSecondary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Animated, FlatList, RefreshControl, ScrollView, View, type FlatListProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ListingCard } from '@/components/listing-card';
import { ProductGridSkeleton } from '@/components/skeleton';
import { Button, Chip, EmptyState, PressableScale, Spinner, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { useFavorites } from '@/hooks/use-favorites';
import { useListingFeed } from '@/hooks/use-listing-feed';
import type { ListingRow } from '@/lib/database.types';
import { fetchCategories } from '@/lib/queries';
import { useApp } from '@/store/app-store';
import { color as C, radius, space } from '@/theme/tokens';

const BRAND_ROW = 44;
const SEARCH_HEIGHT = 46;
const COLUMN_GAP = 10;

/**
 * A FlatList that can accept a native-driven `Animated.event`.
 *
 * Created once at module scope: building an animated component inside render
 * remounts the list on every pass, losing its scroll position and its windowing
 * state. The cast restores the item generic, which `createAnimatedComponent`
 * erases.
 */
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList as unknown as React.ComponentType<FlatListProps<ListingRow>>
);

export default function Home() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { cat, setCat, openSheet } = useApp();

  const [headerH, setHeaderH] = useState(0);
  const scrollY = useAnimatedValue(0);

  const favorites = useFavorites();
  const categories = useAsync(() => fetchCategories('home'), 'categories:home');

  const feed = useListingFeed(
    { category: cat === 'All' ? null : cat },
    `listings:${cat}`
  );

  const headerShift = scrollY.interpolate({
    inputRange: [0, BRAND_ROW],
    outputRange: [0, -BRAND_ROW],
    extrapolate: 'clamp',
  });
  const brandOpacity = scrollY.interpolate({
    inputRange: [0, BRAND_ROW * 0.75],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const hairline = scrollY.interpolate({
    inputRange: [BRAND_ROW, BRAND_ROW + 16],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  /**
   * `FlatList` with two columns rather than a mapped grid: it windows its rows,
   * so a long feed keeps a bounded number of cards mounted, and it owns the
   * end-of-list callback that drives pagination.
   */
  const renderItem = useCallback(
    ({ item }: { item: ListingRow }) => (
      <View style={{ flex: 1 / 2, paddingHorizontal: COLUMN_GAP / 2 }}>
        <ListingCardCell listing={item} saved={favorites.saved.has(item.id)} onToggle={favorites.toggle} />
      </View>
    ),
    [favorites.saved, favorites.toggle]
  );

  const body = () => {
    if (feed.loading) return <ProductGridSkeleton />;

    if (feed.error) {
      return (
        <EmptyState
          icon="close"
          title="Could not load listings"
          body={feed.error.message}
          action={<Button label="Try again" height={44} size={14} onPress={feed.retry} style={{ marginTop: 18 }} />}
        />
      );
    }

    /*
     * The database genuinely has no listings. Nothing is invented to fill the
     * grid; the way out is the Sell flow rather than a seeded catalog.
     */
    return (
      <EmptyState
        icon="bag"
        title={cat === 'All' ? 'No listings yet' : 'Nothing here yet'}
        body={
          cat === 'All'
            ? 'Be the first to list something on SAWA.'
            : 'Try another category, or list something here yourself.'
        }
        action={
          <Button label="Start selling" height={48} onPress={() => router.push('/sell')} style={{ marginTop: 20 }} />
        }
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/*
        Animated.FlatList, not FlatList. With `useNativeDriver: true`,
        `Animated.event` returns an AnimatedEvent object rather than a
        function — only an Animated component unwraps it, via AnimatedProps.
        A plain list calls the prop directly and throws "Object is not a
        function" on the first scroll frame. Web never sees it, because
        NATIVE_DRIVER is false there and the call returns a real function.

        This is the same trap that caught the ScrollView here before the list
        was paginated; swapping the component out is what reintroduced it.
      */}
      <AnimatedFlatList
        data={feed.listings}
        keyExtractor={(l) => l.id}
        renderItem={renderItem}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: NATIVE_DRIVER,
        })}
        columnWrapperStyle={{ paddingHorizontal: space.gutter - COLUMN_GAP / 2 }}
        contentContainerStyle={{
          paddingTop: headerH + space.lg,
          paddingBottom: navClearance,
          rowGap: 20,
        }}
        /* Only when the feed is genuinely empty; a populated list keeps its rows. */
        ListEmptyComponent={body()}
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
          <RefreshControl
            refreshing={feed.refreshing}
            onRefresh={() => {
              feed.refresh();
              favorites.refresh();
            }}
            progressViewOffset={headerH}
            tintColor={C.textMuted}
          />
        }
      />

      {!!favorites.error && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: navClearance }}>
          <T variant="meta" color={C.error} style={{ textAlign: 'center' }}>
            {favorites.error}
          </T>
        </View>
      )}

      <Animated.View
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          paddingTop: insets.top,
          backgroundColor: C.background,
          transform: [{ translateY: headerShift }],
        }}
      >
        <Animated.View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            height: BRAND_ROW,
            paddingHorizontal: space.gutter,
            opacity: brandOpacity,
          }}
        >
          <T w={700} size={25} tracking={-0.5} style={{ flex: 1 }}>
            SAWA
          </T>

          <Tap
            onPress={() => router.push('/favorites')}
            accessibilityRole="button"
            accessibilityLabel="Favorites"
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="heart" size={21} color={C.text} strokeWidth={1.8} />
          </Tap>

          <Tap
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="bell" size={21} color={C.text} strokeWidth={1.8} />
          </Tap>
        </Animated.View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            paddingHorizontal: space.gutter,
            paddingBottom: space.xs,
          }}
        >
          <Tap
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            accessibilityLabel="Search items, brands, categories"
            style={{
              flex: 1,
              height: SEARCH_HEIGHT,
              borderRadius: radius.lg,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingHorizontal: 14,
            }}
          >
            <Icon name="search" size={17} color={C.textSecondary} />
            <T size={14.5} color={C.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
              What are you looking for?
            </T>
          </Tap>

          <PressableScale
            onPress={() => openSheet({ kind: 'filters' })}
            accessibilityRole="button"
            accessibilityLabel="Filters"
            style={{
              width: SEARCH_HEIGHT,
              height: SEARCH_HEIGHT,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="sliders" size={18} color={C.text} strokeWidth={1.9} />
          </PressableScale>
        </View>

        {/* Real categories, absent until they load — no placeholder chips. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingHorizontal: space.gutter, paddingVertical: space.md }}
        >
          <Chip label="All" active={cat === 'All'} onPress={() => setCat('All')} />
          {(categories.data ?? []).map((c) => (
            <Chip key={c.slug} label={c.label} active={cat === c.slug} onPress={() => setCat(c.slug)} />
          ))}
        </ScrollView>

        <Animated.View style={{ height: 1, backgroundColor: C.border, opacity: hairline }} />
      </Animated.View>
    </View>
  );
}

/**
 * A grid cell. Split out so the card measures itself against the column it is
 * given rather than recomputing the screen width for every item.
 */
function ListingCardCell({
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

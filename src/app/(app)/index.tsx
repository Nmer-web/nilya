import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Animated, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ListingGrid } from '@/components/listing-card';
import { ProductGridSkeleton } from '@/components/skeleton';
import { Button, Chip, EmptyState, PressableScale, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useFavorites } from '@/hooks/use-favorites';
import { fetchCategories, fetchListings } from '@/lib/queries';
import { useApp } from '@/store/app-store';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { color as C, radius, space } from '@/theme/tokens';

/** Height of the wordmark row — the amount the header gives back on scroll. */
const BRAND_ROW = 44;

/** Search field and its filter button share a height so they read as one row. */
const SEARCH_HEIGHT = 46;

export default function Home() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { cat, setCat, openSheet } = useApp();

  const [headerH, setHeaderH] = useState(0);
  const scrollY = useAnimatedValue(0);

  const favorites = useFavorites();

  /** Reference data. Ten seeded rows; no fallback list, because there is one. */
  const categories = useAsync(() => fetchCategories('home'), 'categories:home');

  /**
   * The feed. `cat` holds a category slug, or 'All'. The key is what re-runs
   * the query, so it has to name every input the query depends on.
   */
  const feed = useAsync(
    () => fetchListings({ category: cat === 'All' ? null : cat }),
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

  const listings = feed.data?.rows ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: NATIVE_DRIVER,
        })}
        contentContainerStyle={{ paddingTop: headerH + space.lg, paddingBottom: navClearance }}
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
      >
        {feed.loading ? (
          <ProductGridSkeleton />
        ) : feed.error ? (
          <EmptyState
            icon="close"
            title="Could not load listings"
            body={feed.error.message}
            action={
              <Button
                label="Try again"
                height={44}
                size={14}
                onPress={feed.refetch}
                style={{ marginTop: 18 }}
              />
            }
          />
        ) : listings.length === 0 ? (
          /*
           * The database genuinely has no listings. This is the honest state:
           * nothing is invented to fill the grid, and the way out of it is the
           * Sell flow rather than a seeded catalog.
           */
          <EmptyState
            icon="bag"
            title={cat === 'All' ? 'No listings yet' : `Nothing in ${cat} yet`}
            body={
              cat === 'All'
                ? 'Be the first to list something on SAWA.'
                : 'Try another category, or list something here yourself.'
            }
            action={
              <Button
                label="Start selling"
                height={48}
                onPress={() => router.push('/sell')}
                style={{ marginTop: 20 }}
              />
            }
          />
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                paddingHorizontal: space.gutter,
                paddingBottom: space.md,
              }}
            >
              <T variant="sectionTitle">Recommended for you</T>
              <T variant="meta" color={C.textSecondary}>
                {listings.length} item{listings.length === 1 ? '' : 's'}
              </T>
            </View>

            <ListingGrid
              listings={listings}
              savedIds={favorites.saved}
              onToggleSave={favorites.toggle}
            />
          </>
        )}

        {!!favorites.error && (
          <T variant="meta" color={C.error} style={{ textAlign: 'center', paddingTop: space.lg }}>
            {favorites.error}
          </T>
        )}
      </Animated.ScrollView>

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

        {/* Real categories. Absent until the query lands — no placeholder chips. */}
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

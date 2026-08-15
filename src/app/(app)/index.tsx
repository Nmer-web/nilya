import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ListingFeedGrid } from '@/components/listing-feed-grid';
import { Button, Chip, PressableScale, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { useFavorites } from '@/hooks/use-favorites';
import { useListingFeed } from '@/hooks/use-listing-feed';
import { fetchCategories } from '@/lib/queries';
import { filtersActive, useApp } from '@/store/app-store';
import { color as C, radius, space } from '@/theme/tokens';

const BRAND_ROW = 44;
const SEARCH_HEIGHT = 46;

export default function Home() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { cat, setCat, sort, filters, openSheet } = useApp();

  const [headerH, setHeaderH] = useState(0);
  const scrollY = useAnimatedValue(0);

  const favorites = useFavorites();
  const categories = useAsync(() => fetchCategories('home'), 'categories:home');

  /*
   * The chip narrows the feed on top of whatever the filter sheet holds, and
   * wins on category where the two disagree — it is the control on screen.
   * Home's filter button opens the same sheet Explore uses, so it has to read
   * the same state or pressing it would appear to do nothing.
   */
  const category = cat === 'All' ? filters.categorySlug : cat;

  const feed = useListingFeed(
    {
      category,
      minPriceCents: filters.minCents,
      maxPriceCents: filters.maxCents,
      condition: filters.condition,
      countryCode: filters.countryCode,
      sort,
    },
    `home:${category}:${filters.minCents}:${filters.maxCents}:${filters.condition}:${filters.countryCode}:${sort}`
  );

  const hasFilters = filtersActive(filters);

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

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/*
        The grid is shared with Explore, Search and the seller profile. It is
        built on Animated.FlatList rather than FlatList, which is what lets the
        native-driven `Animated.event` below be passed straight through — see
        the note on that component.
      */}
      <ListingFeedGrid
        feed={feed}
        savedIds={favorites.saved}
        onToggleSave={favorites.toggle}
        contentPaddingTop={headerH + space.lg}
        contentPaddingBottom={navClearance}
        refreshOffset={headerH}
        onRefresh={() => {
          feed.refresh();
          favorites.refresh();
        }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: NATIVE_DRIVER,
        })}
        /*
         * The database genuinely has no listings. Nothing is invented to fill
         * the grid; the way out is the Sell flow rather than a seeded catalog.
         */
        empty={{
          icon: 'bag',
          title: cat === 'All' ? 'No listings yet' : 'Nothing here yet',
          body:
            cat === 'All'
              ? 'Be the first to list something on SAWA.'
              : 'Try another category, or list something here yourself.',
          action: (
            <Button label="Start selling" height={48} onPress={() => router.push('/sell')} style={{ marginTop: 20 }} />
          ),
        }}
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
              borderColor: hasFilters ? C.text : C.border,
              backgroundColor: hasFilters ? C.text : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="sliders" size={18} color={hasFilters ? C.primaryText : C.text} strokeWidth={1.9} />
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

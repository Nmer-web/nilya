import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ListingFeedGrid } from '@/components/listing-feed-grid';
import { TabTitle } from '@/components/screen-header';
import { Button, Chip, PressableScale, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useFavorites } from '@/hooks/use-favorites';
import { useListingFeed } from '@/hooks/use-listing-feed';
import { fetchCategories } from '@/lib/queries';
import { filtersActive, SORTS, useApp } from '@/store/app-store';
import { color as C, radius, space } from '@/theme/tokens';

export default function Explore() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { cat, setCat, sort, filters, openSheet } = useApp();

  const [headerH, setHeaderH] = useState(0);

  const favorites = useFavorites();
  const categories = useAsync(() => fetchCategories('explore'), 'categories:explore');

  /**
   * The category chip and the filter sheet both narrow the same query. The chip
   * wins where they disagree, because it is the control on screen — a sheet set
   * days ago should not silently override what the user just tapped.
   */
  const category = cat === 'All' ? filters.categorySlug : cat;

  const feed = useListingFeed(
    {
      category,
      minPriceCents: filters.minCents,
      maxPriceCents: filters.maxCents,
      countryCode: filters.countryCode,
      sort,
    },
    `explore:${category}:${filters.minCents}:${filters.maxCents}:${filters.countryCode}:${sort}`
  );

  const active = filtersActive(filters);
  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? 'Newest first';

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
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
        empty={{
          icon: 'bag',
          title: active || category ? 'Nothing matches those filters' : 'Nothing here yet',
          body:
            active || category
              ? 'Try widening your price range, or clearing a filter.'
              : 'New listings will appear here.',
          action:
            active || category ? (
              <Button
                label="Adjust filters"
                height={46}
                size={14}
                variant="outline"
                onPress={() => openSheet({ kind: 'filters' })}
                style={{ marginTop: 18 }}
              />
            ) : undefined,
        }}
      />

      <View
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          paddingTop: insets.top,
          backgroundColor: C.background,
        }}
      >
        <View style={{ paddingHorizontal: space.gutter, paddingTop: 2, paddingBottom: space.md }}>
          <TabTitle>Explore</TabTitle>
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: space.gutter }}>
          <Tap
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            accessibilityLabel="Search listings"
            style={{
              flex: 1,
              height: 46,
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
              width: 46,
              height: 46,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? C.text : C.surface,
              borderWidth: 1,
              borderColor: active ? C.text : C.border,
            }}
          >
            <Icon name="sliders" size={19} color={active ? C.primaryText : C.text} />
          </PressableScale>
        </View>

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

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: space.gutter,
            paddingBottom: space.md,
          }}
        >
          <T size={13} color={C.textSecondary}>
            {feed.loading
              ? 'Loading…'
              : `${feed.listings.length}${feed.hasMore ? '+' : ''} item${feed.listings.length === 1 && !feed.hasMore ? '' : 's'}`}
          </T>

          <Tap
            onPress={() => openSheet({ kind: 'sort' })}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${sortLabel}. Tap to change.`}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <T w={500} size={13}>
              {sortLabel}
            </T>
            <Icon name="chevronDown" size={13} color={C.text} />
          </Tap>
        </View>
      </View>
    </View>
  );
}

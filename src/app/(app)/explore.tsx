import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { FlatList, RefreshControl, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { CategoryArtwork, artworkFor } from '@/components/category-artwork';
import { Icon } from '@/components/icon';
import { FadeIn, Skeleton } from '@/components/skeleton';
import { Button, EmptyState, PressableScale, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import type { CategoryRow } from '@/lib/database.types';
import { categoryIconName } from '@/lib/categories';
import { haptic } from '@/lib/haptics';
import { fetchCategories } from '@/lib/queries';
import { EMPTY_FILTERS, useApp } from '@/store/app-store';
import {
  color as C,
  duration,
  radius,
  scale,
  space,
  touch,
} from '@/theme/tokens';

/**
 * Category-first discovery.
 *
 * `categories.slug` is the table's primary key and the same value stored on
 * `listings.category_slug`, so a card can hand the existing Search feed an
 * exact database filter without translating or inventing an identifier.
 * Categories have no image column; the artwork below is static decorative UI,
 * mapped by slug only when a known category has a NILYA-owned illustration.
 */
export default function Explore() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const { width } = useWindowDimensions();
  const { setCat, setFilters, setQuery } = useApp();
  const categories = useAsync(() => fetchCategories('explore'), 'categories:explore');

  const gutter = width < 390 ? space.space16 : space.space20;
  const cardWidth = Math.max(0, (width - gutter * 2 - space.space12) / 2);
  const cardHeight = cardWidth * 0.7;

  const openSearch = useCallback(() => {
    setCat('All');
    setQuery('');
    setFilters(EMPTY_FILTERS);
    router.push('/search');
  }, [router, setCat, setFilters, setQuery]);

  const browseCategory = useCallback(
    (category: CategoryRow) => {
      haptic('selection-committed');
      setCat(category.slug);
      setFilters({ ...EMPTY_FILTERS, categorySlug: category.slug, listingType: category.listing_type });
      router.push({ pathname: '/category/[slug]', params: { slug: category.slug } });
    },
    [router, setCat, setFilters]
  );

  const renderCategory = useCallback(
    ({ item }: { item: CategoryRow }) => (
      <CategoryCard
        category={item}
        width={cardWidth}
        height={cardHeight}
        onPress={() => browseCategory(item)}
      />
    ),
    [browseCategory, cardHeight, cardWidth]
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <FadeIn y={space.space8} duration={duration.standard} style={{ flex: 1 }}>
        <FlatList
          data={categories.data ?? []}
          keyExtractor={(category) => category.slug}
          renderItem={renderCategory}
          numColumns={2}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + space.space16,
            paddingHorizontal: gutter,
            paddingBottom: navClearance,
          }}
          columnWrapperStyle={{ gap: space.space12 }}
          ItemSeparatorComponent={() => <View style={{ height: space.space12 }} />}
          refreshControl={
            <RefreshControl
              refreshing={categories.refreshing}
              onRefresh={categories.refresh}
              progressViewOffset={insets.top}
              tintColor={C.textSecondary}
            />
          }
          ListHeaderComponent={
            <PressableScale
              onPress={openSearch}
              scale={scale.buttonPressed}
              accessibilityRole="search"
              accessibilityLabel="Search for items or members"
              style={{
                height: touch.large,
                borderRadius: radius.radiusMedium,
                borderCurve: 'continuous',
                backgroundColor: C.surface,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.space12,
                paddingHorizontal: space.space16,
                marginBottom: space.space20,
              }}
            >
              <Icon name="search" role="inline" color={C.textSecondary} decorative />
              <T variant="body" color={C.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
                Search for items or members
              </T>
            </PressableScale>
          }
          ListEmptyComponent={
            categories.loading ? (
              <BrowseCategorySkeleton cardWidth={cardWidth} cardHeight={cardHeight} />
            ) : categories.error ? (
              <EmptyState
                icon="close"
                title="Could not load categories."
                body="Check your connection and try again."
                style={{ paddingVertical: space.space48 }}
                action={
                  <Button
                    label="Try again"
                    variant="secondary"
                    onPress={categories.refetch}
                    style={{ marginTop: space.space20 }}
                  />
                }
              />
            ) : (
              <EmptyState
                icon="bag"
                title="Browse"
                body="No categories available yet."
                style={{ paddingVertical: space.space48 }}
              />
            )
          }
        />
      </FadeIn>
    </View>
  );
}
function CategoryCard({
  category,
  width,
  height,
  onPress,
}: {
  category: CategoryRow;
  width: number;
  height: number;
  onPress: () => void;
}) {
  const artwork = artworkFor(category.slug);
  const artworkSize = width * 0.5;
  const titleSize = width < 160 ? 22 : 24;

  return (
    <PressableScale
      onPress={onPress}
      scale={0.985}
      motionRole="cardPress"
      accessibilityRole="button"
      accessibilityLabel={`Browse ${category.label}`}
      style={{
        width,
        height,
        borderRadius: radius.radiusMedium,
        borderCurve: 'continuous',
        backgroundColor: C.surface,
        padding: space.space16,
        overflow: 'hidden',
      }}
    >
      <T
        numberOfLines={2}
        style={{
          maxWidth: width * 0.72,
          fontSize: titleSize,
          lineHeight: titleSize + 4,
          fontWeight: '700',
          letterSpacing: 0,
          color: C.textPrimary,
        }}
      >
        {category.label}
      </T>

      <View
        accessible={false}
        style={{
          position: 'absolute',
          right: space.space12,
          bottom: space.space8,
          width: artworkSize,
          height: artworkSize,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {artwork ? (
          <CategoryArtwork kind={artwork} size={artworkSize} />
        ) : (
          <View
            style={{
              width: artworkSize * 0.58,
              height: artworkSize * 0.58,
              borderRadius: radius.radiusMedium,
              borderCurve: 'continuous',
              backgroundColor: C.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={categoryIconName(category.icon_key)} role="navigation" color={C.primary} decorative />
          </View>
        )}
      </View>
    </PressableScale>
  );
}

function BrowseCategorySkeleton({ cardWidth, cardHeight }: { cardWidth: number; cardHeight: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading categories"
      style={{ gap: space.space12 }}
    >
      {Array.from({ length: 3 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', gap: space.space12 }}>
          <Skeleton width={cardWidth} height={cardHeight} round={radius.radiusMedium} />
          <Skeleton width={cardWidth} height={cardHeight} round={radius.radiusMedium} />
        </View>
      ))}
    </View>
  );
}

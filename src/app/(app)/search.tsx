import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryArtwork, artworkFor } from '@/components/category-artwork';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ListingFeedGrid } from '@/components/listing-feed-grid';
import { FadeIn, Skeleton } from '@/components/skeleton';
import { Button, InlineError, PressableScale, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useDebounced } from '@/hooks/use-debounced';
import { useFavorites } from '@/hooks/use-favorites';
import { useGoBack } from '@/hooks/use-go-back';
import { useListingFeed } from '@/hooks/use-listing-feed';
import type { CategoryRow } from '@/lib/database.types';
import { haptic } from '@/lib/haptics';
import { categoryChildren } from '@/lib/categories';
import { fetchCategoryTree } from '@/lib/queries';
import { EMPTY_FILTERS, filtersActive, SORTS, useApp } from '@/store/app-store';
import {
  color as C,
  duration,
  elevation,
  radius,
  screenGutter,
  space,
  touch,
  type as typography,
} from '@/theme/tokens';

/**
 * Search keeps its field mounted while discovery and live catalogue results
 * change below it. Every category and result comes from Supabase; the category
 * illustrations are NILYA-owned decorative UI because the category table has
 * no image column.
 */
export default function Search() {
  const router = useRouter();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    q: activeQuery,
    recent,
    submitSearch,
    removeRecentSearch,
    clearRecentSearches,
    setQuery,
    setCat,
    setFilters,
    sort,
    filters,
    openSheet,
  } = useApp();
  const favorites = useFavorites();

  const [draft, setDraft] = useState(() => activeQuery);
  const query = useDebounced(draft.trim(), 320);
  const hasFilters = filtersActive(filters);
  const showingResults = query.length > 0 || hasFilters;
  const activeFilterCount = Object.values(filters).filter((value) => value !== null).length;
  const gutter = screenGutter(width);
  const categoryGap = space.space12;
  const categoryWidth = Math.max(0, (width - gutter * 2 - categoryGap) / 2);
  const categoryHeight = Math.max(124, categoryWidth * 0.72);

  const categories = useAsync(fetchCategoryTree, 'categories:tree');
  const browseCategories = useMemo(
    () => categoryChildren(categories.data ?? [], null).filter((category) => category.in_explore),
    [categories.data]
  );
  const feed = useListingFeed(
    {
      query,
      category: filters.categorySlug,
      minPriceCents: filters.minCents,
      maxPriceCents: filters.maxCents,
      countryCode: filters.countryCode,
      brand: filters.brand,
      color: filters.color,
      sort,
    },
    `search:${query}:${filters.categorySlug}:${filters.minCents}:${filters.maxCents}:${filters.countryCode}:${filters.brand}:${filters.color}:${sort}`
  );

  useEffect(() => {
    setQuery(query);
  }, [query, setQuery]);

  const sortLabel = SORTS.find((option) => option.key === sort)?.label ?? 'Newest';
  const categoryLabel = useMemo(
    () =>
      filters.categorySlug
        ? (categories.data ?? []).find((category) => category.slug === filters.categorySlug)?.label ?? filters.categorySlug
        : null,
    [categories.data, filters.categorySlug]
  );
  const resultTitle = query ? `Results for “${query}”` : categoryLabel ?? 'Search results';
  const resultCount = feed.loading
    ? 'Searching…'
    : feed.error || feed.total === null
      ? ''
      : `${feed.total} ${feed.total === 1 ? 'item' : 'items'}`;

  const go = useCallback(
    (raw: string) => {
      const term = raw.trim();
      if (!term) return;
      haptic('selection-committed');
      submitSearch(term);
      setDraft(term);
    },
    [submitSearch]
  );

  const browse = useCallback(
    (slug: string) => {
      haptic('selection-committed');
      setDraft('');
      setQuery('');
      setCat('All');
      setFilters(EMPTY_FILTERS);
      router.push({ pathname: '/category/[slug]', params: { slug } });
    },
    [router, setCat, setFilters, setQuery]
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <SearchHeader
        topInset={insets.top}
        gutter={gutter}
        draft={draft}
        onBack={goBack}
        onChange={setDraft}
        onSubmit={() => go(draft)}
        onClear={() => {
          setDraft('');
          setQuery('');
        }}
      />

      {showingResults ? (
        <>
          <ResultsToolbar
            title={resultTitle}
            count={resultCount}
            sortLabel={sortLabel}
            activeFilterCount={activeFilterCount}
            gutter={gutter}
            onSort={() => openSheet({ kind: 'sort' })}
            onFilter={() => openSheet({ kind: 'filters' })}
          />
          <ListingFeedGrid
            feed={feed}
            savedIds={favorites.saved}
            onToggleSave={favorites.toggle}
            contentPaddingBottom={insets.bottom + space.space32}
            onRefresh={() => {
              feed.refresh();
              favorites.refresh();
            }}
            empty={
              filters.categorySlug && !query
                ? {
                    icon: 'bag',
                    title: 'Nothing here yet',
                    body: 'New products in this category will appear here.',
                  }
                : {
                    icon: 'search',
                    title: 'No results found',
                    body: 'Try another search or adjust your filters.',
                  }
            }
            error={{ title: "Couldn't load results", body: 'Check your connection and try again.' }}
          />
        </>
      ) : (
        <FadeIn y={space.space8} duration={duration.standard} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: insets.bottom + space.space40 }}
          >
            <View style={{ paddingTop: space.space20, paddingBottom: space.space32 }}>
              <T variant="screenTitle" accessibilityRole="header">
                Find something new
              </T>
              <T variant="body" color={C.textSecondary} style={{ maxWidth: 330, marginTop: space.space8 }}>
                Search new products from sellers on NILYA.
              </T>
            </View>

            {recent.length > 0 ? (
              <RecentSearches
                terms={recent}
                onSelect={go}
                onRemove={removeRecentSearch}
                onClear={clearRecentSearches}
              />
            ) : null}

            <View style={{ marginTop: recent.length > 0 ? space.space32 : 0 }}>
              <T variant="sectionTitle" accessibilityRole="header">
                Browse categories
              </T>
              <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4, marginBottom: space.space16 }}>
                Start with what you are looking for
              </T>

              {categories.error ? (
                <View style={{ gap: space.space12 }}>
                  <InlineError message="Categories could not be loaded." />
                  <Button label="Try again" variant="secondary" buttonSize="compact" onPress={categories.refetch} />
                </View>
              ) : categories.loading ? (
                <CategoryGridSkeleton cardWidth={categoryWidth} cardHeight={categoryHeight} />
              ) : browseCategories.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: categoryGap }}>
                  {browseCategories.map((category) => (
                    <CategoryDiscoveryCard
                      key={category.slug}
                      category={category}
                      width={categoryWidth}
                      height={categoryHeight}
                      onPress={() => browse(category.slug)}
                    />
                  ))}
                </View>
              ) : (
                <View
                  style={{
                    minHeight: 128,
                    borderRadius: radius.radiusLarge,
                    backgroundColor: C.bgMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: space.space20,
                  }}
                >
                  <T variant="bodyMedium">No categories available yet.</T>
                </View>
              )}
            </View>
          </ScrollView>
        </FadeIn>
      )}
    </View>
  );
}

function SearchHeader({
  topInset,
  gutter,
  draft,
  onBack,
  onChange,
  onSubmit,
  onClear,
}: {
  topInset: number;
  gutter: number;
  draft: string;
  onBack: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}) {
  return (
    <View
      style={{
        paddingTop: topInset + space.space8,
        paddingHorizontal: gutter,
        paddingBottom: space.space12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space12,
      }}
    >
      <IconButton icon="chevronLeft" label="Go back" onPress={onBack} />

      <View
        style={{
          flex: 1,
          height: touch.standard,
          borderRadius: radius.radiusPill,
          borderCurve: 'continuous',
          backgroundColor: C.bgMuted,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.space12,
          paddingLeft: space.space16,
          paddingRight: space.space8,
        }}
      >
        <Icon name="search" role="inline" color={C.textPrimary} decorative />
        <TextInput
          autoFocus
          value={draft}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          placeholder="Search items, brands or sellers"
          placeholderTextColor={C.inkFaint}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search items, brands or sellers"
          selectionColor={C.primary}
          style={{ flex: 1, minWidth: 0, ...typography.body, color: C.textPrimary, padding: 0 }}
        />
        {draft.length > 0 ? (
          <Tap
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
            hitSlop={6}
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.radiusPill,
              backgroundColor: C.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close" role="metadata" color={C.textSecondary} decorative />
          </Tap>
        ) : null}
      </View>
    </View>
  );
}

function ResultsToolbar({
  title,
  count,
  sortLabel,
  activeFilterCount,
  gutter,
  onSort,
  onFilter,
}: {
  title: string;
  count: string;
  sortLabel: string;
  activeFilterCount: number;
  gutter: number;
  onSort: () => void;
  onFilter: () => void;
}) {
  const filtersApplied = activeFilterCount > 0;

  return (
    <View style={{ paddingHorizontal: gutter, paddingTop: space.space8, paddingBottom: space.space16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.space12 }}>
        <T variant="sectionTitle" numberOfLines={1} accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </T>
        <T variant="metadata" color={C.textSecondary} numberOfLines={1}>
          {count}
        </T>
      </View>

      <View style={{ flexDirection: 'row', gap: space.space8, marginTop: space.space12 }}>
        <PressableScale
          onPress={onSort}
          accessibilityRole="button"
          accessibilityLabel={`Sort results, ${sortLabel}`}
          style={{
            flex: 1,
            height: touch.minimum,
            borderRadius: radius.radiusPill,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.space8,
            paddingHorizontal: space.space12,
          }}
        >
          <T variant="button" numberOfLines={1}>
            {sortLabel}
          </T>
          <Icon name="chevronDown" role="metadata" color={C.textPrimary} decorative />
        </PressableScale>

        <PressableScale
          onPress={onFilter}
          accessibilityRole="button"
          accessibilityLabel={filtersApplied ? `Filters, ${activeFilterCount} active` : 'Filters'}
          accessibilityState={{ selected: filtersApplied }}
          style={{
            flex: 1,
            height: touch.minimum,
            borderRadius: radius.radiusPill,
            borderCurve: 'continuous',
            backgroundColor: filtersApplied ? C.textPrimary : C.bgMuted,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.space8,
            paddingHorizontal: space.space12,
          }}
        >
          <Icon name="sliders" role="metadata" color={filtersApplied ? C.textInverse : C.textPrimary} decorative />
          <T variant="button" color={filtersApplied ? C.textInverse : C.textPrimary}>
            {filtersApplied ? `Filters · ${activeFilterCount}` : 'Filters'}
          </T>
        </PressableScale>
      </View>
    </View>
  );
}

function RecentSearches({
  terms,
  onSelect,
  onRemove,
  onClear,
}: {
  terms: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClear: () => void;
}) {
  return (
    <View>
      <View style={{ minHeight: touch.minimum, flexDirection: 'row', alignItems: 'center', gap: space.space12 }}>
        <T variant="sectionTitle" accessibilityRole="header" style={{ flex: 1 }}>
          Recent searches
        </T>
        <Tap
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear recent searches"
          hitSlop={8}
          style={{ minHeight: touch.minimum, justifyContent: 'center' }}
        >
          <T variant="metadataMedium" color={C.primary}>
            Clear all
          </T>
        </Tap>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: radius.radiusXLarge,
          borderCurve: 'continuous',
          backgroundColor: C.surface,
          overflow: 'hidden',
          ...elevation.raised,
        }}
      >
        {terms.map((term, index) => (
          <View
            key={term.toLocaleLowerCase()}
            style={{
              minHeight: touch.large,
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: space.space12,
              paddingRight: space.space8,
              borderBottomWidth: index === terms.length - 1 ? 0 : 1,
              borderBottomColor: C.border,
            }}
          >
            <PressableScale
              onPress={() => onSelect(term)}
              accessibilityRole="button"
              accessibilityLabel={`Search for ${term}`}
              style={{
                flex: 1,
                minHeight: touch.large,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.space12,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: radius.radiusPill,
                  backgroundColor: C.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="search" role="metadata" color={C.primary} decorative />
              </View>
              <T variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                {term}
              </T>
            </PressableScale>
            <Tap
              onPress={() => onRemove(term)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${term} from recent searches`}
              hitSlop={4}
              style={{ width: touch.minimum, height: touch.minimum, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="close" role="metadata" color={C.textSecondary} decorative />
            </Tap>
          </View>
        ))}
      </View>
    </View>
  );
}

function CategoryDiscoveryCard({
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
  const artworkSize = Math.min(width * 0.58, height * 0.78);

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
        borderRadius: radius.radiusXLarge,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.bgMuted,
        overflow: 'hidden',
        padding: space.space16,
      }}
    >
      <T variant="sectionTitle" numberOfLines={2} style={{ maxWidth: width * 0.72, fontSize: 18, lineHeight: 23 }}>
        {category.label}
      </T>

      <View
        accessible={false}
        style={{
          position: 'absolute',
          right: space.space4,
          bottom: -space.space8,
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
              width: artworkSize * 0.6,
              height: artworkSize * 0.6,
              borderRadius: radius.radiusLarge,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="bag" role="navigation" color={C.textSecondary} decorative />
          </View>
        )}
      </View>

      <View
        accessible={false}
        style={{
          position: 'absolute',
          left: space.space16,
          bottom: space.space16,
          width: 30,
          height: 30,
          borderRadius: radius.radiusPill,
          backgroundColor: C.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="chevronRight" role="metadata" color={C.textPrimary} decorative />
      </View>
    </PressableScale>
  );
}

function CategoryGridSkeleton({ cardWidth, cardHeight }: { cardWidth: number; cardHeight: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading categories" style={{ gap: space.space12 }}>
      {Array.from({ length: 3 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', gap: space.space12 }}>
          <Skeleton width={cardWidth} height={cardHeight} round={radius.radiusXLarge} />
          <Skeleton width={cardWidth} height={cardHeight} round={radius.radiusXLarge} />
        </View>
      ))}
    </View>
  );
}

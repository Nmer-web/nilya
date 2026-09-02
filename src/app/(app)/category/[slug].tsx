import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { FlatList, I18nManager, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ListingFeedGrid } from '@/components/listing-feed-grid';
import { Skeleton } from '@/components/skeleton';
import { Button, EmptyState, InlineError, PressableScale, ScreenError, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useFavorites } from '@/hooks/use-favorites';
import { useGoBack } from '@/hooks/use-go-back';
import { useListingFeed } from '@/hooks/use-listing-feed';
import {
  categoryBySlug,
  categoryChildren,
  categoryHasChildren,
  categoryIconName,
  isCanonicalCategorySlug,
} from '@/lib/categories';
import type { CategoryRow } from '@/lib/database.types';
import { haptic } from '@/lib/haptics';
import { fetchCategoryTree } from '@/lib/queries';
import { EMPTY_FILTERS, SORTS, useApp } from '@/store/app-store';
import { color as C, radius, screenGutter, space, touch } from '@/theme/tokens';

function routeValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

export default function CategoryRoute() {
  const params = useLocalSearchParams<{ slug?: string | string[]; view?: string | string[] }>();
  const slug = routeValue(params.slug);
  const showAll = routeValue(params.view) === 'all';

  if (!isCanonicalCategorySlug(slug)) return <CategoryUnavailable />;
  return <CategoryScreen key={`${slug}:${showAll}`} slug={slug} showAll={showAll} />;
}

/** One active tree request decides whether this slug is a menu or a product leaf. */
function CategoryScreen({ slug, showAll }: { slug: string; showAll: boolean }) {
  const categories = useAsync(fetchCategoryTree, 'categories:tree');

  if (categories.loading) return <CategoryLoading />;
  if (categories.error) {
    return <CategoryLoadError error={categories.error} onRetry={categories.refetch} />;
  }

  const rows = categories.data ?? [];
  const category = categoryBySlug(rows, slug);
  if (!category) return <CategoryUnavailable />;

  const children = categoryChildren(rows, category.id);
  if (showAll || children.length === 0) {
    return <CategoryProducts category={category} />;
  }

  return <CategoryMenu category={category} childCategories={children} tree={rows} />;
}

function CategoryMenu({
  category,
  childCategories,
  tree,
}: {
  category: CategoryRow;
  childCategories: CategoryRow[];
  tree: readonly CategoryRow[];
}) {
  const router = useRouter();
  const goBack = useGoBack('/explore');
  const navClearance = useNavClearance();
  const { setCat, setFilters, setQuery } = useApp();

  const openSearch = () => {
    setCat(category.slug);
    setQuery('');
    setFilters({ ...EMPTY_FILTERS, categorySlug: category.slug });
    router.push('/search');
  };

  const openProducts = (target: CategoryRow, viewAll = false) => {
    haptic('selection-committed');
    setCat(target.slug);
    setFilters({ ...EMPTY_FILTERS, categorySlug: target.slug });
    router.push({
      pathname: '/category/[slug]',
      params: viewAll ? { slug: target.slug, view: 'all' } : { slug: target.slug },
    });
  };

  const menuRows: CategoryMenuRow[] = [
    { kind: 'all', key: `all:${category.id}`, category },
    ...childCategories.map((child): CategoryMenuRow => ({ kind: 'category', key: child.id, category: child })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <CategoryHeader title={category.label} onBack={goBack} onSearch={openSearch} />
      <FlatList
        data={menuRows}
        keyExtractor={(row) => row.key}
        renderItem={({ item }) => {
          const hasChildren = item.kind === 'category' && categoryHasChildren(tree, item.category.id);
          const label = item.kind === 'all' ? 'All' : item.category.label;
          const accessibilityLabel =
            item.kind === 'all'
              ? `Browse all ${category.label} products`
              : hasChildren
                ? `Open ${item.category.label} category`
                : `Browse ${item.category.label} products`;

          return (
            <CategoryMenuItem
              label={label}
              icon={item.kind === 'all' ? 'categoryAll' : categoryIconName(item.category.icon_key)}
              accessibilityLabel={accessibilityLabel}
              onPress={() => {
                if (item.kind === 'all') openProducts(category, true);
                else openProducts(item.category);
              }}
            />
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: navClearance,
        }}
      />
    </View>
  );
}

type CategoryMenuRow = {
  kind: 'all' | 'category';
  key: string;
  category: CategoryRow;
};

function CategoryMenuItem({
  label,
  icon,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scale={0.985}
      motionRole="selection"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="flex-row items-center"
      style={{
        minHeight: 72,
        paddingHorizontal: space.gutterCompact,
        paddingVertical: space.space12,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      <View
        accessible={false}
        style={{
          width: 36,
          height: 44,
          marginRight: space.space16,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={30} strokeWidth={1.7} color={C.primary} decorative />
      </View>
      <T variant="sectionTitle" numberOfLines={2} style={{ flex: 1 }}>
        {label}
      </T>
      <Icon
        name={I18nManager.isRTL ? 'chevronLeft' : 'chevronRight'}
        role="navigation"
        color={C.textSecondary}
        strokeWidth={1.7}
        decorative
      />
    </PressableScale>
  );
}

function CategoryProducts({ category }: { category: CategoryRow }) {
  const router = useRouter();
  const goBack = useGoBack('/explore');
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const { width } = useWindowDimensions();
  const gutter = screenGutter(width);
  const { filters, sort, openSheet, setFilters, setCat, setQuery } = useApp();
  const favorites = useFavorites();

  useEffect(() => {
    if (filters.categorySlug === category.slug) return;
    setFilters({ ...filters, categorySlug: category.slug });
  }, [category.slug, filters, setFilters]);

  const feed = useListingFeed(
    {
      category: category.slug,
      minPriceCents: filters.minCents,
      maxPriceCents: filters.maxCents,
      countryCode: filters.countryCode,
      brand: filters.brand,
      color: filters.color,
      sort,
    },
    `category:${category.slug}:${filters.minCents}:${filters.maxCents}:${filters.countryCode}:${filters.brand}:${filters.color}:${sort}`
  );
  const activeFilterCount = [
    filters.minCents,
    filters.maxCents,
    filters.countryCode,
    filters.brand,
    filters.color,
  ].filter((value) => value !== null).length;
  const sortLabel = SORTS.find((option) => option.key === sort)?.label ?? 'Newest';
  const countLabel = feed.loading
    ? 'Loading…'
    : feed.error || feed.total === null
      ? ''
      : `${feed.total} ${feed.total === 1 ? 'product' : 'products'}`;

  const openSearch = () => {
    setCat(category.slug);
    setQuery('');
    setFilters({ ...EMPTY_FILTERS, categorySlug: category.slug });
    router.push('/search');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <CategoryHeader title={category.label} onBack={goBack} onSearch={openSearch} />
      <View style={{ paddingHorizontal: gutter, paddingTop: space.space8, paddingBottom: space.space16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space12 }}>
          <T variant="sectionTitle" accessibilityRole="header" style={{ flex: 1 }}>
            Products
          </T>
          <T variant="metadata" color={C.textSecondary}>
            {countLabel}
          </T>
        </View>
        <View style={{ flexDirection: 'row', gap: space.space8, marginTop: space.space12 }}>
          <ResultControl
            label={sortLabel}
            icon="chevronDown"
            accessibilityLabel={`Sort products, ${sortLabel}`}
            onPress={() => openSheet({ kind: 'sort' })}
          />
          <ResultControl
            label={activeFilterCount > 0 ? `Filters · ${activeFilterCount}` : 'Filters'}
            icon="sliders"
            selected={activeFilterCount > 0}
            accessibilityLabel={
              activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filter products'
            }
            onPress={() => openSheet({ kind: 'filters' })}
          />
        </View>
      </View>

      <ListingFeedGrid
        feed={feed}
        savedIds={favorites.saved}
        onToggleSave={favorites.toggle}
        cardVariant="editorial"
        cardHorizontalInset={gutter}
        contentPaddingBottom={navClearance}
        refreshOffset={insets.top}
        onRefresh={() => {
          feed.refresh();
          favorites.refresh();
        }}
        empty={{
          icon: 'bag',
          title: 'No products found in this category.',
          body:
            activeFilterCount > 0
              ? 'Try adjusting your filters.'
              : 'New products will appear here as sellers publish them.',
        }}
        error={{ title: "Couldn't load products", body: 'Check your connection and try again.' }}
      />

      {favorites.error ? (
        <View style={{ position: 'absolute', left: gutter, right: gutter, bottom: navClearance }}>
          <InlineError message="Your wishlist change could not be saved. Try again." />
        </View>
      ) : null}
    </View>
  );
}

function ResultControl({
  label,
  icon,
  accessibilityLabel,
  selected = false,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  accessibilityLabel: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={{
        flex: 1,
        height: touch.minimum,
        borderRadius: radius.radiusPill,
        borderCurve: 'continuous',
        borderWidth: selected ? 0 : 1,
        borderColor: C.border,
        backgroundColor: selected ? C.textPrimary : C.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.space8,
        paddingHorizontal: space.space12,
      }}
    >
      <Icon name={icon} role="navigation" color={selected ? C.textInverse : C.textPrimary} decorative />
      <T variant="button" color={selected ? C.textInverse : C.textPrimary} numberOfLines={1}>
        {label}
      </T>
    </PressableScale>
  );
}

function CategoryHeader({
  title,
  onBack,
  onSearch,
}: {
  title: string;
  onBack: () => void;
  onSearch: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + space.space8,
        paddingHorizontal: space.gutterCompact,
        paddingBottom: space.space12,
        backgroundColor: C.surface,
      }}
    >
      <View style={{ height: touch.large, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: touch.minimum + space.space12,
            right: touch.minimum + space.space12,
            alignItems: 'center',
          }}
        >
          <T variant="sectionTitle" numberOfLines={1} accessibilityRole="header">
            {title}
          </T>
        </View>
        <PressableScale
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{ width: touch.standard, height: touch.standard, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon
            name={I18nManager.isRTL ? 'arrowRight' : 'arrowLeft'}
            size={30}
            strokeWidth={1.8}
            color={C.textPrimary}
            decorative
          />
        </PressableScale>
        <PressableScale
          onPress={onSearch}
          accessibilityRole="button"
          accessibilityLabel={`Search within ${title}`}
          style={{ width: touch.standard, height: touch.standard, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="search" size={30} strokeWidth={1.8} color={C.textPrimary} decorative />
        </PressableScale>
      </View>
    </View>
  );
}

function CategoryLoading() {
  const goBack = useGoBack('/explore');
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <CategoryHeader title="Category" onBack={goBack} onSearch={() => router.push('/search')} />
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading category"
      >
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <View
            key={index}
            style={{
              minHeight: 72,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.space12,
              paddingHorizontal: space.gutterCompact,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            <Skeleton width={32} height={32} round={radius.radiusSmall} />
            <Skeleton width={index % 2 === 0 ? '42%' : '56%'} height={20} />
          </View>
        ))}
      </View>
    </View>
  );
}

function CategoryLoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const goBack = useGoBack('/explore');
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <CategoryHeader title="Category" onBack={goBack} onSearch={() => router.push('/search')} />
      <ScreenError error={error} title="Could not load this category" onRetry={onRetry} />
    </View>
  );
}

function CategoryUnavailable() {
  const goBack = useGoBack('/explore');
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <CategoryHeader title="Category" onBack={goBack} onSearch={() => router.push('/search')} />
      <EmptyState
        icon="grid"
        title="Category unavailable"
        body="This category does not exist or is no longer available."
        action={
          <Button
            label="Browse categories"
            variant="secondary"
            onPress={() => router.dismissTo('/explore')}
            style={{ marginTop: space.space20 }}
          />
        }
      />
    </View>
  );
}

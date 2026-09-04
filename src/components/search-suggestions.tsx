import { Image } from 'expo-image';
import React, { useMemo, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Skeleton } from '@/components/skeleton';
import { Avatar, Button, InlineError, PressableScale, T } from '@/components/ui';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import { categoryPath } from '@/lib/categories';
import type { CategoryRow } from '@/lib/database.types';
import {
  coverUrl,
  type ProductSearchSuggestion,
  type SellerSearchSuggestion,
} from '@/lib/queries';
import { color as C, radius, space, touch } from '@/theme/tokens';

type CategorySearchSuggestion = {
  category: CategoryRow;
  pathLabel: string;
  score: number;
};

function searchableWords(raw: string): string[] {
  return raw
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** The category tree is small public reference data already loaded for Browse. */
function matchingCategories(
  rows: readonly CategoryRow[],
  rawQuery: string
): CategorySearchSuggestion[] {
  const queryWords = searchableWords(rawQuery);
  if (queryWords.length === 0) return [];

  return rows
    .map((category) => {
      const path = categoryPath(rows, category.slug);
      const pathLabel = path.map((part) => part.label).join(' › ');
      const labelWords = searchableWords(category.label);
      const pathWords = searchableWords(`${pathLabel} ${category.slug.replace(/-/g, ' ')}`);
      const matches = queryWords.every((queryWord) =>
        pathWords.some((pathWord) => pathWord.startsWith(queryWord))
      );
      if (!matches) return null;

      const normalizedQuery = queryWords.join(' ');
      const normalizedLabel = labelWords.join(' ');
      const score = normalizedLabel === normalizedQuery
        ? 0
        : normalizedLabel.startsWith(normalizedQuery)
          ? 1
          : Math.max(path.length - 1, 0) + 2;
      return { category, pathLabel, score };
    })
    .filter((entry): entry is CategorySearchSuggestion => Boolean(entry))
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.pathLabel.length - right.pathLabel.length ||
        left.pathLabel.localeCompare(right.pathLabel)
    )
    .slice(0, 5);
}

function matchingRecentSearches(terms: readonly string[], rawQuery: string): string[] {
  const queryWords = searchableWords(rawQuery);
  if (queryWords.length === 0) return [];
  return terms
    .filter((term) => {
      const words = searchableWords(term);
      return queryWords.every((queryWord) =>
        words.some((word) => word.startsWith(queryWord))
      );
    })
    .slice(0, 4);
}

export function SearchSuggestionsPanel({
  query,
  debouncedQuery,
  categorySlug,
  scopeLabel,
  categories,
  recent,
  gutter,
  bottomInset,
  onSubmit,
  onProduct,
  onCategory,
  onBrand,
  onSeller,
  onRecent,
}: {
  query: string;
  debouncedQuery: string;
  categorySlug: string | null;
  scopeLabel: string | null;
  categories: readonly CategoryRow[];
  recent: readonly string[];
  gutter: number;
  bottomInset: number;
  onSubmit: (term: string) => void;
  onProduct: (suggestion: ProductSearchSuggestion) => void;
  onCategory: (category: CategoryRow) => void;
  onBrand: (brand: string) => void;
  onSeller: (seller: SellerSearchSuggestion) => void;
  onRecent: (term: string) => void;
}) {
  const normalizedQuery = query.trim();
  const normalizedDebounced = debouncedQuery.trim();
  const debounceSettled = normalizedDebounced === normalizedQuery;
  const suggestions = useSearchSuggestions(normalizedDebounced, categorySlug);
  const categorySuggestions = useMemo(
    () => debounceSettled ? matchingCategories(categories, normalizedQuery) : [],
    [categories, debounceSettled, normalizedQuery]
  );
  const recentSuggestions = useMemo(
    () => matchingRecentSearches(recent, normalizedQuery),
    [normalizedQuery, recent]
  );
  const loading = normalizedQuery.length >= 2 && (!debounceSettled || suggestions.loading);
  const data = debounceSettled ? suggestions.data : null;
  const error = debounceSettled ? suggestions.error : null;
  const hasServerSuggestions = Boolean(
    data && (data.products.length > 0 || data.brands.length > 0 || data.sellers.length > 0)
  );
  const hasSuggestions = hasServerSuggestions || categorySuggestions.length > 0 || recentSuggestions.length > 0;

  return (
    <ScrollView
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: bottomInset + space.space32 }}
    >
      <View className="pb-2 pt-3">
        <T variant="sectionTitle" accessibilityRole="header">
          Search suggestions
        </T>
      </View>

      <SuggestionRow
        icon="search"
        title={`Search for “${normalizedQuery}”`}
        subtitle={scopeLabel ? `in ${scopeLabel}` : 'across all Nilya listings'}
        accessibilityLabel={`Search for ${normalizedQuery}`}
        onPress={() => onSubmit(normalizedQuery)}
      />

      {normalizedQuery.length < 2 ? (
        <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space12 }}>
          Type one more character for live listing, brand and seller suggestions.
        </T>
      ) : loading ? (
        <SuggestionSkeleton />
      ) : error ? (
        <View style={{ marginTop: space.space16, gap: space.space12 }}>
          <InlineError message="Suggestions could not be loaded. You can still search." />
          <Button label="Try suggestions again" variant="secondary" buttonSize="compact" onPress={suggestions.retry} />
        </View>
      ) : null}

      {data?.products.length ? (
        <SuggestionGroup title="Listings">
          {data.products.map((product) => (
            <ProductSuggestionRow
              key={product.id}
              product={product}
              onPress={() => onProduct(product)}
            />
          ))}
        </SuggestionGroup>
      ) : null}

      {categorySuggestions.length > 0 ? (
        <SuggestionGroup title="Categories">
          {categorySuggestions.map(({ category, pathLabel }) => (
            <SuggestionRow
              key={category.id}
              icon="grid"
              title={pathLabel}
              accessibilityLabel={`Open ${pathLabel} category`}
              onPress={() => onCategory(category)}
            />
          ))}
        </SuggestionGroup>
      ) : null}

      {data?.brands.length ? (
        <SuggestionGroup title="Brands">
          {data.brands.map((brand) => (
            <SuggestionRow
              key={brand.toLocaleLowerCase()}
              icon="bag"
              title={brand}
              accessibilityLabel={`Search brand ${brand}`}
              onPress={() => onBrand(brand)}
            />
          ))}
        </SuggestionGroup>
      ) : null}

      {data?.sellers.length ? (
        <SuggestionGroup title="Sellers">
          {data.sellers.map((seller) => (
            <SellerSuggestionRow
              key={seller.id}
              seller={seller}
              onPress={() => onSeller(seller)}
            />
          ))}
        </SuggestionGroup>
      ) : null}

      {recentSuggestions.length > 0 ? (
        <SuggestionGroup title="Recent">
          {recentSuggestions.map((term) => (
            <SuggestionRow
              key={term.toLocaleLowerCase()}
              icon="search"
              title={term}
              accessibilityLabel={`Search for ${term}`}
              onPress={() => onRecent(term)}
            />
          ))}
        </SuggestionGroup>
      ) : null}

      {normalizedQuery.length >= 2 && !loading && !error && !hasSuggestions ? (
        <View style={{ paddingVertical: space.space24 }}>
          <T variant="bodyMedium">No matching suggestions yet.</T>
          <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4 }}>
            Press search to look through all matching listings.
          </T>
        </View>
      ) : null}
    </ScrollView>
  );
}

function SuggestionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: space.space24 }}>
      <T variant="metadataMedium" color={C.textSecondary} accessibilityRole="header" style={{ marginBottom: space.space4 }}>
        {title}
      </T>
      {children}
    </View>
  );
}

function SuggestionRow({
  icon,
  leading,
  title,
  subtitle,
  accessibilityLabel,
  onPress,
}: {
  icon?: 'search' | 'grid' | 'bag';
  leading?: ReactNode;
  title: string;
  subtitle?: string | null;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      className="flex-row items-center"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        minHeight: touch.large,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space12,
      }}
    >
      {leading ?? (
        <View
          style={{
            width: touch.minimum,
            height: touch.minimum,
            borderRadius: radius.radiusMedium,
            backgroundColor: C.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon ?? 'search'} role="inline" color={C.primary} decorative />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0, paddingVertical: space.space8 }}>
        <T variant="bodyMedium" numberOfLines={2}>
          {title}
        </T>
        {subtitle ? (
          <T variant="metadata" color={C.textSecondary} numberOfLines={2} style={{ marginTop: 2 }}>
            {subtitle}
          </T>
        ) : null}
      </View>
      <Icon name="chevronRight" role="metadata" color={C.textSecondary} decorative />
    </PressableScale>
  );
}

function ProductSuggestionRow({
  product,
  onPress,
}: {
  product: ProductSearchSuggestion;
  onPress: () => void;
}) {
  const imageUrl = coverUrl(product.images);
  const leading = imageUrl ? (
    <Image
      source={{ uri: imageUrl }}
      contentFit="contain"
      transition={120}
      accessible={false}
      style={{
        width: touch.minimum,
        height: touch.minimum,
        borderRadius: radius.radiusMedium,
        backgroundColor: C.surface,
      }}
    />
  ) : undefined;

  return (
    <SuggestionRow
      icon="bag"
      leading={leading}
      title={product.title}
      subtitle={product.brand?.trim() || null}
      accessibilityLabel={`Open listing ${product.title}`}
      onPress={onPress}
    />
  );
}

function SellerSuggestionRow({
  seller,
  onPress,
}: {
  seller: SellerSearchSuggestion;
  onPress: () => void;
}) {
  const initials = seller.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('');
  const location = [seller.city, seller.countryCode].filter(Boolean).join(', ');

  return (
    <SuggestionRow
      leading={
        <Avatar
          initials={initials || '?'}
          bg={seller.avatarColor?.trim() || C.primary}
          imageUrl={seller.avatarUrl}
          accessibilityLabel={`${seller.displayName} avatar`}
        />
      }
      title={seller.displayName}
      subtitle={location || null}
      accessibilityLabel={`View seller ${seller.displayName}`}
      onPress={onPress}
    />
  );
}

function SuggestionSkeleton() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading search suggestions" style={{ marginTop: space.space20, gap: space.space12 }}>
      {[0, 1, 2].map((index) => (
        <View key={index} style={{ minHeight: touch.large, flexDirection: 'row', alignItems: 'center', gap: space.space12 }}>
          <Skeleton width={touch.minimum} height={touch.minimum} round={radius.radiusMedium} />
          <View style={{ flex: 1, gap: space.space8 }}>
            <Skeleton width={index === 1 ? '58%' : '72%'} height={14} />
            <Skeleton width="38%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

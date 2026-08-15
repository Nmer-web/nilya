import React from 'react';
import { ScrollView, View } from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { Skeleton } from '@/components/skeleton';
import { T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { fetchListings, type FeedFilters } from '@/lib/queries';
import { color as C, radius, space } from '@/theme/tokens';

/**
 * A horizontal row of listings under a heading.
 *
 * The rail removes itself when the query returns nothing. That is the whole
 * point of it: a section called "Near you" with no listings near you is worse
 * than no section, and filling it would mean showing items that are not near
 * you. Loading shows placeholders; empty shows nothing at all.
 *
 * There is no "Popular" rail anywhere in the app. `listings` carries no view
 * count and no denormalised favourite count, so popularity would have to be
 * invented — an ordering dressed up as a signal.
 */
export function ListingRail({
  title,
  subtitle,
  filters,
  cacheKey,
  onSeeAll,
  savedIds,
  onToggleSave,
}: {
  title: string;
  subtitle?: string;
  filters: FeedFilters;
  cacheKey: string;
  onSeeAll?: () => void;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
}) {
  const rail = useAsync(async () => (await fetchListings(filters)).rows.slice(0, 8), cacheKey);

  /* Nothing to show and nothing to say — the section does not exist today. */
  if (!rail.loading && (rail.error || (rail.data ?? []).length === 0)) return null;

  return (
    <View style={{ paddingTop: space.xl }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 12,
          paddingHorizontal: space.gutter,
          paddingBottom: space.md,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={600} size={17} tracking={-0.3}>
            {title}
          </T>
          {!!subtitle && (
            <T size={12.5} color={C.textSecondary} style={{ marginTop: 2 }}>
              {subtitle}
            </T>
          )}
        </View>

        {!!onSeeAll && !rail.loading && (
          <Tap onPress={onSeeAll} accessibilityRole="button" hitSlop={8}>
            <T w={500} size={13.5} color={C.textSecondary}>
              See all
            </T>
          </Tap>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: space.gutter }}
      >
        {rail.loading
          ? [0, 1, 2].map((i) => (
              <View key={i} style={{ width: 150 }}>
                <Skeleton width={150} height={200} round={radius.lg} />
                <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
                <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
              </View>
            ))
          : (rail.data ?? []).map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                width={150}
                saved={savedIds.has(listing.id)}
                onToggleSave={onToggleSave}
              />
            ))}
      </ScrollView>
    </View>
  );
}

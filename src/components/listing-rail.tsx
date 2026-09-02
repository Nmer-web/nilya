import React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { Skeleton } from '@/components/skeleton';
import { T, Tap } from '@/components/ui';
import type { ListingRow } from '@/lib/database.types';
import { color as C, radius, space, touch } from '@/theme/tokens';

/**
 * A horizontal row of listings under a heading.
 *
 * The rail removes itself when there is nothing to show. That is the whole
 * point of it: a section called "Near you" with no listings near you is worse
 * than no section, and filling it would mean showing items that are not near
 * you. Loading shows placeholders; empty shows nothing at all.
 *
 * The rows are handed in rather than read here, because the screens that use a
 * rail already hold the listings for their own reasons — the product page shows
 * the same seller's items over the hero — and one read serving both is one
 * fewer round trip than a rail that insists on fetching for itself.
 *
 * There is no "Popular" rail anywhere in the app. `listings` carries no view
 * count and no denormalised favourite count, so popularity would have to be
 * invented — an ordering dressed up as a signal.
 */
export function ListingRail({
  title,
  subtitle,
  listings,
  loading,
  onSeeAll,
  savedIds,
  onToggleSave,
  style,
}: {
  title: string;
  subtitle?: string;
  listings: readonly ListingRow[];
  loading: boolean;
  onSeeAll?: () => void;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  /* Nothing to show and nothing to say — the section does not exist today. */
  if (!loading && listings.length === 0) return null;

  return (
    <View style={[{ paddingTop: space.space20 }, style]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: space.space12,
          paddingHorizontal: space.gutterCompact,
          paddingBottom: space.space12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="sectionTitle" accessibilityRole="header">
            {title}
          </T>
          {!!subtitle && (
            <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4 }}>
              {subtitle}
            </T>
          )}
        </View>

        {!!onSeeAll && !loading && (
          <Tap
            onPress={onSeeAll}
            accessibilityRole="button"
            hitSlop={8}
            style={{ minHeight: touch.minimum, justifyContent: 'center' }}
          >
            <T variant="button" color={C.textSecondary}>
              See all
            </T>
          </Tap>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.space12, paddingHorizontal: space.gutterCompact }}
      >
        {loading
          ? [0, 1, 2].map((i) => (
              <View key={i} style={{ width: 150 }}>
                <Skeleton width={150} height={200} round={radius.radiusLarge} />
                <Skeleton width="70%" height={12} style={{ marginTop: space.space8 }} />
                <Skeleton width="40%" height={12} style={{ marginTop: space.space8 }} />
              </View>
            ))
          : listings.map((listing) => (
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

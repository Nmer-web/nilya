import React from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { ProductSkeleton } from '@/components/skeleton';
import { T } from '@/components/ui';
import type { ListingRow } from '@/lib/database.types';
import { SIMILAR_LISTING_LIMIT } from '@/lib/queries';
import { space } from '@/theme/tokens';

const LOADING_CARD_COUNT = 3;

/**
 * Products like this one.
 *
 * The rows are handed in rather than read here: the product page also shows
 * them over the foot of its hero, and one read serving both surfaces is one
 * fewer round trip than each fetching the same listings for itself.
 */
export function SimilarProducts({
  title = 'Similar listings',
  listings,
  loading,
  savedIds,
  onToggleSave,
}: {
  title?: string;
  listings: readonly ListingRow[];
  loading: boolean;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(168, Math.max(148, Math.round(width * 0.42)));

  if (!loading && listings.length === 0) return null;

  return (
    <View className="mt-8 border-t border-nilya-border pt-6">
      <View className="px-5 pb-4">
        <T variant="sectionTitle" accessibilityRole="header">
          {title}
        </T>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: space.space12,
          paddingHorizontal: space.gutterCompact,
        }}
      >
        {loading
          ? Array.from({ length: LOADING_CARD_COUNT }, (_, index) => (
              <ProductSkeleton key={index} width={cardWidth} />
            ))
          : listings.slice(0, SIMILAR_LISTING_LIMIT).map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                width={cardWidth}
                saved={savedIds.has(listing.id)}
                onToggleSave={onToggleSave}
              />
            ))}
      </ScrollView>
    </View>
  );
}

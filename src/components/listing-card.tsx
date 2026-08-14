import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Animated, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale, T } from '@/components/ui';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { CONDITION_LABEL, type ListingRow } from '@/lib/database.types';
import { tapLight } from '@/lib/haptics';
import { coverUrl } from '@/lib/queries';
import { color as C, motion, radius, shadow, space } from '@/theme/tokens';

const COLUMN_GAP = 10;
const ROW_GAP = 20;
const IMAGE_RATIO = 3 / 4;
const TOUCH = 44;

/** Card width for an n-column grid inset by the standard gutter. */
function useCardWidth(columns = 2) {
  const { width } = useWindowDimensions();
  return (width - space.gutter * 2 - COLUMN_GAP * (columns - 1)) / columns;
}

/** €45 from 4500. Whole euros stay whole; anything else shows both decimals. */
export function formatPrice(cents: number, currency = 'EUR'): string {
  const symbol = currency === 'EUR' ? '€' : `${currency} `;
  return cents % 100 === 0 ? `${symbol}${cents / 100}` : `${symbol}${(cents / 100).toFixed(2)}`;
}

/**
 * A listing's photograph.
 *
 * `expo-image` rather than RN's Image: it caches to disk and cross-fades on
 * decode, which is what turns a loaded photo into §12's fade rather than a
 * pop. A listing with no images yet falls back to the neutral well — that is
 * an empty state, not a loading one, so it does not shimmer.
 */
export function ListingImage({
  url,
  width,
  round = radius.lg,
}: {
  url: string | null;
  width: number;
  round?: number;
}) {
  return (
    <View
      style={{
        width,
        aspectRatio: IMAGE_RATIO,
        borderRadius: round,
        overflow: 'hidden',
        backgroundColor: C.surfaceSecondary,
      }}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={220}
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="image" size={24} color={C.textMuted} strokeWidth={1.5} />
        </View>
      )}
    </View>
  );
}

/**
 * The heart over a listing image.
 *
 * The saved set is owned by whoever renders the grid, so the card stays a pure
 * function of its props: a favourite toggled here updates one source of truth
 * rather than each card holding its own copy.
 */
export function FavouriteButton({
  saved,
  onToggle,
  size = 32,
}: {
  saved: boolean;
  onToggle: () => void;
  size?: number;
}) {
  const s = useAnimatedValue(1);

  const press = () => {
    tapLight();
    onToggle();
    Animated.sequence([
      Animated.spring(s, { toValue: 1.15, useNativeDriver: NATIVE_DRIVER, tension: 420, friction: 6 }),
      Animated.spring(s, { toValue: 1, useNativeDriver: NATIVE_DRIVER, ...motion.spring }),
    ]).start();
  };

  return (
    <View style={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }} pointerEvents="box-none">
      <PressableScale
        scale={1}
        onPress={press}
        accessibilityRole="button"
        accessibilityState={{ selected: saved }}
        accessibilityLabel={saved ? 'Remove from favourites' : 'Save to favourites'}
        style={{ width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: C.background,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: s }],
            ...shadow.raised,
          }}
        >
          <Icon
            name="heart"
            size={17}
            color={C.favourite}
            fill={saved ? C.favourite : 'none'}
            strokeWidth={1.9}
          />
        </Animated.View>
      </PressableScale>
    </View>
  );
}

/**
 * The listing card, backed by a database row.
 *
 * Image-first and undecorated: no border, no shadow, no container. On a white
 * canvas the photography separates one card from the next, so anything drawn
 * around it competes with the thing being sold.
 */
export const ListingCard = React.memo(function ListingCard({
  listing,
  width,
  saved,
  onToggleSave,
}: {
  listing: ListingRow;
  width: number;
  saved: boolean;
  onToggleSave: (id: string) => void;
}) {
  const router = useRouter();
  const price = formatPrice(listing.price_cents, listing.currency);
  const place = [listing.city, listing.country_code].filter(Boolean).join(', ');

  return (
    /**
     * The heart is a sibling of the card's tap target, not a child of it.
     * Nesting one pressable inside another renders a `<button>` inside a
     * `<button>` on web, which is invalid and swallows the inner press.
     */
    <View style={{ width }}>
      <PressableScale
        scale={0.98}
        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${listing.title}, ${price}, ${CONDITION_LABEL[listing.condition]}${place ? `, ${place}` : ''}`}
      >
        <ListingImage url={coverUrl(listing.images)} width={width} />

        <View style={{ paddingTop: space.sm }}>
          <T variant="productTitle" numberOfLines={1}>
            {listing.title}
          </T>
          <T variant="price" style={{ marginTop: 2 }}>
            {price}
          </T>
          <T variant="meta" color={C.textSecondary} style={{ marginTop: 5 }}>
            {CONDITION_LABEL[listing.condition]}
          </T>
          {!!place && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
              <Icon name="pin" size={11} color={C.textMuted} />
              <T size={12} color={C.textMuted} numberOfLines={1}>
                {place}
              </T>
            </View>
          )}
        </View>
      </PressableScale>

      <FavouriteButton saved={saved} onToggle={() => onToggleSave(listing.id)} />
    </View>
  );
});

/** Two-column grid of listings. */
export const ListingGrid = React.memo(function ListingGrid({
  listings,
  savedIds,
  onToggleSave,
  columns = 2,
}: {
  listings: ListingRow[];
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  columns?: number;
}) {
  const width = useCardWidth(columns);
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: ROW_GAP,
        columnGap: COLUMN_GAP,
        paddingHorizontal: space.gutter,
      }}
    >
      {listings.map((l) => (
        <ListingCard
          key={l.id}
          listing={l}
          width={width}
          saved={savedIds.has(l.id)}
          onToggleSave={onToggleSave}
        />
      ))}
    </View>
  );
});

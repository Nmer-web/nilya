import React from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { ImageSlot } from '@/components/image-slot';
import { ListingImage, formatPrice, listingPriceText, listingTypeBadge, useFavoriteFeedback } from '@/components/listing-card';
import { PressableScale } from '@/components/ui';
import type { ListingRow } from '@/lib/database.types';
import { coverUrl } from '@/lib/queries';
import {
  color as C,
  elevation,
  image as imageToken,
  radius,
  scale as scaleToken,
  space,
  type,
} from '@/theme/tokens';

/**
 * The row thumbnail, and the catalogue `ProductCard` further down.
 *
 * The prototype's mock-typed card family is gone; everything here is typed to
 * `ListingRow` and navigates only to real listing ids.
 *
 * The thumbnail below is not a card and is not a duplicate: it carries no
 * price, no favourite and no tap target, because the row around it owns all
 * three. It stays because Chat, Inbox, Orders and Checkout are still on
 * prototype data and are not this task's to convert.
 */

/** Listing imagery is portrait everywhere — the card, the tile, the rail. */
/** Widths for the row thumbnail. Two sizes, so rows stop inventing their own. */
export const THUMB = { sm: 40, md: 54 } as const;

/**
 * The small listing thumbnail that sits inside a row — inbox conversations,
 * order lines, the chat header, the checkout summary.
 *
 * It exists because those six rows each invented their own well — 36x44, 40x48,
 * 52x64, 54x66 and 56x70, at radii of 7, 9 and 12 — so none shared the card's
 * 3:4 crop and most sat off the radius ladder. Bare numbers are why the step
 * that constrained the radii never caught them.
 */
export function ListingThumb({ width = THUMB.md }: { width?: number }) {
  return (
    <View
      style={{
        width,
        aspectRatio: imageToken.conversation.aspectRatio,
        borderRadius: radius.radiusSmall,
        overflow: 'hidden',
        backgroundColor: C.surface,
      }}
    >
      <ImageSlot tiny />
    </View>
  );
}

/**
 * The catalogue card: a 3:4 photograph with a soft heart and an earned badge,
 * then the title and the price.
 *
 * Both badges are derived, never assigned: "New in" when the listing was
 * published in the last seven days, "Sale" when a stored original price sits
 * above the current one. There is no "Best Seller" because nothing in the
 * schema counts sales per listing.
 */
const NEW_IN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function productBadge(listing: ListingRow): string | null {
  const typed = listingTypeBadge(listing);
  if (typed) return typed;
  const published = listing.published_at ? Date.parse(listing.published_at) : Number.NaN;
  if (Number.isFinite(published) && Date.now() - published <= NEW_IN_WINDOW_MS) return 'New in';
  if (listing.price_cents != null && listing.original_price_cents != null && listing.original_price_cents > listing.price_cents) return 'Sale';
  return null;
}

export const ProductCard = React.memo(function ProductCard({
  listing,
  width,
  saved,
  onToggleSave,
  onPress,
}: {
  listing: ListingRow;
  width: number;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onPress: () => void;
}) {
  const title = listing.title.trim();
  const price = listingPriceText(listing);
  const originalPrice =
    listing.price_cents != null && listing.original_price_cents != null && listing.original_price_cents > listing.price_cents
      ? formatPrice(listing.original_price_cents, listing.currency)
      : null;
  const badge = productBadge(listing);
  const imageHeight = width / (3 / 4);
  const feedback = useFavoriteFeedback(() => onToggleSave(listing.id));

  return (
    <View style={{ width }}>
      <PressableScale
        onPress={onPress}
        scale={scaleToken.cardPressed}
        motionRole="cardPress"
        accessibilityRole="button"
        accessibilityLabel={[title, price, originalPrice ? `was ${originalPrice}` : null, badge]
          .filter(Boolean)
          .join(', ')}
      >
        <ListingImage
          url={coverUrl(listing.images)}
          width={width}
          aspectRatio={3 / 4}
          round={radius.radiusXLarge}
          label={`${title} listing photo`}
        />

        {badge ? (
          <View
            accessible={false}
            style={{
              position: 'absolute',
              left: space.space8,
              top: imageHeight - space.space8 - 24,
              minHeight: 24,
              justifyContent: 'center',
              paddingHorizontal: space.space12,
              borderRadius: radius.radiusPill,
              backgroundColor: C.surface,
              ...elevation.card,
            }}
          >
            <Text style={{ ...type.metadataMedium, fontSize: 11, lineHeight: 14, color: C.textPrimary }}>
              {badge}
            </Text>
          </View>
        ) : null}

        <View style={{ paddingTop: space.space12, gap: space.space4 }}>
          <Text style={{ ...type.metadata, color: C.textSecondary }} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.space8 }}>
            <Text style={{ ...type.cardTitle, color: C.textPrimary }} numberOfLines={1}>
              {price}
            </Text>
            {originalPrice ? (
              <Text
                style={{ ...type.metadata, color: C.inkFaint, textDecorationLine: 'line-through' }}
                numberOfLines={1}
              >
                {originalPrice}
              </Text>
            ) : null}
          </View>
        </View>
      </PressableScale>

      {/* A sibling of the card's tap target, never a child: nested pressables
          render a button inside a button on web and swallow the inner press. */}
      <PressableScale
        scale={1}
        onPress={feedback.activate}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ selected: saved }}
        accessibilityLabel={saved ? 'Remove from wishlist' : 'Add to wishlist'}
        style={{
          position: 'absolute',
          right: space.space8,
          top: space.space8,
          width: 32,
          height: 32,
          borderRadius: radius.radiusPill,
          backgroundColor: C.surface,
          alignItems: 'center',
          justifyContent: 'center',
          ...elevation.card,
        }}
      >
        <Animated.View style={feedback.animatedStyle}>
          <Icon name="heart" role="metadata" color={C.primary} fill={saved ? C.primary : 'none'} />
        </Animated.View>
      </PressableScale>
    </View>
  );
});

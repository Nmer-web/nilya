import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, type RefreshControlProps, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { NEW_CONDITION, type ListingRow } from '@/lib/database.types';
import { detailKindForCategory } from '@/lib/listing-types';
import { coverUrl } from '@/lib/queries';
import {
  color as C,
  duration,
  elevation,
  image as imageToken,
  radius,
  scale as scaleToken,
  space,
  spring,
  touch,
  type,
} from '@/theme/tokens';

const SIZED_CATEGORY_SLUGS = new Set(['women', 'men', 'kids', 'shoes']);

/** Runs the favorite action immediately, then gives it one interruptible pulse. */
export function useFavoriteFeedback(onActivate: () => void) {
  const { allowScale } = useReducedMotion();
  const value = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: value.value }] }));

  const activate = () => {
    onActivate();
    cancelAnimation(value);
    value.set(allowScale
      ? withSequence(
          withSpring(scaleToken.favoritePeak, spring.favorite),
          withSpring(1, spring.favorite)
        )
      : 1);
  };

  return { activate, animatedStyle };
}

/** Card width for an n-column grid inset by the standard gutter. */
function useCardWidth(columns = 2) {
  const { width } = useWindowDimensions();
  return (width - space.space16 * 2 - space.space12 * (columns - 1)) / columns;
}

/** €45 from 4500. Whole euros stay whole; anything else shows both decimals. */
export function formatPrice(cents: number, currency = 'EUR'): string {
  const symbol = currency === 'EUR' ? '€' : `${currency} `;
  return cents % 100 === 0 ? `${symbol}${cents / 100}` : `${symbol}${(cents / 100).toFixed(2)}`;
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

/** The truthful price/compensation label used by every typed listing card. */
export function listingPriceText(
  listing: Pick<
    ListingRow,
    | 'listing_type'
    | 'job_details'
    | 'service_details'
    | 'food_details'
    | 'price_cents'
    | 'currency'
  >
): string {
  if (listing.listing_type === 'job' && listing.job_details) {
    const { salary_min_cents: minimum, salary_max_cents: maximum, salary_currency: currency } = listing.job_details;
    return minimum === maximum
      ? formatPrice(minimum, currency)
      : `${formatPrice(minimum, currency)}–${formatPrice(maximum, currency)}`;
  }
  if (listing.listing_type === 'service' && listing.service_details?.pricing_mode === 'quote') {
    return 'Quote required';
  }
  if (listing.price_cents == null) return 'Price unavailable';
  const amount = formatPrice(listing.price_cents, listing.currency);
  if (listing.listing_type === 'food' && listing.food_details) {
    return `${amount} / ${listing.food_details.price_unit}`;
  }
  if (listing.listing_type === 'service' && listing.service_details) {
    const suffix = listing.service_details.pricing_mode === 'hourly'
      ? ' / hour'
      : listing.service_details.pricing_mode === 'daily'
        ? ' / day'
        : '';
    return `${amount}${suffix}`;
  }
  return amount;
}

export function listingTypeBadge(listing: ListingRow): string | null {
  const kind = detailKindForCategory(listing.category);
  if (kind === 'perfume') return 'FRAGRANCE';
  if (kind === 'product') return null;
  return kind.toUpperCase();
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
  label,
  round = imageToken.listing.radius,
  aspectRatio = imageToken.listing.aspectRatio,
}: {
  url: string | null;
  width: number;
  label?: string;
  round?: number;
  aspectRatio?: number;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      className="overflow-hidden bg-nilya-surface"
      style={{
        width,
        height: width / aspectRatio,
        borderRadius: round,
        borderCurve: 'continuous',
        backgroundColor: C.surface,
      }}
    >
      {url && !failed ? (
        <Image
          source={{ uri: url }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={duration.standard}
          cachePolicy="memory-disk"
          accessible={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-2">
          <Icon name="image" role="navigation" color={C.textSecondary} decorative />
          <Text className="text-xs font-medium text-nilya-secondary">
            Image unavailable
          </Text>
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
  imageHeight,
  topAligned = false,
}: {
  saved: boolean;
  onToggle: () => void;
  imageHeight: number;
  topAligned?: boolean;
}) {
  const feedback = useFavoriteFeedback(onToggle);

  return (
    <View
      className="absolute right-3 z-10 h-11 w-11 rounded-full border border-nilya-border bg-nilya-background"
      style={{ top: topAligned ? space.space12 : imageHeight - touch.minimum - space.space12 }}
      pointerEvents="box-none"
    >
      <PressableScale
        scale={1}
        onPress={feedback.activate}
        accessibilityRole="button"
        accessibilityState={{ selected: saved }}
        accessibilityLabel={saved ? 'Remove from favorites' : 'Add to favorites'}
        className="h-full w-full items-center justify-center rounded-full"
      >
        <Animated.View style={feedback.animatedStyle}>
          <Icon
            name="heart"
            role="metadata"
            color={C.primary}
            fill={saved ? C.primary : 'none'}
          />
        </Animated.View>
      </PressableScale>
    </View>
  );
}

/**
 * The listing card, backed by a database row.
 *
 * The framed catalogue treatment is the default everywhere — one card shape
 * across Home, search, seller, favorites, and utility screens. A screen can
 * still opt out of the frame, but nothing needs to opt in anymore.
 */
export const ListingCard = React.memo(function ListingCard({
  listing,
  width,
  saved,
  onToggleSave,
  showAttributes = true,
  showPhotoCount = true,
  showSellerVerification = true,
  showDiscountBadge = true,
  framed = true,
  imageAspectRatio = imageToken.listing.aspectRatio,
}: {
  listing: ListingRow;
  width: number;
  saved: boolean;
  onToggleSave: (id: string) => void;
  showAttributes?: boolean;
  showPhotoCount?: boolean;
  showSellerVerification?: boolean;
  showDiscountBadge?: boolean;
  framed?: boolean;
  imageAspectRatio?: number;
}) {
  const router = useRouter();
  const price = listingPriceText(listing);
  const originalPrice = listing.original_price_cents == null
    ? null
    : formatPrice(listing.original_price_cents, listing.currency);
  const title = listing.title.trim();
  const candidateBrand = listing.listing_type === 'job'
    ? listing.job_details?.employer?.trim() || null
    : listing.perfume_details?.brand?.trim() || listing.brand?.trim() || null;
  const brand = candidateBrand?.toLocaleLowerCase() === title.toLocaleLowerCase() ? null : candidateBrand;
  const place = [listing.city, listing.country_code].filter(Boolean).join(', ');
  const size = SIZED_CATEGORY_SLUGS.has(listing.category_slug) ? listing.size?.trim() : null;
  const color = listing.color?.trim();
  const typedAttributes = listing.listing_type === 'job' && listing.job_details
    ? [humanize(listing.job_details.contract_type), humanize(listing.job_details.work_mode)]
    : listing.listing_type === 'service' && listing.service_details
      ? [humanize(listing.service_details.delivery_mode), listing.service_details.service_area]
      : listing.listing_type === 'food' && listing.food_details
        ? [humanize(listing.food_details.preparation_type), humanize(listing.food_details.halal_status)]
        : listing.perfume_details
          ? [humanize(listing.perfume_details.fragrance_type), `${listing.perfume_details.volume_ml} ml`]
          : [size, color, listing.condition === NEW_CONDITION ? 'NEW' : null];
  const attributes = typedAttributes.filter(
    (value): value is string => Boolean(value)
  );
  const showAttributeRow = showAttributes && attributes.length > 0;
  const photoCount = listing.images.length;
  const verifiedSeller = showSellerVerification && listing.seller?.is_verified === true;
  const discountPercent =
    listing.price_cents != null && listing.original_price_cents != null && listing.original_price_cents > listing.price_cents
      ? Math.round((1 - listing.price_cents / listing.original_price_cents) * 100)
      : null;
  const imageHeight = width / imageAspectRatio;
  const accessibilityDetails = [
    brand,
    listing.title,
    price,
    ...attributes,
    place,
    verifiedSeller ? 'Verified seller' : null,
    photoCount > 1 ? `${photoCount} photos` : null,
  ].filter(Boolean).join(', ');

  return (
    /**
     * The heart is a sibling of the card's tap target, not a child of it.
     * Nesting one pressable inside another renders a `<button>` inside a
     * `<button>` on web, which is invalid and swallows the inner press.
     */
    <View
      style={[
        { width },
        framed
          ? {
              overflow: 'hidden',
              borderRadius: radius.radiusXLarge,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: C.surface,
              ...elevation.raised,
            }
          : null,
      ]}
    >
      <PressableScale
        scale={scaleToken.cardPressed}
        motionRole="cardPress"
        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
        accessibilityRole="button"
        accessibilityLabel={accessibilityDetails}
      >
        <ListingImage
          url={coverUrl(listing.images)}
          width={width}
          label={`${listing.title} listing photo`}
          round={framed ? 0 : imageToken.listing.radius}
          aspectRatio={imageAspectRatio}
        />

        {/*
          Discount and photo-count both live in the same top-left slot. A
          discounted listing's savings matter more to a shopper than its photo
          count, so the badge wins the slot when both would otherwise apply.
        */}
        {listingTypeBadge(listing) ? (
          <View accessible accessibilityLabel={`${listingTypeBadge(listing)} listing`} style={{ position: 'absolute', left: space.space12, top: space.space12, minHeight: 30, justifyContent: 'center', borderRadius: radius.radiusSmall, backgroundColor: C.primary, paddingHorizontal: space.space8 }}>
            <Text style={{ color: C.textInverse, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 }}>{listingTypeBadge(listing)}</Text>
          </View>
        ) : showDiscountBadge && discountPercent != null && discountPercent > 0 ? (
          <View
            accessible
            accessibilityLabel={`${discountPercent} percent below the original price`}
            style={{
              position: 'absolute',
              left: space.space12,
              top: space.space12,
              minHeight: 30,
              justifyContent: 'center',
              borderRadius: radius.radiusSmall,
              backgroundColor: C.primary,
              paddingHorizontal: space.space8,
            }}
          >
            <Text style={{ color: C.textInverse, fontSize: 13, fontWeight: '600' }}>
              -{discountPercent}%
            </Text>
          </View>
        ) : showPhotoCount && photoCount > 1 ? (
          <View
            accessible={false}
            className="absolute left-3 top-3 min-h-7 flex-row items-center gap-1 rounded-full bg-nilya-accent px-2"
          >
            <Icon name="image" role="metadata" color={C.textPrimary} decorative />
            <Text className="text-xs font-medium text-nilya-text" style={{ fontVariant: ['tabular-nums'] }}>
              {photoCount}
            </Text>
          </View>
        ) : null}

        <View
          className="pt-2"
          style={
            framed
              ? {
                  minHeight: 112,
                  paddingHorizontal: space.space12,
                  paddingTop: space.space12,
                  paddingBottom: space.space12,
                }
              : undefined
          }
        >
          {brand && !framed ? (
            <Text className="mb-1 text-sm text-nilya-secondary" numberOfLines={1}>
              {brand}
            </Text>
          ) : null}
          <Text className="text-base font-medium text-nilya-text" numberOfLines={framed ? 1 : 2}>
            {listing.title}
          </Text>
          <View className="mt-2 flex-row flex-wrap items-baseline gap-2">
            <Text className="text-lg font-bold text-nilya-text">{price}</Text>
            {originalPrice ? (
              <Text className="text-xs font-medium text-nilya-secondary line-through">
                {originalPrice}
              </Text>
            ) : null}
          </View>
          {showAttributeRow ? (
            <Text className="mt-1.5 text-sm text-nilya-secondary" numberOfLines={1}>
              {attributes.join(' \u00b7 ')}
            </Text>
          ) : null}
          {place ? (
            <View
              accessible
              accessibilityLabel={`${place}${verifiedSeller ? ', verified seller' : ''}`}
              className={`flex-row items-center gap-1 ${showAttributeRow ? 'mt-1' : 'mt-1.5'}`}
            >
              <Icon name="pin" role="metadata" color={framed ? C.primary : C.textSecondary} decorative />
              <Text className="shrink text-[13px] text-nilya-secondary" numberOfLines={1}>
                {place}
              </Text>
              {verifiedSeller ? <Icon name="badgeCheck" role="metadata" color={C.textSecondary} decorative /> : null}
            </View>
          ) : null}
        </View>
      </PressableScale>

      <FavouriteButton
        saved={saved}
        onToggle={() => onToggleSave(listing.id)}
        imageHeight={imageHeight}
        topAligned={framed}
      />
    </View>
  );
});

/** Two-column grid of listings. */
export const ListingGrid = React.memo(function ListingGrid({
  listings,
  savedIds,
  onToggleSave,
  columns = 2,
  listHeader,
  listEmpty,
  refreshControl,
  contentPaddingTop = 0,
  contentPaddingBottom = 0,
}: {
  listings: ListingRow[];
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  columns?: number;
  listHeader?: React.ReactElement | null;
  listEmpty?: React.ReactElement | null;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentPaddingTop?: number;
  contentPaddingBottom?: number;
}) {
  const width = useCardWidth(columns);
  return (
    <FlatList
      data={listings}
      keyExtractor={(listing) => listing.id}
      numColumns={columns}
      renderItem={({ item }) => (
        <View className="px-1.5" style={{ flex: 1 / columns }}>
          <ListingCard
            listing={item}
            width={width}
            saved={savedIds.has(item.id)}
            onToggleSave={onToggleSave}
          />
        </View>
      )}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      columnWrapperClassName="px-2.5"
      contentContainerClassName="gap-y-[18px]"
      contentContainerStyle={{ paddingTop: contentPaddingTop, paddingBottom: contentPaddingBottom }}
    />
  );
});

/**
 * The showcase card used by Home.
 *
 * A soft well holds the photograph, with the saving and the heart floating
 * over it; beneath, the category leads, the title supports, and the price row
 * closes with the seller's rating. Every figure on it is a column: the
 * category label is the joined `categories` row, the saving is derived from
 * two stored prices, and the rating is the seller's `rating_avg`, shown only
 * once at least one real review exists.
 */
export const ShowcaseListingCard = React.memo(function ShowcaseListingCard({
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
  const price = listingPriceText(listing);
  const originalPrice =
    listing.price_cents != null && listing.original_price_cents != null && listing.original_price_cents > listing.price_cents
      ? formatPrice(listing.original_price_cents, listing.currency)
      : null;
  const discountPercent =
    listing.price_cents != null && listing.original_price_cents != null && listing.original_price_cents > listing.price_cents
      ? Math.round((1 - listing.price_cents / listing.original_price_cents) * 100)
      : null;
  const title = listing.title.trim();
  const categoryLabel = listing.category?.label?.trim() || null;
  const candidateBrand = listing.brand?.trim() || null;
  const brand = candidateBrand?.toLocaleLowerCase() === title.toLocaleLowerCase() ? null : candidateBrand;
  /* Category leads when the join resolved; otherwise the title takes the lead
     line and the brand, if any, supports it. Nothing is invented to fill a slot. */
  const lead = categoryLabel ?? title;
  const support = categoryLabel ? title : brand;
  const rating =
    listing.seller && listing.seller.rating_count > 0 && listing.seller.rating_avg != null
      ? listing.seller.rating_avg
      : null;
  const inset = space.space12;
  const imageWidth = width - inset * 2;
  const imageHeight = imageWidth;
  const accessibilityDetails = [
    categoryLabel,
    title,
    brand,
    price,
    originalPrice ? `was ${originalPrice}` : null,
    discountPercent != null && discountPercent > 0 ? `${discountPercent} percent off` : null,
    rating != null ? `seller rated ${rating.toFixed(1)} out of 5` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      style={{
        width,
        borderRadius: radius.radiusXLarge,
        borderCurve: 'continuous',
        backgroundColor: C.surface,
        padding: inset,
      }}
    >
      <PressableScale
        scale={scaleToken.cardPressed}
        motionRole="cardPress"
        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
        accessibilityRole="button"
        accessibilityLabel={accessibilityDetails}
      >
        <ListingImage
          url={coverUrl(listing.images)}
          width={imageWidth}
          label={`${title} listing photo`}
          round={radius.radiusLarge}
          aspectRatio={imageWidth / imageHeight}
        />

        {discountPercent != null && discountPercent > 0 ? (
          <View
            accessible
            accessibilityLabel={`${discountPercent} percent below the original price`}
            style={{
              position: 'absolute',
              left: space.space8,
              top: space.space8,
              minHeight: 28,
              justifyContent: 'center',
              borderRadius: radius.radiusPill,
              borderCurve: 'continuous',
              backgroundColor: C.surface,
              paddingHorizontal: space.space12,
              ...elevation.raised,
            }}
          >
            <Text style={{ ...type.metadataMedium, fontWeight: '700', color: C.primary }}>
              -{discountPercent}%
            </Text>
          </View>
        ) : null}

        <View style={{ paddingTop: space.space12, gap: space.space4 }}>
          <Text style={{ ...type.cardTitle, color: C.textPrimary }} numberOfLines={1}>
            {lead}
          </Text>
          {support ? (
            <Text style={{ ...type.metadata, color: C.textSecondary }} numberOfLines={1}>
              {support}
            </Text>
          ) : null}

          <View
            style={{
              marginTop: space.space4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.space8,
            }}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: space.space8 }}>
              <Text style={{ ...type.price, color: C.textPrimary }} numberOfLines={1}>
                {price}
              </Text>
              {originalPrice ? (
                <Text
                  style={{ ...type.metadata, color: C.textSecondary, textDecorationLine: 'line-through' }}
                  numberOfLines={1}
                >
                  {originalPrice}
                </Text>
              ) : null}
            </View>

            {rating != null ? (
              <View
                accessible
                accessibilityLabel={`Seller rated ${rating.toFixed(1)} out of 5`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.space4 }}
              >
                <Text
                  style={{ ...type.metadataMedium, color: C.textPrimary, fontVariant: ['tabular-nums'] }}
                >
                  {rating.toFixed(1)}
                </Text>
                <Icon name="star" role="metadata" color={C.accent} decorative />
              </View>
            ) : null}
          </View>
        </View>
      </PressableScale>

      <FavouriteButton
        saved={saved}
        onToggle={() => onToggleSave(listing.id)}
        imageHeight={imageHeight}
        topAligned
      />
    </View>
  );
});

import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  ScrollView,
  Share,
  type TextLayoutEvent,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeIn as ReanimatedFadeIn,
  FadeOut as ReanimatedFadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { IconButton } from "@/components/icon-button";
import {
  ListingActionBar,
  listingActionBarContentClearance,
} from "@/components/listing-action-bar";
import { formatPrice, listingPriceText, useFavoriteFeedback } from "@/components/listing-card";
import { ListingRail } from "@/components/listing-rail";
import { FloatingIconButton } from "@/components/screen-header";
import { SimilarProducts } from "@/components/similar-products";
import { FadeIn, Skeleton } from "@/components/skeleton";
import {
  Avatar,
  Button,
  EmptyState,
  PressableScale,
  T,
  Tap,
} from "@/components/ui";
import { SellerLocationBlock } from "@/features/location/seller-location";
import { useLocation } from "@/features/location/useLocation";
import { useAsync } from "@/hooks/use-async";
import { useFavorites } from "@/hooks/use-favorites";
import { useGoBack } from "@/hooks/use-go-back";
import { hasActiveBundleDiscount } from "@/lib/bundle-discounts";
import type { ListingDetailRow, SellerIdentity } from "@/lib/database.types";
import { retryableReadMessage } from "@/lib/errors";
import {
  fetchDeliveryOptions,
  findOrCreateConversationForListing,
  applyToJob,
  bookService,
  requestServiceQuote,
} from "@/lib/mutations";
import { isCanonicalListing, isCommerceListing, listingNoun } from "@/lib/listing-types";
import {
  fetchListing,
  fetchListings,
  fetchPublicBundleDiscountSettings,
  fetchSimilarListings,
  imageUrl,
} from "@/lib/queries";
import {
  formatMemberSinceYear,
  formatProfileLocation,
  formatProfileRating,
  profileInitials,
} from "@/lib/profile-presentation";
import { listingShareContent } from "@/lib/sharing";
import { useAuth } from "@/store/auth-store";
import { useCart } from "@/store/cart-store";
import { useApp } from "@/store/app-store";
import {
  color as C,
  duration,
  radius,
  scale,
  space,
  touch,
} from "@/theme/tokens";

const descriptionLayout = LinearTransition.duration(duration.standard);
const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const COLLAPSED_DESCRIPTION_LINES = 5;

/** The hero photograph's share of the viewport height. */
const HERO_VIEWPORT_RATIO = 0.55;
/** How far the white sheet climbs over the photograph. */
const SHEET_OVERLAP = 24;
/** Outer edge of the floating hero controls and the sheet's content. */
const EDGE = space.space20;

export default function ListingDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const listingId = listingIdFromParam(id);

  if (!listingId) return <ListingLoadFailure />;

  return <ListingDetail key={listingId} listingId={listingId} />;
}

function ListingDetail({ listingId }: { listingId: string }) {
  const router = useRouter();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const listing = useAsync(
    () => fetchListing(listingId),
    `listing:${listingId}`,
  );
  const favorites = useFavorites();
  const { user } = useAuth();
  const cart = useCart();
  const { flash } = useApp();

  const [opening, setOpening] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [typedAction, setTypedAction] = useState<'apply' | 'quote' | 'book' | null>(null);
  const [typedActionError, setTypedActionError] = useState<string | null>(null);
  const mounted = useRef(true);
  const openingRef = useRef(false);
  const openingRequest = useRef(0);
  const heroHeight = Math.round(height * HERO_VIEWPORT_RATIO);

  const row = listing.data;
  const images = useMemo(() => normalizeHeroImages(row?.images ?? []), [row]);
  const favourite = useFavoriteFeedback(() => {
    if (row) favorites.toggle(row.id);
  });

  /*
   * The other items this seller has listed, for the rail further down.
   */
  const sellerItems = useAsync(
    async () =>
      row
        ? (await fetchListings({ sellerId: row.seller_id })).rows
            .filter((item) => item.id !== row.id)
            .slice(0, 8)
        : [],
    `listing-seller-items:${row?.seller_id ?? "none"}:${listingId}`,
  );

  /*
   * Products like this one, for the section further down.
   */
  const similarItems = useAsync(
    async () =>
      row
        ? await fetchSimilarListings({
            categorySlug: row.category_slug,
            currentListingId: row.id,
            currentSellerId: row.seller_id,
            allowCurrentSellerFallback: false,
          })
        : [],
    `listing-similar:${listingId}:${row?.category_slug ?? "none"}:${row?.seller_id ?? "none"}`,
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      openingRef.current = false;
      openingRequest.current += 1;
    };
  }, []);

  if (listing.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: touch.large + insets.bottom + space.space48,
          }}
        >
          <Skeleton width={width} height={heroHeight} round={0} />
          <View className="gap-3 px-5 py-6">
            <Skeleton width="76%" height={28} />
            <Skeleton width="46%" height={14} />
            <Skeleton width="34%" height={30} />
            <View className="mt-3 gap-3 border-t border-nilya-border pt-6">
              <Skeleton width="36%" height={20} />
              <Skeleton width="100%" height={13} />
              <Skeleton width="92%" height={13} />
              <Skeleton width="64%" height={13} />
            </View>
            <View className="mt-3 border-t border-nilya-border pt-6">
              <Skeleton width="28%" height={20} />
              <View className="mt-4 flex-row gap-3">
                <Skeleton
                  width={touch.large}
                  height={touch.large}
                  round={radius.radiusPill}
                />
                <View className="flex-1 gap-2 pt-1">
                  <Skeleton width="48%" height={14} />
                  <Skeleton width="68%" height={12} />
                  <Skeleton width="42%" height={12} />
                </View>
              </View>
            </View>
            <View className="mt-3 gap-3 border-t border-nilya-border pt-6">
              <Skeleton width="32%" height={20} />
              <Skeleton width="100%" height={56} round={radius.radiusMedium} />
              <Skeleton width="100%" height={56} round={radius.radiusMedium} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (listing.error || !row) {
    return (
      <ListingLoadFailure
        queryFailed={Boolean(listing.error)}
        onRetry={listing.refetch}
      />
    );
  }

  const saved = favorites.saved.has(row.id);
  const isMine = !!user && user.id === row.seller_id;
  const canonical = isCanonicalListing(row.listing_type, row.condition);
  const commerce = isCommerceListing(row.listing_type);
  const isJob = row.listing_type === 'job';
  const isService = row.listing_type === 'service';
  const today = new Date().toISOString().slice(0, 10);
  const applicationsOpen = !isJob || Boolean(
    row.job_details && row.job_details.application_deadline >= today
  );
  const foodExpired = Boolean(row.food_details && row.food_details.expiry_date < today);
  const canMessage = !isMine && row.status === "active" && canonical;
  const sellerAway = row.seller?.holiday_mode === true;
  const canBuy = canMessage && commerce && row.price_cents != null && !sellerAway && !foodExpired;
  const showFavorite = !isMine;
  const sellerItemRows = sellerItems.data ?? [];
  const similarItemRows = similarItems.data ?? [];
  /*
   * The listing's one stored size and one stored colour. The rail and the
   * swatch present those values — there is no range to choose from, so
   * neither is a selector, and each is omitted when the column is empty.
   */
  const sizeValue = row.size?.trim() || null;
  const priceLabel = listingPriceText(row);
  const originalPrice =
    row.price_cents != null && row.original_price_cents != null && row.original_price_cents > row.price_cents
      ? formatPrice(row.original_price_cents, row.currency)
      : null;
  /* The seller's stored rating, present only once someone has rated them. */
  const sellerRating = row.seller
    ? formatProfileRating(row.seller.rating_avg, row.seller.rating_count)
    : null;
  const displayBrand = distinctBrand(
    row.perfume_details?.brand ?? row.job_details?.employer ?? row.brand,
    row.title
  );
  const description = row.description?.trim() ?? "";
  const publishedAgo = formatPublishedAgo(row.published_at);
  const typeLabel = isJob ? 'JOB' : isService ? 'SERVICE' : row.listing_type === 'food' ? 'FOOD · NEW' : 'NEW';
  const publicationLabel = publishedAgo ? `${typeLabel} · Published ${publishedAgo}` : typeLabel;

  const contactSeller = async () => {
    if (
      openingRef.current ||
      (user && user.id === row.seller_id) ||
      row.status !== "active" ||
      !canonical
    ) {
      return;
    }

    if (!user) {
      router.push('/sign-in');
      return;
    }

    const request = openingRequest.current + 1;
    openingRequest.current = request;
    openingRef.current = true;
    setOpening(true);
    setContactError(null);
    try {
      const conversationId = await findOrCreateConversationForListing(row.id);
      if (!mounted.current || openingRequest.current !== request) return;
      router.push({ pathname: "/chat/[id]", params: { id: conversationId } });
    } catch {
      if (mounted.current && openingRequest.current === request) {
        setContactError("Could not open a conversation. Try again.");
      }
    } finally {
      if (openingRequest.current === request) {
        openingRef.current = false;
        if (mounted.current) setOpening(false);
      }
    }
  };

  const runTypedAction = async (action: 'apply' | 'quote' | 'book') => {
    if (!canMessage || typedAction || (action === 'apply' && !applicationsOpen)) return;
    if (!user) {
      router.push('/sign-in');
      return;
    }
    setTypedAction(action);
    setTypedActionError(null);
    try {
      if (action === 'apply' && row.job_details) {
        const result = await applyToJob(row.id);
        flash(result.existing ? 'Application already submitted' : 'Application submitted on Nilya');
        const target = applicationTarget(row.job_details.application_method, row.job_details.application_value);
        if (target && await Linking.canOpenURL(target)) await Linking.openURL(target);
      } else if (action === 'quote') {
        const result = await requestServiceQuote(row.id);
        flash(result.existing ? 'Quote already requested' : 'Quote requested on Nilya');
      } else if (action === 'book') {
        const result = await bookService(row.id);
        flash(result.existing ? 'Booking already requested' : 'Booking requested on Nilya');
      }
    } catch (caught) {
      setTypedActionError(retryableReadMessage(caught, 'This request could not be saved.'));
    } finally {
      if (mounted.current) setTypedAction(null);
    }
  };

  const scrollBottomPadding = commerce
    ? listingActionBarContentClearance(insets.bottom)
    : insets.bottom + space.space48;

  return (
    <View className="flex-1 bg-nilya-background">
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: scrollBottomPadding,
        }}
      >
        {/*
          The photograph, full-bleed and just over half the viewport. Back
          floats top-left, the heart and share top-right, and a vertical dot
          pager sits on the right edge when there is more than one photo.
          Product imagery always sits on white.
        */}
        <View style={{ width, height: heroHeight, backgroundColor: C.surface }}>
          <ListingHeroGallery
            images={images}
            title={row.title}
            width={width}
            height={heroHeight}
            indicator="dots"
          />
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: EDGE,
              right: EDGE,
              top: insets.top + space.space8,
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <IconButton
              icon="chevronLeft"
              variant="surface"
              label="Go back"
              onPress={goBack}
            />
            <View style={{ flexDirection: "row", gap: space.space8 }}>
              {showFavorite && (
                <Animated.View style={favourite.animatedStyle}>
                  <IconButton
                    icon="heart"
                    variant="surface"
                    label={saved ? "Remove from favorites" : "Add to favorites"}
                    color={C.primary}
                    fill={saved ? C.primary : "none"}
                    accessibilityState={{ selected: saved }}
                    onPress={favourite.activate}
                  />
                </Animated.View>
              )}
              <IconButton
                icon="send"
                variant="surface"
                label={`Share ${listingNoun(row.listing_type)}`}
                onPress={() => {
                  void Share.share(
                    listingShareContent(
                      row.title,
                      priceLabel,
                    ),
                  ).catch(() => {});
                }}
              />
            </View>
          </View>
        </View>

        {/*
          The sheet climbs over the foot of the photograph. Everything after it
          continues on the same white ground, so only its top corners round.
        */}
        <View
          style={{
            marginTop: -SHEET_OVERLAP,
            borderTopLeftRadius: radius.radiusHero,
            borderTopRightRadius: radius.radiusHero,
            borderCurve: "continuous",
            backgroundColor: C.background,
            paddingTop: space.space24,
          }}
        >
        <FadeIn y={space.space8} duration={duration.standard}>
          <View className="px-5">
            {/* Meta row: what is known about the listing on the left, the
                seller's real rating on the right — only once someone has
                actually rated them. */}
            <View className="flex-row items-center justify-between gap-3">
              <T
                variant="metadata"
                color={C.textSecondary}
                className="shrink"
                numberOfLines={1}
                selectable
              >
                {publicationLabel}
              </T>
              {sellerRating ? (
                <View
                  accessible
                  accessibilityLabel={`Seller rated ${sellerRating.label}`}
                  className="flex-row items-center gap-1"
                >
                  <Icon name="star" role="metadata" color={C.accent} decorative />
                  <T variant="metadata" color={C.textSecondary}>
                    {sellerRating.label}
                  </T>
                </View>
              ) : null}
            </View>

            {!!displayBrand && (
              <T variant="metadata" color={C.textSecondary} className="mt-3" selectable>
                {displayBrand}
              </T>
            )}

            <View className="mt-1 flex-row items-start justify-between gap-4">
              <T
                variant="productTitle"
                accessibilityRole="header"
                className="min-w-0 flex-1"
                selectable
              >
                {row.title}
              </T>
              <View className="items-end">
                {originalPrice ? (
                  <T variant="metadata" color={C.inkFaint} className="line-through" selectable>
                    {originalPrice}
                  </T>
                ) : null}
                <T variant="detailPrice" selectable>
                  {priceLabel}
                </T>
              </View>
            </View>

            {/* One stored size, shown as the selected square. There is no
                range to choose from, so this is not a selector. */}
            {sizeValue ? (
              <View className="mt-4 gap-2">
                <T variant="metadataMedium" color={C.textSecondary}>
                  Size
                </T>
                <View
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Size ${sizeValue}, the only size available`}
                  style={{
                    alignSelf: "flex-start",
                    minWidth: touch.minimum,
                    height: touch.minimum,
                    paddingHorizontal: space.space12,
                    borderRadius: radius.radiusMedium,
                    borderCurve: "continuous",
                    backgroundColor: C.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <T variant="bodyMedium" color={C.textInverse}>
                    {sizeValue}
                  </T>
                </View>
              </View>
            ) : null}

            {commerce ? <ProductBundleDiscount sellerId={row.seller_id} /> : null}

            {/* Buying lives in the bar at the foot of the screen; messaging
                sits here, beside the copy it is about. */}
            {canMessage ? (
              <View className="mt-5 gap-2">
                {contactError ? (
                  <T variant="metadata" color={C.errorText} accessibilityRole="alert">
                    {contactError}
                  </T>
                ) : null}
                <Button
                  label={isJob ? 'Contact employer' : isService ? 'Message provider' : 'Message seller'}
                  variant="secondary"
                  loading={opening}
                  onPress={() => {
                    void contactSeller();
                  }}
                />
              </View>
            ) : null}

            {canMessage && isJob ? (
              <View className="mt-3 gap-2">
                {typedActionError ? <T variant="metadata" color={C.errorText} accessibilityRole="alert">{typedActionError}</T> : null}
                <Button
                  label={applicationsOpen ? 'Apply now' : 'Applications closed'}
                  disabled={!applicationsOpen}
                  loading={typedAction === 'apply'}
                  onPress={() => void runTypedAction('apply')}
                />
                <Button label={saved ? 'Remove saved job' : 'Save job'} variant="secondary" onPress={favourite.activate} />
              </View>
            ) : null}

            {canMessage && isService ? (
              <View className="mt-3 gap-2">
                {typedActionError ? <T variant="metadata" color={C.errorText} accessibilityRole="alert">{typedActionError}</T> : null}
                <Button label="Request quote" loading={typedAction === 'quote'} onPress={() => void runTypedAction('quote')} />
                <Button label="Book service" variant="secondary" loading={typedAction === 'book'} onPress={() => void runTypedAction('book')} />
              </View>
            ) : null}

            {sellerAway && commerce ? (
              <View
                accessible
                accessibilityRole="text"
                accessibilityLabel="Seller is currently away. Buying is paused for this product."
                className="mt-5 flex-row items-start gap-2"
              >
                <Icon name="info" role="metadata" color={C.textSecondary} decorative />
                <View className="min-w-0 flex-1">
                  <T variant="bodyMedium" accessible={false}>
                    Seller is currently away
                  </T>
                  <T variant="metadata" color={C.textSecondary} className="mt-1" accessible={false}>
                    Buying is paused for this product.
                  </T>
                </View>
              </View>
            ) : null}

            {foodExpired ? (
              <View className="mt-5 flex-row items-start gap-2" accessibilityRole="alert">
                <Icon name="info" role="metadata" color={C.errorText} decorative />
                <T variant="metadata" color={C.errorText} className="min-w-0 flex-1">
                  This food listing has passed its expiry date and cannot be purchased.
                </T>
              </View>
            ) : null}

            {isMine && (
              <View className="mt-5 gap-3">
                <T variant="metadata" color={C.textSecondary}>
                  This is your listing.
                </T>
                <Button
                  label={isJob ? 'Edit job' : isService ? 'Edit service' : 'Edit listing'}
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: "/edit-listing/[id]",
                      params: { id: row.id },
                    })
                  }
                />
              </View>
            )}
          </View>
        </FadeIn>
        </View>

        {!!description && (
          <DescriptionSection key={description} description={description} />
        )}

        <SellerLocationSection listing={row} />

        {row.listing_type === 'product' && !row.perfume_details ? (
          <ProductAttributes
            categoryLabel={row.category?.label ?? null}
            color={row.color}
            size={row.size}
          />
        ) : (
          <TypedListingDetails listing={row} />
        )}

        {row.seller ? (
          <SellerBlock
            seller={row.seller}
            sellerId={row.seller_id}
            title={isJob ? 'Employer' : isService ? 'Provider' : 'Seller'}
          />
        ) : (
          <SellerUnavailable />
        )}

        {commerce ? <DeliveryBlock countryCode={row.country_code} currency={row.currency} /> : null}
        {commerce ? <TrustBlock /> : null}
        <ListingRail
          title={isJob ? 'More from this employer' : isService ? 'More from this provider' : 'More from this seller'}
          listings={sellerItemRows}
          loading={sellerItems.loading}
          savedIds={favorites.saved}
          onToggleSave={favorites.toggle}
          style={{
            marginTop: space.space32,
            paddingTop: space.space24,
            borderTopWidth: 1,
            borderTopColor: C.border,
          }}
        />
        {/* The same rows the hero strip shows, on one read rather than two. */}
        <SimilarProducts
          title={isJob ? 'Similar jobs' : isService ? 'Similar services' : row.listing_type === 'food' ? 'Similar food listings' : 'Similar products'}
          listings={similarItemRows}
          loading={similarItems.loading}
          savedIds={favorites.saved}
          onToggleSave={favorites.toggle}
        />
      </ScrollView>

      {commerce && row.price_cents != null ? <ListingActionBar
        bottomInset={insets.bottom}
        inCart={cart.has(row.id)}
        onBuyNow={
          canBuy
            ? () =>
                router.push({ pathname: "/checkout", params: { id: row.id } })
            : undefined
        }
        onAddToCart={
          canBuy
            ? () => {
                void cart.add(row.id);
              }
            : undefined
        }
        onViewCart={() => router.push("/cart")}
      /> : null}
    </View>
  );
}

function ProductBundleDiscount({ sellerId }: { sellerId: string }) {
  const settings = useAsync(
    () => fetchPublicBundleDiscountSettings(sellerId),
    `listing-bundle-discounts:${sellerId}`,
  );

  if (settings.loading) {
    return <Skeleton width={216} height={13} style={{ marginTop: space.space16 }} />;
  }

  if (settings.error) {
    return (
      <View className="mt-4 flex-row flex-wrap items-center gap-2">
        <T variant="caption" color={C.errorText} accessibilityRole="alert">
          Bundle discount information unavailable.
        </T>
        <Tap
          onPress={settings.refetch}
          accessibilityRole="button"
          accessibilityLabel="Retry bundle discount information"
          className="min-h-11 justify-center"
        >
          <T variant="caption">Retry</T>
        </Tap>
      </View>
    );
  }

  if (!hasActiveBundleDiscount(settings.data)) return null;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel="Bundle discounts available from this seller"
      className="mt-4 flex-row items-center gap-2"
    >
      <Icon name="offerTicket" role="metadata" color={C.textSecondary} decorative />
      <T variant="metadataMedium" color={C.textSecondary} accessible={false} selectable>
        Bundle discounts available from this seller
      </T>
    </View>
  );
}

function listingIdFromParam(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : [value];

  for (const candidate of values) {
    const normalized = candidate?.trim();
    if (normalized && UUID_PATTERN.test(normalized)) return normalized;
  }

  return null;
}

function ListingLoadFailure({
  queryFailed = false,
  onRetry,
}: {
  queryFailed?: boolean;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.background,
        paddingTop: insets.top,
      }}
    >
      <EmptyState
        icon="bag"
        title={
          queryFailed ? "Couldn't load this product" : "Listing unavailable"
        }
        body={
          queryFailed
            ? "Check your connection and try again."
            : "This product may have been removed or is no longer available."
        }
        action={
          <View style={{ marginTop: space.space20, gap: space.space12 }}>
            {queryFailed && onRetry ? (
              <Button label="Try again" onPress={onRetry} />
            ) : null}
            <Button
              label="Back to Browse"
              variant="secondary"
              onPress={() => router.dismissTo("/explore")}
            />
          </View>
        }
      />
    </View>
  );
}

function formatPublishedAgo(value: string | null) {
  if (!value) return null;

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;

  const published = new Date(timestamp);
  const now = new Date();
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - timestamp) / 1000),
  );
  if (elapsedSeconds < 60) return "just now";

  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  return published.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: published.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function distinctBrand(brand: string | null, title: string) {
  const label = brand?.trim();
  if (!label) return null;

  const normalizeIdentity = (value: string) =>
    value
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();

  if (normalizeIdentity(label) === normalizeIdentity(title)) return null;

  return label;
}

type HeroImage = {
  storagePath: string;
  position: number;
  uri: string;
};

function ListingHeroGallery({
  images,
  title,
  width,
  height,
  bottomInset = 0,
  indicator = "counter",
}: {
  images: readonly HeroImage[];
  title: string;
  width: number;
  height: number;
  /** Room reserved at the foot of the hero, so controls clear the strip. */
  bottomInset?: number;
  /** A next button with a counter, or a quiet vertical dot pager on the right. */
  indicator?: "counter" | "dots";
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const listRef = useRef<FlatList<HeroImage>>(null);

  if (images.length > 1) {
    /* Wraps rather than stopping: a disabled arrow on the last photo is a
       control that stops working, and there is somewhere to go. */
    const showNextImage = () => {
      const nextIndex = (activeImageIndex + 1) % images.length;
      setActiveImageIndex(nextIndex);
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    };

    return (
      <>
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(item) => item.storagePath}
          renderItem={({ item, index }) => (
            <GalleryImage
              uri={item.uri}
              title={title}
              index={index}
              total={images.length}
              width={width}
              height={height}
              bottomInset={bottomInset}
              onPress={showNextImage}
            />
          )}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          scrollEventThrottle={16}
          /* Tracked from every scroll frame, not only the momentum end: the
             web build never fires the latter, and the pager would freeze. */
          onScroll={(event) => {
            const nextIndex = Math.round(
              event.nativeEvent.contentOffset.x / width,
            );
            const clamped = Math.max(0, Math.min(nextIndex, images.length - 1));
            setActiveImageIndex((current) =>
              current === clamped ? current : clamped,
            );
          }}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(
              event.nativeEvent.contentOffset.x / width,
            );
            setActiveImageIndex(
              Math.max(0, Math.min(nextIndex, images.length - 1)),
            );
          }}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          style={{ height }}
        />

        {indicator === "dots" ? (
          <View
            accessibilityRole="tablist"
            accessibilityLabel={`Photo ${activeImageIndex + 1} of ${images.length}`}
            pointerEvents="box-none"
            style={{
              position: "absolute",
              right: space.space16,
              top: 0,
              bottom: SHEET_OVERLAP,
              justifyContent: "center",
              gap: space.space4,
            }}
          >
            {images.map((image, index) => {
              const active = index === activeImageIndex;
              return (
                <Tap
                  key={image.storagePath}
                  onPress={() => {
                    setActiveImageIndex(index);
                    listRef.current?.scrollToIndex({ index, animated: true });
                  }}
                  hitSlop={{ left: 16, right: 16, top: 2, bottom: 2 }}
                  accessibilityRole="tab"
                  accessibilityLabel={`Show photo ${index + 1}`}
                  accessibilityState={{ selected: active }}
                  style={{
                    width: 20,
                    minHeight: 20,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: active ? 18 : 6,
                      borderRadius: radius.radiusPill,
                      backgroundColor: active ? C.textPrimary : C.surface,
                      borderWidth: active ? 0 : 1,
                      borderColor: C.border,
                    }}
                  />
                </Tap>
              );
            })}
          </View>
        ) : (
          <>
            <View
              pointerEvents="box-none"
              className="absolute inset-x-0 z-10 items-center"
              style={{ bottom: bottomInset + space.space16 }}
            >
              <FloatingIconButton
                name="chevronRight"
                label="Next photo"
                onPress={showNextImage}
              />
            </View>

            <View
              accessible
              accessibilityLabel={`Photo ${activeImageIndex + 1} of ${images.length}`}
              pointerEvents="none"
              className="absolute z-10 rounded-full bg-nilya-accent px-2.5 py-1"
              style={{ bottom: bottomInset + space.space16, right: space.space16 }}
            >
              <T variant="caption" color={C.textPrimary} className="tabular-nums">
                {activeImageIndex + 1} / {images.length}
              </T>
            </View>
          </>
        )}
      </>
    );
  }

  if (images.length === 1) {
    return (
      <GalleryImage
        uri={images[0].uri}
        title={title}
        index={0}
        total={1}
        width={width}
        height={height}
        bottomInset={bottomInset}
      />
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${title}, image unavailable`}
      className="items-center justify-center gap-2"
      style={{ width, height, paddingBottom: bottomInset }}
    >
      <Icon name="image" role="hero" color={C.textSecondary} decorative />
      <T variant="metadata" color={C.textSecondary}>
        Image unavailable
      </T>
    </View>
  );
}

function normalizeHeroImages(
  images: readonly { storage_path: string; position: number }[],
): HeroImage[] {
  const byPath = new Map<string, HeroImage>();

  for (const image of images) {
    const storagePath = image.storage_path?.trim();
    if (!storagePath) continue;

    let uri: string;
    try {
      uri = imageUrl(storagePath).trim();
      const protocol = new URL(uri).protocol;
      if (protocol !== "https:" && protocol !== "http:") continue;
    } catch {
      continue;
    }

    const existing = byPath.get(storagePath);
    if (!existing || image.position < existing.position) {
      byPath.set(storagePath, { storagePath, position: image.position, uri });
    }
  }

  return [...byPath.values()].sort((a, b) => a.position - b.position);
}

function GalleryImage({
  uri,
  title,
  index,
  total,
  width,
  height,
  bottomInset = 0,
  onPress,
}: {
  uri: string;
  title: string;
  index: number;
  total: number;
  width: number;
  height: number;
  bottomInset?: number;
  /** A tap on the photograph shows the next one — the way to page without a
      drag, which a mouse on the web build cannot do. */
  onPress?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={`${title}, photo ${index + 1} of ${total} could not be loaded`}
        className="items-center justify-center"
        style={{ width, height, paddingBottom: bottomInset }}
      >
        <Icon name="image" role="hero" color={C.textSecondary} decorative />
        <T
          variant="metadata"
          color={C.textSecondary}
          style={{ marginTop: space.space8 }}
        >
          Image unavailable
        </T>
      </View>
    );
  }

  /*
   * Contained rather than cropped, with room on every side, so the complete
   * product remains visible against the white photo surface.
   */
  const label = `${title}, photo ${index + 1} of ${total}`;
  const frame = (
    <View
      style={{
        width,
        height,
        paddingBottom: bottomInset,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        source={{ uri }}
        style={{
          width: Math.max(width - space.space32 * 2, 0),
          height: Math.max(height - bottomInset - space.space24 * 2, 0),
        }}
        contentFit="contain"
        transition={duration.standard}
        cachePolicy="memory-disk"
        accessible={!onPress}
        accessibilityLabel={label}
        onError={() => setFailed(true)}
      />
    </View>
  );

  if (!onPress) return frame;

  return (
    <Tap
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={label}
      accessibilityHint="Shows the next photo"
    >
      {frame}
    </Tap>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-8 gap-4 border-t border-nilya-border px-5 pt-6">
      <T variant="sectionTitle" accessibilityRole="header">
        {title}
      </T>
      <View>{children}</View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      className={`min-h-11 flex-row items-center gap-4 py-3 ${last ? "" : "border-b border-nilya-border"}`}
      accessible
      accessibilityLabel={`${label}, ${value}`}
    >
      <T variant="metadata" color={C.textSecondary} className="w-24">
        {label}
      </T>
      <T variant="bodyMedium" className="min-w-0 flex-1 text-right" selectable>
        {value}
      </T>
    </View>
  );
}

function ProductAttributes({
  categoryLabel,
  color,
  size,
}: {
  categoryLabel: string | null;
  color: string | null;
  size: string | null;
}) {
  const categoryValue = categoryLabel?.trim();
  const colorValue = color?.trim();
  const sizeValue = size?.trim();
  const rows = [
    categoryValue ? { label: "Category", value: categoryValue } : null,
    sizeValue ? { label: "Size", value: sizeValue } : null,
    colorValue ? { label: "Colour", value: colorValue } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  if (rows.length === 0) return null;

  return (
    <DetailSection title="Product details">
      {rows.map((row, index) => (
        <DetailRow
          key={row.label}
          label={row.label}
          value={row.value}
          last={index === rows.length - 1}
        />
      ))}
    </DetailSection>
  );
}

function readable(value: string): string {
  return value.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function applicationTarget(
  method: NonNullable<ListingDetailRow['job_details']>['application_method'],
  value: string | null
): string | null {
  if (!value) return null;
  if (method === 'external_url') return /^https?:\/\//i.test(value) ? value : null;
  if (method === 'email') return `mailto:${value}`;
  if (method === 'phone') return `tel:${value.replace(/[^+0-9]/g, '')}`;
  return null;
}

function TypedListingDetails({ listing }: { listing: ListingDetailRow }) {
  const rows: { label: string; value: string }[] = [];
  let title = 'Details';

  if (listing.food_details) {
    const food = listing.food_details;
    title = 'Food details';
    rows.push(
      { label: 'Category', value: listing.category?.label ?? listing.category_slug },
      { label: 'Quantity', value: `${food.quantity} ${food.price_unit}` },
      { label: 'Ingredients', value: food.ingredients },
      { label: 'Allergens', value: food.allergens },
      { label: 'Expiry', value: food.expiry_date },
      { label: 'Halal', value: readable(food.halal_status) },
      { label: 'Preparation', value: readable(food.preparation_type) },
      { label: 'Storage', value: food.storage_requirements },
      { label: 'Delivery', value: food.delivery_requirements },
    );
  } else if (listing.perfume_details) {
    const perfume = listing.perfume_details;
    title = 'Fragrance details';
    rows.push(
      { label: 'Brand', value: perfume.brand },
      { label: 'Fragrance', value: perfume.fragrance_name },
      { label: 'Type', value: readable(perfume.fragrance_type) },
      { label: 'Volume', value: `${perfume.volume_ml} ml` },
      { label: 'Condition', value: 'New' },
      { label: 'Sealed', value: perfume.sealed ? 'Yes' : 'No' },
      { label: 'Authenticity', value: perfume.authenticity_declared ? 'Declared authentic' : 'Not declared' },
      { label: 'Notes', value: perfume.fragrance_notes },
      { label: 'Audience', value: readable(perfume.target_audience) },
    );
  } else if (listing.job_details) {
    const job = listing.job_details;
    title = 'Job details';
    rows.push(
      { label: 'Employer', value: job.employer },
      { label: 'Sector', value: job.sector },
      { label: 'Contract', value: readable(job.contract_type) },
      { label: 'Schedule', value: job.schedule },
      { label: 'Work mode', value: readable(job.work_mode) },
      { label: 'Location', value: job.location },
      { label: 'Salary', value: `${formatPrice(job.salary_min_cents, job.salary_currency)}–${formatPrice(job.salary_max_cents, job.salary_currency)}` },
      { label: 'Experience', value: job.required_experience },
      { label: 'Apply via', value: readable(job.application_method) },
      { label: 'Deadline', value: job.application_deadline },
    );
  } else if (listing.service_details) {
    const service = listing.service_details;
    title = 'Service details';
    rows.push(
      { label: 'Category', value: listing.category?.label ?? listing.category_slug },
      { label: 'Pricing', value: readable(service.pricing_mode) },
      { label: 'Service area', value: service.service_area },
      { label: 'Delivery', value: readable(service.delivery_mode) },
      { label: 'Availability', value: service.availability },
      { label: 'Experience', value: service.experience },
    );
  }

  if (rows.length === 0) return null;
  return (
    <DetailSection title={title}>
      {rows.map((row, index) => (
        <DetailRow key={`${row.label}:${index}`} label={row.label} value={row.value} last={index === rows.length - 1} />
      ))}
    </DetailSection>
  );
}

/**
 * Where this listing is offered from.
 *
 * Rendered only when there is something true to say. The seller's own
 * `show_location` decides whether a map may be drawn at all, and the distance
 * appears only if the buyer granted their own position — otherwise there is no
 * "from you" to measure from.
 */
function SellerLocationSection({ listing }: { listing: ListingDetailRow }) {
  const viewer = useLocation();
  const label = formatProfileLocation(listing.city, listing.country_code);
  const showLocation = listing.seller?.show_location !== false;
  const coordinates =
    listing.latitude !== null && listing.longitude !== null
      ? { latitude: listing.latitude, longitude: listing.longitude }
      : null;

  if (!label && !(showLocation && coordinates)) return null;

  return (
    <DetailSection title="Seller location">
      <SellerLocationBlock
        coordinates={coordinates}
        city={listing.city}
        countryCode={listing.country_code}
        showLocation={showLocation}
        viewerCoordinates={viewer.coords}
        label={label}
      />
    </DetailSection>
  );
}

function DescriptionSection({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(false);

  return (
    <DetailSection title="Description">
      <Animated.View layout={descriptionLayout} className="gap-2">
        <T
          variant="body"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="pointer-events-none absolute left-0 right-0 opacity-0"
          onTextLayout={(event: TextLayoutEvent) => {
            const next =
              event.nativeEvent.lines.length > COLLAPSED_DESCRIPTION_LINES;
            setCanCollapse((current) => (current === next ? current : next));
          }}
        >
          {description}
        </T>
        <Animated.View
          key={expanded ? "expanded" : "collapsed"}
          entering={ReanimatedFadeIn.duration(duration.fast)}
          exiting={ReanimatedFadeOut.duration(duration.fast)}
        >
          <T
            variant="body"
            selectable
            numberOfLines={expanded ? undefined : COLLAPSED_DESCRIPTION_LINES}
            ellipsizeMode="tail"
          >
            {description}
          </T>
        </Animated.View>
        {canCollapse && (
          <Tap
            onPress={() => setExpanded((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={
              expanded
                ? "Show less of the description"
                : "Read the full description"
            }
            accessibilityState={{ expanded }}
            className="min-h-11 self-start justify-center"
          >
            <T variant="button">{expanded ? "Show less" : "Read more"}</T>
          </Tap>
        )}
      </Animated.View>
    </DetailSection>
  );
}

function SellerBlock({
  seller,
  sellerId,
  title = 'Seller',
}: {
  seller: SellerIdentity;
  sellerId: string;
  title?: string;
}) {
  const router = useRouter();
  const displayName = seller.display_name?.trim() ?? "";
  const routeSellerId = sellerId?.trim() ?? "";
  const joinedSellerId = seller.id?.trim() ?? "";
  const validSellerRelation =
    UUID_PATTERN.test(routeSellerId) &&
    UUID_PATTERN.test(joinedSellerId) &&
    routeSellerId.toLowerCase() === joinedSellerId.toLowerCase();
  const rating = formatProfileRating(seller.rating_avg, seller.rating_count);
  const memberSince = formatMemberSinceYear(seller.created_at);
  const place = formatProfileLocation(seller.city, seller.country_code);
  const initials = profileInitials(displayName);

  if (!displayName || !validSellerRelation) return <SellerUnavailable />;

  return (
    <DetailSection title={title}>
      <PressableScale
        onPress={() =>
          router.push({
            pathname: "/seller/[id]",
            params: { id: routeSellerId },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`View seller profile for ${displayName}`}
        motionRole="cardPress"
        scale={scale.cardPressed}
        className="min-h-[72px] flex-row items-center gap-3 py-2"
      >
        <Avatar
          initials={initials}
          bg={seller.avatar_color?.trim() || C.textPrimary}
          size={touch.large}
          imageUrl={seller.avatar_url}
        />

        <View className="min-w-0 flex-1 gap-1">
          <T variant="bodyMedium" selectable>
            {displayName}
          </T>
          {!!place && (
            <View className="flex-row items-center gap-1">
              <Icon
                name="pin"
                role="metadata"
                color={C.textSecondary}
                decorative
              />
              <T
                variant="metadata"
                color={C.textSecondary}
                className="min-w-0 flex-1"
                selectable
              >
                {place}
              </T>
            </View>
          )}
          {!!rating && (
            <View className="flex-row items-center gap-1">
              <Icon
                name="star"
                role="metadata"
                color={C.textSecondary}
                decorative
              />
              <T variant="metadata" color={C.textSecondary} selectable>
                {rating.label}
              </T>
            </View>
          )}
          {!!memberSince && (
            <T variant="metadata" color={C.textSecondary} selectable>
              {memberSince}
            </T>
          )}
        </View>

        <Icon
          name="chevronRight"
          role="metadata"
          color={C.textSecondary}
          decorative
        />
      </PressableScale>
    </DetailSection>
  );
}

function SellerUnavailable() {
  return (
    <DetailSection title="Seller">
      <View
        accessible
        accessibilityLabel="Seller unavailable"
        className="min-h-[72px] justify-center py-2"
      >
        <T variant="bodyMedium" color={C.textSecondary}>
          Seller unavailable
        </T>
      </View>
    </DetailSection>
  );
}

function DeliveryBlock({
  countryCode,
  currency,
}: {
  countryCode: string;
  currency: string;
}) {
  const options = useAsync(
    () => fetchDeliveryOptions(countryCode),
    `delivery:${countryCode}`,
  );
  const rows = options.data ?? [];

  if (options.loading) {
    return (
      <DetailSection title="Delivery">
        <View accessibilityLabel="Loading delivery options" className="gap-3">
          <Skeleton width="100%" height={48} />
          <Skeleton width="100%" height={48} />
        </View>
      </DetailSection>
    );
  }

  if (options.error) {
    return (
      <DetailSection title="Delivery">
        <View className="gap-2">
          <T variant="metadata" color={C.errorText} accessibilityRole="alert">
            {retryableReadMessage(
              options.error,
              "Delivery information could not be loaded.",
            )}
          </T>
          <Tap
            accessibilityRole="button"
            accessibilityLabel="Retry delivery information"
            onPress={options.refetch}
            className="min-h-11 self-start justify-center"
          >
            <T variant="button">Retry delivery information</T>
          </Tap>
        </View>
      </DetailSection>
    );
  }

  return (
    <DetailSection title="Delivery">
      {rows.length === 0 ? (
        <T
          accessible
          accessibilityLabel="Delivery options unavailable"
          variant="metadata"
          color={C.textSecondary}
          className="min-h-11 py-3"
        >
          Delivery options unavailable
        </T>
      ) : (
        rows.map((option, index) => {
          const priceLabel =
            option.price_cents === 0
              ? "Free"
              : formatPrice(option.price_cents, currency);

          return (
            <View
              key={option.id}
              className={`min-h-16 flex-row items-center gap-3 py-3 ${index === 0 ? "" : "border-t border-nilya-border"}`}
              accessible
              accessibilityLabel={`${option.name}, ${priceLabel}`}
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-nilya-surface">
                <Icon
                  name="package"
                  role="metadata"
                  color={C.textPrimary}
                  decorative
                />
              </View>
              <View className="min-w-0 flex-1">
                <T variant="bodyMedium">{option.name}</T>
              </View>
              <T variant="bodyMedium" className="shrink-0 text-right">
                {priceLabel}
              </T>
            </View>
          );
        })
      )}
    </DetailSection>
  );
}

function TrustBlock() {
  return (
    <DetailSection title="Trust & safety">
      <TrustRow
        icon="shieldCheck"
        title="Stripe-hosted checkout"
        body="Card details are entered in Stripe Checkout and are not stored by the NILYA app."
      />
      <TrustRow
        icon="shield"
        title="Keep payment details private"
        body="Do not share card details or payment credentials in messages."
        divided
      />
    </DetailSection>
  );
}

function TrustRow({
  icon,
  title,
  body,
  divided = false,
}: {
  icon: "shield" | "shieldCheck";
  title: string;
  body: string;
  divided?: boolean;
}) {
  return (
    <View
      className={`min-h-14 flex-row items-center gap-3 py-3 ${divided ? "border-t border-nilya-border" : ""}`}
      accessible
      accessibilityLabel={`${title}. ${body}`}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-nilya-background">
        <Icon name={icon} role="inline" color={C.textPrimary} decorative />
      </View>
      <View className="min-w-0 flex-1">
        <T variant="bodyMedium">{title}</T>
        <T variant="metadata" color={C.textSecondary} className="mt-1">
          {body}
        </T>
      </View>
    </View>
  );
}

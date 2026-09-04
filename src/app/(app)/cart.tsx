import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ListingImage, formatPrice } from '@/components/listing-card';
import { Skeleton } from '@/components/skeleton';
import { Button, EmptyState, InlineError, PressableScale, ScreenError, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useFavorites } from '@/hooks/use-favorites';
import { useGoBack } from '@/hooks/use-go-back';
import {
  calculateBundlePricing,
  type BundlePricing,
} from '@/lib/bundle-discounts';
import type { BundleDiscountSettingsRow, ListingRow } from '@/lib/database.types';
import { isCommerceListing } from '@/lib/listing-types';
import {
  coverUrl,
  fetchListingsByIds,
  fetchOrders,
  fetchPublicBundleDiscountSettingsForSellers,
} from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { getCartIds, removeManyFromCart, useCart } from '@/store/cart-store';
import { color as C, elevation, radius, scale, space, touch, type } from '@/theme/tokens';

const EDGE = space.space16;
const THUMB = 88;
type CommerceListingRow = ListingRow & { price_cents: number };

function isPurchasable(row: ListingRow): row is CommerceListingRow {
  return isCommerceListing(row.listing_type) && row.condition === 'new' && row.price_cents != null;
}

/** Order statuses that mean a listing has been bought and should leave the cart. */
const LIVE_ORDER_STATUSES = new Set(['pending_payment', 'paid', 'shipped', 'delivered', 'completed', 'disputed']);

/**
 * My cart.
 *
 * The ids live on this device (see `lib/cart.ts`); everything shown for them
 * is read live from `listings`. An id whose row no longer comes back is shown
 * as unavailable rather than remembered, and an id the signed-in buyer already
 * holds a live order for is dropped automatically, because checkout is one
 * order per listing and that order already exists.
 *
 * There is no quantity control: every listing is one item, and the database
 * permits one live sale of it. Shipping and buyer protection depend on the
 * delivery option chosen at checkout, so the summary states that instead of
 * printing a number it cannot know yet.
 */
export default function Cart() {
  const router = useRouter();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const cart = useCart();
  const favorites = useFavorites();

  /* Fetched once per visit for the ids stored at that moment; removals are
     applied to the result locally so the list does not reload under a tap. */
  const items = useAsync(
    async () => {
      const ids = cart.hydrated ? getCartIds() : [];
      if (ids.length === 0) {
        return {
          rows: [] as ListingRow[],
          bought: [] as string[],
          bundleSettings: [] as BundleDiscountSettingsRow[],
        };
      }
      const [rows, orders] = await Promise.all([fetchListingsByIds(ids), fetchOrders()]);
      const bundleSettings = await fetchPublicBundleDiscountSettingsForSellers(
        rows.flatMap((row) => (row.seller?.id ? [row.seller.id] : []))
      );
      const inCart = new Set(ids);
      const bought = orders
        .filter((order) => order.buyer_id === user?.id && LIVE_ORDER_STATUSES.has(order.status))
        .flatMap((order) =>
          order.items.length > 0
            ? order.items.map((item) => item.listing_id)
            : [order.listing_id]
        )
        .filter((listingId) => inCart.has(listingId));
      return { rows, bought, bundleSettings };
    },
    `cart:${cart.hydrated}`
  );

  useEffect(() => {
    if (items.data && items.data.bought.length > 0) void removeManyFromCart(items.data.bought);
  }, [items.data]);

  const rowsById = useMemo(
    () => new Map((items.data?.rows ?? []).filter(isPurchasable).map((row) => [row.id, row])),
    [items.data]
  );
  const available = cart.ids.map((id) => rowsById.get(id)).filter((row): row is CommerceListingRow => Boolean(row));
  const unavailableIds = items.data ? cart.ids.filter((id) => !rowsById.has(id)) : [];

  const bundle = useMemo(
    () => findFirstBundle(available, items.data?.bundleSettings ?? []),
    [available, items.data?.bundleSettings]
  );
  const first = available[0] ?? null;
  const checkoutRows = bundle?.rows ?? (first ? [first] : []);
  const checkoutSubtotal = bundle?.pricing.listSubtotalCents ?? first?.price_cents ?? 0;
  const checkoutCurrency = checkoutRows[0]?.currency ?? 'EUR';
  const checkoutLabel = bundle
    ? `Checkout ${bundle.rows.length}-item bundle`
    : available.length > 1
      ? `Checkout 1 of ${available.length}`
      : 'Checkout';

  const header = (
    <View
      style={{
        paddingTop: insets.top + space.space8,
        paddingHorizontal: EDGE,
        height: insets.top + space.space8 + touch.standard,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        accessible={false}
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, top: insets.top + space.space8, height: touch.standard, alignItems: 'center', justifyContent: 'center' }}
      >
        <T variant="bodyMedium" accessibilityRole="header">
          My cart
        </T>
      </View>
      <PressableScale
        onPress={goBack}
        scale={scale.buttonPressed}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={{
          width: touch.standard,
          height: touch.standard,
          borderRadius: radius.radiusPill,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: C.border,
          backgroundColor: C.surface,
          ...elevation.raised,
        }}
      >
        <Icon name="chevronLeft" role="action" color={C.textPrimary} decorative />
      </PressableScale>
    </View>
  );

  const loading = !cart.hydrated || items.loading;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {header}

      {items.error ? (
        <ScreenError error={items.error} title="Could not load your cart" onRetry={items.refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingTop: space.space16,
            paddingHorizontal: EDGE,
            paddingBottom: insets.bottom + space.space32,
            gap: space.space16,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={items.refreshing}
              onRefresh={() => {
                items.refresh();
                favorites.refresh();
              }}
              tintColor={C.textSecondary}
            />
          }
        >
          {loading ? (
            <CartSkeleton />
          ) : cart.ids.length === 0 ? (
            <EmptyState
              icon="bag"
              title="Your cart is empty"
              body="Products you add from a listing will wait here on this device."
              style={{ paddingVertical: space.space48 }}
              action={
                <Button
                  label="Browse products"
                  onPress={() => router.dismissTo('/')}
                  style={{ marginTop: space.space20 }}
                />
              }
            />
          ) : (
            <>
              {available.map((row) => (
                <CartItem
                  key={row.id}
                  listing={row}
                  saved={favorites.saved.has(row.id)}
                  onToggleSave={() => favorites.toggle(row.id)}
                  onRemove={() => void cart.remove(row.id)}
                  onOpen={() => router.push({ pathname: '/listing/[id]', params: { id: row.id } })}
                />
              ))}

              {unavailableIds.map((id) => (
                <UnavailableItem key={id} onRemove={() => void cart.remove(id)} />
              ))}

              {available.length > 0 ? (
                <OrderSummary
                  count={checkoutRows.length}
                  currency={checkoutCurrency}
                  subtotalCents={checkoutSubtotal}
                  bundlePricing={bundle?.pricing ?? null}
                  remainingCount={available.length - checkoutRows.length}
                  checkoutLabel={checkoutLabel}
                  onCheckout={
                    checkoutRows.length > 0
                      ? () =>
                          bundle
                            ? router.push({
                                pathname: '/checkout',
                                params: { ids: bundle.rows.map((row) => row.id).join(',') },
                              })
                            : router.push({
                                pathname: '/checkout',
                                params: { id: checkoutRows[0]!.id },
                              })
                      : undefined
                  }
                />
              ) : null}
            </>
          )}

          {favorites.error ? (
            <InlineError message="Your wishlist change could not be saved. Try again." />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function CartItem({
  listing,
  saved,
  onToggleSave,
  onRemove,
  onOpen,
}: {
  listing: CommerceListingRow;
  saved: boolean;
  onToggleSave: () => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const title = listing.title.trim();
  const brand = listing.brand?.trim() || null;
  /* The supporting line is the brand when the seller gave one, otherwise the
     seller's name — both are stored, neither is a label the app made up. */
  const support = brand && brand.toLocaleLowerCase() !== title.toLocaleLowerCase()
    ? brand
    : listing.seller?.display_name ?? null;
  const categoryLabel = listing.category?.label?.trim() || null;
  const price = formatPrice(listing.price_cents, listing.currency);

  return (
    <View
      style={{
        borderRadius: radius.radiusXLarge,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
        ...elevation.raised,
      }}
    >
      <PressableScale
        onPress={onOpen}
        scale={scale.cardPressed}
        motionRole="cardPress"
        accessibilityRole="button"
        accessibilityLabel={[title, support, categoryLabel, price].filter(Boolean).join(', ')}
        style={{ flexDirection: 'row', gap: space.space12, padding: space.space12 }}
      >
        <ListingImage
          url={coverUrl(listing.images)}
          width={THUMB}
          aspectRatio={1}
          round={radius.radiusMedium}
          label={`${title} product photo`}
        />
        <View style={{ flex: 1, minHeight: THUMB, justifyContent: 'space-between' }}>
          <View style={{ gap: space.space4 }}>
            <Text style={{ ...type.bodyMedium, color: C.textPrimary }} numberOfLines={1}>
              {title}
            </Text>
            {support ? (
              <Text style={{ ...type.metadata, color: C.textSecondary }} numberOfLines={1}>
                {support}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.space8 }}>
            {categoryLabel ? (
              <View
                style={{
                  borderRadius: radius.radiusPill,
                  backgroundColor: C.surfaceSecondary,
                  paddingHorizontal: space.space12,
                  minHeight: 28,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...type.metadata, color: C.textPrimary }} numberOfLines={1}>
                  {categoryLabel}
                </Text>
              </View>
            ) : (
              <View />
            )}
            <Text style={{ ...type.price, color: C.textPrimary }} numberOfLines={1}>
              {price}
            </Text>
          </View>
        </View>
      </PressableScale>

      <View style={{ height: 1, backgroundColor: C.border, marginHorizontal: space.space12 }} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space.space12,
          paddingVertical: space.space4,
        }}
      >
        <Tap
          onPress={onToggleSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          accessibilityState={{ selected: saved }}
          style={{ minHeight: touch.minimum, justifyContent: 'center', paddingHorizontal: space.space4 }}
        >
          <T variant="metadataMedium" color={saved ? C.primary : C.textPrimary}>
            {saved ? 'In wishlist' : 'Add to wishlist'}
          </T>
        </Tap>

        {/* One listing is one item, so there is nothing to step up or down. */}
        <Tap
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${title} from cart`}
          hitSlop={6}
          style={{
            width: touch.minimum,
            height: touch.minimum,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" role="inline" color={C.textSecondary} decorative />
        </Tap>
      </View>
    </View>
  );
}

function UnavailableItem({ onRemove }: { onRemove: () => void }) {
  return (
    <View
      style={{
        borderRadius: radius.radiusXLarge,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
        padding: space.space16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space12,
      }}
    >
      <View style={{ flex: 1, gap: space.space4 }}>
        <T variant="bodyMedium">No longer available</T>
        <T variant="metadata" color={C.textSecondary}>
          This product has been sold or removed by its seller.
        </T>
      </View>
      <Button label="Remove" variant="secondary" buttonSize="compact" onPress={onRemove} />
    </View>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.space12 }}>
      <Text style={{ ...(strong ? type.bodyMedium : type.metadata), color: strong ? C.textPrimary : C.textSecondary }}>
        {label}
      </Text>
      <Text
        style={{ ...(strong ? type.bodyMedium : type.metadata), color: C.textPrimary, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
    </View>
  );
}

function OrderSummary({
  count,
  currency,
  subtotalCents,
  bundlePricing,
  remainingCount,
  checkoutLabel,
  onCheckout,
}: {
  count: number;
  currency: string;
  subtotalCents: number;
  bundlePricing: BundlePricing | null;
  remainingCount: number;
  checkoutLabel: string;
  onCheckout?: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: radius.radiusXLarge,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
        padding: space.space16,
        gap: space.space12,
        ...elevation.raised,
      }}
    >
      <T variant="sectionTitle" style={{ fontSize: 18, lineHeight: 24 }}>
        Order Summary
      </T>

      <SummaryLine
        label={`Subtotal · ${count} ${count === 1 ? 'item' : 'items'}`}
        value={formatPrice(subtotalCents, currency)}
        strong={!bundlePricing}
      />
      {bundlePricing ? (
        <>
          <SummaryLine
            label={`Bundle discount · ${bundlePricing.discountPercent}%`}
            value={`−${formatPrice(bundlePricing.discountCents, currency)}`}
          />
          <SummaryLine
            label="After discount"
            value={formatPrice(bundlePricing.discountedSubtotalCents, currency)}
            strong
          />
        </>
      ) : null}
      <SummaryLine label="Shipping" value="Chosen at checkout" />
      <SummaryLine label="Buyer protection" value="Added at checkout" />

      <T variant="caption" color={C.textSecondary}>
        {bundlePricing
          ? `This seller's discount is applied to this bundle by Nilya at checkout.`
          : 'This product is paid for on its own.'}
        {remainingCount > 0
          ? ` ${remainingCount} other ${remainingCount === 1 ? 'item stays' : 'items stay'} in your bag.`
          : ''}
      </T>

      <Button label={checkoutLabel} onPress={onCheckout} style={{ marginTop: space.space4 }} />
    </View>
  );
}

type BundleCandidate = {
  rows: CommerceListingRow[];
  pricing: BundlePricing;
};

function findFirstBundle(
  rows: readonly CommerceListingRow[],
  settingsRows: readonly BundleDiscountSettingsRow[]
): BundleCandidate | null {
  const settings = new Map(settingsRows.map((row) => [row.seller_id, row]));
  const groups = new Map<string, CommerceListingRow[]>();

  for (const row of rows) {
    const sellerId = row.seller?.id;
    if (!sellerId) continue;
    const key = `${sellerId}:${row.currency.trim().toUpperCase()}:${row.country_code}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    const sellerId = group[0]?.seller?.id;
    if (!sellerId) continue;
    const limited = group.slice(0, 20);
    const pricing = calculateBundlePricing(
      limited.map((row) => row.price_cents),
      settings.get(sellerId) ?? null
    );
    if (pricing) return { rows: limited, pricing };
  }

  return null;
}

function CartSkeleton() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading your cart" style={{ gap: space.space16 }}>
      {[0, 1].map((index) => (
        <Skeleton key={index} width="100%" height={THUMB + space.space12 * 2 + touch.minimum + space.space8} round={radius.radiusXLarge} />
      ))}
      <Skeleton width="100%" height={220} round={radius.radiusXLarge} />
    </View>
  );
}

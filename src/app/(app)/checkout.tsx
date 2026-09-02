import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ListingImage, formatPrice } from '@/components/listing-card';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Button, Card, EmptyState, InlineError, ScreenError, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { NEW_CONDITION } from '@/lib/database.types';
import { retryableReadMessage } from '@/lib/errors';
import { fetchDeliveryOptions, startCheckout, type DeliveryOptionRow } from '@/lib/mutations';
import { coverUrl, fetchAcceptedOffer, fetchListing, fetchPlatformSettings } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, elevation, radius, space, touch } from '@/theme/tokens';

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/**
 * Checkout.
 *
 * Nothing here decides what is charged. The screen shows the numbers so the
 * buyer can see them, but the amount, the seller, the fee and whether the item
 * is still for sale are all resolved server-side by `create-checkout` — the
 * client has no write grant on `orders` at all. If this screen and the server
 * ever disagreed, the server would win and the order would not be created.
 *
 * Payment happens on Stripe's hosted test-mode page, and the order becomes paid
 * only when the webhook verifies the event. Returning from the browser proves
 * nothing, so this screen refetches rather than assuming.
 */
export default function CheckoutRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const listingId = uuidFromParam(id);

  if (!listingId) return <CheckoutUnavailable />;

  return <Checkout key={listingId} listingId={listingId} />;
}

function Checkout({ listingId }: { listingId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const listing = useAsync(() => fetchListing(listingId), `checkout-listing:${listingId}`);
  const settings = useAsync(fetchPlatformSettings, 'platform-settings');
  const offer = useAsync(
    () => fetchAcceptedOffer(listingId),
    `accepted-offer:${listingId}`
  );

  const row = listing.data;
  const options = useAsync(
    async () => (row ? fetchDeliveryOptions(row.country_code) : []),
    `delivery:${row?.country_code ?? 'none'}`
  );

  const [deliveryKey, setDeliveryKey] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const startingRef = useRef(false);
  const checkoutRequest = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      startingRef.current = false;
      checkoutRequest.current += 1;
    };
  }, []);

  if (listing.loading || settings.loading || offer.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Checkout" />
        <View style={{ padding: space.gutterCompact, gap: space.space12 }}>
          <Skeleton width="100%" height={92} round={radius.radiusLarge} />
          <Skeleton width="100%" height={140} round={radius.radiusLarge} />
          <Skeleton width="100%" height={110} round={radius.radiusLarge} />
        </View>
      </View>
    );
  }

  if (listing.error || !row) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Checkout" />
        {listing.error ? (
          <ScreenError error={listing.error} title="Could not load this item" onRetry={listing.refetch} />
        ) : (
          <EmptyState
            icon="bag"
            title="Listing unavailable"
            body="It may have been sold or removed."
            style={{ paddingVertical: touch.minimum }}
            action={<Button label="Back to browsing" onPress={() => router.dismissTo('/')} style={{ marginTop: space.space20 }} />}
          />
        )}
      </View>
    );
  }

  if (settings.error || offer.error || !settings.data) {
    const source = settings.error ?? offer.error;
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Checkout" />
        <ScreenError
          error={source}
          title="Could not prepare checkout"
          fallback="Pricing could not be confirmed."
          onRetry={settings.error ? settings.refetch : offer.refetch}
        />
      </View>
    );
  }

  /* The two states where checking out cannot succeed, refused up front rather
     than after a round trip that the server would reject anyway. */
  const isMine = user?.id === row.seller_id;
  const unavailable = row.status !== 'active' || row.condition !== NEW_CONDITION;
  const sellerAway = row.seller?.holiday_mode === true;
  const signedOut = !user;

  const ladder = options.data ?? [];
  const selected = ladder.find((o) => o.key === deliveryKey) ?? null;

  const itemPriceCents = offer.data?.amount_cents ?? row.price_cents;
  const shippingCents = selected?.price_cents ?? 0;
  const protectionFeeCents =
    selected && !selected.waives_protection_fee ? (settings.data?.protection_fee_cents ?? 0) : 0;
  const totalCents = itemPriceCents + shippingCents + protectionFeeCents;

  const pay = async () => {
    if (!selected || startingRef.current || signedOut || isMine || unavailable || sellerAway) return;

    const request = checkoutRequest.current + 1;
    checkoutRequest.current = request;
    startingRef.current = true;
    setStarting(true);
    setError(null);

    let handedOff = false;
    try {
      const result = await startCheckout({
        listingId: row.id,
        deliveryKey: selected.key,
        offerId: offer.data?.id ?? null,
      });
      if (!mounted.current || checkoutRequest.current !== request) return;

      /*
       * Hosted Stripe Checkout in a browser sheet. The app never sees card
       * details and holds no Stripe secret — it only opens a URL the server
       * created. Dismissing the sheet tells us the buyer came back, not that
       * they paid, so the order screen is where the truth is read.
       */
      await WebBrowser.openBrowserAsync(result.checkoutUrl);
      if (!mounted.current || checkoutRequest.current !== request) return;

      handedOff = true;
      router.replace({ pathname: '/order/[id]', params: { id: result.orderId } });
    } catch (e) {
      if (mounted.current && checkoutRequest.current === request) {
        setError(retryableReadMessage(e, 'Checkout could not be started.'));
      }
    } finally {
      if (checkoutRequest.current === request && !handedOff) {
        startingRef.current = false;
        if (mounted.current) setStarting(false);
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader title="Checkout" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutterCompact, paddingBottom: insets.bottom + 120 }}
      >
        <Card style={{ flexDirection: 'row', gap: space.space16, padding: space.space16, ...elevation.raised }}>
          <View style={{ width: 72 }}>
            <ListingImage url={coverUrl(row.images)} width={72} round={radius.radiusMedium} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T variant="cardTitle" numberOfLines={2}>
              {row.title}
            </T>
            <T variant="price" style={{ marginTop: space.space4 }}>
              {formatPrice(itemPriceCents, row.currency)}
            </T>
            {!!offer.data && (
              <T variant="metadata" color={C.success} style={{ marginTop: space.space4 }}>
                Accepted offer · was {formatPrice(row.price_cents, row.currency)}
              </T>
            )}
            {!!row.seller && (
              <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4 }}>
                Sold by {row.seller.display_name}
              </T>
            )}
          </View>
        </Card>

        {sellerAway ? (
          <View
            accessibilityRole="alert"
            className="mt-4 flex-row items-start gap-2 border-y border-nilya-border py-4"
          >
            <Icon name="info" role="metadata" color={C.textSecondary} decorative />
            <View className="min-w-0 flex-1">
              <T variant="bodyMedium">Seller is currently away</T>
              <T variant="metadata" color={C.textSecondary} className="mt-1">
                Checkout is paused for this product.
              </T>
            </View>
          </View>
        ) : null}

        <T variant="sectionTitle" style={{ marginTop: space.space20, marginBottom: space.space12 }}>
          Delivery
        </T>

        {options.loading ? (
          <Skeleton width="100%" height={140} round={radius.radiusLarge} />
        ) : options.error ? (
          <InlineError
            message={retryableReadMessage(options.error, 'Delivery options could not be loaded.')}
            actionLabel="Retry"
            onAction={options.refetch}
          />
        ) : ladder.length === 0 ? (
          <T variant="metadata" color={C.textSecondary}>
            No delivery options are configured for this country yet.
          </T>
        ) : (
          <View accessibilityRole="radiogroup" style={{ gap: space.space8 }}>
            {ladder.map((option) => (
              <DeliveryChoice
                key={option.key}
                option={option}
                currency={row.currency}
                selected={deliveryKey === option.key}
                onPress={() => setDeliveryKey(option.key)}
              />
            ))}
          </View>
        )}

        <T variant="sectionTitle" style={{ marginTop: space.space20, marginBottom: space.space12 }}>
          Order summary
        </T>

        <Card style={{ padding: space.space16, gap: space.space8, ...elevation.raised }}>
          <Line label="Item" value={formatPrice(itemPriceCents, row.currency)} />
          <Line
            label={selected ? selected.name : 'Delivery'}
            value={selected ? formatPrice(shippingCents, row.currency) : '—'}
          />
          {/*
            The fee is `platform_settings.protection_fee_cents`, and it is
            waived where the delivery option says so — both read from the
            database rather than assumed here.
          */}
          <Line
            label="Buyer protection"
            value={
              !selected
                ? '—'
                : protectionFeeCents === 0
                  ? 'Waived'
                  : formatPrice(protectionFeeCents, row.currency)
            }
          />
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: space.space4 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T variant="price">
              Total
            </T>
            <T variant="price">
              {selected ? formatPrice(totalCents, row.currency) : '—'}
            </T>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space8, marginTop: space.space16 }}>
          <Icon name="shieldSolid" role="metadata" color={C.textSecondary} decorative />
          <T variant="caption" color={C.textSecondary} style={{ flex: 1 }}>
            Card details are entered on Stripe, never in NILYA. Your order is confirmed only once
            Stripe verifies the payment.
          </T>
        </View>

        {!!error && <InlineError message={error} style={{ marginTop: space.space12 }} />}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: space.gutterCompact,
          paddingBottom: Math.max(insets.bottom, space.space12) + space.space8,
          backgroundColor: C.background,
          borderTopWidth: 1,
          borderTopColor: C.border,
          ...elevation.sheet,
        }}
      >
        <Button
          style={{ minHeight: touch.large }}
          label={
            isMine
              ? 'This is your listing'
              : signedOut
                ? 'Sign in to check out'
              : sellerAway
                ? 'Seller is currently away'
              : unavailable
                ? 'No longer available'
                : starting
                  ? 'Opening Stripe…'
                  : selected
                    ? `Pay ${formatPrice(totalCents, row.currency)}`
                    : 'Choose a delivery option'
          }
          disabled={signedOut || isMine || sellerAway || unavailable || !selected || starting}
          loading={starting}
          loadingLabel="Opening Stripe…"
          onPress={pay}
        />
      </View>
    </View>
  );
}

function uuidFromParam(value: string | string[] | undefined): string | null {
  const values = Array.isArray(value) ? value : [value];

  for (const candidate of values) {
    const normalized = candidate?.trim();
    if (normalized && UUID_PATTERN.test(normalized)) return normalized;
  }

  return null;
}

function CheckoutUnavailable() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader title="Checkout" />
      <EmptyState
        icon="bag"
        title="Listing unavailable"
        body="This checkout link is not valid."
        style={{ paddingVertical: touch.minimum }}
        action={
          <Button
            label="Back to browsing"
            onPress={() => router.dismissTo('/')}
            style={{ marginTop: space.space20 }}
          />
        }
      />
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.space12 }}>
      <T variant="metadata" color={C.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </T>
      <T variant="metadata">{value}</T>
    </View>
  );
}

function DeliveryChoice({
  option,
  currency,
  selected,
  onPress,
}: {
  option: DeliveryOptionRow;
  currency: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${option.name}, ${option.price_cents === 0 ? 'Free' : formatPrice(option.price_cents, currency)}`}
      accessibilityHint={option.subtitle ?? option.eta_label}
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space12,
        padding: space.space16,
        minHeight: touch.minimum,
        borderRadius: radius.radiusLarge,
        borderWidth: 1,
        borderColor: selected ? C.primary : C.border,
        backgroundColor: selected ? C.primarySoft : C.surface,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: radius.radiusPill,
          borderWidth: selected ? 6 : 1.5,
          borderColor: selected ? C.primary : C.borderStrong,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="bodyMedium">
          {option.name}
        </T>
        {!!option.subtitle && (
          <T variant="metadata" color={C.textSecondary} numberOfLines={1} style={{ marginTop: space.space4 }}>
            {option.subtitle}
          </T>
        )}
        <T variant="caption" color={C.textSecondary} style={{ marginTop: space.space4 }}>
          {option.eta_label}
        </T>
      </View>
      <T variant="bodyMedium">
        {option.price_cents === 0 ? 'Free' : formatPrice(option.price_cents, currency)}
      </T>
    </Tap>
  );
}

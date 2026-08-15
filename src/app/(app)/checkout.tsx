import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ListingImage, formatPrice } from '@/components/listing-card';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Button, Card, EmptyState, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { fetchDeliveryOptions, startCheckout, type DeliveryOptionRow } from '@/lib/mutations';
import { coverUrl, fetchAcceptedOffer, fetchListing, fetchPlatformSettings } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space } from '@/theme/tokens';

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
export default function Checkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const listing = useAsync(() => fetchListing(id), `checkout-listing:${id}`);
  const settings = useAsync(fetchPlatformSettings, 'platform-settings');
  const offer = useAsync(() => fetchAcceptedOffer(id), `accepted-offer:${id}`);

  const row = listing.data;
  const options = useAsync(
    async () => (row ? fetchDeliveryOptions(row.country_code) : []),
    `delivery:${row?.country_code ?? 'none'}`
  );

  const [deliveryKey, setDeliveryKey] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (listing.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Checkout" />
        <View style={{ padding: space.gutter, gap: 12 }}>
          <Skeleton width="100%" height={92} round={radius.lg} />
          <Skeleton width="100%" height={140} round={radius.lg} />
          <Skeleton width="100%" height={110} round={radius.lg} />
        </View>
      </View>
    );
  }

  if (listing.error || !row) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Checkout" />
        <EmptyState
          icon="bag"
          title={listing.error ? 'Could not load this item' : 'Listing unavailable'}
          body={listing.error ? listing.error.message : 'It may have been sold or removed.'}
          style={{ paddingVertical: 44 }}
          action={
            <Button label="Back to browsing" height={48} onPress={() => router.dismissTo('/')} style={{ marginTop: 20 }} />
          }
        />
      </View>
    );
  }

  /* The two states where checking out cannot succeed, refused up front rather
     than after a round trip that the server would reject anyway. */
  const isMine = user?.id === row.seller_id;
  const unavailable = row.status !== 'active';

  const ladder = options.data ?? [];
  const selected = ladder.find((o) => o.key === deliveryKey) ?? null;

  const itemPriceCents = offer.data?.amount_cents ?? row.price_cents;
  const shippingCents = selected?.price_cents ?? 0;
  const protectionFeeCents =
    selected && !selected.waives_protection_fee ? (settings.data?.protection_fee_cents ?? 0) : 0;
  const totalCents = itemPriceCents + shippingCents + protectionFeeCents;

  const pay = async () => {
    if (!selected || starting) return;
    setStarting(true);
    setError(null);
    try {
      const result = await startCheckout({
        listingId: row.id,
        deliveryKey: selected.key,
        offerId: offer.data?.id ?? null,
      });
      /*
       * Hosted Stripe Checkout in a browser sheet. The app never sees card
       * details and holds no Stripe secret — it only opens a URL the server
       * created. Dismissing the sheet tells us the buyer came back, not that
       * they paid, so the order screen is where the truth is read.
       */
      await WebBrowser.openBrowserAsync(result.checkoutUrl);
      router.replace({ pathname: '/order/[id]', params: { id: result.orderId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout');
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader title="Checkout" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, paddingBottom: insets.bottom + 120 }}
      >
        <Card style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
          <View style={{ width: 54 }}>
            <ListingImage url={coverUrl(row.images)} width={54} round={radius.sm} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w={500} size={15} numberOfLines={2}>
              {row.title}
            </T>
            <T w={700} size={18} style={{ marginTop: 3 }}>
              {formatPrice(itemPriceCents, row.currency)}
            </T>
            {!!offer.data && (
              <T size={12.5} color={C.success} style={{ marginTop: 2 }}>
                Accepted offer · was {formatPrice(row.price_cents, row.currency)}
              </T>
            )}
            {!!row.seller && (
              <T size={12.5} color={C.textSecondary} style={{ marginTop: 2 }}>
                Sold by {row.seller.display_name}
              </T>
            )}
          </View>
        </Card>

        <T w={600} size={15} style={{ marginTop: space.xl, marginBottom: space.md }}>
          Delivery
        </T>

        {options.loading ? (
          <Skeleton width="100%" height={140} round={radius.lg} />
        ) : ladder.length === 0 ? (
          <T size={13} color={C.textSecondary}>
            No delivery options are configured for this country yet.
          </T>
        ) : (
          <View style={{ gap: 8 }}>
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

        <T w={600} size={15} style={{ marginTop: space.xl, marginBottom: space.md }}>
          Total
        </T>

        <Card style={{ padding: 14, gap: 8 }}>
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
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T w={700} size={15}>
              Total
            </T>
            <T w={700} size={15}>
              {selected ? formatPrice(totalCents, row.currency) : '—'}
            </T>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.lg }}>
          <Icon name="shieldSolid" size={16} color={C.textSecondary} />
          <T size={12} color={C.textSecondary} lh={17} style={{ flex: 1 }}>
            Card details are entered on Stripe, never in SAWA. Your order is confirmed only once
            Stripe verifies the payment.
          </T>
        </View>

        {!!error && (
          <T size={12.5} color={C.error} style={{ textAlign: 'center', paddingTop: space.md }}>
            {error}
          </T>
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: space.gutter,
          paddingBottom: Math.max(insets.bottom, 12) + 8,
          backgroundColor: C.background,
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        <Button
          label={
            isMine
              ? 'This is your listing'
              : unavailable
                ? 'No longer available'
                : starting
                  ? 'Opening Stripe…'
                  : selected
                    ? `Pay ${formatPrice(totalCents, row.currency)}`
                    : 'Choose a delivery option'
          }
          height={52}
          disabled={isMine || unavailable || !selected || starting}
          onPress={pay}
        />
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <T size={13.5} color={C.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </T>
      <T size={13.5}>{value}</T>
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
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        minHeight: 44,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: selected ? C.text : C.border,
        backgroundColor: selected ? C.surface : C.background,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: selected ? 6 : 1.5,
          borderColor: selected ? C.text : C.borderStrong,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T w={500} size={14}>
          {option.name}
        </T>
        {!!option.subtitle && (
          <T size={12.5} color={C.textSecondary} numberOfLines={1} style={{ marginTop: 1 }}>
            {option.subtitle}
          </T>
        )}
        <T size={12} color={C.textMuted} style={{ marginTop: 2 }}>
          {option.eta_label}
        </T>
      </View>
      <T w={600} size={14}>
        {option.price_cents === 0 ? 'Free' : formatPrice(option.price_cents, currency)}
      </T>
    </Tap>
  );
}

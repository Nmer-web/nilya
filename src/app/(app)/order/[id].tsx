import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListingImage, formatPrice } from '@/components/listing-card';
import { OrderStatusPill, PaymentStatusLine } from '@/components/order-status';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Button, Card, EmptyState, RefreshNotice, ScreenError, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { coverUrl, fetchOrder } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space, touch } from '@/theme/tokens';

/**
 * One order.
 *
 * The whole screen is read-only, which is not a limitation but the design: no
 * client role has a write grant on `orders` or `payments`, so every state shown
 * here arrived through a Stripe event the webhook verified. Pulling to refresh
 * is how a payment that completed in the browser shows up.
 */
export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const order = useAsync(() => fetchOrder(id), `order:${id}`);
  const row = order.data;

  if (order.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Order" />
        <View style={{ padding: space.gutterCompact, gap: space.space12 }}>
          <Skeleton width="100%" height={96} round={radius.radiusLarge} />
          <Skeleton width="100%" height={120} round={radius.radiusLarge} />
        </View>
      </View>
    );
  }

  if (!row) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Order" />
        {order.error ? (
          <ScreenError error={order.error} title="Could not load this order" onRetry={order.refetch} />
        ) : (
          <EmptyState
            icon="package"
            title="Order not found"
            body="It may not belong to this account."
            style={{ paddingVertical: touch.minimum }}
            action={<Button label="Back to orders" onPress={() => router.dismissTo('/orders')} style={{ marginTop: space.space20 }} />}
          />
        )}
      </View>
    );
  }

  const sold = user?.id === row.seller_id;
  const counterparty = sold ? row.buyer : row.seller;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* The id is the order's real UUID; nothing invents a display number. */}
      <ScreenHeader title="Order" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutterCompact, paddingBottom: space.space40 + insets.bottom, gap: space.space12 }}
        refreshControl={
          <RefreshControl refreshing={order.refreshing} onRefresh={order.refresh} tintColor={C.textSecondary} />
        }
      >
        {order.error ? <RefreshNotice onRetry={order.refresh} /> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.space12 }}>
          <OrderStatusPill status={row.status} />
          <T variant="caption" color={C.textSecondary}>
            {new Date(row.placed_at).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </T>
        </View>

        <Card style={{ flexDirection: 'row', gap: space.space12, padding: space.space16 }}>
          <View style={{ width: 54 }}>
            <ListingImage url={coverUrl(row.listing?.images ?? null)} width={54} round={radius.radiusSmall} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T variant="cardTitle" numberOfLines={2}>
              {row.listing?.title ?? 'Listing unavailable'}
            </T>
            <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4 }}>
              {sold ? 'Bought by' : 'Sold by'} {counterparty?.display_name ?? 'a member'}
            </T>
          </View>
        </Card>

        <Card style={{ padding: space.space16, gap: space.space8 }}>
          <Line label="Item" value={formatPrice(row.item_price_cents, row.currency)} />
          <Line
            label="Delivery"
            value={row.shipping_cents === 0 ? 'Free' : formatPrice(row.shipping_cents, row.currency)}
          />
          <Line
            label="Buyer protection"
            value={
              row.protection_fee_cents === 0
                ? 'Waived'
                : formatPrice(row.protection_fee_cents, row.currency)
            }
          />
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: space.space4 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T variant="price">
              Total
            </T>
            <T variant="price">
              {formatPrice(row.total_cents, row.currency)}
            </T>
          </View>
          {!!row.offer_id && (
            <T variant="caption" color={C.textSecondary} style={{ marginTop: space.space4 }}>
              Price agreed through an accepted offer.
            </T>
          )}
        </Card>

        <Card style={{ padding: space.space16, gap: space.space8 }}>
          <T variant="cardTitle">
            Payment
          </T>
          <PaymentStatusLine payment={row.payment} />
          {row.status === 'pending_payment' && (
            <T variant="caption" color={C.textSecondary} style={{ marginTop: space.space4 }}>
              This order is confirmed only when Stripe verifies the payment. If you completed
              checkout a moment ago, pull down to refresh.
            </T>
          )}
          {!!row.payment && row.payment.amount_refunded_cents > 0 && (
            <T variant="metadata" color={C.textSecondary}>
              Refunded {formatPrice(row.payment.amount_refunded_cents, row.currency)}
            </T>
          )}
        </Card>

        {/*
          No tracking card. `shipments` exists but nothing writes to it yet, so
          a carrier and a tracking number would be invented.
        */}
      </ScrollView>
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

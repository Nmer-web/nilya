import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { ListingImage, formatPrice } from '@/components/listing-card';
import { OrderStatusPill } from '@/components/order-status';
import { TabTitle } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Button, Card, EmptyState, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { coverUrl, fetchOrders, type OrderRow } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space } from '@/theme/tokens';

/**
 * Orders, bought and sold.
 *
 * Every row here is the result of a Stripe event the webhook verified — there
 * is no client write path to `orders`, so nothing on this screen can exist
 * because the app decided it should.
 */
export default function Orders() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { status, user } = useAuth();
  const signedIn = status === 'signedIn';

  const orders = useAsync(async () => (signedIn ? fetchOrders() : []), `orders:${signedIn}`);
  const list = orders.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: space.gutter }}>
        <View style={{ paddingTop: 2, paddingBottom: 14 }}>
          <TabTitle>Orders</TabTitle>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: navClearance, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={orders.refreshing} onRefresh={orders.refresh} tintColor={C.textMuted} />
        }
      >
        {!signedIn ? (
          <EmptyState
            icon="person"
            title="Sign in to see your orders"
            body="Purchases and sales are kept to your account."
            style={{ paddingVertical: 60 }}
            action={<Button label="Sign in" height={48} onPress={() => router.push('/sign-in')} style={{ marginTop: 20 }} />}
          />
        ) : orders.loading ? (
          <View style={{ gap: 10 }}>
            {[0, 1].map((i) => (
              <Skeleton key={i} width="100%" height={96} round={radius.lg} />
            ))}
          </View>
        ) : orders.error ? (
          <EmptyState
            icon="close"
            title="Could not load your orders"
            body={orders.error.message}
            style={{ paddingVertical: 44 }}
            action={<Button label="Try again" height={44} size={14} onPress={orders.refetch} style={{ marginTop: 18 }} />}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon="package"
            title="No orders yet"
            body="Items you buy and sell will appear here."
            style={{ paddingVertical: 60 }}
            action={
              <Button label="Browse listings" height={48} onPress={() => router.dismissTo('/')} style={{ marginTop: 20 }} />
            }
          />
        ) : (
          list.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              me={user?.id ?? null}
              onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function OrderCard({ order, me, onPress }: { order: OrderRow; me: string | null; onPress: () => void }) {
  const sold = me === order.seller_id;
  const counterparty = sold ? order.buyer : order.seller;

  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={`Order for ${order.listing?.title ?? 'an item'}`}>
      <Card style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
        <View style={{ width: 54 }}>
          <ListingImage url={coverUrl(order.listing?.images ?? null)} width={54} round={radius.sm} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T w={500} size={14.5} numberOfLines={1} style={{ flex: 1 }}>
              {order.listing?.title ?? 'Listing unavailable'}
            </T>
            <OrderStatusPill status={order.status} />
          </View>

          <T w={700} size={16} style={{ marginTop: 3 }}>
            {formatPrice(order.total_cents, order.currency)}
          </T>

          <T size={12.5} color={C.textSecondary} style={{ marginTop: 2 }} numberOfLines={1}>
            {sold ? 'Sold to' : 'From'} {counterparty?.display_name ?? 'a member'} ·{' '}
            {new Date(order.placed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </T>
        </View>
      </Card>
    </Tap>
  );
}

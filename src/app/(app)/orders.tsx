import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { ListingImage, formatPrice } from '@/components/listing-card';
import { OrderStatusPill } from '@/components/order-status';
import { TabTitle } from '@/components/screen-header';
import { OrderSkeleton } from '@/components/skeleton';
import { Button, Card, EmptyState, InlineError, ScreenError, T, Tap } from '@/components/ui';
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
      <View style={{ paddingTop: insets.top, paddingHorizontal: space.gutterCompact }}>
        <View style={{ paddingTop: space.space4, paddingBottom: space.space12 }}>
          <TabTitle>Orders</TabTitle>
        </View>
      </View>

      <FlatList
        data={signedIn ? list : []}
        keyExtractor={(order) => order.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            me={user?.id ?? null}
            onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.space12 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.gutterCompact, paddingBottom: navClearance, gap: space.space12 }}
        refreshControl={
          <RefreshControl refreshing={orders.refreshing} onRefresh={orders.refresh} tintColor={C.textSecondary} />
        }
        ListHeaderComponent={orders.error && list.length > 0 ? (
          <View style={{ paddingBottom: space.space12 }}>
            <InlineError message="Orders could not be refreshed." actionLabel="Retry" onAction={orders.refresh} />
          </View>
        ) : null}
        ListEmptyComponent={!signedIn ? (
          <EmptyState
            icon="person"
            title="Sign in to see your orders"
            body="Purchases and sales are kept to your account."
            style={{ paddingVertical: space.space48 }}
            action={<Button label="Sign in" onPress={() => router.push('/sign-in')} style={{ marginTop: space.space20 }} />}
          />
        ) : orders.loading && list.length === 0 ? (
          <OrderSkeleton />
        ) : orders.error && list.length === 0 ? (
          <ScreenError error={orders.error} title="Could not load your orders" onRetry={orders.refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="package"
            title="No orders yet"
            body="Items you buy and sell will appear here."
            style={{ paddingVertical: space.space48 }}
            action={
              <Button label="Browse listings" onPress={() => router.dismissTo('/')} style={{ marginTop: space.space20 }} />
            }
          />
        ) : null}
      />
    </View>
  );
}

function OrderCard({ order, me, onPress }: { order: OrderRow; me: string | null; onPress: () => void }) {
  const sold = me === order.seller_id;
  const counterparty = sold ? order.buyer : order.seller;
  const item = order.listing?.title ?? 'Listing unavailable';
  const counterpartyName = counterparty?.display_name ?? 'a member';

  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${sold ? 'Sale' : 'Purchase'} for ${item}, ${formatPrice(order.total_cents, order.currency)}, ${order.status.replaceAll('_', ' ')}, ${sold ? 'sold to' : 'from'} ${counterpartyName}`}
    >
      <Card style={{ flexDirection: 'row', gap: space.space12, padding: space.space16 }}>
        <View style={{ width: 54 }}>
          <ListingImage url={coverUrl(order.listing?.images ?? null)} width={54} round={radius.radiusSmall} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space8 }}>
            <T variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>
              {item}
            </T>
            <OrderStatusPill status={order.status} />
          </View>

          <T variant="price" style={{ marginTop: space.space4 }}>
            {formatPrice(order.total_cents, order.currency)}
          </T>

          <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4 }} numberOfLines={1}>
            {sold ? 'Sold to' : 'From'} {counterparty?.display_name ?? 'a member'} ·{' '}
            {new Date(order.placed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </T>
        </View>
      </Card>
    </Tap>
  );
}

import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Button, EmptyState, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { markNotificationRead } from '@/lib/mutations';
import { fetchNotifications, type NotificationRow } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, space } from '@/theme/tokens';

/**
 * Notifications.
 *
 * Rows from `notifications`, which only triggers and functions insert into —
 * `notifications_mark_read` grants the client `read_at` and nothing else. The
 * five entries this screen used to show were written by hand: a message from a
 * person who does not exist, an offer on a listing that was never created, and
 * a link to order "SS28491" which the real order route cannot resolve.
 *
 * Nothing writes to this table yet, so the honest result today is empty.
 */
export default function Notifications() {
  const router = useRouter();
  const navClearance = useNavClearance();
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  const notifications = useAsync(
    async () => (signedIn ? fetchNotifications() : []),
    `notifications:${signedIn}`
  );

  const list = notifications.data ?? [];
  const unread = list.filter((n) => n.read_at === null);

  const markAllRead = async () => {
    await Promise.all(unread.map((n) => markNotificationRead(n.id).catch(() => {})));
    notifications.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader
        title="Notifications"
        right={
          unread.length > 0 ? (
            <Tap onPress={markAllRead} accessibilityRole="button" hitSlop={8} style={{ paddingRight: 10 }}>
              <T w={500} size={13} color={C.textSecondary}>
                Mark all read
              </T>
            </Tap>
          ) : undefined
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: space.md, paddingBottom: navClearance }}
        refreshControl={
          <RefreshControl
            refreshing={notifications.refreshing}
            onRefresh={notifications.refresh}
            tintColor={C.textMuted}
          />
        }
      >
        {!signedIn ? (
          <EmptyState
            icon="person"
            title="Sign in to see your notifications"
            body="Updates about your listings and orders are kept to your account."
            style={{ paddingVertical: 60 }}
            action={
              <Button label="Sign in" height={48} onPress={() => router.push('/sign-in')} style={{ marginTop: 20 }} />
            }
          />
        ) : notifications.loading ? (
          <View style={{ paddingHorizontal: space.gutter, gap: 14 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <Skeleton width={38} height={38} round={19} />
                <View style={{ flex: 1, paddingTop: 4 }}>
                  <Skeleton width="64%" height={13} />
                  <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
                </View>
              </View>
            ))}
          </View>
        ) : notifications.error ? (
          <EmptyState
            icon="close"
            title="Could not load notifications"
            body={notifications.error.message}
            style={{ paddingVertical: 44 }}
            action={
              <Button
                label="Try again"
                height={44}
                size={14}
                onPress={notifications.refetch}
                style={{ marginTop: 18 }}
              />
            }
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon="bell"
            title="Nothing new"
            body="Offers, messages and order updates will appear here."
            style={{ paddingVertical: 60 }}
          />
        ) : (
          list.map((n, i) => <NotificationRowView key={n.id} notification={n} first={i === 0} />)
        )}
      </ScrollView>
    </View>
  );
}

/**
 * `kind` is free text on the table, documented as
 * `offer_received | message | order_placed | shipped | ...`, so this maps the
 * known ones and falls back rather than assuming the set is closed.
 */
function iconFor(kind: string) {
  if (kind.startsWith('offer')) return 'offerNote' as const;
  if (kind.startsWith('message')) return 'chat' as const;
  if (kind.startsWith('order') || kind === 'shipped') return 'package' as const;
  return 'bell' as const;
}

function NotificationRowView({ notification, first }: { notification: NotificationRow; first: boolean }) {
  const unread = notification.read_at === null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: space.gutter,
        backgroundColor: unread ? C.surface : C.background,
        borderTopWidth: first ? 1 : 0,
        borderBottomWidth: 1,
        borderColor: C.border,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: C.surfaceSecondary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={iconFor(notification.kind)} size={18} color={C.text} strokeWidth={1.8} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <T w={unread ? 600 : 500} size={14} numberOfLines={2}>
          {notification.title}
        </T>
        {!!notification.body && (
          <T size={12.5} color={C.textSecondary} numberOfLines={2} style={{ marginTop: 2 }}>
            {notification.body}
          </T>
        )}
        <T size={11.5} color={C.textMuted} style={{ marginTop: 3 }}>
          {new Date(notification.created_at).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
          })}
        </T>
      </View>

      {/*
        No destination. `data` is a jsonb blob whose shape nothing writes yet,
        so routing from it would mean guessing at keys that do not exist.
      */}
      <View style={{ width: 8, alignItems: 'center' }}>
        {unread && (
          <View
            accessibilityLabel="Unread"
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent }}
          />
        )}
      </View>
    </View>
  );
}

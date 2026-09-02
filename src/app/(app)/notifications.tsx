import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { AccessibilityInfo, FlatList, RefreshControl, View } from 'react-native';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { NotificationSkeleton } from '@/components/skeleton';
import { Button, EmptyState, InlineError, ScreenError, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { markNotificationRead } from '@/lib/mutations';
import { fetchNotifications, type NotificationRow } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space, touch } from '@/theme/tokens';

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
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  const markAllRead = async () => {
    if (marking || unread.length === 0) return;
    setMarking(true);
    setMarkError(null);
    const results = await Promise.allSettled(unread.map((n) => markNotificationRead(n.id)));
    if (results.some((result) => result.status === 'rejected')) {
      setMarkError('Some notifications could not be marked as read. Try again.');
    } else {
      AccessibilityInfo.announceForAccessibility('All notifications marked as read');
    }
    notifications.refetch();
    setMarking(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader
        title="Notifications"
        right={
          unread.length > 0 ? (
            <Tap
              onPress={markAllRead}
              disabled={marking}
              accessibilityRole="button"
              accessibilityLabel={marking ? 'Marking all notifications as read' : 'Mark all notifications as read'}
              accessibilityState={{ busy: marking, disabled: marking }}
              hitSlop={8}
              style={{ paddingRight: space.space12, minHeight: touch.minimum, justifyContent: 'center' }}
            >
              <T variant="button" color={C.textSecondary}>
                Mark all read
              </T>
            </Tap>
          ) : undefined
        }
      />

      <FlatList
        data={signedIn ? list : []}
        keyExtractor={(notification) => notification.id}
        renderItem={({ item, index }) => <NotificationRowView notification={item} first={index === 0} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: space.space12, paddingBottom: navClearance }}
        refreshControl={
          <RefreshControl
            refreshing={notifications.refreshing}
            onRefresh={notifications.refresh}
            tintColor={C.textSecondary}
          />
        }
        ListHeaderComponent={(notifications.error && list.length > 0) || markError ? (
          <View style={{ paddingHorizontal: space.gutterCompact, paddingBottom: space.space12, gap: space.space8 }}>
            {notifications.error && list.length > 0 ? (
              <InlineError
                message="Notifications could not be refreshed."
                actionLabel="Retry"
                onAction={notifications.refresh}
              />
            ) : null}
            {markError ? <InlineError message={markError} actionLabel="Retry" onAction={markAllRead} /> : null}
          </View>
        ) : null}
        ListEmptyComponent={!signedIn ? (
          <EmptyState
            icon="person"
            title="Sign in to see your notifications"
            body="Updates about your listings and orders are kept to your account."
            style={{ paddingVertical: space.space48 }}
            action={
              <Button label="Sign in" onPress={() => router.push('/sign-in')} style={{ marginTop: space.space20 }} />
            }
          />
        ) : notifications.loading && list.length === 0 ? (
          <NotificationSkeleton />
        ) : notifications.error && list.length === 0 ? (
          <ScreenError error={notifications.error} title="Could not load notifications" onRetry={notifications.refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="bell"
            title="Nothing new"
            body="Offers, messages and order updates will appear here."
            style={{ paddingVertical: space.space48 }}
          />
        ) : null}
      />
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
      accessible
      accessibilityLabel={`${notification.title}${unread ? ', unread' : ''}${notification.body ? `, ${notification.body}` : ''}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space12,
        paddingVertical: space.space12,
        paddingHorizontal: space.gutterCompact,
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
          borderRadius: radius.radiusPill,
          backgroundColor: C.surfaceSecondary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={iconFor(notification.kind)} role="inline" color={C.textPrimary} decorative />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant={unread ? 'cardTitle' : 'metadata'} numberOfLines={2}>
          {notification.title}
        </T>
        {!!notification.body && (
          <T variant="metadata" color={C.textSecondary} numberOfLines={2} style={{ marginTop: space.space4 }}>
            {notification.body}
          </T>
        )}
        <T variant="caption" color={C.textSecondary} style={{ marginTop: space.space4 }}>
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
            accessible={false}
            style={{ width: 8, height: 8, borderRadius: radius.radiusPill, backgroundColor: C.accent }}
          />
        )}
      </View>
    </View>
  );
}

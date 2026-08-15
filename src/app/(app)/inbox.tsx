import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ListingImage, formatPrice } from '@/components/listing-card';
import { TabTitle } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Avatar, Button, EmptyState, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import {
  coverUrl,
  fetchConversationSummaries,
  fetchConversations,
  type ConversationRow,
  type MessageRow,
} from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space } from '@/theme/tokens';

/**
 * The conversation list.
 *
 * Threads come from `conversations`, which RLS already limits to the ones this
 * user is part of. The preview line, the timestamp and the unread dot are all
 * read from `messages` — an unread thread is one holding messages the other
 * party sent that have no `read_at`, which is a fact in the database rather
 * than a count kept in the app.
 *
 * There is no Offers tab. Offers are a real table but nothing in the app writes
 * to them yet, and the tab it replaces showed a fabricated offer from a
 * fabricated buyer.
 */
export default function Inbox() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { status, user } = useAuth();
  const signedIn = status === 'signedIn';

  const threads = useAsync(
    async () => (signedIn ? fetchConversations() : []),
    `conversations:${signedIn}`
  );
  const summaries = useAsync(
    async () => (signedIn ? fetchConversationSummaries() : new Map()),
    `conversation-summaries:${signedIn}`
  );

  const list = threads.data ?? [];

  const refresh = () => {
    threads.refresh();
    summaries.refresh();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: space.gutter }}>
        <View style={{ paddingTop: 2, paddingBottom: 14 }}>
          <TabTitle>Inbox</TabTitle>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: navClearance }}
        refreshControl={
          <RefreshControl refreshing={threads.refreshing} onRefresh={refresh} tintColor={C.textMuted} />
        }
      >
        {!signedIn ? (
          <EmptyState
            icon="person"
            title="Sign in to see your messages"
            body="Conversations are kept to your account."
            style={{ paddingVertical: 60 }}
            action={
              <Button label="Sign in" height={48} onPress={() => router.push('/sign-in')} style={{ marginTop: 20 }} />
            }
          />
        ) : threads.loading ? (
          <View>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: space.gutter,
                }}
              >
                <Skeleton width={44} height={44} round={22} />
                <View style={{ flex: 1, paddingTop: 3 }}>
                  <Skeleton width="42%" height={13} />
                  <Skeleton width="76%" height={12} style={{ marginTop: 8 }} />
                </View>
                <Skeleton width={40} height={53} round={radius.sm} />
              </View>
            ))}
          </View>
        ) : threads.error ? (
          <EmptyState
            icon="close"
            title="Could not load your messages"
            body={threads.error.message}
            style={{ paddingVertical: 44 }}
            action={
              <Button label="Try again" height={44} size={14} onPress={threads.refetch} style={{ marginTop: 18 }} />
            }
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon="chat"
            title="No messages yet"
            body="Your conversations with buyers and sellers will appear here."
            style={{ paddingVertical: 60 }}
            action={
              <Button
                label="Browse listings"
                height={48}
                onPress={() => router.dismissTo('/')}
                style={{ marginTop: 20 }}
              />
            }
          />
        ) : (
          list.map((thread, i) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              me={user?.id ?? null}
              summary={summaries.data?.get(thread.id)}
              first={i === 0}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: thread.id } })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

/** 14:08 today, "Yesterday", a weekday this week, otherwise a short date. */
function whenLabel(iso: string): string {
  const at = new Date(iso);
  const now = new Date();
  const sameDay = at.toDateString() === now.toDateString();
  if (sameDay) {
    return at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (at.toDateString() === yesterday.toDateString()) return 'Yesterday';

  const days = (now.getTime() - at.getTime()) / 86_400_000;
  if (days < 7) return at.toLocaleDateString(undefined, { weekday: 'short' });
  return at.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function ThreadRow({
  thread,
  me,
  summary,
  first,
  onPress,
}: {
  thread: ConversationRow;
  me: string | null;
  summary?: { last: MessageRow; unread: number };
  first: boolean;
  onPress: () => void;
}) {
  const other = me === thread.buyer_id ? thread.seller : thread.buyer;
  const listing = thread.listing;
  const unread = (summary?.unread ?? 0) > 0;

  const initials = (other?.display_name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const stamp = summary?.last.created_at ?? thread.last_message_at ?? thread.created_at;

  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${other?.display_name ?? 'a member'}${unread ? ', unread' : ''}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: space.gutter,
        backgroundColor: C.surface,
        borderTopWidth: first ? 1 : 0,
        borderBottomWidth: 1,
        borderColor: C.border,
      }}
    >
      <Avatar initials={initials} bg={C.text} size={44} fontSize={15} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <T w={600} size={14.5} numberOfLines={1} style={{ flex: 1 }}>
            {other?.display_name ?? 'Member unavailable'}
          </T>
          <T size={11.5} color={C.textMuted}>
            {whenLabel(stamp)}
          </T>
        </View>

        {/* No message yet is a real state: a thread exists from the moment it
            is opened, and saying so beats inventing a preview. */}
        <T
          w={unread ? 500 : 400}
          size={13}
          color={unread ? C.text : C.textSecondary}
          numberOfLines={1}
          style={{ marginTop: 2 }}
        >
          {summary?.last.body ?? 'No messages yet'}
        </T>

        <T size={12} color={C.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>
          {listing
            ? `${listing.title} · ${formatPrice(listing.price_cents, listing.currency)}`
            : 'Listing unavailable'}
        </T>
      </View>

      {listing ? (
        <View style={{ width: 40 }}>
          <ListingImage url={coverUrl(listing.images)} width={40} round={radius.sm} />
        </View>
      ) : (
        <View
          style={{
            width: 40,
            aspectRatio: 3 / 4,
            borderRadius: radius.sm,
            backgroundColor: C.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="image" size={14} color={C.textMuted} strokeWidth={1.5} />
        </View>
      )}

      {/* The dot keeps its slot whether or not it shows, so a read row's
          thumbnail lines up with an unread one's. */}
      <View style={{ width: 8, alignItems: 'center' }}>
        {unread && (
          <View
            accessibilityLabel="Unread"
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent }}
          />
        )}
      </View>
    </Tap>
  );
}

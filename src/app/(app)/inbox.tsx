import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, RefreshControl, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { formatPrice } from '@/components/listing-card';
import { Skeleton } from '@/components/skeleton';
import { Button, EmptyState, InlineError, PressableScale, ScreenError, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import {
  type ListingCondition,
  type ListingType,
  type ListingImageRow,
  type ProfileSummary,
} from '@/lib/database.types';
import { coverUrl, fetchConversationSummaries, type MessageRow } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { CANONICAL_LISTING_FILTER, isCanonicalListing } from '@/lib/listing-types';
import { useAuth } from '@/store/auth-store';
import {
  color as C,
  duration,
  elevation,
  radius,
  screenGutter,
  space,
  touch,
} from '@/theme/tokens';

type InboxParticipant = Pick<ProfileSummary, 'id' | 'display_name' | 'avatar_url'>;

type InboxThread = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string | null;
  created_at: string;
  buyer: InboxParticipant | null;
  seller: InboxParticipant | null;
};

type InboxListing = {
  id: string;
  title: string;
  price_cents: number | null;
  currency: string;
  listing_type: ListingType;
  images: ListingImageRow[];
};

type InboxListingQueryRow = InboxListing & { condition: ListingCondition | null };

const INBOX_THREAD_SELECT = `
  id, listing_id, buyer_id, seller_id, last_message_at, created_at,
  buyer:profiles!conversations_buyer_id_fkey ( id, display_name, avatar_url ),
  seller:profiles!conversations_seller_id_fkey ( id, display_name, avatar_url )
`;

async function fetchInboxThreads(): Promise<InboxThread[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(INBOX_THREAD_SELECT)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as unknown as InboxThread[];
}

async function fetchInboxListings(listingIds: readonly string[]): Promise<Map<string, InboxListing>> {
  if (listingIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('listings')
    .select('id, title, price_cents, currency, listing_type, condition, images:listing_images ( storage_path, position )')
    .in('id', [...listingIds])
    .or(CANONICAL_LISTING_FILTER);

  if (error) throw error;
  const rows = (data ?? []) as unknown as InboxListingQueryRow[];
  return new Map(
    rows
      .filter((row) => isCanonicalListing(row.listing_type, row.condition))
      .map(({ condition: _condition, ...listing }) => [listing.id, listing])
  );
}

export default function Inbox() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const gutter = screenGutter(width);
  const { status, user } = useAuth();
  const signedIn = status === 'signedIn';
  const authLoading = status === 'loading';

  const threads = useAsync(
    async () => (signedIn ? fetchInboxThreads() : []),
    `inbox-conversations:${signedIn}`
  );
  const summaries = useAsync(
    async () => (signedIn ? fetchConversationSummaries() : new Map()),
    `inbox-message-summaries:${signedIn}`
  );

  const list = threads.data ?? [];
  const listingIds = [...new Set(list.map((thread) => thread.listing_id))].sort();
  const listingKey = listingIds.join(',');
  const listings = useAsync(
    async () => (signedIn ? fetchInboxListings(listingIds) : new Map()),
    `inbox-listings:${signedIn}:${listingKey}`
  );

  const totalUnread = useMemo(
    () => [...(summaries.data?.values() ?? [])].reduce((total, summary) => total + summary.unread, 0),
    [summaries.data]
  );

  const refresh = () => {
    threads.refresh();
    summaries.refresh();
    listings.refresh();
  };

  const refreshing = threads.refreshing || summaries.refreshing || listings.refreshing;
  const hasRetainedError = list.length > 0 && Boolean(threads.error || summaries.error || listings.error);
  const showConversationHeading = signedIn && !threads.loading && list.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View
        style={{
          paddingTop: insets.top + space.space16,
          paddingHorizontal: gutter,
          paddingBottom: space.space20,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space12 }}>
          <T variant="screenTitle" accessibilityRole="header" style={{ flex: 1 }}>
            Inbox
          </T>
          {signedIn && !summaries.loading && totalUnread > 0 ? (
            <View
              accessibilityLabel={`${totalUnread} unread ${totalUnread === 1 ? 'message' : 'messages'}`}
              style={{
                minHeight: 32,
                borderRadius: radius.radiusPill,
                backgroundColor: C.primarySoft,
                paddingHorizontal: space.space12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <T variant="metadataMedium" color={C.primary}>
                {totalUnread} unread
              </T>
            </View>
          ) : null}
        </View>
        <T variant="body" color={C.textSecondary} style={{ marginTop: space.space4 }}>
          Your product conversations, all in one place.
        </T>
      </View>

      {showConversationHeading ? (
        <View
          style={{
            paddingHorizontal: gutter,
            paddingBottom: space.space12,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <T variant="sectionTitle" accessibilityRole="header" style={{ flex: 1 }}>
            Messages
          </T>
          {!summaries.loading && totalUnread === 0 ? (
            <T variant="metadata" color={C.textSecondary}>
              All caught up
            </T>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={signedIn ? list : []}
        keyExtractor={(thread) => thread.id}
        renderItem={({ item }) => (
          <ConversationCard
            thread={item}
            me={user?.id ?? null}
            summary={summaries.data?.get(item.id)}
            summaryLoading={summaries.loading}
            listing={listings.data?.get(item.listing_id)}
            listingLoading={listings.loading}
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.space12 }} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: list.length === 0 ? 1 : undefined,
          paddingHorizontal: gutter,
          paddingBottom: navClearance,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={C.textSecondary}
            colors={[C.primary]}
          />
        }
        ListHeaderComponent={
          signedIn && hasRetainedError ? (
            <View style={{ gap: space.space8, paddingBottom: space.space12 }}>
              {threads.error ? (
                <InlineError
                  message="Conversations could not be refreshed."
                  actionLabel="Retry"
                  onAction={threads.refresh}
                />
              ) : null}
              {summaries.error ? (
                <InlineError
                  message="Message previews could not be refreshed."
                  actionLabel="Retry"
                  onAction={summaries.refresh}
                />
              ) : null}
              {listings.error ? (
                <InlineError
                  message="Product details could not be refreshed."
                  actionLabel="Retry"
                  onAction={listings.refresh}
                />
              ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          authLoading ? (
            <ConversationListSkeleton />
          ) : !signedIn ? (
            <InboxStateCard>
              <EmptyState
                icon="person"
                title="Sign in to see your messages"
                body="Your conversations are securely connected to your account."
                action={<Button label="Sign in" onPress={() => router.push('/sign-in')} style={{ marginTop: space.space20 }} />}
              />
            </InboxStateCard>
          ) : threads.loading ? (
            <ConversationListSkeleton />
          ) : threads.error ? (
            <InboxStateCard>
              <ScreenError error={threads.error} title="Could not load your messages" onRetry={threads.refetch} />
            </InboxStateCard>
          ) : (
            <InboxEmptyState onBrowse={() => router.push('/explore')} />
          )
        }
      />
    </View>
  );
}

function ConversationCard({
  thread,
  me,
  summary,
  summaryLoading,
  listing,
  listingLoading,
  onPress,
}: {
  thread: InboxThread;
  me: string | null;
  summary?: { last: MessageRow; unread: number };
  summaryLoading: boolean;
  listing?: InboxListing;
  listingLoading: boolean;
  onPress: () => void;
}) {
  const other = me === thread.buyer_id ? thread.seller : thread.buyer;
  const name = other?.display_name.trim() || 'Member unavailable';
  const unreadCount = summary?.unread ?? 0;
  const unread = unreadCount > 0;
  const stamp = summary?.last.created_at ?? thread.last_message_at ?? thread.created_at;
  const price = listing
    ? listing.price_cents == null
      ? listing.listing_type === 'job' ? 'Job opportunity' : 'Service'
      : formatPrice(listing.price_cents, listing.currency)
    : null;
  const noMessages = thread.last_message_at === null && !summary;
  const sentByMe = summary?.last.sender_id === me;
  const preview = summary ? `${sentByMe ? 'You: ' : ''}${summary.last.body}` : noMessages ? 'Start the conversation' : null;
  const accessibilityLabel = [
    `Conversation with ${name}`,
    unread ? `${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}` : null,
    summary ? `Latest message: ${summary.last.body}` : noMessages ? 'No messages yet' : null,
    listing && price ? `Product: ${listing.title}, ${price}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <PressableScale
      onPress={onPress}
      scale={0.985}
      motionRole="cardPress"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens this conversation"
      style={{
        minHeight: 116,
        borderRadius: radius.radiusXLarge,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: unread ? C.primary : C.border,
        backgroundColor: unread ? C.primarySoft : C.surface,
        padding: space.space12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.space12,
        ...elevation.raised,
      }}
    >
      <AvatarWithUnread participant={other} unreadCount={unreadCount} />

      <View style={{ minWidth: 0, flex: 1, paddingVertical: space.space4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space8 }}>
          <T variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>
            {name}
          </T>
          <T variant="caption" color={C.textSecondary} style={{ fontVariant: ['tabular-nums'] }}>
            {whenLabel(stamp)}
          </T>
        </View>

        {summaryLoading && !summary ? (
          <View style={{ paddingTop: space.space12 }}>
            <Skeleton width="76%" height={12} />
          </View>
        ) : preview ? (
          <T
            variant={unread ? 'metadataMedium' : 'metadata'}
            color={unread ? C.textPrimary : C.textSecondary}
            numberOfLines={2}
            style={{ marginTop: space.space8 }}
          >
            {preview}
          </T>
        ) : null}

        {listing && price ? (
          <View style={{ marginTop: space.space12, flexDirection: 'row', alignItems: 'center', gap: space.space8 }}>
            <Icon name="bag" role="metadata" color={C.textSecondary} decorative />
            <T variant="caption" color={C.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
              {listing.title}
            </T>
            <T variant="metadataMedium" numberOfLines={1}>
              {price}
            </T>
          </View>
        ) : null}
      </View>

      {listingLoading && !listing ? (
        <Skeleton width={58} height={76} round={radius.radiusMedium} />
      ) : listing ? (
        <ListingPreview listing={listing} />
      ) : (
        <View
          accessible={false}
          style={{
            width: 32,
            height: touch.minimum,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="chevronRight" role="inline" color={C.textSecondary} decorative />
        </View>
      )}
    </PressableScale>
  );
}

function AvatarWithUnread({
  participant,
  unreadCount,
}: {
  participant: InboxParticipant | null;
  unreadCount: number;
}) {
  return (
    <View accessible={false} style={{ width: 52, height: 56 }}>
      <ParticipantAvatar participant={participant} />
      {unreadCount > 0 ? (
        <View
          style={{
            position: 'absolute',
            right: -2,
            bottom: 0,
            minWidth: 22,
            height: 22,
            paddingHorizontal: space.space4,
            borderRadius: radius.radiusPill,
            borderWidth: 2,
            borderColor: C.surface,
            backgroundColor: C.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T variant="caption" style={{ color: C.textPrimary, fontSize: 10, lineHeight: 12 }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </T>
        </View>
      ) : null}
    </View>
  );
}

function ParticipantAvatar({ participant }: { participant: InboxParticipant | null }) {
  const name = participant?.display_name.trim() ?? '';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      accessible={false}
      style={{
        width: 50,
        height: 50,
        borderRadius: radius.radiusPill,
        backgroundColor: C.primary,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {initials ? (
        <T variant="metadataMedium" color={C.textInverse}>
          {initials}
        </T>
      ) : (
        <Icon name="person" role="inline" color={C.textInverse} decorative />
      )}
      {participant?.avatar_url ? (
        <Image
          source={{ uri: participant.avatar_url }}
          style={{ position: 'absolute', inset: 0 }}
          contentFit="cover"
          transition={duration.standard}
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : null}
    </View>
  );
}

function ListingPreview({ listing }: { listing: InboxListing }) {
  const imageUrl = coverUrl(listing.images);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${listing.title} product photo`}
      style={{
        width: 58,
        height: 76,
        borderRadius: radius.radiusMedium,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%', backgroundColor: C.surface }}
          contentFit="contain"
          transition={duration.standard}
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : (
        <Icon name="image" role="inline" color={C.textSecondary} decorative />
      )}
    </View>
  );
}

function ConversationListSkeleton() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading conversations" style={{ gap: space.space12 }}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={{
            minHeight: 116,
            borderRadius: radius.radiusXLarge,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
            padding: space.space12,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: space.space12,
          }}
        >
          <Skeleton width={50} height={50} round={radius.radiusPill} />
          <View style={{ flex: 1, gap: space.space8, paddingTop: space.space4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.space12 }}>
              <Skeleton width={index % 2 === 0 ? '46%' : '58%'} height={15} />
              <Skeleton width={36} height={10} />
            </View>
            <Skeleton width={index % 2 === 0 ? '78%' : '64%'} height={11} />
            <Skeleton width="54%" height={10} style={{ marginTop: space.space8 }} />
          </View>
          <Skeleton width={58} height={76} round={radius.radiusMedium} />
        </View>
      ))}
    </View>
  );
}

function InboxStateCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: 360,
        borderRadius: radius.radiusXLarge,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.bgMuted,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: space.space32,
      }}
    >
      {children}
    </View>
  );
}

function InboxEmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <InboxStateCard>
      <EmptyState
        icon="chat"
        title="No messages yet"
        body="When you contact a seller or a buyer messages you, the conversation will appear here."
        action={<Button label="Browse products" variant="secondary" onPress={onBrowse} style={{ marginTop: space.space20 }} />}
      />
    </InboxStateCard>
  );
}

/** 14:08 today, “Yesterday”, a weekday this week, otherwise a short date. */
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

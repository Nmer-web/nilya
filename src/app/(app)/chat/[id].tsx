import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrostedBar } from '@/components/frosted-bar';
import { Icon } from '@/components/icon';
import { ListingImage, formatPrice } from '@/components/listing-card';
import { FadeIn, Skeleton } from '@/components/skeleton';
import { Avatar, Button, EmptyState, PressableScale, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useConversation } from '@/hooks/use-conversation';
import { markConversationRead, sendMessage } from '@/lib/mutations';
import { coverUrl, fetchConversation, type ConversationRow } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space } from '@/theme/tokens';

/**
 * One conversation.
 *
 * Everything on the screen is a row: the participants come from `profiles`, the
 * item from `listings`, the transcript from `messages`. Which side a bubble
 * falls on is decided by comparing `sender_id` with the session's user — not by
 * a flag the client sets when it happens to be the one sending.
 */
export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const thread = useAsync(() => fetchConversation(id), `conversation:${id}`);
  const { messages, loading, error, live, retry, append } = useConversation(id);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);

  const conversation = thread.data;
  const me = user?.id ?? null;
  /* The other participant is whichever of the two is not the signed-in user. */
  const other = conversation
    ? me === conversation.buyer_id
      ? conversation.seller
      : conversation.buyer
    : null;

  /* Arriving at a thread is what marks it read; failure is not worth a banner. */
  useEffect(() => {
    if (!conversation) return;
    void markConversationRead(id).catch(() => {});
  }, [conversation, id]);

  useEffect(() => {
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages.length]);

  const canSend = draft.trim().length > 0 && !sending;

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setSendError(null);
    /* Cleared up front so a fast second message is not typed into stale text;
       restored below if the write is refused. */
    setDraft('');

    try {
      append(await sendMessage(id, text));
    } catch (e) {
      setDraft(text);
      setSendError(e instanceof Error ? e.message : 'Message not sent');
    } finally {
      setSending(false);
    }
  };

  if (thread.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top + 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, padding: space.gutter }}>
          <Skeleton width={34} height={34} round={17} />
          <Skeleton width="46%" height={16} style={{ marginTop: 8 }} />
        </View>
        <View style={{ padding: space.gutter, gap: 10 }}>
          <Skeleton width="62%" height={44} round={18} />
          <Skeleton width="44%" height={44} round={18} />
          <Skeleton width="70%" height={44} round={18} />
        </View>
      </View>
    );
  }

  if (thread.error || !conversation) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top }}>
        <Header onBack={() => router.back()} />
        <EmptyState
          icon="chat"
          title={thread.error ? 'Could not open this conversation' : 'Conversation unavailable'}
          body={
            thread.error
              ? thread.error.message
              : 'It may have been removed, or it is not yours to read.'
          }
          style={{ paddingVertical: 44 }}
          action={
            thread.error ? (
              <Button
                label="Try again"
                height={44}
                size={14}
                onPress={thread.refetch}
                style={{ marginTop: 18 }}
              />
            ) : undefined
          }
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        onBack={() => router.back()}
        name={other?.display_name}
        avatarUrl={other?.avatar_url ?? null}
        verified={other?.is_verified}
        onPressName={
          other ? () => router.push({ pathname: '/seller/[id]', params: { id: other.id } }) : undefined
        }
      />

      <ListingStrip conversation={conversation} />

      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        contentContainerStyle={{ padding: space.gutter, paddingBottom: 8 }}
      >
        {loading ? (
          <View style={{ gap: 10 }}>
            <Skeleton width="58%" height={44} round={18} />
            <Skeleton width="42%" height={44} round={18} />
          </View>
        ) : error ? (
          <EmptyState
            icon="close"
            title="Could not load messages"
            body={error.message}
            style={{ paddingVertical: 32 }}
            action={<Button label="Try again" height={44} size={14} onPress={retry} style={{ marginTop: 18 }} />}
          />
        ) : messages.length === 0 ? (
          <EmptyState
            icon="chat"
            title="No messages yet"
            body={`Say hello to ${other?.display_name ?? 'them'} — ask about condition, size or collection.`}
            style={{ paddingVertical: 40 }}
          />
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === me;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const startsRun = !prev || prev.sender_id !== m.sender_id;
            const endsRun = !next || next.sender_id !== m.sender_id;

            return (
              /*
               * Keyed by message id, so a bubble animates when it first
               * arrives and not again when the list around it changes.
               * Runs from one sender group together: 2pt apart, and only the
               * last of a run gets the pointed corner, so a three-line reply
               * does not read as three separate arrivals.
               */
              <FadeIn key={m.id} y={6} duration={200} style={{ marginTop: startsRun && i > 0 ? 8 : 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <View
                    style={{
                      maxWidth: '76%',
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      backgroundColor: mine ? C.bubbleOut : C.bubbleIn,
                      borderTopLeftRadius: 18,
                      borderTopRightRadius: 18,
                      borderBottomLeftRadius: mine || !endsRun ? 18 : 5,
                      borderBottomRightRadius: mine && endsRun ? 5 : 18,
                    }}
                  >
                    <T size={14.5} lh={20.3} color={mine ? C.primaryText : C.text}>
                      {m.body}
                    </T>
                  </View>
                </View>
              </FadeIn>
            );
          })
        )}
      </ScrollView>

      {/* Only shown once the history has loaded, so a normal open does not
          flash "reconnecting" during the first subscribe. */}
      {!loading && !live && (
        <T size={11.5} color={C.textMuted} style={{ textAlign: 'center', paddingBottom: 6 }}>
          Reconnecting…
        </T>
      )}

      {!!sendError && (
        <T size={12} color={C.error} style={{ textAlign: 'center', paddingBottom: 6 }}>
          {sendError}
        </T>
      )}

      <FrostedBar
        edge="top"
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 8,
          paddingHorizontal: 12,
          paddingTop: 9,
          paddingBottom: Math.max(insets.bottom, 10),
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message…"
          placeholderTextColor={C.textSecondary}
          multiline
          editable={!sending}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 38,
            maxHeight: 108,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
            paddingHorizontal: 15,
            paddingTop: Platform.OS === 'ios' ? 10 : 8,
            paddingBottom: Platform.OS === 'ios' ? 10 : 8,
            fontSize: 14.5,
            lineHeight: 19,
            color: C.text,
          }}
        />

        <PressableScale
          scale={0.94}
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={sending ? 'Sending' : 'Send message'}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: canSend ? C.text : C.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="send" size={17} color={canSend ? C.primaryText : C.textMuted} />
        </PressableScale>
      </FrostedBar>
    </KeyboardAvoidingView>
  );
}

function Header({
  onBack,
  name,
  avatarUrl,
  verified,
  onPressName,
}: {
  onBack: () => void;
  name?: string;
  avatarUrl?: string | null;
  verified?: boolean;
  onPressName?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const initials = (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <FrostedBar
      edge="bottom"
      style={{
        paddingTop: insets.top,
        paddingBottom: 10,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Tap
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
        style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevronLeft" size={20} color={C.text} strokeWidth={2} />
      </Tap>

      {!!name && (
        <Tap
          onPress={onPressName}
          accessibilityRole="button"
          accessibilityLabel={`View ${name}'s profile`}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44 }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 34, height: 34, borderRadius: 17 }}
              contentFit="cover"
              transition={200}
              accessible={false}
            />
          ) : (
            <Avatar initials={initials} bg={C.text} size={34} fontSize={13} />
          )}
          <T w={600} size={15} numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </T>
          {verified && <Icon name="badgeCheck" size={14} color={C.success} />}
        </Tap>
      )}
      {!name && <View style={{ flex: 1 }} />}
    </FrostedBar>
  );
}

/**
 * The item the conversation is about.
 *
 * A conversation cannot exist without a listing — `listing_id` is NOT NULL —
 * but the row can be removed underneath it, and `listings` is readable only
 * while visible. Either way the thread survives and says so rather than
 * showing a placeholder item.
 */
function ListingStrip({ conversation }: { conversation: ConversationRow }) {
  const router = useRouter();
  const listing = conversation.listing;

  if (!listing) {
    return (
      <View
        style={{
          paddingVertical: 10,
          paddingHorizontal: space.gutter,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <T size={13} color={C.textSecondary}>
          Listing unavailable
        </T>
      </View>
    );
  }

  return (
    <Tap
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
      accessibilityRole="button"
      accessibilityLabel={`View ${listing.title}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingVertical: 10,
        paddingHorizontal: space.gutter,
        backgroundColor: C.surface,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      <View style={{ width: 40 }}>
        <ListingImage url={coverUrl(listing.images)} width={40} round={radius.sm} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <T w={500} size={13.5} numberOfLines={1}>
          {listing.title}
        </T>
        <T w={700} size={15} style={{ marginTop: 1 }}>
          {formatPrice(listing.price_cents, listing.currency)}
        </T>
      </View>

      <Icon name="chevronRight" size={17} color={C.textMuted} strokeWidth={1.9} />
    </Tap>
  );
}

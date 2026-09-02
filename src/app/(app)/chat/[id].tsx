import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { formatPrice } from '@/components/listing-card';
import { OfferCard } from '@/components/offer-card';
import { Scrim, Sheet, SheetClose, SheetGrabber } from '@/components/sheet';
import { FadeIn, MessageSkeleton, Skeleton } from '@/components/skeleton';
import { Button, EmptyState, InlineError, PressableScale, ScreenError, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useConversation } from '@/hooks/use-conversation';
import { useGoBack } from '@/hooks/use-go-back';
import { NEW_CONDITION } from '@/lib/database.types';
import { retryableReadMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { createOffer, markConversationRead, sendMessage } from '@/lib/mutations';
import { coverUrl, fetchOffers, type ConversationRow, type MessageRow, type OfferRow } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth-store';
import { color as C, duration, space } from '@/theme/tokens';

type ChatConversationBase = Omit<ConversationRow, 'listing'>;
type ChatListing = NonNullable<ConversationRow['listing']>;
type ChatListingQueryRow = ChatListing & { condition: string };
type OfferSheetPhase = 'closed' | 'open' | 'closing';

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

const CHAT_CONVERSATION_SELECT = `
  id, listing_id, buyer_id, seller_id, last_message_at, created_at,
  buyer:profiles!conversations_buyer_id_fkey ( id, display_name, avatar_url, is_verified, rating_avg, rating_count, lifetime_sales ),
  seller:profiles!conversations_seller_id_fkey ( id, display_name, avatar_url, is_verified, rating_avg, rating_count, lifetime_sales )
`;

async function fetchChatConversation(id: string): Promise<ConversationRow | null> {
  const conversationResult = await supabase
    .from('conversations')
    .select(CHAT_CONVERSATION_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (conversationResult.error) throw conversationResult.error;
  if (!conversationResult.data) return null;

  const conversation = conversationResult.data as unknown as ChatConversationBase;
  const listingResult = await supabase
    .from('listings')
    .select('id, title, price_cents, currency, status, condition, images:listing_images ( storage_path, position )')
    .eq('id', conversation.listing_id)
    .eq('condition', NEW_CONDITION)
    .maybeSingle();

  if (listingResult.error) throw listingResult.error;
  const listingRow = listingResult.data as unknown as ChatListingQueryRow | null;
  const listing = listingRow?.condition === NEW_CONDITION
    ? (({ condition: _condition, ...row }) => row)(listingRow)
    : null;

  return { ...conversation, listing };
}

export default function ConversationRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const conversationId = conversationIdFromParam(id);

  if (!conversationId) return <ConversationUnavailable />;

  return <Conversation key={conversationId} id={conversationId} />;
}

function Conversation({ id }: { id: string }) {
  const router = useRouter();
  const goBack = useGoBack('/inbox');
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const thread = useAsync(() => fetchChatConversation(id), `conversation:${id}`);
  const { messages, loading, error, live, retry, append } = useConversation(id);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const mounted = useRef(true);
  const sendingRef = useRef(false);
  const offeringRef = useRef(false);

  const offers = useAsync(() => fetchOffers(id), `offers:${id}`);
  const refreshOffers = offers.refresh;
  const [offerSheetPhase, setOfferSheetPhase] = useState<OfferSheetPhase>('closed');
  const [offerDraft, setOfferDraft] = useState('');
  const [offering, setOffering] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  const conversation = thread.data;
  const me = user?.id ?? null;
  const other = conversation
    ? me === conversation.buyer_id
      ? conversation.seller
      : conversation.buyer
    : null;
  const unreadSignature = messages
    .filter((message) => message.sender_id !== me && message.read_at === null)
    .map((message) => message.id)
    .join(',');

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!conversation || !me || !unreadSignature) return;
    void markConversationRead(id).catch(() => {});
  }, [conversation, id, me, unreadSignature]);

  useEffect(() => {
    if (!conversation?.id || !conversation.listing || !me) return;

    const channel = supabase
      .channel(`offers:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => refreshOffers()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversation?.id, conversation?.listing, me, refreshOffers]);

  const canSend = draft.trim().length > 0 && !sending;
  const parsedOffer = parseOfferAmount(offerDraft);

  const closeOfferSheet = useCallback(() => {
    if (!offering) {
      Keyboard.dismiss();
      setOfferSheetPhase('closing');
    }
  }, [offering]);

  const finishOfferSheetClose = useCallback(() => {
    setOfferSheetPhase('closed');
    setOfferDraft('');
    setOfferError(null);
  }, []);

  const submitOffer = async () => {
    if (parsedOffer.amountCents === null || offeringRef.current) return;
    offeringRef.current = true;
    setOffering(true);
    setOfferError(null);
    try {
      await createOffer(id, parsedOffer.amountCents);
      if (!mounted.current) return;
      haptic('offer-sent');
      Keyboard.dismiss();
      offers.refresh();
      setOfferSheetPhase('closing');
    } catch (caught) {
      if (mounted.current) {
        setOfferError(retryableReadMessage(caught, 'The offer could not be sent.'));
      }
    } finally {
      offeringRef.current = false;
      if (mounted.current) setOffering(false);
    }
  };

  const liveOffer = conversation?.listing
    ? (offers.data ?? []).find((offer) => offer.state === 'open' || offer.state === 'countered')
    : undefined;
  const acceptedOffer = conversation?.listing
    ? (offers.data ?? []).find((offer) => offer.state === 'accepted')
    : undefined;

  const send = async () => {
    const text = draft.trim();
    if (!text || sendingRef.current) return;

    sendingRef.current = true;
    setSending(true);
    setSendError(null);
    try {
      const inserted = await sendMessage(id, text);
      if (!mounted.current) return;
      append(inserted);
      setDraft('');
    } catch (caught) {
      if (mounted.current) {
        setSendError(retryableReadMessage(caught, 'The message could not be sent.'));
      }
    } finally {
      sendingRef.current = false;
      if (mounted.current) setSending(false);
    }
  };

  if (thread.loading) {
    return <ChatLoading />;
  }

  if (thread.error || !conversation) {
    return (
      <View className="flex-1 bg-nilya-background">
        <ChatHeader onBack={goBack} />
        {thread.error ? (
          <ScreenError error={thread.error} title="Could not open this conversation" onRetry={thread.refetch} />
        ) : (
          <EmptyState
            icon="chat"
            title="Conversation unavailable"
            body="It may have been removed, or it is not yours to read."
          />
        )}
      </View>
    );
  }

  const participantName = other?.display_name ?? 'Member unavailable';
  const menuListingId = conversation.listing?.id;
  const offerCurrency = conversation.listing?.currency;
  const canMakeOffer = !!conversation.listing
    && conversation.listing.status === 'active'
    && me === conversation.buyer_id
    && conversation.buyer_id !== conversation.seller_id
    && !liveOffer
    && !acceptedOffer
    && !offers.loading
    && !offers.error;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-nilya-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ChatHeader
        onBack={goBack}
        name={participantName}
        verified={other?.is_verified}
        onMore={other || conversation.listing ? () => setMenuOpen(true) : undefined}
      />

      <ListingContext conversation={conversation} />

      {loading ? (
        <View className="flex-1 px-4 py-4">
          <MessageSkeleton />
        </View>
      ) : error ? (
        <View className="flex-1">
          <ScreenError error={error} title="Could not load messages" onRetry={retry} />
        </View>
      ) : (
        <ChatTranscript
          messages={messages}
          me={me}
          otherName={participantName}
          offers={conversation.listing ? (offers.data ?? []) : []}
          offersError={conversation.listing ? offers.error : null}
          offerCurrency={conversation.listing?.currency}
          onRetryOffers={offers.refetch}
        />
      )}

      {!loading && !live && (
        <Text accessibilityLiveRegion="polite" className="pb-2 text-center text-xs text-nilya-secondary">
          Reconnecting…
        </Text>
      )}

      {!!sendError && (
        <View className="px-3 pb-2">
          <InlineError message={sendError} />
        </View>
      )}

      {canMakeOffer && !!offerCurrency && (
        <View className="px-3 pb-2">
          <PressableScale
            onPress={() => {
              setOfferError(null);
              setOfferSheetPhase('open');
            }}
            accessibilityRole="button"
            accessibilityLabel="Make an offer"
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-nilya-primary bg-nilya-surface px-4"
          >
            <Icon name="offerTicket" size={18} decorative />
            <Text className="text-sm font-semibold text-nilya-primary">Make an offer</Text>
          </PressableScale>
        </View>
      )}

      <View
        className="flex-row items-end gap-2 border-t border-nilya-border bg-nilya-background px-3 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, space.space12) }}
      >
        <TextInput
          value={draft}
          onChangeText={(value) => {
            setDraft(value);
            if (sendError) setSendError(null);
          }}
          placeholder="Message…"
          placeholderTextColor={C.textSecondary}
          selectionColor={C.primary}
          multiline
          maxLength={2000}
          editable={!sending}
          accessibilityLabel="Message"
          accessibilityState={{ disabled: sending }}
          className="min-h-11 max-h-28 min-w-0 flex-1 rounded-2xl bg-nilya-surface px-4 py-3 text-base leading-5 text-nilya-text"
          style={{ textAlignVertical: 'top' }}
        />

        <PressableScale
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend, busy: sending }}
          className={canSend
            ? 'h-11 w-11 items-center justify-center rounded-full bg-nilya-primary'
            : 'h-11 w-11 items-center justify-center rounded-full bg-nilya-surface-2'}
        >
          <Icon name="send" size={19} color={canSend ? C.textInverse : C.textSecondary} decorative />
        </PressableScale>
      </View>

      <ConversationMenu
        visible={menuOpen}
        bottomInset={insets.bottom}
        participantName={other?.display_name}
        listingTitle={conversation.listing?.title}
        onClose={() => setMenuOpen(false)}
        onViewProfile={other ? () => {
          setMenuOpen(false);
          router.push({ pathname: '/seller/[id]', params: { id: other.id } });
        } : undefined}
        onViewListing={menuListingId ? () => {
          setMenuOpen(false);
          router.push({ pathname: '/listing/[id]', params: { id: menuListingId } });
        } : undefined}
      />

      {!!conversation.listing && !!offerCurrency && (
        <OfferSheet
          phase={offerSheetPhase}
          sellerPrice={formatPrice(conversation.listing.price_cents, offerCurrency)}
          currency={offerCurrency}
          value={offerDraft}
          validationError={parsedOffer.error}
          mutationError={offerError}
          sending={offering}
          onChangeValue={setOfferDraft}
          onClose={closeOfferSheet}
          onExited={finishOfferSheetClose}
          onSubmit={submitOffer}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function ConversationUnavailable() {
  const goBack = useGoBack('/inbox');

  return (
    <View className="flex-1 bg-nilya-background">
      <ChatHeader onBack={goBack} />
      <EmptyState
        icon="chat"
        title="Conversation unavailable"
        body="It may have been removed, or it is not yours to read."
      />
    </View>
  );
}

function conversationIdFromParam(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : [value];

  for (const candidate of values) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.trim();
    if (UUID_PATTERN.test(normalized)) return normalized;
  }

  return null;
}

function OfferSheet({
  phase,
  sellerPrice,
  currency,
  value,
  validationError,
  mutationError,
  sending,
  onChangeValue,
  onClose,
  onExited,
  onSubmit,
}: {
  phase: OfferSheetPhase;
  sellerPrice: string;
  currency: string;
  value: string;
  validationError: string | null;
  mutationError: string | null;
  sending: boolean;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  onExited: () => void;
  onSubmit: () => void;
}) {
  const visible = phase !== 'closed';
  const closing = phase === 'closing';
  const canSubmit = value.trim().length > 0 && !validationError && !sending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Scrim closing={closing} onPress={onClose} />
        <Sheet
          closing={closing}
          onExited={onExited}
          accessibilityLabel="Make an offer"
        >
          <SheetGrabber style={{ marginTop: space.space12 }} />
          <View className="px-5 pb-5 pt-3">
            <View className="flex-row items-center gap-3">
              <Text accessibilityRole="header" className="min-w-0 flex-1 text-xl font-bold text-nilya-text">
                Make an offer
              </Text>
              <SheetClose onPress={onClose} />
            </View>

            <View className="mt-6 rounded-xl bg-nilya-surface p-4">
              <Text className="text-sm text-nilya-secondary">Seller price</Text>
              <Text className="mt-1 text-2xl font-bold text-nilya-text">{sellerPrice}</Text>
            </View>

            <Text className="mt-6 text-sm font-semibold text-nilya-text">Your offer</Text>
            <View className="mt-2 h-14 flex-row items-center rounded-xl border border-nilya-border bg-nilya-surface px-4 focus:border-nilya-primary">
              <Text className="mr-2 text-lg font-semibold text-nilya-text">
                {currencySymbol(currency)}
              </Text>
              <TextInput
                value={value}
                onChangeText={onChangeValue}
                placeholder="0.00"
                placeholderTextColor={C.textSecondary}
                selectionColor={C.primary}
                keyboardType="decimal-pad"
                returnKeyType="done"
                editable={!sending}
                autoFocus
                accessibilityLabel={`Your offer in ${currency}`}
                accessibilityState={{ disabled: sending }}
                className="h-full min-w-0 flex-1 p-0 text-lg text-nilya-text"
              />
            </View>

            {!!validationError && value.trim().length > 0 && (
              <Text accessibilityRole="alert" className="mt-2 text-sm text-nilya-error-text">
                {validationError}
              </Text>
            )}

            {!!mutationError && (
              <View className="mt-3">
                <InlineError message={mutationError} />
              </View>
            )}

            <View className="mt-6">
              <Button
                label="Send offer"
                loading={sending}
                loadingLabel="Sending offer..."
                disabled={!canSubmit}
                onPress={onSubmit}
              />
            </View>
          </View>
        </Sheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChatTranscript({
  messages,
  me,
  otherName,
  offers,
  offersError,
  offerCurrency,
  onRetryOffers,
}: {
  messages: MessageRow[];
  me: string | null;
  otherName: string;
  offers: OfferRow[];
  offersError: Error | null;
  offerCurrency?: string;
  onRetryOffers: () => void;
}) {
  const [initialMessageIds] = useState(() => new Set(messages.map((message) => message.id)));
  const scroller = useRef<FlatList<MessageRow>>(null);
  const positionedHistory = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scroller.current?.scrollToEnd({ animated: positionedHistory.current });
      positionedHistory.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages.length]);

  return (
    <FlatList
      ref={scroller}
      data={messages}
      keyExtractor={(message) => message.id}
      renderItem={({ item, index }) => (
        <MessageBubble
          message={item}
          previous={messages[index - 1]}
          next={messages[index + 1]}
          index={index}
          me={me}
          otherName={otherName}
          animateIncoming={item.sender_id !== me && !initialMessageIds.has(item.id)}
        />
      )}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: messages.length === 0 ? 1 : undefined,
        paddingHorizontal: space.space16,
        paddingTop: space.space12,
        paddingBottom: space.space12,
      }}
      ListHeaderComponent={offers.length > 0 && offerCurrency ? (
        <View className="gap-2 pb-4">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              me={me}
              currency={offerCurrency}
              onChanged={onRetryOffers}
            />
          ))}
        </View>
      ) : offersError ? (
        <InlineError
          message={retryableReadMessage(offersError, 'Offers could not be refreshed.')}
          actionLabel="Retry"
          onAction={onRetryOffers}
          style={{ marginBottom: space.space16 }}
        />
      ) : null}
      ListEmptyComponent={<ChatEmptyState />}
    />
  );
}

function ChatHeader({
  onBack,
  name,
  verified,
  onMore,
}: {
  onBack: () => void;
  name?: string;
  verified?: boolean;
  onMore?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-b border-nilya-border bg-nilya-background" style={{ paddingTop: insets.top }}>
      <View className="h-14 flex-row items-center px-3">
        <Tap
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="h-11 w-11 items-center justify-center"
        >
          <Icon name="chevronLeft" role="navigation" decorative />
        </Tap>

        <View className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5 px-2">
          {!!name && (
            <Text accessibilityRole="header" numberOfLines={1} className="max-w-[90%] text-base font-semibold text-nilya-text">
              {name}
            </Text>
          )}
          {verified && <Icon name="badgeCheck" size={16} color={C.textPrimary} decorative />}
        </View>

        {onMore ? (
          <Tap
            onPress={onMore}
            accessibilityRole="button"
            accessibilityLabel="Conversation options"
            className="h-11 w-11 items-center justify-center"
          >
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <Icon name="dotsVertical" role="navigation" decorative />
            </View>
          </Tap>
        ) : (
          <View className="h-11 w-11" />
        )}
      </View>
    </View>
  );
}

function ListingContext({ conversation }: { conversation: ConversationRow }) {
  const router = useRouter();
  const listing = conversation.listing;

  if (!listing) {
    return (
      <View className="min-h-14 justify-center border-b border-nilya-border bg-nilya-background px-5 py-3">
        <Text className="text-sm text-nilya-secondary">Listing unavailable</Text>
      </View>
    );
  }

  const imageUrl = coverUrl(listing.images);
  const price = formatPrice(listing.price_cents, listing.currency);

  return (
    <Tap
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
      accessibilityRole="button"
      accessibilityLabel={`View ${listing.title}, ${price}`}
      className="min-h-16 flex-row items-center gap-3 border-b border-nilya-border bg-nilya-surface px-5 py-3"
    >
      {!!imageUrl && (
        <View accessible={false} className="h-14 w-11 overflow-hidden rounded-lg bg-nilya-surface">
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={duration.standard}
            cachePolicy="memory-disk"
            accessible={false}
          />
        </View>
      )}

      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-medium text-nilya-text">
          {listing.title}
        </Text>
        <Text className="mt-1 text-sm font-bold text-nilya-text">{price}</Text>
      </View>
      <Icon name="chevronRight" size={18} color={C.textSecondary} decorative />
    </Tap>
  );
}

function MessageBubble({
  message,
  previous,
  next,
  index,
  me,
  otherName,
  animateIncoming,
}: {
  message: MessageRow;
  previous?: MessageRow;
  next?: MessageRow;
  index: number;
  me: string | null;
  otherName: string;
  animateIncoming: boolean;
}) {
  const mine = message.sender_id === me;
  const startsRun = !previous || previous.sender_id !== message.sender_id;
  const endsRun = !next || next.sender_id !== message.sender_id;
  const timestamp = messageTimeLabel(message.created_at);
  const content = (
    <View className={startsRun && index > 0 ? 'mt-3' : 'mt-1'}>
      <View className={mine ? 'flex-row justify-end' : 'flex-row justify-start'}>
        <View
          accessible
          accessibilityLabel={`${mine ? 'You' : otherName}: ${message.body}. ${timestamp}`}
          className={mine
            ? `max-w-[78%] rounded-2xl bg-nilya-primary px-3.5 py-2.5 ${endsRun ? 'rounded-br-md' : ''}`
            : `max-w-[78%] rounded-2xl bg-nilya-surface-2 px-3.5 py-2.5 ${endsRun ? 'rounded-bl-md' : ''}`}
        >
          <Text selectable className={mine ? 'text-base leading-5 text-nilya-inverse' : 'text-base leading-5 text-nilya-text'}>
            {message.body}
          </Text>
        </View>
      </View>
      {endsRun && (
        <Text className={mine ? 'mt-1 text-right text-[11px] text-nilya-secondary' : 'mt-1 text-left text-[11px] text-nilya-secondary'}>
          {timestamp}
        </Text>
      )}
    </View>
  );

  return animateIncoming ? (
    <FadeIn y={6} duration={duration.fast}>
      {content}
    </FadeIn>
  ) : content;
}

function ChatEmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-nilya-surface">
        <Icon name="chat" size={24} decorative />
      </View>
      <Text accessibilityRole="header" className="mt-4 text-center text-lg font-semibold text-nilya-text">
        No messages yet
      </Text>
      <Text className="mt-2 text-center text-sm leading-5 text-nilya-secondary">
        Send the first message to start this conversation.
      </Text>
    </View>
  );
}

function ChatLoading() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-nilya-background" style={{ paddingTop: insets.top }} accessibilityRole="progressbar" accessibilityLabel="Loading conversation">
      <View className="h-14 flex-row items-center gap-4 border-b border-nilya-border px-4">
        <Skeleton width={32} height={32} round={16} />
        <Skeleton width="42%" height={16} />
      </View>
      <View className="h-20 flex-row items-center gap-3 border-b border-nilya-border px-5">
        <Skeleton width={44} height={56} round={8} />
        <View className="flex-1 gap-2">
          <Skeleton width="62%" height={12} />
          <Skeleton width="28%" height={12} />
        </View>
      </View>
      <View className="gap-3 px-4 py-5">
        <Skeleton width="62%" height={42} round={16} />
        <Skeleton width="44%" height={42} round={16} style={{ alignSelf: 'flex-end' }} />
        <Skeleton width="70%" height={42} round={16} />
      </View>
    </View>
  );
}

function ConversationMenu({
  visible,
  bottomInset,
  participantName,
  listingTitle,
  onClose,
  onViewProfile,
  onViewListing,
}: {
  visible: boolean;
  bottomInset: number;
  participantName?: string;
  listingTitle?: string;
  onClose: () => void;
  onViewProfile?: () => void;
  onViewListing?: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close conversation options"
          onPress={onClose}
          className="absolute inset-0 bg-nilya-primary-dark/40"
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel="Conversation options"
          className="rounded-t-2xl bg-nilya-background px-5 pt-3"
          style={{ paddingBottom: Math.max(bottomInset, space.space16) }}
        >
          <View accessible={false} className="mb-3 h-1 w-10 self-center rounded-full bg-nilya-border" />
          <Text accessibilityRole="header" className="pb-3 text-lg font-semibold text-nilya-text">
            Conversation
          </Text>
          {!!onViewProfile && (
            <Tap
              onPress={onViewProfile}
              accessibilityRole="button"
              accessibilityLabel={`View ${participantName ?? 'participant'} profile`}
              className="min-h-14 flex-row items-center gap-3 border-t border-nilya-border"
            >
              <Icon name="person" size={20} decorative />
              <Text className="flex-1 text-base font-medium text-nilya-primary">View profile</Text>
              <Icon name="chevronRight" size={18} color={C.textSecondary} decorative />
            </Tap>
          )}
          {!!onViewListing && (
            <Tap
              onPress={onViewListing}
              accessibilityRole="button"
              accessibilityLabel={`View ${listingTitle ?? 'product'}`}
              className="min-h-14 flex-row items-center gap-3 border-t border-nilya-border"
            >
              <Icon name="image" size={20} decorative />
              <Text className="flex-1 text-base font-medium text-nilya-primary">View product</Text>
              <Icon name="chevronRight" size={18} color={C.textSecondary} decorative />
            </Tap>
          )}
          <Tap
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            className="min-h-14 items-center justify-center border-t border-nilya-border"
          >
            <Text className="text-base font-semibold text-nilya-primary">Cancel</Text>
          </Tap>
        </View>
      </View>
    </Modal>
  );
}

function messageTimeLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return time;
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${time}`;
}

function parseOfferAmount(value: string): { amountCents: number | null; error: string | null } {
  const input = value.trim();
  if (!input) return { amountCents: null, error: null };

  const normalized = input.replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) {
    return { amountCents: null, error: 'Use a valid amount with up to 2 decimal places.' };
  }

  const [whole, fraction = ''] = normalized.split('.');
  const amountCents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amountCents)) {
    return { amountCents: null, error: 'That amount is too large.' };
  }
  if (amountCents <= 0) {
    return { amountCents: null, error: 'Offer must be above zero.' };
  }

  return { amountCents, error: null };
}

function currencySymbol(currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase();

  if (!normalizedCurrency) {
    return currency;
  }

  return formatPrice(0, normalizedCurrency).replace(/0(?:\.00)?$/, '').trim() || normalizedCurrency;
}

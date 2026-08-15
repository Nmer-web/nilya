import { useCallback, useEffect, useRef, useState } from 'react';

import { toError } from '@/lib/errors';
import { fetchMessages, type MessageRow } from '@/lib/queries';
import { supabase } from '@/lib/supabase';

type ConversationState = {
  messages: MessageRow[];
  loading: boolean;
  error: Error | null;
  /** True once the realtime channel is subscribed and delivering. */
  live: boolean;
  retry: () => void;
  /** Adds a message optimistically; the realtime echo is deduplicated. */
  append: (message: MessageRow) => void;
};

/**
 * A thread's messages, kept current by Supabase Realtime.
 *
 * The history is fetched once and then extended by INSERT events on `messages`
 * filtered server-side to this `conversation_id`, so the client is not handed
 * every message in the database and asked to discard most of them. Realtime
 * evaluates RLS per subscriber, so a thread the user is not a participant in
 * delivers nothing — the filter narrows what is relevant, the policy decides
 * what is permitted.
 *
 * Two things this has to get right, both of which are easy to get wrong:
 *
 * Exactly one channel per conversation. The effect keys on `conversationId`
 * alone, so a re-render cannot open a second subscription, and its cleanup
 * removes the channel before the next one is created. A channel left behind on
 * unmount keeps receiving and writing state into a dead screen.
 *
 * Insert-by-id, never append-blind. The sender already has their own message
 * locally, and Postgres echoes it back over the same channel; a reconnect can
 * also replay. Merging on the primary key makes both harmless.
 */
export function useConversation(conversationId: string): ConversationState {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  /**
   * Which conversation the socket is currently subscribed for, rather than a
   * bare boolean. `live` is then a comparison, so switching threads reads as
   * "not yet live" without the effect having to reset a flag on the way in —
   * a synchronous setState in an effect body is exactly the cascading render
   * the compiler rejects.
   */
  const [liveFor, setLiveFor] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  /** Merge by id, keeping the list in send order. */
  const merge = useCallback((incoming: MessageRow[]) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, []);

  /* History. */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const rows = await fetchMessages(conversationId);
        if (cancelled) return;
        setMessages(rows);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(toError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, nonce]);

  /* Live tail. */
  const mergeRef = useRef(merge);
  useEffect(() => {
    mergeRef.current = merge;
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => mergeRef.current([payload.new as MessageRow])
      )
      .subscribe((status) => {
        /*
         * Only SUBSCRIBED means messages are actually arriving. The other
         * states are reported so the screen can say the thread is reconnecting
         * rather than quietly showing a list that has stopped updating. This
         * runs as a callback from the socket, not during render.
         */
        setLiveFor(status === 'SUBSCRIBED' ? conversationId : null);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return {
    messages,
    loading,
    error,
    live: liveFor === conversationId,
    retry: useCallback(() => {
      setLoading(true);
      setNonce((n) => n + 1);
    }, []),
    append: useCallback((message: MessageRow) => merge([message]), [merge]),
  };
}

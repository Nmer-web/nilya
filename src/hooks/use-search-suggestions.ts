import { useCallback, useEffect, useRef, useState } from 'react';

import { toError } from '@/lib/errors';
import { fetchSearchSuggestions, type SearchSuggestions } from '@/lib/queries';

type SearchSuggestionState = {
  data: SearchSuggestions | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
};

/**
 * Debounced search suggestions with transport cancellation and latest-query
 * identity. Aborting the previous Supabase request saves the work; matching
 * the settled key prevents an old response from ever painting a newer query.
 */
export function useSearchSuggestions(
  query: string,
  categorySlug?: string | null
): SearchSuggestionState {
  const normalized = query.trim();
  const enabled = normalized.length >= 2;
  const key = `${categorySlug ?? '*'}:${normalized.toLocaleLowerCase()}`;
  const [data, setData] = useState<SearchSuggestions | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const nonceRef = useRef(0);
  const requestKey = `${key}:${nonce}`;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await fetchSearchSuggestions(normalized, categorySlug, controller.signal);
        if (cancelled) return;
        setData(result);
        setError(null);
        setSettledKey(requestKey);
      } catch (caught) {
        if (cancelled || controller.signal.aborted) return;
        setData(null);
        setError(toError(caught));
        setSettledKey(requestKey);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [categorySlug, enabled, normalized, requestKey]);

  const retry = useCallback(() => {
    nonceRef.current += 1;
    setNonce(nonceRef.current);
  }, []);

  const current = enabled && settledKey === requestKey;
  return {
    data: current ? data : null,
    loading: enabled && !current,
    error: current ? error : null,
    retry,
  };
}

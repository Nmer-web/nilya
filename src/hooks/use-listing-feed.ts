import { useCallback, useEffect, useRef, useState } from 'react';

import { toError } from '@/lib/errors';
import { fetchListings, type FeedFilters } from '@/lib/queries';
import type { ListingRow } from '@/lib/database.types';

type FeedState = {
  listings: ListingRow[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  /** Exact size of the whole filtered set, or null before the first page settles. */
  total: number | null;
  refresh: () => void;
  retry: () => void;
  loadMore: () => void;
};

/**
 * A paginated listings feed.
 *
 * Separate from `useAsync` because pages accumulate rather than replace: the
 * generic hook holds one result, this holds a growing list plus the cursor and
 * the in-flight guard that keeps a fast scroller from firing the same page
 * three times.
 *
 * `key` identifies the filter set. Changing it starts a new feed from page
 * zero and discards whatever the previous filters had loaded.
 */
export function useListingFeed(filters: FeedFilters, key: string): FeedState {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const page = useRef(0);
  /** Blocks overlapping page requests — onEndReached fires repeatedly. */
  const inFlight = useRef(false);
  const requestGenerationRef = useRef(0);
  const nonceRef = useRef(0);
  const previousKeyRef = useRef(key);
  const refreshRequestRef = useRef<{ key: string; nonce: number } | null>(null);

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  });

  useEffect(() => {
    if (previousKeyRef.current !== key) {
      previousKeyRef.current = key;
      refreshRequestRef.current = null;
    }
  }, [key]);

  /* First page, and any reload of it. */
  useEffect(() => {
    let cancelled = false;
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    const refreshRequest = refreshRequestRef.current;
    const preserveExistingData = refreshRequest?.key === key && refreshRequest.nonce === nonce;
    page.current = 0;
    inFlight.current = true;

    void (async () => {
      try {
        const { rows, hasMore: more, total: count } = await fetchListings(filtersRef.current, 0);
        if (cancelled || generation !== requestGenerationRef.current) return;
        setListings(rows);
        setHasMore(more);
        setTotal(count);
        setError(null);
        setSettledKey(key);
      } catch (e) {
        if (cancelled || generation !== requestGenerationRef.current) return;
        setError(toError(e));
        if (!preserveExistingData) {
          setListings([]);
          setHasMore(false);
          setTotal(null);
        }
        setSettledKey(key);
      } finally {
        if (!cancelled && generation === requestGenerationRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
          inFlight.current = false;
          if (refreshRequestRef.current?.key === key && refreshRequestRef.current.nonce === nonce) {
            refreshRequestRef.current = null;
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      if (generation === requestGenerationRef.current) inFlight.current = false;
    };
  }, [key, nonce]);

  const loadMore = useCallback(() => {
    if (inFlight.current || !hasMore) return;
    inFlight.current = true;
    setLoadingMore(true);

    const next = page.current + 1;
    const generation = requestGenerationRef.current;
    void (async () => {
      try {
        const { rows, hasMore: more } = await fetchListings(filtersRef.current, next);
        if (generation !== requestGenerationRef.current) return;
        page.current = next;
        /*
         * Merge by id rather than concatenating. A listing published while the
         * user is part-way down shifts every later row by one, and an offset
         * page would otherwise repeat whatever crossed the boundary.
         */
        setListings((prev) => {
          const seen = new Set(prev.map((l) => l.id));
          return [...prev, ...rows.filter((l) => !seen.has(l.id))];
        });
        setHasMore(more);
      } catch (e) {
        if (generation !== requestGenerationRef.current) return;
        setError(toError(e));
      } finally {
        if (generation === requestGenerationRef.current) {
          setLoadingMore(false);
          inFlight.current = false;
        }
      }
    })();
  }, [hasMore]);

  const refresh = useCallback(() => {
    const nextNonce = nonceRef.current + 1;
    nonceRef.current = nextNonce;
    refreshRequestRef.current = { key, nonce: nextNonce };
    setRefreshing(true);
    setNonce(nextNonce);
  }, [key]);

  const retry = useCallback(() => {
    const nextNonce = nonceRef.current + 1;
    nonceRef.current = nextNonce;
    refreshRequestRef.current = null;
    setLoading(true);
    setNonce(nextNonce);
  }, []);

  const current = settledKey === key;

  return {
    listings: current ? listings : [],
    loading: current ? loading : true,
    refreshing: current ? refreshing : false,
    loadingMore: current ? loadingMore : false,
    error: current ? error : null,
    hasMore: current ? hasMore : false,
    total: current ? total : null,
    refresh,
    retry,
    loadMore,
  };
}

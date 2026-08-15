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
  const [nonce, setNonce] = useState(0);

  const page = useRef(0);
  /** Blocks overlapping page requests — onEndReached fires repeatedly. */
  const inFlight = useRef(false);

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  });

  /* First page, and any reload of it. */
  useEffect(() => {
    let cancelled = false;
    page.current = 0;
    inFlight.current = true;

    void (async () => {
      try {
        const { rows, hasMore: more } = await fetchListings(filtersRef.current, 0);
        if (cancelled) return;
        setListings(rows);
        setHasMore(more);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(toError(e));
        setListings([]);
        setHasMore(false);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
          inFlight.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
      inFlight.current = false;
    };
  }, [key, nonce]);

  const loadMore = useCallback(() => {
    if (inFlight.current || !hasMore) return;
    inFlight.current = true;
    setLoadingMore(true);

    const next = page.current + 1;
    void (async () => {
      try {
        const { rows, hasMore: more } = await fetchListings(filtersRef.current, next);
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
        setError(toError(e));
      } finally {
        setLoadingMore(false);
        inFlight.current = false;
      }
    })();
  }, [hasMore]);

  return {
    listings,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    refresh: useCallback(() => {
      setRefreshing(true);
      setNonce((n) => n + 1);
    }, []),
    retry: useCallback(() => {
      setLoading(true);
      setNonce((n) => n + 1);
    }, []),
    loadMore,
  };
}

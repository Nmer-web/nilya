import { useCallback, useEffect, useRef, useState } from 'react';

import type { ListingRow } from '@/lib/database.types';
import { toError } from '@/lib/errors';
import { fetchFavoriteListings } from '@/lib/queries';

type FavoriteFeedState = {
  listings: ListingRow[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  /** Favorites are read by id in pages and never counted, so this stays null. */
  total: null;
  refresh: () => void;
  retry: () => void;
  loadMore: () => void;
};

export function useFavoriteListingsFeed(enabled: boolean, key: string): FavoriteFeedState {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const page = useRef(0);
  const inFlight = useRef(false);
  const requestGenerationRef = useRef(0);
  const nonceRef = useRef(0);
  const previousKeyRef = useRef(key);
  const refreshRequestRef = useRef<{ key: string; nonce: number } | null>(null);

  useEffect(() => {
    if (previousKeyRef.current !== key) {
      previousKeyRef.current = key;
      refreshRequestRef.current = null;
    }
  }, [key]);

  useEffect(() => {
    if (!enabled) {
      requestGenerationRef.current += 1;
      refreshRequestRef.current = null;
      inFlight.current = false;
      return;
    }

    let cancelled = false;
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    const refreshRequest = refreshRequestRef.current;
    const preserveExistingData = refreshRequest?.key === key && refreshRequest.nonce === nonce;
    page.current = 0;
    inFlight.current = true;

    void (async () => {
      try {
        const { rows, hasMore: more, page: fetchedPage } = await fetchFavoriteListings(0);
        if (cancelled || generation !== requestGenerationRef.current) return;
        page.current = fetchedPage;
        setListings(rows);
        setHasMore(more);
        setError(null);
        setSettledKey(key);
      } catch (e) {
        if (cancelled || generation !== requestGenerationRef.current) return;
        setError(toError(e));
        if (!preserveExistingData) {
          setListings([]);
          setHasMore(false);
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
  }, [enabled, key, nonce]);

  const loadMore = useCallback(() => {
    if (!enabled || inFlight.current || !hasMore) return;
    inFlight.current = true;
    setLoadingMore(true);

    const next = page.current + 1;
    const generation = requestGenerationRef.current;
    void (async () => {
      try {
        const { rows, hasMore: more, page: fetchedPage } = await fetchFavoriteListings(next);
        if (generation !== requestGenerationRef.current) return;
        page.current = fetchedPage;
        setListings((prev) => {
          const seen = new Set(prev.map((listing) => listing.id));
          return [...prev, ...rows.filter((listing) => !seen.has(listing.id))];
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
  }, [enabled, hasMore]);

  const refresh = useCallback(() => {
    if (!enabled) return;
    const nextNonce = nonceRef.current + 1;
    nonceRef.current = nextNonce;
    refreshRequestRef.current = { key, nonce: nextNonce };
    setRefreshing(true);
    setNonce(nextNonce);
  }, [enabled, key]);

  const retry = useCallback(() => {
    if (!enabled) return;
    const nextNonce = nonceRef.current + 1;
    nonceRef.current = nextNonce;
    refreshRequestRef.current = null;
    setLoading(true);
    setNonce(nextNonce);
  }, [enabled]);

  const current = enabled && settledKey === key;

  return {
    listings: current ? listings : [],
    loading: enabled ? (current ? loading : true) : false,
    refreshing: current ? refreshing : false,
    loadingMore: current ? loadingMore : false,
    error: current ? error : null,
    hasMore: current ? hasMore : false,
    total: null,
    refresh,
    retry,
    loadMore,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ListingStatus } from '@/lib/database.types';
import { toError } from '@/lib/errors';
import { fetchMyListings, type MyListingRow } from '@/lib/queries';

type MyListingsState = {
  listings: MyListingRow[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  refresh: () => void;
  retry: () => void;
  loadMore: () => void;
  remove: (listingId: string) => void;
};

/** Paginated private owner feed, following the same lifecycle as useListingFeed. */
export function useMyListings(status: ListingStatus): MyListingsState {
  const [listings, setListings] = useState<MyListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [settledStatus, setSettledStatus] = useState<ListingStatus | null>(null);
  const [nonce, setNonce] = useState(0);

  const pageRef = useRef(0);
  const inFlightRef = useRef(false);
  const generationRef = useRef(0);
  const nonceRef = useRef(0);
  const refreshRequestRef = useRef<{ status: ListingStatus; nonce: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const refreshRequest = refreshRequestRef.current;
    const preserveExistingData = refreshRequest?.status === status && refreshRequest.nonce === nonce;

    pageRef.current = 0;
    inFlightRef.current = true;

    void (async () => {
      try {
        const page = await fetchMyListings(status, 0);
        if (cancelled || generation !== generationRef.current) return;
        setListings(page.rows);
        setHasMore(page.hasMore);
        setError(null);
        setSettledStatus(status);
      } catch (caught) {
        if (cancelled || generation !== generationRef.current) return;
        if (!preserveExistingData) {
          setListings([]);
          setHasMore(false);
        }
        setError(toError(caught));
        setSettledStatus(status);
      } finally {
        if (!cancelled && generation === generationRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
          inFlightRef.current = false;
          if (refreshRequestRef.current?.status === status && refreshRequestRef.current.nonce === nonce) {
            refreshRequestRef.current = null;
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      if (generation === generationRef.current) inFlightRef.current = false;
    };
  }, [nonce, status]);

  const loadMore = useCallback(() => {
    if (inFlightRef.current || !hasMore) return;
    inFlightRef.current = true;
    setLoadingMore(true);

    const nextPage = pageRef.current + 1;
    const generation = generationRef.current;
    void (async () => {
      try {
        const next = await fetchMyListings(status, nextPage);
        if (generation !== generationRef.current) return;
        pageRef.current = nextPage;
        setListings((current) => {
          const seen = new Set(current.map((listing) => listing.id));
          return [...current, ...next.rows.filter((listing) => !seen.has(listing.id))];
        });
        setHasMore(next.hasMore);
        setError(null);
      } catch (caught) {
        if (generation !== generationRef.current) return;
        setError(toError(caught));
      } finally {
        if (generation === generationRef.current) {
          setLoadingMore(false);
          inFlightRef.current = false;
        }
      }
    })();
  }, [hasMore, status]);

  const refresh = useCallback(() => {
    const nextNonce = nonceRef.current + 1;
    nonceRef.current = nextNonce;
    refreshRequestRef.current = { status, nonce: nextNonce };
    setRefreshing(true);
    setNonce(nextNonce);
  }, [status]);

  const retry = useCallback(() => {
    const nextNonce = nonceRef.current + 1;
    nonceRef.current = nextNonce;
    refreshRequestRef.current = null;
    setLoading(true);
    setNonce(nextNonce);
  }, []);

  const remove = useCallback((listingId: string) => {
    setListings((current) => current.filter((listing) => listing.id !== listingId));
  }, []);

  const current = settledStatus === status;
  return {
    listings: current ? listings : [],
    loading: current ? loading : true,
    refreshing: current ? refreshing : false,
    loadingMore: current ? loadingMore : false,
    error: current ? error : null,
    hasMore: current ? hasMore : false,
    refresh,
    retry,
    loadMore,
    remove,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/store/auth-store';
import { useApp } from '@/store/app-store';
import { fetchFavoriteIds, setFavorite } from '@/lib/queries';
import { useAsync } from '@/hooks/use-async';
import { haptic } from '@/lib/haptics';

type FavoriteMutation = {
  listingId: string;
  saved: boolean;
};

const favoriteMutationListeners = new Set<(mutation: FavoriteMutation) => void>();

function publishFavoriteMutation(mutation: FavoriteMutation) {
  favoriteMutationListeners.forEach((listener) => listener(mutation));
}

/**
 * The signed-in user's saved listing ids, with an optimistic toggle.
 *
 * The heart has to respond on the frame it is pressed, so the set is updated
 * before the write and rolled back if the write fails. Without the rollback a
 * denied insert — an expired session, RLS, no network — would leave a filled
 * heart that survives until the next fetch and then silently empties.
 *
 * Signed-out users get an empty set and a toggle that reports why rather than
 * failing quietly.
 */
export function useFavorites() {
  const { status } = useAuth();
  const { flash } = useApp();
  const signedIn = status === 'signedIn';
  const mounted = useRef(true);
  const inFlight = useRef(new Set<string>());

  const query = useAsync(
    async () => (signedIn ? new Set(await fetchFavoriteIds()) : new Set<string>()),
    `favorites:${signedIn}`
  );

  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const refreshQuery = query.refresh;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /*
   * Every mounted surface uses its own read state, but a successful mutation
   * is account-wide. Publish only the committed listing value so Home,
   * Product Detail, search, and seller grids converge without Realtime or a
   * second favorites store.
   */
  useEffect(() => {
    if (!signedIn) return;

    const receive = (mutation: FavoriteMutation) => {
      setOverrides((current) => {
        if (current.get(mutation.listingId) === mutation.saved) return current;
        return new Map(current).set(mutation.listingId, mutation.saved);
      });
      refreshQuery();
    };

    favoriteMutationListeners.add(receive);
    return () => {
      favoriteMutationListeners.delete(receive);
    };
  }, [refreshQuery, signedIn]);

  /**
   * Server state with any in-flight optimistic changes applied on top.
   * Memoised so the toggle below keeps a stable identity between renders.
   */
  const saved = useMemo(() => {
    const next = new Set(query.data ?? []);
    overrides.forEach((on, id) => (on ? next.add(id) : next.delete(id)));
    return next;
  }, [query.data, overrides]);

  const toggle = useCallback(
    (id: string) => {
      if (!signedIn) {
        setError('Sign in to save items');
        flash('Sign in to save items');
        return;
      }

      if (inFlight.current.has(id)) return;
      inFlight.current.add(id);

      const previous = saved.has(id);
      const next = !previous;
      setOverrides((m) => new Map(m).set(id, next));
      setError(null);

      void setFavorite(id, next)
        .then(() => {
          if (mounted.current) haptic('favorite-confirmed');
          publishFavoriteMutation({ listingId: id, saved: next });
        })
        .catch(() => {
          if (!mounted.current) return;
          setOverrides((m) => new Map(m).set(id, previous));
          setError('Could not update favorites. Try again.');
          flash('Could not update favorites. Try again.');
        })
        .finally(() => {
          inFlight.current.delete(id);
        });
    },
    [flash, saved, signedIn]
  );

  return {
    saved,
    toggle,
    loading: query.loading,
    refreshing: query.refreshing,
    loadError: query.error,
    error,
    /** Re-reads from the database and drops local overrides. */
    refresh: useCallback(() => {
      setOverrides(new Map());
      refreshQuery();
    }, [refreshQuery]),
  };
}

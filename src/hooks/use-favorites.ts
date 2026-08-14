import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/store/auth-store';
import { fetchFavoriteIds, setFavorite } from '@/lib/queries';
import { useAsync } from '@/hooks/use-async';

/**
 * The signed-in user's saved listing ids, with an optimistic toggle.
 *
 * The heart has to respond on the frame it is pressed, so the set is updated
 * before the write and rolled back if the write fails. Without the rollback a
 * refused insert — an expired session, RLS, no network — would leave a filled
 * heart that survives until the next fetch and then silently empties.
 *
 * Signed-out users get an empty set and a toggle that reports why rather than
 * failing quietly.
 */
export function useFavorites() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  const query = useAsync(
    async () => (signedIn ? new Set(await fetchFavoriteIds()) : new Set<string>()),
    `favorites:${signedIn}`
  );

  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const [error, setError] = useState<string | null>(null);

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
        return;
      }

      const next = !saved.has(id);
      setOverrides((m) => new Map(m).set(id, next));
      setError(null);

      void setFavorite(id, next)
        .then(() => {
          /* Keep the override in place: it already matches the server, and
             clearing it before a refetch would flash the old value. */
        })
        .catch((e: unknown) => {
          setOverrides((m) => {
            const copy = new Map(m);
            copy.delete(id);
            return copy;
          });
          setError(e instanceof Error ? e.message : 'Could not save that item');
        });
    },
    [saved, signedIn]
  );

  return {
    saved,
    toggle,
    loading: query.loading,
    error,
    /** Re-reads from the database and drops local overrides. */
    refresh: useCallback(() => {
      setOverrides(new Map());
      query.refetch();
    }, [query]),
  };
}

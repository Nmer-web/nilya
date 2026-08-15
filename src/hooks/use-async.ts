import { useCallback, useEffect, useRef, useState } from 'react';

import { toError } from '@/lib/errors';

export type AsyncState<T> = {
  data: T | null;
  /** True on the first load only, so a refetch does not blank the screen. */
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  refetch: () => void;
  refresh: () => void;
};

/**
 * Runs an async read and exposes the four states every screen needs.
 *
 * Deliberately small: the app has no query library, and adding one to fetch a
 * handful of tables would be a dependency with more surface than the problem.
 * What it does provide is what is easy to get wrong by hand — discarding a
 * superseded response, not writing state after unmount, and keeping first load
 * separate from refresh so pull-to-refresh does not replace the list with a
 * spinner.
 *
 * `key` identifies the query: change it and the read runs again. A string
 * rather than a dependency array, because a spread array cannot be checked by
 * the rules of hooks, and because a query key is worth naming deliberately —
 * `listings:shoes:price_asc` says what is being fetched in a way `[cat, sort]`
 * does not.
 *
 * State is only ever written after an `await`, and re-runs are driven by an
 * event rather than from inside the effect, which is what keeps this clear of
 * the compiler's cascading-render rule.
 */
export function useAsync<T>(fn: () => Promise<T>, key: string): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  /** Bumped by refetch/refresh to re-run the effect without changing `key`. */
  const [nonce, setNonce] = useState(0);

  /**
   * The fetcher is read through a ref so an inline closure does not restart the
   * request on every render. Assigned in an effect rather than during render,
   * since a render-phase ref write is not a safe read for anything else.
   */
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await fnRef.current();
        if (cancelled) return;
        setData(result);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(toError(e));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    /**
     * Cancellation is what discards a superseded response: the effect's own
     * cleanup runs before the next one starts, so an earlier slow request can
     * never overwrite a later fast one.
     */
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const refetch = useCallback(() => {
    setLoading(true);
    setNonce((n) => n + 1);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setNonce((n) => n + 1);
  }, []);

  return { data, loading, refreshing, error, refetch, refresh };
}

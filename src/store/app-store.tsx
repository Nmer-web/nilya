import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';


/*
 * The prototype's money helpers and delivery ladder are gone.
 *
 * `euro()` and `sdg()` formatted numbers the app no longer holds — prices are
 * cents from the database, formatted by `formatPrice`. `deliveryFor()` returned
 * a hard-coded ladder per country; the real one is `delivery_options`, seeded
 * with the same shape and read by checkout. `PROTECTION_FEE` was €2.50 as a
 * constant, which is `platform_settings.protection_fee_cents` — the server
 * reads it there so the client cannot disagree with what is charged.
 */

/* ─────────────────────────── state ─────────────────────────── */

export type SortKey = 'recent' | 'price_asc' | 'price_desc';

/** The sort options, in the order the sheet lists them. */
export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Newest first' },
  { key: 'price_asc', label: 'Price: low to high' },
  { key: 'price_desc', label: 'Price: high to low' },
];

/**
 * Discovery filters.
 *
 * Held in database units — cents, category slugs,
 * ISO country codes — so the sheet and the query speak the same language and
 * nothing is translated in between.
 */
export type Filters = {
  categorySlug: string | null;
  minCents: number | null;
  maxCents: number | null;
  countryCode: string | null;
};

export const EMPTY_FILTERS: Filters = {
  categorySlug: null,
  minCents: null,
  maxCents: null,
  countryCode: null,
};
/*
 * The prototype conversation is gone from here. `msgs`, `typing` and the
 * `sendMessage` that appended a canned reply after 1.4s were the whole of the
 * old chat: four hard-coded lines and an imaginary correspondent. Messaging is
 * now `messages` in Postgres, read and written through the query layer and kept
 * current over Realtime, so there is nothing left for the store to hold.
 */

/*
 * Two sheets. The offer sheet became rows in `offers`, answered inside the
 * conversation; share, report and the order-placed confirmation were built on
 * a numeric catalog id and had no real entity to name.
 */
export type Sheet = { kind: 'filters' } | { kind: 'sort' } | null;

type AppState = {
  /*
   * No `favs` here. It held `{1: true, 6: true, 13: true}` — three numeric
   * catalog ids marked as favourites of nobody. Favourites are rows in
   * `favorites` keyed by listing UUID, read and written by `useFavorites`.
   */

  /** Category chip, shared by Home and Explore. */
  cat: string;
  q: string;
  /** Recent search terms, most recent first. */
  recent: string[];
  sort: SortKey;

  /*
   * The Sell composer no longer lives here. It writes to Supabase, so its
   * state is local to the screen and its result is a row rather than a flag.
   */

  /*
   * Discovery filters, in the shape the query takes them. Prices are cents and
   * so nothing has to be translated
   * between the sheet and the database.
   */
  filters: Filters;

  notifRead: boolean;
  sheet: Sheet;
  toast: string | null;
};

const INITIAL: AppState = {
  cat: 'All',
  q: '',
  recent: [],
  sort: 'recent',
  filters: EMPTY_FILTERS,
  notifRead: false,
  sheet: null,
  toast: null,
};

type AppActions = {
  setCat: (cat: string) => void;
  setQuery: (q: string) => void;
  setSort: (s: SortKey) => void;
  /** Records a term in the recent list and applies it as the active query. */
  submitSearch: (q: string) => void;


  setFilters: (f: Filters) => void;
  resetFilters: () => void;

  markNotifsRead: () => void;

  openSheet: (s: NonNullable<Sheet>) => void;
  closeSheet: () => void;

  flash: (msg: string) => void;
  dismissToast: () => void;
};

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL);
  /** Lets memoised actions read fresh state without re-creating on every change. */
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  /*
   * The deferred-callback helper that lived here is gone with the scripted
   * chat reply it existed for. The toast timer below owns its own handle.
   */

  const patch = useCallback((p: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => {
    setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) }));
  }, []);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback(
    (msg: string) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      patch({ toast: msg });
      toastTimer.current = setTimeout(() => patch({ toast: null }), 2600);
    },
    [patch]
  );

  const actions = useMemo<AppActions>(
    () => ({
      setCat: (cat) => patch({ cat }),
      setQuery: (q) => patch({ q }),
      setSort: (sort) => patch({ sort }),
      submitSearch: (raw) => {
        const q = raw.trim();
        if (!q) return;
        patch((s) => ({
          q,
          // Most recent first, de-duplicated case-insensitively, capped at six.
          recent: [q, ...s.recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 6),
        }));
      },

      setFilters: (filters) => patch({ filters }),
      resetFilters: () => patch({ filters: EMPTY_FILTERS }),

      markNotifsRead: () => {
        patch({ notifRead: true });
        flash('All caught up');
      },

      openSheet: (sheet) => patch({ sheet }),
      closeSheet: () => patch({ sheet: null }),
      flash,
      dismissToast: () => patch({ toast: null }),
    }),
    [patch, flash]
  );

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/* ─────────────────────────── selectors ─────────────────────────── */

/** True when any filter is set — drives the filter button's filled state. */
export function filtersActive(f: Filters) {
  return Object.values(f).some((v) => v !== null);
}

/**
 * The client-side filtering that used to live here is gone. Discovery now
 * filters in the database — `fetchListings` takes these same fields — so
 * loading the whole catalog to narrow it locally would be both wrong and
 * unbounded.
 */

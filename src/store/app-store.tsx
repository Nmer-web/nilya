import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type Product } from '@/data/catalog';

/* ─────────────────────────── formatting ─────────────────────────── */

/** €45 for whole euros, €45.99 otherwise — matches the prototype's `euro()`. */
export const euro = (n: number) => '€' + (Math.round(n * 100) % 100 === 0 ? n : n.toFixed(2));

/** Indicative SDG conversion used on the Sudan-local checkout. */
export const sdg = (n: number) => (n * 875).toLocaleString('en-US') + ' SDG';

/* ─────────────────────────── delivery ─────────────────────────── */

export type DeliveryOption = {
  k: string;
  n: string;
  sub: string;
  price: number;
  eta: string;
};

export type DeliveryLadder = {
  kind: 'local' | 'dom' | 'intl';
  opts: DeliveryOption[];
};

/** Which delivery options a listing offers, decided by the seller's country. */
export function deliveryFor(p: Product): DeliveryLadder {
  if (p.cc === 'SD') {
    return {
      kind: 'local',
      opts: [
        {
          k: 'point',
          n: 'Local pickup',
          sub: 'Al Riyadh Pickup Point, Khartoum',
          price: 0,
          eta: 'Ready to collect in 1–2 days',
        },
        {
          k: 'moto',
          n: 'Khartoum delivery',
          sub: 'Motorbike courier to your address',
          price: 3,
          eta: 'Same day if ordered before 15:00',
        },
      ],
    };
  }
  if (p.cc === 'FR') {
    return {
      kind: 'dom',
      opts: [
        {
          k: 'point',
          n: 'Pickup point',
          sub: 'Épicerie du Canal · 400 m away',
          price: 4.99,
          eta: '2–4 days',
        },
        { k: 'home', n: 'Home delivery', sub: 'Colissimo to 75011 Paris', price: 7.99, eta: '2–4 days' },
      ],
    };
  }
  return {
    kind: 'intl',
    opts: [
      {
        k: 'point',
        n: 'International pickup point',
        sub: 'DHL ServicePoint · 700 m away',
        price: 9.99,
        eta: '7–14 days',
      },
      {
        k: 'home',
        n: 'International home delivery',
        sub: 'DHL Express, tracked',
        price: 14.99,
        eta: '7–14 days',
      },
    ],
  };
}

/** Buyer-protection fee, waived on cash-at-handover pickups. */
export const PROTECTION_FEE = 2.5;

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
 * Held in database units — cents, category slugs, `listing_condition` values,
 * ISO country codes — so the sheet and the query speak the same language and
 * nothing is translated in between.
 */
export type Filters = {
  categorySlug: string | null;
  minCents: number | null;
  maxCents: number | null;
  condition: string | null;
  countryCode: string | null;
};

export const EMPTY_FILTERS: Filters = {
  categorySlug: null,
  minCents: null,
  maxCents: null,
  condition: null,
  countryCode: null,
};
export type OfferState = 'open' | 'countered' | 'accepted' | 'declined';
export type Message = { me: boolean; t: string };

export type Sheet =
  | { kind: 'offer'; mode: 'buyer' | 'counter'; productId: number; amount: number }
  | { kind: 'filters' }
  | { kind: 'sort' }
  | { kind: 'share'; productId: number }
  | { kind: 'report'; productId: number }
  | { kind: 'done'; doneKind: 'placed' | 'paid' }
  | null;

type AppState = {
  favs: Record<number, true>;
  /** Category chip, shared by Home and Explore exactly as in the prototype. */
  cat: string;
  q: string;
  /** Recent search terms, most recent first. */
  recent: string[];
  sort: SortKey;

  /*
   * The Sell composer no longer lives here. It writes to Supabase, so its
   * state is local to the screen and its result is a row rather than a flag.
   */

  /* Inbox */
  offerState: OfferState;
  msgs: Message[];
  typing: boolean;

  /*
   * Discovery filters, in the shape the query takes them. Prices are cents and
   * `condition` is a `listing_condition` value, so nothing has to be translated
   * between the sheet and the database.
   */
  filters: Filters;

  /* Checkout */
  delKey: string | null;

  notifRead: boolean;
  sheet: Sheet;
  toast: string | null;
};

const INITIAL: AppState = {
  favs: { 1: true, 6: true, 13: true },
  cat: 'All',
  q: '',
  recent: [],
  sort: 'recent',
  offerState: 'open',
  msgs: [
    { me: true, t: 'Is this still available?' },
    { me: false, t: 'Yes 👍' },
    { me: true, t: 'Can you ship to Paris?' },
    { me: false, t: 'Yes, no problem. I can post it tomorrow.' },
  ],
  typing: false,
  filters: EMPTY_FILTERS,
  delKey: null,
  notifRead: false,
  sheet: null,
  toast: null,
};

type AppActions = {
  toggleFav: (id: number) => void;
  setCat: (cat: string) => void;
  setQuery: (q: string) => void;
  setSort: (s: SortKey) => void;
  /** Records a term in the recent list and applies it as the active query. */
  submitSearch: (q: string) => void;


  setOfferState: (s: OfferState) => void;
  sendMessage: (text: string) => void;

  setFilters: (f: Filters) => void;
  resetFilters: () => void;

  setDelKey: (k: string) => void;
  markNotifsRead: () => void;

  openSheet: (s: NonNullable<Sheet>) => void;
  closeSheet: () => void;
  setOfferAmount: (n: number) => void;

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
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

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
      toggleFav: (id) =>
        patch((s) => {
          const favs = { ...s.favs };
          if (favs[id]) delete favs[id];
          else favs[id] = true;
          return { favs };
        }),
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

      setOfferState: (offerState) => patch({ offerState }),
      sendMessage: (text) => {
        const t = text.trim();
        if (!t) return;
        patch((s) => ({ msgs: [...s.msgs, { me: true, t }], typing: true }));
        later(
          () =>
            patch((s) => ({
              typing: false,
              msgs: [...s.msgs, { me: false, t: 'Sure — I can hold it for you until tomorrow.' }],
            })),
          1400
        );
      },

      setFilters: (filters) => patch({ filters }),
      resetFilters: () => patch({ filters: EMPTY_FILTERS }),

      setDelKey: (delKey) => patch({ delKey }),
      markNotifsRead: () => {
        patch({ notifRead: true });
        flash('All caught up');
      },

      openSheet: (sheet) => patch({ sheet }),
      closeSheet: () => patch({ sheet: null }),
      setOfferAmount: (amount) =>
        patch((s) =>
          s.sheet?.kind === 'offer' ? { sheet: { ...s.sheet, amount: Math.max(1, amount) } } : {}
        ),

      flash,
      dismissToast: () => patch({ toast: null }),
    }),
    [patch, later, flash]
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

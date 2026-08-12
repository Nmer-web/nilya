import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { PRODUCTS, type Product } from '@/data/catalog';

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

export type SortKey = 'Relevance' | 'Price: low to high' | 'Newest first';
export type OfferState = 'open' | 'countered' | 'accepted' | 'declined';
export type Message = { me: boolean; t: string };

export type Sheet =
  | { kind: 'offer'; mode: 'buyer' | 'counter'; productId: number; amount: number }
  | { kind: 'filters' }
  | { kind: 'done'; doneKind: 'published' | 'placed' | 'paid' }
  | null;

type AppState = {
  favs: Record<number, true>;
  /** Category chip, shared by Home and Explore exactly as in the prototype. */
  cat: string;
  q: string;
  sort: SortKey;

  /* Sell composer */
  photos: number;
  scanning: boolean;
  suggested: boolean;
  filled: boolean;
  sudanPickup: boolean;

  /* Inbox */
  offerState: OfferState;
  msgs: Message[];
  typing: boolean;

  /* Filters */
  maxPrice: number;
  fCond: string;
  fDel: string;
  verifiedOnly: boolean;

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
  sort: 'Relevance',
  photos: 0,
  scanning: false,
  suggested: false,
  filled: false,
  sudanPickup: true,
  offerState: 'open',
  msgs: [
    { me: true, t: 'Is this still available?' },
    { me: false, t: 'Yes 👍' },
    { me: true, t: 'Can you ship to Paris?' },
    { me: false, t: 'Yes, no problem. I can post it tomorrow.' },
  ],
  typing: false,
  maxPrice: 300,
  fCond: 'Any',
  fDel: 'Any',
  verifiedOnly: false,
  delKey: null,
  notifRead: false,
  sheet: null,
  toast: null,
};

type AppActions = {
  toggleFav: (id: number) => void;
  setCat: (cat: string) => void;
  setQuery: (q: string) => void;
  cycleSort: () => void;

  addPhotos: () => void;
  applySuggestion: () => void;
  toggleSudanPickup: () => void;
  publish: () => void;

  setOfferState: (s: OfferState) => void;
  sendMessage: (text: string) => void;

  setMaxPrice: (n: number) => void;
  setCond: (c: string) => void;
  setDel: (d: string) => void;
  toggleVerifiedOnly: () => void;
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
      cycleSort: () =>
        patch((s) => ({
          sort:
            s.sort === 'Relevance'
              ? 'Price: low to high'
              : s.sort === 'Price: low to high'
                ? 'Newest first'
                : 'Relevance',
        })),

      addPhotos: () => {
        patch({ photos: 3, scanning: true, suggested: false });
        later(() => patch({ scanning: false, suggested: true }), 1300);
      },
      applySuggestion: () => {
        patch({ filled: true, suggested: false });
        flash('Details filled in — check the price');
      },
      toggleSudanPickup: () => patch((s) => ({ sudanPickup: !s.sudanPickup })),
      publish: () => {
        if (!latest.current.filled) {
          flash('Add a title and price to publish');
          return;
        }
        patch({ sheet: { kind: 'done', doneKind: 'published' } });
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

      setMaxPrice: (maxPrice) => patch({ maxPrice }),
      setCond: (fCond) => patch({ fCond }),
      setDel: (fDel) => patch({ fDel }),
      toggleVerifiedOnly: () => patch((s) => ({ verifiedOnly: !s.verifiedOnly })),
      resetFilters: () => patch({ fCond: 'Any', fDel: 'Any', maxPrice: 300, verifiedOnly: false }),

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

/** True when any filter differs from its default — drives the filter button's filled state. */
export function filtersActive(s: {
  fCond: string;
  fDel: string;
  maxPrice: number;
  verifiedOnly: boolean;
}) {
  return s.fCond !== 'Any' || s.fDel !== 'Any' || s.maxPrice < 300 || s.verifiedOnly;
}

export function useHomeFeed() {
  const { cat } = useApp();
  return useMemo(() => PRODUCTS.filter((p) => cat === 'All' || p.cat === cat), [cat]);
}

export function useSearchResults() {
  const { cat, q, maxPrice, fCond, fDel, sort } = useApp();
  return useMemo(() => {
    const ql = q.trim().toLowerCase();
    let out = PRODUCTS.filter(
      (p) =>
        (cat === 'All' || p.cat === cat) &&
        (!ql || `${p.t} ${p.b} ${p.cat} ${p.city} ${p.country}`.toLowerCase().includes(ql)) &&
        p.pr <= maxPrice &&
        (fCond === 'Any' || p.cd === fCond) &&
        (fDel === 'Any' ||
          (fDel === 'Local pickup' ? p.cc === 'SD' : fDel === 'International' ? p.cc !== 'FR' : p.cc === 'FR'))
    );
    if (sort === 'Price: low to high') out = [...out].sort((a, b) => a.pr - b.pr);
    if (sort === 'Newest first') out = [...out].sort((a, b) => b.id - a.id);
    return out;
  }, [cat, q, maxPrice, fCond, fDel, sort]);
}

export function useFavourites() {
  const { favs } = useApp();
  return useMemo(() => PRODUCTS.filter((p) => favs[p.id]), [favs]);
}

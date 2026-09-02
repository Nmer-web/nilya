import { useCallback, useSyncExternalStore } from 'react';

import { readCart, writeCart } from '@/lib/cart';

/**
 * The cart, as a module-level external store.
 *
 * A singleton rather than a provider because every reader — Home's badge, the
 * listing action bar, the cart screen — wants the same ordered set of ids and
 * none of them owns it. Hydration from disk happens once, on the first
 * subscription, and writes wait for it so an early tap cannot be overwritten
 * by the stored value arriving afterwards. See `lib/cart.ts` for why this is
 * local at all.
 */
type CartState = { ids: readonly string[]; hydrated: boolean };

let state: CartState = { ids: [], hydrated: false };
const listeners = new Set<() => void>();
let hydration: Promise<void> | null = null;

function set(next: CartState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function hydrate(): Promise<void> {
  if (!hydration) {
    hydration = readCart().then((ids) => {
      set({ ids, hydrated: true });
    });
  }
  return hydration;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void hydrate();
  return () => {
    listeners.delete(listener);
  };
}

function snapshot() {
  return state;
}

/** The ids as stored right now, for callers outside React. */
export function getCartIds(): readonly string[] {
  return state.ids;
}

export async function addToCart(id: string): Promise<void> {
  await hydrate();
  if (state.ids.includes(id)) return;
  const ids = [...state.ids, id];
  set({ ids, hydrated: true });
  await writeCart(ids);
}

export async function removeFromCart(id: string): Promise<void> {
  await hydrate();
  if (!state.ids.includes(id)) return;
  const ids = state.ids.filter((value) => value !== id);
  set({ ids, hydrated: true });
  await writeCart(ids);
}

/** Removes several ids in one write — used when live orders retire cart lines. */
export async function removeManyFromCart(ids: readonly string[]): Promise<void> {
  await hydrate();
  const drop = new Set(ids);
  const next = state.ids.filter((value) => !drop.has(value));
  if (next.length === state.ids.length) return;
  set({ ids: next, hydrated: true });
  await writeCart(next);
}

export function useCart() {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  const has = useCallback((id: string) => current.ids.includes(id), [current.ids]);
  return {
    ids: current.ids,
    count: current.ids.length,
    hydrated: current.hydrated,
    has,
    add: addToCart,
    remove: removeFromCart,
  };
}

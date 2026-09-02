import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { AttributeKey } from '@/config/categoryAttributes';
import {
  clearStoredDraft,
  EMPTY_DRAFT,
  isDraftEmpty,
  readStoredDraft,
  writeStoredDraft,
  type ListingDraft,
} from '@/features/sell/draft';
import { disposeListingPhotos, type LocalListingPhoto } from '@/lib/listing-photos';

const PERSIST_DEBOUNCE_MS = 500;

type DraftContextValue = {
  draft: ListingDraft;
  /** Prepared on this device, never persisted; see `draft.ts`. */
  photos: readonly LocalListingPhoto[];
  /** True once storage has been read, so screens can tell "empty" from "not yet loaded". */
  hydrated: boolean;
  /** True when this session started from a stored draft. */
  resumed: boolean;
  patch: (changes: Partial<Omit<ListingDraft, 'attributes'>>) => void;
  setAttribute: (key: AttributeKey, value: string | null) => void;
  /** Changing category clears the attributes, since their options belong to it. */
  setCategory: (slug: string | null) => void;
  setPhotos: (update: (previous: readonly LocalListingPhoto[]) => readonly LocalListingPhoto[]) => void;
  /** Writes the draft to storage right now, ahead of the debounce. */
  save: () => Promise<void>;
  /** Forgets the draft on this device and in memory. */
  discard: () => Promise<void>;
};

const DraftContext = createContext<DraftContextValue | null>(null);

/**
 * Holds one listing draft for the whole Sell wizard.
 *
 * Mounted by the wizard's layout, so the state outlives navigation between
 * steps and is released when the seller leaves the flow. Text fields persist
 * to AsyncStorage half a second after the last change; photographs stay in
 * memory and are disposed with the provider.
 */
export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<ListingDraft>(EMPTY_DRAFT);
  const [photos, setPhotosState] = useState<readonly LocalListingPhoto[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [resumed, setResumed] = useState(false);
  const photosRef = useRef<readonly LocalListingPhoto[]>([]);
  const draftRef = useRef(draft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    let cancelled = false;
    void readStoredDraft().then((stored) => {
      if (cancelled) return;
      if (stored) {
        setDraft(stored);
        setResumed(true);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Debounced persistence. Nothing is written before hydration, or the empty
     initial state would overwrite a stored draft before it was read. */
  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void (isDraftEmpty(draft) ? clearStoredDraft() : writeStoredDraft(draft));
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, hydrated]);

  useEffect(
    () => () => {
      disposeListingPhotos(photosRef.current);
    },
    []
  );

  const patch = useCallback((changes: Partial<Omit<ListingDraft, 'attributes'>>) => {
    setDraft((previous) => ({ ...previous, ...changes }));
  }, []);

  const setAttribute = useCallback((key: AttributeKey, value: string | null) => {
    setDraft((previous) => ({ ...previous, attributes: { ...previous.attributes, [key]: value } }));
  }, []);

  const setCategory = useCallback((slug: string | null) => {
    setDraft((previous) =>
      previous.categorySlug === slug
        ? previous
        : { ...previous, categorySlug: slug, attributes: { size: null, color: null } }
    );
  }, []);

  const setPhotos = useCallback(
    (update: (previous: readonly LocalListingPhoto[]) => readonly LocalListingPhoto[]) => {
      photosRef.current = update(photosRef.current);
      setPhotosState(photosRef.current);
    },
    []
  );

  const save = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await (isDraftEmpty(draftRef.current) ? clearStoredDraft() : writeStoredDraft(draftRef.current));
  }, []);

  const discard = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    disposeListingPhotos(photosRef.current);
    photosRef.current = [];
    setPhotosState([]);
    setDraft(EMPTY_DRAFT);
    setResumed(false);
    await clearStoredDraft();
  }, []);

  const value = useMemo<DraftContextValue>(
    () => ({ draft, photos, hydrated, resumed, patch, setAttribute, setCategory, setPhotos, save, discard }),
    [draft, photos, hydrated, resumed, patch, setAttribute, setCategory, setPhotos, save, discard]
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const context = useContext(DraftContext);
  if (!context) throw new Error('useDraft must be used inside the Sell wizard');
  return context;
}

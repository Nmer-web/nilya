import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AttributeKey } from '@/config/categoryAttributes';

/**
 * The seller's in-progress listing.
 *
 * Every field here lands in a real `listings` column when the draft is
 * published: `attributes` carries only the two attribute columns the table
 * has, `originalPrice` is `original_price_cents`, and the category is a
 * `categories.slug`. There is no condition — NILYA sells new products and the
 * column is written as such — and no quantity, variants or shipping, because
 * one listing is one item and delivery is country-level reference data.
 */
export type ListingDraft = {
  title: string;
  brand: string;
  description: string;
  categorySlug: string | null;
  attributes: Record<AttributeKey, string | null>;
  /** Kept as typed so a half-entered "12." survives a save; parsed at publish. */
  price: string;
  originalPrice: string;
  countryCode: string | null;
};

export const EMPTY_DRAFT: ListingDraft = {
  title: '',
  brand: '',
  description: '',
  categorySlug: null,
  attributes: { size: null, color: null },
  price: '',
  originalPrice: '',
  countryCode: null,
};

export function isDraftEmpty(draft: ListingDraft): boolean {
  return (
    draft.title === '' &&
    draft.brand === '' &&
    draft.description === '' &&
    draft.categorySlug === null &&
    draft.attributes.size === null &&
    draft.attributes.color === null &&
    draft.price === '' &&
    draft.originalPrice === '' &&
    draft.countryCode === null
  );
}

/**
 * Local draft storage.
 *
 * Deliberately on-device only: there is no drafts table, and a seller's
 * unfinished listing is not something another device needs. Photographs are
 * not stored — their URIs are temporary picker files and web object URLs that
 * do not survive a relaunch — so a resumed draft asks for photos again.
 */
const KEY = 'nilya:draft-listing';
const VERSION = 1;

type StoredDraft = { version: typeof VERSION; savedAt: string; draft: ListingDraft };

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function nullableText(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.trim() ? value.slice(0, max) : null;
}

export async function readStoredDraft(): Promise<ListingDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (parsed.version !== VERSION || !parsed.draft || typeof parsed.draft !== 'object') return null;
    const stored = parsed.draft as Partial<ListingDraft>;
    const attributes = (stored.attributes ?? {}) as Partial<Record<AttributeKey, unknown>>;
    /* Read field by field so a record from an earlier build cannot smuggle
       shapes the current draft does not have. */
    const draft: ListingDraft = {
      title: text(stored.title, 80),
      brand: text(stored.brand, 60),
      description: text(stored.description, 1000),
      categorySlug: nullableText(stored.categorySlug, 64),
      attributes: {
        size: nullableText(attributes.size, 40),
        color: nullableText(attributes.color, 40),
      },
      price: text(stored.price, 12),
      originalPrice: text(stored.originalPrice, 12),
      countryCode: nullableText(stored.countryCode, 2)?.toUpperCase() ?? null,
    };
    return isDraftEmpty(draft) ? null : draft;
  } catch {
    return null;
  }
}

export async function writeStoredDraft(draft: ListingDraft): Promise<void> {
  try {
    const record: StoredDraft = { version: VERSION, savedAt: new Date().toISOString(), draft };
    await AsyncStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    /* Storage unavailable: the draft lives for this session only. */
  }
}

export async function clearStoredDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* Nothing to clear, or nothing that can be. */
  }
}

export async function hasStoredDraft(): Promise<boolean> {
  return (await readStoredDraft()) !== null;
}

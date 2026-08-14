import { supabase } from '@/lib/supabase';
import type { CategoryRow, ListingDetailRow, ListingRow } from '@/lib/database.types';

/**
 * Every read the app performs, in one place.
 *
 * These run under the publishable key and therefore under RLS: `listings` is
 * readable only where `status = 'active'`, and `favorites` only for rows the
 * signed-in user owns. Nothing here can see more than the policies allow, which
 * is why none of it needs its own permission checks.
 *
 * The select strings were executed against the project's REST endpoint before
 * being written down — the embedded `profiles!listings_seller_id_fkey` and
 * `listing_images` joins both resolve.
 */

/** Columns the grid and the feed need. Kept as one string so the two agree. */
const LISTING_SELECT = `
  id, title, brand, price_cents, original_price_cents, currency, condition,
  category_slug, city, country_code, tagline, published_at,
  seller:profiles!listings_seller_id_fkey (
    id, display_name, avatar_url, is_verified, rating_avg, rating_count, lifetime_sales
  ),
  images:listing_images ( storage_path, position )
`;

export const PAGE_SIZE = 20;

export type FeedFilters = {
  /** Category slug, or null for everything. */
  category?: string | null;
  /** Free text, matched against title, brand, city and description. */
  query?: string;
  maxPriceCents?: number | null;
  condition?: string | null;
  countryCode?: string | null;
  sort?: 'recent' | 'price_asc';
};

/**
 * A page of active listings.
 *
 * Ordering is by `published_at desc` to match the partial index on
 * `(status, published_at desc)`; sorting by price uses the `listings_price`
 * index instead. Both are covered, so neither path falls back to a seq scan as
 * the table grows.
 */
export async function fetchListings(
  filters: FeedFilters = {},
  page = 0
): Promise<{ rows: ListingRow[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;

  let q = supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'active')
    .range(from, from + PAGE_SIZE - 1);

  if (filters.category) q = q.eq('category_slug', filters.category);
  if (filters.countryCode) q = q.eq('country_code', filters.countryCode);
  if (filters.condition) q = q.eq('condition', filters.condition);
  if (filters.maxPriceCents != null) q = q.lte('price_cents', filters.maxPriceCents);

  /**
   * Full-text against the generated `search_tsv` column, which is what the GIN
   * index covers. `websearch` accepts the quoting and negation people type,
   * and unlike `ilike('%term%')` it can use the index.
   */
  const text = filters.query?.trim();
  if (text) q = q.textSearch('search_tsv', text, { type: 'websearch', config: 'simple' });

  q = filters.sort === 'price_asc'
    ? q.order('price_cents', { ascending: true })
    : q.order('published_at', { ascending: false });

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as ListingRow[];
  return { rows, hasMore: rows.length === PAGE_SIZE };
}

/** One listing, or null when it is missing, removed or not yet published. */
export async function fetchListing(id: string): Promise<ListingDetailRow | null> {
  const { data, error } = await supabase
    .from('listings')
    .select(`${LISTING_SELECT}, description, size, color, status, seller_id`)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as ListingDetailRow) ?? null;
}

/** Reference data. Seeded by migration, readable by everyone. */
export async function fetchCategories(scope: 'home' | 'explore'): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('slug, label, sort_order, in_explore, in_home')
    .eq(scope === 'home' ? 'in_home' : 'in_explore', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

/* ─────────────────────────── favourites ─────────────────────────── */

/** Listing ids the signed-in user has saved. Empty when signed out. */
export async function fetchFavoriteIds(): Promise<string[]> {
  const { data, error } = await supabase.from('favorites').select('listing_id');
  if (error) throw error;
  return (data ?? []).map((r) => (r as { listing_id: string }).listing_id);
}

/** The saved listings themselves, for the Favourites screen. */
export async function fetchFavoriteListings(): Promise<ListingRow[]> {
  const ids = await fetchFavoriteIds();
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .in('id', ids)
    .eq('status', 'active');

  if (error) throw error;
  return (data ?? []) as unknown as ListingRow[];
}

/**
 * Adds or removes a favourite.
 *
 * The user id is not passed from the client: `favorites_insert_own` checks it
 * against `auth.uid()`, so it is taken from the session server-side. Sending it
 * would be both redundant and a claim the policy would reject if it disagreed.
 */
export async function setFavorite(listingId: string, on: boolean): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sign in to save items');

  const { error } = on
    ? await supabase.from('favorites').upsert({ user_id: userId, listing_id: listingId })
    : await supabase.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId);

  if (error) throw error;
}

/* ─────────────────────────── storage ─────────────────────────── */

/**
 * Public URL for a listing image.
 *
 * The bucket is public, so this is a plain URL rather than a signed one — no
 * round trip, and the URL can be handed straight to `<Image>`.
 */
export function imageUrl(storagePath: string): string {
  return supabase.storage.from('listing-images').getPublicUrl(storagePath).data.publicUrl;
}

/** The cover image, or null for a listing with no photographs yet. */
export function coverUrl(images: { storage_path: string; position: number }[] | null): string | null {
  if (!images || images.length === 0) return null;
  const cover = [...images].sort((a, b) => a.position - b.position)[0];
  return imageUrl(cover.storage_path);
}

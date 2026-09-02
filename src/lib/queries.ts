import { supabase } from '@/lib/supabase';
import { categoryDescendantSlugs, isCanonicalCategorySlug } from '@/lib/categories';
import { NEW_CONDITION } from '@/lib/database.types';
import { REFERRAL_CODE_PATTERN } from '@/lib/referrals';
import type {
  BundleDiscountSettingsRow,
  CategoryRow,
  ListingDetailRow,
  ListingImageRow,
  ListingRow,
  ListingStatus,
  ProfileSummary,
  SellerBadgeRow,
} from '@/lib/database.types';

const BUNDLE_DISCOUNT_SELECT = `
  seller_id, is_enabled,
  min_items_1, discount_percent_1,
  min_items_2, discount_percent_2,
  min_items_3, discount_percent_3,
  updated_at
`;

type SupabaseDiagnosticError = {
  message: string | null;
  details: string | null;
  hint: string | null;
  code: string | null;
};

function diagnosticError(error: unknown): SupabaseDiagnosticError {
  if (!error || typeof error !== 'object') {
    return { message: error == null ? null : String(error), details: null, hint: null, code: null };
  }

  const value = error as Record<string, unknown>;
  const text = (field: 'message' | 'details' | 'hint' | 'code') =>
    typeof value[field] === 'string' ? value[field] : null;

  return {
    message: text('message'),
    details: text('details'),
    hint: text('hint'),
    code: text('code'),
  };
}

async function logAuthDiagnostics(): Promise<void> {
  if (!__DEV__) return;

  const [sessionResult, userResult] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  console.log('[NILYA][AUTH]', {
    hasSession: Boolean(sessionResult.data.session),
    userId: userResult.data.user?.id ?? null,
    sessionError: diagnosticError(sessionResult.error),
    userError: diagnosticError(userResult.error),
  });
}

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

/** Listing columns shared by feed and detail reads. */
const LISTING_BASE_SELECT = `
  id, title, brand, price_cents, original_price_cents, currency, condition,
  category_slug, size, color, city, country_code, tagline, published_at,
  category:categories ( slug, label ),
  images:listing_images ( storage_path, position )
`;

/** Columns the grid and feed need, including their compact seller signals. */
const LISTING_SELECT = `
  ${LISTING_BASE_SELECT},
  seller:profiles!listings_seller_id_fkey!inner (
    id, display_name, avatar_url, is_verified, rating_avg, rating_count, lifetime_sales
  )
`;

/**
 * Similar-product cards require a real stored image, so this read uses an
 * inner embed instead of the feed's optional image embed.
 */
const SIMILAR_LISTING_SELECT = `
  id, title, brand, price_cents, original_price_cents, currency, condition,
  category_slug, size, color, city, country_code, tagline, published_at,
  category:categories ( slug, label ),
  seller:profiles!listings_seller_id_fkey!inner (
    id, display_name, avatar_url, is_verified, rating_avg, rating_count, lifetime_sales
  ),
  images:listing_images!inner ( storage_path, position )
`;

/** One joined identity read; Product Detail never needs a second profile request. */
const LISTING_DETAIL_SELECT = `
  ${LISTING_BASE_SELECT},
  description, status, seller_id,
  seller:profiles!listings_seller_id_fkey (
    id, display_name, avatar_url, avatar_color, city, country_code,
    rating_avg, rating_count, created_at, holiday_mode
  )
`;

/** Private owner-management rows. No public seller join or favorite state is needed. */
const MY_LISTING_SELECT = `
  id, seller_id, title, price_cents, original_price_cents, currency, condition, status,
  published_at, created_at, updated_at,
  images:listing_images ( storage_path, position )
`;

export const PAGE_SIZE = 20;
export const SIMILAR_LISTING_LIMIT = 6;

export type FeedSort = 'recent' | 'price_asc' | 'price_desc';

export type FeedFilters = {
  /** Category slug, or null for everything. A parent includes every active descendant. */
  category?: string | null;
  /** Free text, matched against title, brand, city and description. */
  query?: string;
  minPriceCents?: number | null;
  maxPriceCents?: number | null;
  countryCode?: string | null;
  brand?: string | null;
  color?: string | null;
  /** Restricts the feed to one seller, for their profile. */
  sellerId?: string | null;
  /** Seller and owner storefronts remain readable while the seller is away. */
  includeHolidaySellers?: boolean;
  sort?: FeedSort;
};

export type MyListingRow = {
  id: string;
  seller_id: string;
  title: string;
  price_cents: number;
  original_price_cents: number | null;
  currency: string;
  condition: ListingRow['condition'];
  status: ListingStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  images: ListingImageRow[];
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
): Promise<{ rows: ListingRow[]; hasMore: boolean; total: number | null }> {
  const from = page * PAGE_SIZE;
  const categorySlugs = filters.category
    ? await fetchCategoryDescendantSlugs(filters.category)
    : null;

  /* An invalid or inactive category has no product set. Returning a truthful
     empty page avoids turning an unrecognised scope into an unfiltered feed. */
  if (filters.category && categorySlugs?.length === 0) {
    return { rows: [], hasMore: false, total: 0 };
  }

  /*
   * `condition = 'new'` on every feed read. NILYA is a new-product marketplace,
   * and the enum still accepts legacy non-new values, so this keeps any row
   * outside the constitution out of the feed rather than trusting none exists.
   */
  let q = supabase
    .from('listings')
    .select(LISTING_SELECT, { count: 'exact' })
    .eq('status', 'active')
    .eq('condition', NEW_CONDITION)
    .range(from, from + PAGE_SIZE - 1);

  /* Public marketplace discovery excludes away sellers without rewriting any
     listing state. Direct seller storefronts opt in explicitly below. */
  if (!filters.includeHolidaySellers) q = q.eq('seller.holiday_mode', false);

  if (categorySlugs) q = q.in('category_slug', categorySlugs);
  if (filters.sellerId) q = q.eq('seller_id', filters.sellerId);
  if (filters.countryCode) q = q.eq('country_code', filters.countryCode);
  if (filters.brand) q = q.eq('brand', filters.brand);
  if (filters.color) q = q.eq('color', filters.color);
  if (filters.minPriceCents != null) q = q.gte('price_cents', filters.minPriceCents);
  if (filters.maxPriceCents != null) q = q.lte('price_cents', filters.maxPriceCents);

  /**
   * Full-text against the generated `search_tsv` column, which is what the GIN
   * index covers. `websearch` accepts the quoting and negation people type,
   * and unlike `ilike('%term%')` it can use the index.
   */
  const text = filters.query?.trim();
  if (text) q = q.textSearch('search_tsv', text, { type: 'websearch', config: 'simple' });

  q =
    filters.sort === 'price_asc'
      ? q.order('price_cents', { ascending: true })
      : filters.sort === 'price_desc'
        ? q.order('price_cents', { ascending: false })
        : q.order('published_at', { ascending: false });

  const { data, error, count } = await q;
  if (error) {
    if (__DEV__) {
      await logAuthDiagnostics();
      console.log('[NILYA][LISTINGS]', {
        data,
        error: diagnosticError(error),
      });
    }
    throw error;
  }

  const rows = (data ?? []) as unknown as ListingRow[];
  /* PostgREST counts the whole filtered set alongside the page, so the figure
     shown beside the grid is the real total and never an extrapolation. */
  return { rows, hasMore: rows.length === PAGE_SIZE, total: typeof count === 'number' ? count : null };
}

/**
 * One private management page for the currently authenticated seller.
 *
 * The caller supplies only a real status and page number. Identity is read
 * again from Supabase Auth here, then repeated in the query so the database
 * can use `listings_seller`; `listings_read_active` remains the final authority
 * and permits inactive rows only when `seller_id = auth.uid()`.
 */
export async function fetchMyListings(
  status: ListingStatus,
  page = 0
): Promise<{ rows: MyListingRow[]; hasMore: boolean }> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const sellerId = auth.user?.id;
  if (authError || !sellerId) throw new Error('Your session expired. Sign in again to continue.');

  const from = page * PAGE_SIZE;
  const orderColumn = status === 'active'
    ? 'published_at'
    : status === 'draft'
      ? 'created_at'
      : 'updated_at';

  const { data, error } = await supabase
    .from('listings')
    .select(MY_LISTING_SELECT)
    .eq('seller_id', sellerId)
    .eq('condition', NEW_CONDITION)
    .eq('status', status)
    .order(orderColumn, { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + PAGE_SIZE);

  if (error) throw error;
  const pageRows = (data ?? []) as unknown as MyListingRow[];
  return { rows: pageRows.slice(0, PAGE_SIZE), hasMore: pageRows.length > PAGE_SIZE };
}

/**
 * One NEW listing visible under RLS.
 *
 * Public viewers receive active rows only; RLS also permits an owner to retain
 * their own inactive listing detail. Buyer actions still gate on `status`.
 */
export async function fetchListing(id: string): Promise<ListingDetailRow | null> {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_DETAIL_SELECT)
    .eq('id', id)
    .eq('condition', NEW_CONDITION)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as ListingDetailRow;
  const images = Array.isArray(row.images)
    ? row.images
        .filter(
          (image): image is ListingImageRow =>
            typeof image?.storage_path === 'string' && image.storage_path.trim().length > 0
        )
        .map((image) => ({ ...image, storage_path: image.storage_path.trim() }))
    : [];

  return { ...row, images };
}

type SimilarListingsInput = {
  categorySlug: string;
  currentListingId: string;
  currentSellerId: string;
  excludedListingIds?: readonly string[];
  allowCurrentSellerFallback?: boolean;
};

/**
 * Active NEW products in the current listing's category.
 *
 * Different sellers are queried first, then any remaining slots are filled
 * from the current seller. Each partition is newest-published first, which is
 * deterministic and uses only real schema fields rather than an invented
 * recommendation score.
 */
export async function fetchSimilarListings({
  categorySlug,
  currentListingId,
  currentSellerId,
  excludedListingIds = [],
  allowCurrentSellerFallback = true,
}: SimilarListingsInput): Promise<ListingRow[]> {
  const excludedIds = [...new Set(excludedListingIds)].filter((id) => id !== currentListingId);

  const fetchPartition = async (sameSeller: boolean, limit: number) => {
    if (limit <= 0) return [];

    let query = supabase
      .from('listings')
      .select(SIMILAR_LISTING_SELECT)
      .eq('status', 'active')
      .eq('condition', NEW_CONDITION)
      .eq('category_slug', categorySlug)
      .eq('seller.holiday_mode', false)
      .neq('id', currentListingId)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (excludedIds.length > 0) {
      query = query.not('id', 'in', `(${excludedIds.join(',')})`);
    }

    query = sameSeller
      ? query.eq('seller_id', currentSellerId)
      : query.neq('seller_id', currentSellerId);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as ListingRow[];
  };

  const differentSellerListings = await fetchPartition(false, SIMILAR_LISTING_LIMIT);
  if (!allowCurrentSellerFallback) return differentSellerListings;

  const remaining = SIMILAR_LISTING_LIMIT - differentSellerListings.length;
  const sameSellerListings = await fetchPartition(true, remaining);

  return [...differentSellerListings, ...sameSellerListings];
}

export type OwnerPublicationState = {
  id: string;
  seller_id: string;
  status: ListingStatus;
  condition: string;
  published_at: string | null;
  images: {
    storage_path: string;
    position: number;
    width: number | null;
    height: number | null;
  }[];
};

/** Owner-visible state for publication reconciliation; never called by buyer detail reads. */
export async function fetchOwnerPublicationState(id: string): Promise<OwnerPublicationState | null> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      'id, seller_id, status, condition, published_at, images:listing_images ( storage_path, position, width, height )'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as OwnerPublicationState;
  return { ...row, images: [...(row.images ?? [])].sort((a, b) => a.position - b.position) };
}

const CATEGORY_SELECT =
  'id, slug, label, parent_id, icon_key, sort_order, is_active, created_at, in_explore, in_home';

const LEGACY_CATEGORY_SELECT = 'slug, label, sort_order, in_explore, in_home';

type LegacyCategoryRow = Pick<
  CategoryRow,
  'slug' | 'label' | 'sort_order' | 'in_explore' | 'in_home'
>;

/**
 * The hierarchy migration is deployed separately from the mobile bundle. Only
 * the specific missing-column response may use the legacy read; connection,
 * permission and unrelated query failures must still reach the error UI.
 */
function isMissingCategoryHierarchy(error: unknown): boolean {
  const diagnostic = diagnosticError(error);
  if (diagnostic.code !== '42703' && diagnostic.code !== 'PGRST204') return false;

  const description = [diagnostic.message, diagnostic.details, diagnostic.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return (
    description.includes('categories') &&
    ['.id', 'parent_id', 'icon_key', 'is_active', 'created_at', "'id'"].some((column) =>
      description.includes(column)
    )
  );
}

function isMissingCategoryDescendantFunction(error: unknown): boolean {
  const diagnostic = diagnosticError(error);
  return (
    diagnostic.code === 'PGRST202' &&
    (diagnostic.message ?? '').includes('category_descendant_slugs')
  );
}

/**
 * Translate real rows from the verified pre-hierarchy schema. The slug is a
 * safe transient identity because that schema uses it as its primary key; no
 * parent relationships or category records are invented here.
 */
function legacyCategory(row: LegacyCategoryRow): CategoryRow {
  return {
    ...row,
    id: row.slug,
    parent_id: null,
    icon_key: null,
    is_active: true,
    created_at: '',
  };
}

async function fetchLegacyCategories(scope?: 'home' | 'explore'): Promise<CategoryRow[]> {
  let query = supabase
    .from('categories')
    .select(LEGACY_CATEGORY_SELECT)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (scope) query = query.eq(scope === 'home' ? 'in_home' : 'in_explore', true);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as LegacyCategoryRow[]).map(legacyCategory);
}

/** Every active category in one ordered request, used by hierarchy pickers. */
export async function fetchCategoryTree(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(CATEGORY_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    if (isMissingCategoryHierarchy(error)) return fetchLegacyCategories();
    throw error;
  }
  return (data ?? []) as unknown as CategoryRow[];
}

/** Active top-level reference data for Home and Browse. */
export async function fetchCategories(scope: 'home' | 'explore'): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(CATEGORY_SELECT)
    .eq('is_active', true)
    .is('parent_id', null)
    .eq(scope === 'home' ? 'in_home' : 'in_explore', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    if (isMissingCategoryHierarchy(error)) return fetchLegacyCategories(scope);
    throw error;
  }
  return (data ?? []) as unknown as CategoryRow[];
}

const descendantSlugRequests = new Map<string, Promise<string[]>>();

/**
 * The sole listing-scope resolver. The recursive SQL function owns hierarchy
 * traversal; every feed (Home, Search, filters and category results) reaches it
 * through `fetchListings` rather than implementing its own tree walk.
 */
export async function fetchCategoryDescendantSlugs(categorySlug: string): Promise<string[]> {
  const normalized = categorySlug.trim();
  if (!isCanonicalCategorySlug(normalized)) return [];

  const existing = descendantSlugRequests.get(normalized);
  if (existing) return existing;

  const request = (async () => {
    const { data, error } = await supabase.rpc('category_descendant_slugs', {
      root_category_slug: normalized,
    });
    if (error) {
      if (isMissingCategoryDescendantFunction(error)) {
        return categoryDescendantSlugs(await fetchCategoryTree(), normalized);
      }
      throw error;
    }
    const rows = (data ?? []) as unknown as { slug: string }[];
    return [...new Set(rows.map((row) => row.slug).filter(Boolean))];
  })();

  descendantSlugRequests.set(normalized, request);
  try {
    return await request;
  } catch (error) {
    descendantSlugRequests.delete(normalized);
    throw error;
  }
}

/* ─────────────────────────── delivery ─────────────────────────── */

/**
 * The countries NILYA delivers to domestically.
 *
 * `delivery_options` keys rows by `country_code`, with `'**'` standing for the
 * international fallback that reaches everywhere else. Excluding it leaves the
 * real domestic footprint, which the onboarding country picker uses to order
 * itself — a projection of what the platform actually does, rather than an
 * editorial guess about which countries matter.
 *
 * Failure is not fatal to the caller: an empty list simply means the picker
 * shows one undivided alphabetical list.
 */
export async function fetchDeliveryCountries(): Promise<string[]> {
  const { data, error } = await supabase
    .from('delivery_options')
    .select('country_code')
    .eq('is_active', true)
    .neq('country_code', '**');

  if (error) throw error;

  const seen = new Set<string>();
  for (const row of data ?? []) {
    const code = (row as { country_code: string }).country_code?.trim().toUpperCase();
    if (code) seen.add(code);
  }
  return [...seen];
}

/* ─────────────────────── bundle discounts ─────────────────────── */

/** The signed-in seller's persisted row, including a disabled configuration. */
export async function fetchOwnBundleDiscountSettings(): Promise<BundleDiscountSettingsRow | null> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const sellerId = auth.user?.id;
  if (authError || !sellerId) {
    throw new Error('Your session expired. Sign in again to continue.');
  }

  const { data, error } = await supabase
    .from('seller_bundle_discounts')
    .select(BUNDLE_DISCOUNT_SELECT)
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (error) throw error;
  return (data as BundleDiscountSettingsRow | null) ?? null;
}

/* ─────────────────────── seller achievements ─────────────────────── */

/**
 * Public-safe definitions joined to private earned state by a database-owned
 * RPC. The RPC also reconciles eligible milestones and accepts no user id, so
 * a client cannot inspect or award another account's badges.
 */
export async function fetchOwnSellerBadges(): Promise<SellerBadgeRow[]> {
  const { data, error } = await supabase.rpc('get_my_badges');
  if (error) throw error;
  return (data ?? []) as SellerBadgeRow[];
}

/**
 * An enabled seller configuration visible under the table's public-read RLS.
 * Disabled rows resolve to null for visitors, including when the seller has
 * retained valid tiers for later use.
 */
export async function fetchPublicBundleDiscountSettings(
  sellerId: string
): Promise<BundleDiscountSettingsRow | null> {
  const { data, error } = await supabase
    .from('seller_bundle_discounts')
    .select(BUNDLE_DISCOUNT_SELECT)
    .eq('seller_id', sellerId)
    .eq('is_enabled', true)
    .maybeSingle();

  if (error) throw error;
  return (data as BundleDiscountSettingsRow | null) ?? null;
}

/* ─────────────────────────── referrals ─────────────────────────── */

export type ReferralSummary = {
  code: string;
  invitedCount: number;
};

/** Stable invite code and confirmed joined-account count for the current user. */
export async function fetchOwnReferralSummary(): Promise<ReferralSummary> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (authError || !userId) {
    throw new Error('Your session expired. Sign in again to continue.');
  }

  const [profileResult, countResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .single(),
    supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', userId),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (countResult.error) throw countResult.error;

  const code = (profileResult.data as { referral_code?: unknown }).referral_code;
  if (typeof code !== 'string' || !REFERRAL_CODE_PATTERN.test(code)) {
    throw new Error('Your referral code is unavailable.');
  }
  if (typeof countResult.count !== 'number') {
    throw new Error('Your referral count is unavailable.');
  }

  return { code, invitedCount: countResult.count };
}

/* ─────────────────────────── profiles ─────────────────────────── */

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  /** Seeded per account; backs the initials disc when there is no photo. */
  avatar_color: string | null;
  bio: string | null;
  city: string | null;
  country_code: string | null;
  is_verified: boolean;
  lifetime_sales: number;
  /** `numeric(2,1)`, null until the profile has been rated at all. */
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
  holiday_mode: boolean;
  holiday_mode_started_at: string | null;
};

export type ReviewRow = {
  id: string;
  author_id: string;
  subject_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  author: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

/**
 * One profile by id, or null when the id does not resolve.
 *
 * The same function serves a seller's public page and the signed-in user's own
 * account screen — they are the same row read through the same policy, and a
 * second "my profile" query would only be a second thing to keep in step.
 */
export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, display_name, avatar_url, avatar_color, bio, city, country_code, is_verified, lifetime_sales, rating_avg, rating_count, created_at, holiday_mode, holiday_mode_started_at'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (__DEV__) {
      await logAuthDiagnostics();
      console.log('[NILYA][PROFILE]', {
        userId: id,
        data,
        error: diagnosticError(error),
      });
    }
    throw error;
  }
  return (data as Profile) ?? null;
}

/** Public reviews about a seller, when real review rows exist. */
export async function fetchProfileReviews(profileId: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `id, author_id, subject_id, rating, body, created_at,
      author:profiles!reviews_author_id_fkey (
        id, display_name, avatar_url
      )`
    )
    .eq('subject_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as unknown as ReviewRow[];
}

/** Whether the signed-in account currently follows this public profile. */
export async function fetchProfileFollow(profileId: string): Promise<boolean> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const followerId = auth.user?.id;
  if (!followerId || followerId === profileId) return false;

  const { data, error } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', followerId)
    .eq('followee_id', profileId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

/**
 * Adds or removes the signed-in account's follow relation under the existing
 * `follows_insert_own` / `follows_delete_own` policies.
 */
export async function setProfileFollow(profileId: string, following: boolean): Promise<void> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const followerId = auth.user?.id;
  if (!followerId) throw new Error('Sign in to follow sellers');
  if (followerId === profileId) throw new Error('You cannot follow yourself');

  const { error } = following
    ? await supabase.from('follows').upsert({ follower_id: followerId, followee_id: profileId })
    : await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('followee_id', profileId);

  if (error) throw error;
}

/*
 * A seller's listings are `fetchListings({ sellerId })` rather than a function
 * of their own: same columns, same page size, same `status = 'active'` filter,
 * so a separate query would only be a second thing to keep in step.
 */

/**
 * Country codes that currently have listings, for the location filter.
 *
 * PostgREST has no DISTINCT, so this reads the column and reduces client-side.
 * Bounded to a page so it cannot become a full-table read as the catalog grows;
 * a `listing_countries` view would be the answer at real scale, and that is a
 * schema change this task is not permitted to make.
 */
export async function fetchListingCountries(): Promise<string[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('country_code, seller:profiles!listings_seller_id_fkey!inner(id)')
    .eq('status', 'active')
    .eq('condition', NEW_CONDITION)
    .eq('seller.holiday_mode', false)
    .limit(200);

  if (error) throw error;
  const set = new Set((data ?? []).map((r) => (r as { country_code: string }).country_code));
  return [...set].sort();
}

/**
 * Real values currently attached to active new listings for a filter column.
 *
 * PostgREST has no DISTINCT projection, so these are bounded reads reduced on
 * the client. At catalog scale this wants schema support, but a view or RPC is
 * a schema change and this task is explicitly not allowed to make one.
 */
async function fetchListingTextValues(column: 'brand' | 'color'): Promise<string[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(`${column}, seller:profiles!listings_seller_id_fkey!inner(id)`)
    .eq('status', 'active')
    .eq('condition', NEW_CONDITION)
    .eq('seller.holiday_mode', false)
    .not(column, 'is', null)
    .limit(200);

  if (error) throw error;

  const set = new Set<string>();
  for (const row of data ?? []) {
    const value = (row as Record<typeof column, string | null>)[column]?.trim();
    if (value) set.add(value);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function fetchListingBrands(): Promise<string[]> {
  return fetchListingTextValues('brand');
}

export async function fetchListingColors(): Promise<string[]> {
  return fetchListingTextValues('color');
}

/* ─────────────────────────── conversations ─────────────────────────── */

/**
 * A thread is identified by `(listing_id, buyer_id)`, which the schema declares
 * unique — there is no second conversation about the same item between the same
 * two people, and none of this needs a client-invented conversation id.
 */
export type ConversationRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string | null;
  created_at: string;
  listing: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    status: ListingStatus;
    images: ListingImageRow[];
  } | null;
  buyer: ProfileSummary | null;
  seller: ProfileSummary | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

const CONVERSATION_SELECT = `
  id, listing_id, buyer_id, seller_id, last_message_at, created_at,
  listing:listings ( id, title, price_cents, currency, status, images:listing_images ( storage_path, position ) ),
  buyer:profiles!conversations_buyer_id_fkey ( id, display_name, avatar_url, is_verified, rating_avg, rating_count, lifetime_sales ),
  seller:profiles!conversations_seller_id_fkey ( id, display_name, avatar_url, is_verified, rating_avg, rating_count, lifetime_sales )
`;

/**
 * Every thread the signed-in user is part of.
 *
 * No `buyer_id = me or seller_id = me` filter: `conversations_read_participant`
 * already restricts this to threads the caller belongs to, and repeating the
 * rule in the query would let the two drift apart.
 */
export async function fetchConversations(): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as unknown as ConversationRow[];
}

/** One thread, or null when it does not exist or is not the caller's. */
export async function fetchConversation(id: string): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as ConversationRow) ?? null;
}

/**
 * A thread's messages, oldest first — the order they are read in.
 *
 * The index is on `(conversation_id, created_at desc)`, which serves an
 * ascending scan equally well; Postgres reads a b-tree backwards at the same
 * cost.
 */
export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, read_at, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

/**
 * The most recent message in each of the caller's threads, plus what is unread.
 *
 * PostgREST cannot do "latest row per group", so rather than one query per
 * conversation this reads a bounded slice of the caller's messages newest-first
 * and reduces it. RLS means only the caller's own threads come back.
 */
export async function fetchConversationSummaries(): Promise<
  Map<string, { last: MessageRow; unread: number }>
> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(400);

  if (error) throw error;

  const rows = (data ?? []) as MessageRow[];
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;

  const summaries = new Map<string, { last: MessageRow; unread: number }>();
  for (const row of rows) {
    const entry = summaries.get(row.conversation_id);
    /* Newest first, so the first row seen for a conversation is its latest. */
    if (!entry) {
      summaries.set(row.conversation_id, { last: row, unread: 0 });
    }
    const current = summaries.get(row.conversation_id)!;
    if (row.read_at === null && row.sender_id !== me) current.unread += 1;
  }
  return summaries;
}

/* ─────────────────────────── favourites ─────────────────────────── */

/** Listing ids the signed-in user has saved. Empty when signed out. */
export async function fetchFavoriteIds(): Promise<string[]> {
  const { data, error } = await supabase.from('favorites').select('listing_id');
  if (error) throw error;
  return (data ?? []).map((r) => (r as { listing_id: string }).listing_id);
}

/** One page of saved listings for the Favorites screen. */
export async function fetchFavoriteListings(
  page = 0
): Promise<{ rows: ListingRow[]; hasMore: boolean; page: number }> {
  let currentPage = page;

  while (true) {
    const from = currentPage * PAGE_SIZE;
    const favoritePage = await supabase
      .from('favorites')
      .select('listing_id')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (favoritePage.error) throw favoritePage.error;

    const ids = (favoritePage.data ?? []).map((r) => (r as { listing_id: string }).listing_id);
    if (ids.length === 0) return { rows: [], hasMore: false, page: currentPage };

    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .in('id', ids)
      .eq('status', 'active')
      .eq('condition', NEW_CONDITION);

    if (error) throw error;
    const byId = new Map(((data ?? []) as unknown as ListingRow[]).map((row) => [row.id, row]));
    const rows = ids.map((id) => byId.get(id)).filter((row): row is ListingRow => Boolean(row));
    const hasMore = ids.length === PAGE_SIZE;

    if (rows.length > 0 || !hasMore) {
      return { rows, hasMore, page: currentPage };
    }

    currentPage += 1;
  }
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

/* ─────────────────────────── offers ─────────────────────────── */

/**
 * `offer_state` in the database. There are six, and the UI must not invent a
 * seventh: `expired` is set by whatever sweeps `expires_at`, and the other five
 * are reachable from the app.
 */
export type OfferRow = {
  id: string;
  conversation_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_cents: number;
  state: 'open' | 'countered' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
  counter_of: string | null;
  expires_at: string | null;
  responded_at: string | null;
  created_at: string;
};

const OFFER_SELECT =
  'id, conversation_id, listing_id, buyer_id, seller_id, amount_cents, state, counter_of, expires_at, responded_at, created_at';

/** Every offer in a thread, newest first. RLS limits this to the two parties. */
export async function fetchOffers(conversationId: string): Promise<OfferRow[]> {
  const { data, error } = await supabase
    .from('offers')
    .select(OFFER_SELECT)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as OfferRow[];
}

/**
 * The buyer's accepted offer on a listing, if there is one.
 *
 * Checkout uses it to know whether a negotiated price applies. The server
 * re-reads and re-checks the same row before charging anything — this is for
 * showing the right number, not for deciding it.
 */
export async function fetchAcceptedOffer(listingId: string): Promise<OfferRow | null> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return null;

  const { data, error } = await supabase
    .from('offers')
    .select(OFFER_SELECT)
    .eq('listing_id', listingId)
    .eq('buyer_id', me)
    .eq('state', 'accepted')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as OfferRow) ?? null;
}

/* ─────────────────────────── orders ─────────────────────────── */

export type OrderRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_id: string | null;
  item_price_cents: number;
  shipping_cents: number;
  protection_fee_cents: number;
  /** Generated column: the three above, summed by Postgres. */
  total_cents: number;
  currency: string;
  delivery_kind: string;
  delivery_key: string;
  status:
    | 'pending_payment'
    | 'paid'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled'
    | 'refunded'
    | 'disputed';
  placed_at: string;
  paid_at: string | null;
  listing: { id: string; title: string; images: ListingImageRow[] } | null;
  buyer: ProfileSummary | null;
  seller: ProfileSummary | null;
  payment: {
    status:
      | 'requires_payment_method'
      | 'processing'
      | 'succeeded'
      | 'failed'
      | 'refunded'
      | 'partially_refunded';
    amount_cents: number;
    amount_refunded_cents: number;
    last_error: string | null;
  } | null;
};

const ORDER_SELECT = `
  id, listing_id, buyer_id, seller_id, offer_id,
  item_price_cents, shipping_cents, protection_fee_cents, total_cents, currency,
  delivery_kind, delivery_key, status, placed_at, paid_at,
  listing:listings ( id, title, images:listing_images ( storage_path, position ) ),
  buyer:profiles!orders_buyer_id_fkey ( id, display_name, avatar_url, is_verified, rating_avg, rating_count, lifetime_sales ),
  seller:profiles!orders_seller_id_fkey ( id, display_name, avatar_url, is_verified, rating_avg, rating_count, lifetime_sales ),
  payment:payments ( status, amount_cents, amount_refunded_cents, last_error )
`;

/**
 * The caller's orders, as buyer or seller.
 *
 * `orders_read_party` scopes this; there is no client write path to orders at
 * all, so everything here is the result of a verified Stripe event.
 */
export async function fetchOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .order('placed_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as unknown as OrderRow[];
}

/** One order, or null when it is not the caller's. */
export async function fetchOrder(id: string): Promise<OrderRow | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as OrderRow) ?? null;
}

/** The single-row platform configuration. Readable, never guessed at. */
export async function fetchPlatformSettings(): Promise<{
  protection_fee_cents: number;
  base_currency: string;
}> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('protection_fee_cents, base_currency')
    .eq('id', true)
    .single();

  if (error) throw error;
  return data as { protection_fee_cents: number; base_currency: string };
}

/* ─────────────────────────── notifications ─────────────────────────── */

export type NotificationRow = {
  id: string;
  user_id: string;
  /** Free text on the table: offer_received | message | order_placed | shipped | … */
  kind: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

/** The caller's own notifications. `notifications_read_own` scopes this. */
export async function fetchNotifications(): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, kind, title, body, data, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

/**
 * Live rows for a set of listing ids, for the cart.
 *
 * Reads under the same policy as every other listing read, so an id that has
 * been sold, withdrawn, or hidden simply does not come back — the cart treats
 * absence as "no longer available" rather than guessing at a title for it.
 */
export async function fetchListingsByIds(ids: readonly string[]): Promise<ListingRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .in('id', [...ids])
    .eq('status', 'active')
    .eq('condition', NEW_CONDITION);

  if (error) throw error;
  return (data ?? []) as unknown as ListingRow[];
}

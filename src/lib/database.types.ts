/**
 * Row shapes for the tables the app reads.
 *
 * Hand-written rather than generated: `supabase gen types` needs a logged-in
 * CLI, and this session has no Supabase credentials. Every field here was taken
 * from the ordered SQL files in `supabase/migrations`, and the existing query
 * shapes in `queries.ts` were run against the live REST endpoint before being
 * committed to. When the CLI is available, replace this file with generated
 * output — it is a stand-in, not a second source of truth.
 */

export type ListingCondition = 'new' | 'very_good' | 'good';

export type ListingStatus = 'draft' | 'active' | 'reserved' | 'sold' | 'removed';

export type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  parent_id: string | null;
  icon_key: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  /** Existing placement flags retained for backward-compatible Home/Browse curation. */
  in_explore: boolean;
  in_home: boolean;
};

export type ProfileSummary = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  /** `numeric(2,1)`; PostgREST returns it as a number, null until rated. */
  rating_avg: number | null;
  rating_count: number;
  lifetime_sales: number;
};

/** Public-safe seller configuration stored by the bundle-discount migration. */
export type BundleDiscountSettingsRow = {
  seller_id: string;
  is_enabled: boolean;
  min_items_1: number | null;
  discount_percent_1: number | null;
  min_items_2: number | null;
  discount_percent_2: number | null;
  min_items_3: number | null;
  discount_percent_3: number | null;
  updated_at: string;
};

export type ReferralRow = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  created_at: string;
};

export type SellerBadgeIconKey =
  | 'package'
  | 'grid'
  | 'star'
  | 'badgeCheck'
  | 'person'
  | 'send';

/** One current-user row returned by the trusted `get_my_badges()` RPC. */
export type SellerBadgeRow = {
  badge_key: string;
  title: string;
  description: string;
  requirement: string;
  icon_key: SellerBadgeIconKey;
  sort_order: number;
  earned_at: string | null;
  progress_current: number | null;
  progress_target: number | null;
};

/** Public profile fields needed to identify the seller on Listing Detail. */
export type SellerIdentity = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_color: string | null;
  city: string | null;
  country_code: string | null;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
  holiday_mode: boolean;
};

export type ListingImageRow = {
  storage_path: string;
  position: number;
};

/** A listing as the feed and the grid need it. */
export type ListingRow = {
  id: string;
  title: string;
  brand: string | null;
  price_cents: number;
  original_price_cents: number | null;
  currency: string;
  condition: ListingCondition;
  category_slug: string;
  /** The category row `category_slug` points at, for its display label. */
  category: { slug: string; label: string } | null;
  size: string | null;
  color: string | null;
  city: string | null;
  country_code: string;
  tagline: string | null;
  published_at: string | null;
  seller: ProfileSummary | null;
  images: ListingImageRow[];
};

/** Everything above, plus the fields only the detail screen needs. */
export type ListingDetailRow = Omit<ListingRow, 'seller'> & {
  description: string | null;
  status: ListingStatus;
  seller_id: string;
  seller: SellerIdentity | null;
  category: {
    slug: string;
    label: string;
  } | null;
};

/**
 * The `listing_condition` enum, in the wording the UI shows.
 *
 * The type still lists all three values because that is what the column
 * accepts — writing it down as `'new'` alone would be a description of the
 * database that is not true.
 *
 * NILYA sells new products only, so `'new'` is the only value the app writes and
 * the only one it reads: `createDraftListing` sets it, and every feed query
 * filters on it. The other two are reachable in Postgres and by nothing else.
 *
 * SCHEMA LIMITATION: the enum permits `very_good` and `good`, so the rule is
 * enforced by this application rather than by the database. A row written by
 * any other client could still carry a used condition. Closing that properly
 * needs a migration — `alter table listings add constraint listings_are_new
 * check (condition = 'new')` — which is outside what this task may change.
 */
export const CONDITION_LABEL: Record<ListingCondition, string> = {
  new: 'New',
  very_good: 'Very good',
  good: 'Good',
};

/** Every NILYA product is new. The single value the app ever writes or filters. */
export const NEW_CONDITION: ListingCondition = 'new';

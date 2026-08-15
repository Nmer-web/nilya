/**
 * Row shapes for the tables the app reads.
 *
 * Hand-written rather than generated: `supabase gen types` needs a logged-in
 * CLI, and this session has no Supabase credentials. Every field here was taken
 * from `supabase/migrations/20260812120451_sawa_core_schema.sql`, and the query
 * shapes in `queries.ts` were run against the live REST endpoint before being
 * committed to. When the CLI is available, replace this file with generated
 * output — it is a stand-in, not a second source of truth.
 */

export type ListingCondition = 'new' | 'very_good' | 'good';

export type ListingStatus = 'draft' | 'active' | 'reserved' | 'sold' | 'removed';

export type CategoryRow = {
  slug: string;
  label: string;
  sort_order: number;
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
  city: string | null;
  country_code: string;
  tagline: string | null;
  published_at: string | null;
  seller: ProfileSummary | null;
  images: ListingImageRow[];
};

/** Everything above, plus the fields only the detail screen needs. */
export type ListingDetailRow = ListingRow & {
  description: string | null;
  size: string | null;
  color: string | null;
  status: ListingStatus;
  seller_id: string;
};

/**
 * The `listing_condition` enum, in the wording the UI shows.
 *
 * The type still lists all three values because that is what the column
 * accepts — writing it down as `'new'` alone would be a description of the
 * database that is not true.
 *
 * SAWA sells new products only, so `'new'` is the only value the app writes and
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

/** Every SAWA product is new. The single value the app ever writes or filters. */
export const NEW_CONDITION: ListingCondition = 'new';

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

/** The catalog's `listing_condition` enum, in the wording the UI shows. */
export const CONDITION_LABEL: Record<ListingCondition, string> = {
  new: 'New',
  very_good: 'Very good',
  good: 'Good',
};

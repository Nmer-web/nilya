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

/** The server-validated kind of record stored in `listings`. */
export type ListingType = 'product' | 'food' | 'job' | 'service';

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
  listing_type: ListingType;
  /** Product categories under Perfumes & Incense require `perfume_details`. */
  requires_perfume_details: boolean;
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

export type FoodDetailsRow = {
  listing_id: string;
  price_unit: 'item' | 'kg' | 'g' | 'litre' | 'ml' | 'pack' | 'dozen';
  quantity: number;
  ingredients: string;
  allergens: string;
  expiry_date: string;
  halal_status: 'halal' | 'not_halal' | 'not_specified';
  preparation_type: 'homemade' | 'packaged';
  storage_requirements: string;
  delivery_requirements: string;
  created_at: string;
  updated_at: string;
};

export type PerfumeDetailsRow = {
  listing_id: string;
  brand: string;
  fragrance_name: string;
  fragrance_type:
    | 'parfum'
    | 'eau_de_parfum'
    | 'eau_de_toilette'
    | 'cologne'
    | 'perfume_oil'
    | 'attar'
    | 'oud'
    | 'incense'
    | 'bakhoor'
    | 'other';
  volume_ml: number;
  sealed: boolean;
  authenticity_declared: boolean;
  fragrance_notes: string;
  target_audience: 'women' | 'men' | 'unisex' | 'kids';
  created_at: string;
  updated_at: string;
};

export type JobDetailsRow = {
  listing_id: string;
  employer: string;
  sector: string;
  contract_type: 'full_time' | 'part_time' | 'fixed_term' | 'temporary' | 'freelance' | 'internship';
  schedule: string;
  work_mode: 'onsite' | 'hybrid' | 'remote';
  location: string;
  salary_min_cents: number;
  salary_max_cents: number;
  salary_currency: string;
  required_experience: string;
  application_method: 'in_app' | 'external_url' | 'email' | 'phone';
  application_value: string | null;
  application_deadline: string;
  created_at: string;
  updated_at: string;
};

export type ServiceDetailsRow = {
  listing_id: string;
  pricing_mode: 'fixed' | 'hourly' | 'daily' | 'quote';
  service_area: string;
  delivery_mode: 'onsite' | 'remote' | 'either';
  availability: string;
  experience: string;
  created_at: string;
  updated_at: string;
};

/** A listing as the feed and the grid need it. */
export type ListingRow = {
  id: string;
  title: string;
  brand: string | null;
  price_cents: number | null;
  original_price_cents: number | null;
  currency: string;
  condition: ListingCondition | null;
  listing_type: ListingType;
  category_slug: string;
  /** The category row `category_slug` points at, for its display label. */
  category: {
    slug: string;
    label: string;
    listing_type: ListingType;
    requires_perfume_details: boolean;
  } | null;
  size: string | null;
  color: string | null;
  city: string | null;
  country_code: string;
  tagline: string | null;
  published_at: string | null;
  seller: ProfileSummary | null;
  images: ListingImageRow[];
  food_details: FoodDetailsRow | null;
  perfume_details: PerfumeDetailsRow | null;
  job_details: JobDetailsRow | null;
  service_details: ServiceDetailsRow | null;
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
    listing_type: ListingType;
    requires_perfume_details: boolean;
  } | null;
};

/**
 * The `listing_condition` enum, in the wording the UI shows.
 *
 * The type still lists all three values because that is what the column
 * accepts — writing it down as `'new'` alone would be a description of the
 * database that is not true.
 *
 * Product and food rows use only `'new'`; job and service rows store null.
 * `listings_typed_core_fields` enforces that distinction in PostgreSQL. The
 * legacy enum members remain because removing them would rewrite history, but
 * canonical public RLS excludes rows that do not satisfy the typed invariant.
 */
export const CONDITION_LABEL: Record<ListingCondition, string> = {
  new: 'New',
  very_good: 'Very good',
  good: 'Good',
};

/** Every purchasable Nilya product and food listing is new. */
export const NEW_CONDITION: ListingCondition = 'new';

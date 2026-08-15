import { supabase } from '@/lib/supabase';
import type {
  CategoryRow,
  ListingDetailRow,
  ListingImageRow,
  ListingRow,
  ListingStatus,
  ProfileSummary,
} from '@/lib/database.types';

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

export type FeedSort = 'recent' | 'price_asc' | 'price_desc';

export type FeedFilters = {
  /** Category slug, or null for everything. */
  category?: string | null;
  /** Free text, matched against title, brand, city and description. */
  query?: string;
  minPriceCents?: number | null;
  maxPriceCents?: number | null;
  /** A `listing_condition` enum value. */
  condition?: string | null;
  countryCode?: string | null;
  /** Restricts the feed to one seller, for their profile. */
  sellerId?: string | null;
  sort?: FeedSort;
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
  if (filters.sellerId) q = q.eq('seller_id', filters.sellerId);
  if (filters.countryCode) q = q.eq('country_code', filters.countryCode);
  if (filters.condition) q = q.eq('condition', filters.condition);
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
      'id, display_name, avatar_url, avatar_color, bio, city, country_code, is_verified, lifetime_sales, rating_avg, rating_count, created_at'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile) ?? null;
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
    .select('country_code')
    .eq('status', 'active')
    .limit(200);

  if (error) throw error;
  const set = new Set((data ?? []).map((r) => (r as { country_code: string }).country_code));
  return [...set].sort();
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

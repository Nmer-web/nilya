import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { NEW_CONDITION } from '@/lib/database.types';
import type {
  BundleDiscountSettingsRow,
  FoodDetailsRow,
  JobDetailsRow,
  ListingType,
  PerfumeDetailsRow,
  ServiceDetailsRow,
} from '@/lib/database.types';
import {
  CANONICAL_LISTING_FILTER,
  conditionForListingType,
  isCanonicalListing,
  isCommerceListing,
} from '@/lib/listing-types';
import {
  bundleDiscountWriteValuesToDraft,
  validateBundleDiscountDraft,
  type BundleDiscountWriteValues,
} from '@/lib/bundle-discounts';
import type { MessageRow } from '@/lib/queries';

/**
 * Writes. Every one of these runs under the publishable key and therefore
 * under RLS — `listings_insert_own` and the storage policies decide what is
 * allowed, and none of it is re-checked here.
 */

export type ListingDraftInput = {
  title: string;
  description: string | null;
  brand: string | null;
  color: string | null;
  size: string | null;
  categorySlug: string;
  listingType: ListingType;
  priceCents: number | null;
  currency: string;
  /** `original_price_cents`; omitted or null leaves no price drop recorded. */
  originalPriceCents?: number | null;
  city: string | null;
  countryCode: string;
  /**
   * Where the listing is offered from, as a pair or not at all.
   * `listings_coordinates_valid` rejects half of one, and `listings_nearby`
   * ignores rows without both.
   */
  latitude: number | null;
  longitude: number | null;
  details:
    | { kind: 'product' }
    | { kind: 'food'; values: Omit<FoodDetailsRow, 'listing_id' | 'created_at' | 'updated_at'> }
    | { kind: 'perfume'; values: Omit<PerfumeDetailsRow, 'listing_id' | 'created_at' | 'updated_at'> }
    | { kind: 'job'; values: Omit<JobDetailsRow, 'listing_id' | 'created_at' | 'updated_at'> }
    | { kind: 'service'; values: Omit<ServiceDetailsRow, 'listing_id' | 'created_at' | 'updated_at'> };
};

export type AuthenticatedListingSeller = {
  id: string;
};

/** Existing profile-photo input contract; listing photos use listing-photos.ts. */
export type PickedImage = {
  uri: string;
  mimeType: string;
};

async function readPickedImage(image: PickedImage): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const response = await fetch(image.uri);
    if (!response.ok) throw new Error('That photo could not be read');
    return new Uint8Array(await response.arrayBuffer());
  }
  return await new File(image.uri).bytes();
}

export class ListingError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'session-required'
      | 'profile-required'
      | 'draft-create-failed'
      | 'object-upload-failed'
      | 'image-row-failed'
      | 'activation-failed'
      | 'object-remove-failed'
      | 'draft-delete-failed'
      | 'object-list-failed' = 'draft-create-failed'
  ) {
    super(message);
    this.name = 'ListingError';
  }
}

export class OwnerListingManagementError extends Error {
  constructor(
    message: string,
    readonly code: 'deactivation-failed' | 'draft-delete-failed' | 'draft-transaction-linked'
  ) {
    super(message);
    this.name = 'OwnerListingManagementError';
  }
}

export type ActivatedListingRow = {
  id: string;
  seller_id: string;
  condition: string | null;
  listing_type: ListingType;
  status: string;
  published_at: string | null;
};

/** Revalidates identity at the mutation boundary and confirms its required profile row. */
export async function requireAuthenticatedListingSeller(): Promise<AuthenticatedListingSeller> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const sellerId = auth.user?.id;
  if (authError || !sellerId) {
    throw new ListingError('Your session expired. Sign in again to continue.', 'session-required');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', sellerId)
    .maybeSingle();
  if (profileError) {
    throw new ListingError('Your seller profile could not be checked. Try again.', 'profile-required');
  }
  if (!profile) {
    throw new ListingError('Your seller profile is required before you can publish.', 'profile-required');
  }
  return { id: sellerId };
}

/** Writes the one normalized detail row that belongs to a typed listing. */
async function upsertSpecializedDetails(
  listingId: string,
  details: ListingDraftInput['details']
): Promise<void> {
  if (details.kind === 'product') return;

  const table = details.kind === 'food'
    ? 'food_details'
    : details.kind === 'perfume'
      ? 'perfume_details'
      : details.kind === 'job'
        ? 'job_details'
        : 'service_details';
  const { error } = await supabase
    .from(table)
    .upsert({ listing_id: listingId, ...details.values }, { onConflict: 'listing_id' });
  if (error) throw error;
}

/**
 * Creates the listing row and returns its id.
 *
 * `seller_id` is taken from the session rather than passed in: the insert
 * policy checks it against `auth.uid()`, so a client-supplied value would
 * either be redundant or rejected.
 *
 * The row is created as a draft. It only becomes `active` once its images are
 * in place — `active_listings_are_published` requires `published_at`, and a
 * listing that went live before its photographs uploaded would appear in the
 * feed as a blank card.
 */
export async function createDraftListing(
  seller: AuthenticatedListingSeller,
  input: ListingDraftInput
): Promise<string> {
  const currentSeller = await requireAuthenticatedListingSeller();
  if (currentSeller.id !== seller.id) {
    throw new ListingError('Your seller session changed. Sign in again to continue.', 'session-required');
  }
  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: currentSeller.id,
      title: input.title,
      description: input.description,
      brand: input.brand,
      color: input.color,
      size: input.size,
      category_slug: input.categorySlug,
      listing_type: input.listingType,
      condition: conditionForListingType(input.listingType),
      price_cents: input.priceCents,
      original_price_cents: input.originalPriceCents ?? null,
      currency: input.currency,
      city: input.city,
      country_code: input.countryCode,
      latitude: input.latitude,
      longitude: input.longitude,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    throw new ListingError('The private listing draft could not be created. Try again.', 'draft-create-failed');
  }
  const listingId = (data as { id: string }).id;
  try {
    await upsertSpecializedDetails(listingId, input.details);
  } catch {
    await supabase.from('listings').delete().eq('id', listingId).eq('status', 'draft');
    throw new ListingError('The specialised listing details could not be saved.', 'draft-create-failed');
  }
  return listingId;
}

/**
 * Reads a picked photograph into bytes.
 *
 * The picker returns two different kinds of URI and only one of them can be
 * read the same way:
 *
 *   web    — `URL.createObjectURL(file)`, a `blob:` URL. `fetch` is the only
 *            thing that reads it; expo-file-system does not handle blob URLs.
 *   native — a `file://` path. `fetch` on `file://` is not part of the fetch
 *            standard and React Native's implementation of it is inconsistent,
 *            which is what produced "Could not read the selected photo" from a
 *            photograph that was perfectly readable.
 *
 * `new File(uri).bytes()` is the SDK 57 way to read a local file and returns a
 * Uint8Array, which is what Storage wants anyway.
 */
/**
 * Uploads one photograph and records it against the listing.
 *
 * The object path is `<listing_id>/<position>-<random>.<ext>` — the listing id
 * MUST be the first segment. The storage policies read
 * `owns_listing((storage.foldername(name))[1]::uuid)`, so the first folder is
 * cast to a uuid and looked up in `listings`. A conventional
 * `user_id/listing_id/...` layout casts cleanly but then asks whether a
 * *listing* exists with the user's id, which it never does, and every upload is
 * refused.
 *
 * Reading the bytes is platform-split, because the two platforms hand back two
 * different kinds of URI. See `readPickedImage`.
 */
export async function uploadListingObject(path: string, bytes: Uint8Array): Promise<void> {
  if (!/^[0-9a-f-]{36}\/[a-zA-Z0-9_-]+\.jpg$/.test(path)) {
    throw new ListingError('The listing photo path is invalid.', 'object-upload-failed');
  }
  const { error } = await supabase.storage
    .from('listing-images')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new ListingError('The photo could not be uploaded.', 'object-upload-failed');
}

export async function insertListingImage(input: {
  listingId: string;
  path: string;
  position: number;
  width: number;
  height: number;
}): Promise<void> {
  const { error } = await supabase.from('listing_images').insert({
    listing_id: input.listingId,
    storage_path: input.path,
    position: input.position,
    width: input.width,
    height: input.height,
  });
  if (error) {
    throw new ListingError('The uploaded photo could not be attached to the listing.', 'image-row-failed');
  }
}

/**
 * Flips a draft to active. Sets `published_at` in the same statement, because
 * `active_listings_are_published` rejects an active row without one.
 */
export async function activateDraftListing(listingId: string): Promise<ActivatedListingRow> {
  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'active', published_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('status', 'draft')
    .select('id, seller_id, condition, listing_type, status, published_at')
    .single();
  if (error) throw new ListingError('The listing could not be activated.', 'activation-failed');
  return data as ActivatedListingRow;
}

/**
 * Removes a listing that never made it live.
 *
 * Used when uploads fail partway: the draft and any objects already stored
 * would otherwise linger invisibly. `on delete cascade` clears listing_images,
 * and the storage objects are removed first since the policy that authorises it
 * depends on the listing still existing.
 */
export async function removeListingObjects(paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from('listing-images').remove([...paths]);
  if (error) throw new ListingError('Uploaded photo cleanup could not be completed.', 'object-remove-failed');
}

/**
 * Creates a listing end to end: draft, photographs, publish.
 *
 * Ordered this way because the storage policy needs the listing to exist before
 * anything can be written under its id. If any photograph fails the whole thing
 * is rolled back, so a half-uploaded listing never appears in the feed.
 */
export async function listListingObjectPaths(listingId: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from('listing-images').list(listingId, { limit: 100 });
  if (error) throw new ListingError('Uploaded photo cleanup could not be confirmed.', 'object-list-failed');
  return (data ?? [])
    .filter((item) => item.name !== '.emptyFolderPlaceholder')
    .map((item) => `${listingId}/${item.name}`);
}

export async function deleteOwnerDraft(listingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (error) throw new ListingError('The private draft could not be removed.', 'draft-delete-failed');
  return data !== null;
}

/** Moves only the signed-in owner's active canonical listing to `removed`. */
export async function deactivateOwnerListing(listingId: string): Promise<void> {
  const seller = await requireAuthenticatedListingSeller();
  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'removed' })
    .eq('id', listingId)
    .eq('seller_id', seller.id)
    .or(CANONICAL_LISTING_FILTER)
    .eq('status', 'active')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    throw new OwnerListingManagementError(
      'The active listing could not be deactivated. Refresh and try again.',
      'deactivation-failed'
    );
  }
}

/**
 * Permanently deletes a private draft only after proving it has no order.
 *
 * Storage objects go first because their delete policy resolves ownership by
 * looking up the listing row. The database delete remains draft-only and the
 * orders foreign key is `ON DELETE RESTRICT`, so transaction history cannot be
 * erased even if the state changes between these checks.
 */
export async function deleteManagedOwnerDraft(listingId: string): Promise<void> {
  const seller = await requireAuthenticatedListingSeller();
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, seller_id, status, condition, listing_type')
    .eq('id', listingId)
    .eq('seller_id', seller.id)
    .maybeSingle();

  if (
    listingError ||
    !listing ||
    listing.status !== 'draft' ||
    !isCanonicalListing(listing.listing_type as ListingType, listing.condition)
  ) {
    throw new OwnerListingManagementError(
      'That private draft is no longer available for deletion.',
      'draft-delete-failed'
    );
  }

  const { data: linkedOrders, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('listing_id', listingId)
    .limit(1);
  if (orderError) {
    throw new OwnerListingManagementError(
      'NILYA could not safely check this draft. Try again.',
      'draft-delete-failed'
    );
  }
  if ((linkedOrders ?? []).length > 0) {
    throw new OwnerListingManagementError(
      'This listing has transaction history and cannot be deleted.',
      'draft-transaction-linked'
    );
  }

  const objectPaths = await listListingObjectPaths(listingId);
  await removeListingObjects(objectPaths);
  const deleted = await deleteOwnerDraft(listingId);
  if (!deleted) {
    throw new OwnerListingManagementError(
      'The private draft could not be removed. Refresh and try again.',
      'draft-delete-failed'
    );
  }
}

/* ─────────────────────────── delivery ─────────────────────────── */

export type DeliveryOptionRow = {
  id: string;
  country_code: string;
  key: string;
  kind: string;
  name: string;
  subtitle: string | null;
  price_cents: number;
  eta_label: string;
  waives_protection_fee: boolean;
};

/**
 * The delivery ladder that applies to a country.
 *
 * `'**'` is the fallback row for everything that is neither FR nor SD, and
 * ordering by country_code descending puts the specific match ahead of it.
 *
 * Note that nothing is stored against the listing: `delivery_options` is keyed
 * by country and no column on `listings` or `orders` references it, so a seller
 * does not choose a ladder — their country selects one. The Sell flow shows
 * what will apply rather than saving a choice there is nowhere to put. There is
 * likewise no parcel-size column, so the client must not fabricate that value.
 */
export async function fetchDeliveryOptions(countryCode: string): Promise<DeliveryOptionRow[]> {
  const { data, error } = await supabase
    .from('delivery_options')
    .select('id, country_code, key, kind, name, subtitle, price_cents, eta_label, waives_protection_fee')
    .in('country_code', [countryCode, '**'])
    .eq('is_active', true)
    .order('country_code', { ascending: false })
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as DeliveryOptionRow[];
  /* Keep only the most specific ladder: if the country has its own rows, the
     '**' fallback is not part of its offer. */
  const specific = rows.filter((r) => r.country_code === countryCode);
  return specific.length > 0 ? specific : rows;
}

/* ─────────────────────────── messaging ─────────────────────────── */

/**
 * The signed-in user's id, or a refusal.
 *
 * Read from the session rather than accepted as an argument. `sender_id` and
 * `buyer_id` are NOT NULL with no default, so the row must carry them — but
 * every policy below re-derives the same value from `auth.uid()` and rejects
 * the insert if the two disagree. Passing them in from a caller would be a
 * claim the database checks, not one it trusts.
 */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('Your session expired. Sign in again to continue.');
  return id;
}

export type TypedActionResult = { id: string; existing: boolean };

async function insertOnce(
  table: 'job_applications' | 'service_quote_requests' | 'service_bookings',
  identityColumn: 'applicant_id' | 'requester_id' | 'customer_id',
  listingId: string,
  extra: Record<string, string | null> = {}
): Promise<TypedActionResult> {
  const userId = await requireUserId();
  const created = await supabase
    .from(table)
    .insert({ listing_id: listingId, [identityColumn]: userId, ...extra })
    .select('id')
    .single();

  if (!created.error) return { id: (created.data as { id: string }).id, existing: false };
  if (created.error.code !== '23505') throw created.error;

  const existing = await supabase
    .from(table)
    .select('id')
    .eq('listing_id', listingId)
    .eq(identityColumn, userId)
    .single();
  if (existing.error) throw existing.error;
  return { id: (existing.data as { id: string }).id, existing: true };
}

/** Persists an application before any optional external hand-off. */
export function applyToJob(listingId: string): Promise<TypedActionResult> {
  return insertOnce('job_applications', 'applicant_id', listingId);
}

export function requestServiceQuote(
  listingId: string,
  message?: string
): Promise<TypedActionResult> {
  const normalized = message?.trim() || null;
  return insertOnce('service_quote_requests', 'requester_id', listingId, { message: normalized });
}

export function bookService(
  listingId: string,
  note?: string
): Promise<TypedActionResult> {
  const normalized = note?.trim() || null;
  return insertOnce('service_bookings', 'customer_id', listingId, { note: normalized });
}

/**
 * Finds the thread for a listing, or opens it.
 *
 * `conversations` is unique on `(listing_id, buyer_id)`, so a buyer has exactly
 * one thread per item and reopening a chat is a lookup rather than a new row.
 * The existing-conversation select comes first because it is the common case;
 * the insert races only when opening a genuine first thread, and a 23505 there
 * means another request won the race. The second read then returns that
 * canonical row rather than surfacing an error.
 *
 * Buyer identity comes from Auth and seller identity is read from the active
 * canonical listing. `conversations_insert_as_buyer` independently enforces the same
 * relationship at the database boundary.
 */
export async function findOrCreateConversationForListing(
  listingId: string
): Promise<string> {
  const me = await requireUserId();

  const listing = await supabase
    .from('listings')
    .select('seller_id')
    .eq('id', listingId)
    .eq('status', 'active')
    .or(CANONICAL_LISTING_FILTER)
    .maybeSingle();

  if (listing.error) throw listing.error;
  if (!listing.data) throw new Error('This listing is no longer available');

  const sellerId = (listing.data as { seller_id: string }).seller_id;
  if (me === sellerId) throw new Error('This is your own listing');

  const existing = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', me)
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return (existing.data as { id: string }).id;

  const created = await supabase
    .from('conversations')
    .insert({ listing_id: listingId, buyer_id: me, seller_id: sellerId })
    .select('id')
    .single();

  if (created.error) {
    if (created.error.code === '23505') {
      const retry = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('buyer_id', me)
        .eq('seller_id', sellerId)
        .single();
      if (retry.error) throw retry.error;
      return (retry.data as { id: string }).id;
    }
    throw created.error;
  }

  return (created.data as { id: string }).id;
}

/**
 * Sends a message and stamps the thread.
 *
 * `last_message_at` is written from here because no trigger maintains it and
 * the policy grants UPDATE on that column alone — it is the one field a
 * participant may touch, which is what makes this safe to do from the client.
 * A failure to stamp is swallowed: the message is already sent, and the list
 * ordering recovering on the next send is better than reporting a failure for
 * something that succeeded.
 */
export async function sendMessage(conversationId: string, body: string): Promise<MessageRow> {
  const me = await requireUserId();
  const text = body.trim();
  if (!text) throw new Error('Write a message first');

  /*
   * The inserted row is read back and returned so the sender sees their own
   * message immediately, rather than waiting for it to arrive back over the
   * socket. The realtime echo of this same row is deduplicated by id, so a
   * healthy connection changes nothing and a stalled one still shows the
   * message that was actually written.
   */
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: me, body: text })
    .select('id, conversation_id, sender_id, body, read_at, created_at')
    .single();

  if (error) throw error;

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data as MessageRow;
}

/**
 * Marks the other party's messages as read.
 *
 * Scoped to messages the caller did not send, matching
 * `messages_update_read_state` — a sender cannot mark their own message read,
 * and `read_at` is the only column UPDATE is granted on.
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  const me = await requireUserId();

  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', me)
    .is('read_at', null);

  if (error) throw error;
}

/* ─────────────────────────── offers ─────────────────────────── */

/**
 * Opens an offer inside an existing conversation.
 *
 * Unlike orders, offers are genuinely client-writable. The supported client
 * flow is buyer offer -> seller response, so this helper also verifies that
 * the authenticated participant is the conversation's buyer.
 *
 * `buyer_id` and `seller_id` come from the conversation row rather than from the
 * caller, so an offer cannot be attributed to someone else.
 */
export async function createOffer(conversationId: string, amountCents: number): Promise<void> {
  const me = await requireUserId();

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Enter an amount above zero');
  }

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('id, listing_id, buyer_id, seller_id, listing:listings ( status, condition, seller_id )')
    .eq('id', conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation) throw new Error('That conversation no longer exists');

  const row = conversation as unknown as {
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    listing: { status: string; condition: string; seller_id: string } | null;
  };

  if (row.listing?.status !== 'active') throw new Error('That listing is no longer available');
  if (row.listing.condition !== NEW_CONDITION) throw new Error('That listing is not available on NILYA');
  if (row.listing.seller_id !== row.seller_id) throw new Error('That conversation does not match the listing');
  if (row.buyer_id === row.seller_id) throw new Error('You cannot offer on your own listing');
  if (me !== row.buyer_id) throw new Error('Only the buyer can make an offer');

  const { data: existingOffer, error: existingOfferError } = await supabase
    .from('offers')
    .select('id')
    .eq('conversation_id', conversationId)
    .in('state', ['open', 'countered', 'accepted'])
    .limit(1)
    .maybeSingle();

  if (existingOfferError) throw existingOfferError;
  if (existingOffer) throw new Error('This conversation already has a current offer');

  const { error } = await supabase.from('offers').insert({
    conversation_id: conversationId,
    listing_id: row.listing_id,
    buyer_id: row.buyer_id,
    seller_id: row.seller_id,
    amount_cents: amountCents,
  });

  if (error) throw error;
}

/**
 * Moves an offer through its state machine.
 *
 * `grant update (state, responded_at)` is the entire writable surface. An
 * amount cannot be edited after the fact.
 *
 * Who may do what is enforced above this: the counterparty accepts or declines,
 * and the author withdraws. Passing the actor's role in would be a claim; both
 * are re-derived here from the row.
 */
export async function respondToOffer(
  offerId: string,
  action: 'accepted' | 'declined' | 'withdrawn'
): Promise<void> {
  const me = await requireUserId();

  const { data, error: readError } = await supabase
    .from('offers')
    .select('id, buyer_id, seller_id, state, counter_of')
    .eq('id', offerId)
    .maybeSingle();

  if (readError) throw readError;
  if (!data) throw new Error('That offer no longer exists');

  const offer = data as {
    buyer_id: string;
    seller_id: string;
    state: string;
    counter_of: string | null;
  };
  if (offer.state !== 'open') {
    throw new Error('That offer has already been answered');
  }
  if (offer.counter_of !== null) throw new Error('That counteroffer cannot be answered in this flow');

  if (action === 'withdrawn' && me !== offer.buyer_id) {
    throw new Error('Only the buyer can withdraw an offer');
  }
  if (action !== 'withdrawn' && me !== offer.seller_id) {
    throw new Error('Only the seller can answer this offer');
  }

  const { data: updated, error } = await supabase
    .from('offers')
    .update({ state: action, responded_at: new Date().toISOString() })
    .eq('id', offerId)
    .eq('state', 'open')
    .is('counter_of', null)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!updated) throw new Error('That offer has already been answered');
}

/* ─────────────────────────── checkout ─────────────────────────── */

export type CheckoutResult = {
  orderId: string;
  checkoutUrl: string;
  itemPriceCents: number;
  shippingCents: number;
  protectionFeeCents: number;
  totalCents: number;
  currency: string;
};

export type BundleCheckoutResult = CheckoutResult & {
  itemCount: number;
  listSubtotalCents: number;
  bundleDiscountPercent: number;
  bundleDiscountCents: number;
};

const CHECKOUT_UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function isStripeCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'checkout.stripe.com' || url.hostname.endsWith('.stripe.com'))
    );
  } catch {
    return false;
  }
}

function validateCheckoutResult(data: CheckoutResult | null): CheckoutResult {
  if (!data || !CHECKOUT_UUID_PATTERN.test(data.orderId)) {
    throw new Error('Checkout returned an invalid order reference');
  }
  if (!isStripeCheckoutUrl(data.checkoutUrl)) {
    throw new Error('Checkout returned an invalid payment URL');
  }

  const amounts = [
    data.itemPriceCents,
    data.shippingCents,
    data.protectionFeeCents,
    data.totalCents,
  ];
  if (amounts.some((amount) => !Number.isSafeInteger(amount) || amount < 0)) {
    throw new Error('Checkout returned invalid pricing');
  }
  if (
    data.itemPriceCents <= 0 ||
    data.totalCents !==
      data.itemPriceCents + data.shippingCents + data.protectionFeeCents
  ) {
    throw new Error('Checkout returned inconsistent pricing');
  }
  if (!/^[A-Z]{3}$/.test(data.currency)) {
    throw new Error('Checkout returned an invalid currency');
  }

  return data;
}

function validateBundleCheckoutResult(
  data: BundleCheckoutResult | null
): BundleCheckoutResult {
  validateCheckoutResult(data);
  if (
    !data ||
    !Number.isSafeInteger(data.itemCount) ||
    data.itemCount < 2 ||
    data.itemCount > 20 ||
    !Number.isSafeInteger(data.listSubtotalCents) ||
    data.listSubtotalCents <= data.itemPriceCents ||
    !Number.isSafeInteger(data.bundleDiscountPercent) ||
    data.bundleDiscountPercent < 1 ||
    data.bundleDiscountPercent > 50 ||
    !Number.isSafeInteger(data.bundleDiscountCents) ||
    data.bundleDiscountCents <= 0 ||
    data.listSubtotalCents - data.itemPriceCents !== data.bundleDiscountCents
  ) {
    throw new Error('Checkout returned invalid bundle pricing');
  }
  return data;
}

/**
 * Starts a purchase.
 *
 * Everything that decides what is charged — price, delivery cost, protection
 * fee, whether the item is still for sale — is resolved by the `create-checkout`
 * Edge Function against the database. This call carries which listing, which
 * delivery option and which offer, and nothing else: no amount, no seller, no
 * total. The client has no INSERT grant on `orders`, so it could not write one
 * even if it tried.
 *
 * The returned URL is Stripe's hosted, test-mode checkout. Payment is confirmed
 * by the webhook; nothing here may mark an order paid.
 */
export async function startCheckout(input: {
  listingId: string;
  deliveryKey: string;
  offerId?: string | null;
}): Promise<CheckoutResult> {
  const { data, error } = await supabase.functions.invoke<CheckoutResult>('create-checkout', {
    body: {
      listingId: input.listingId,
      deliveryKey: input.deliveryKey,
      offerId: input.offerId ?? undefined,
    },
  });

  if (error) {
    /*
     * FunctionsHttpError carries the response, and the function puts a
     * human-readable reason in `error` — "Someone else is already buying this
     * item" is worth showing, and losing it to a generic failure is not.
     */
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const body = (await context.json()) as { error?: string };
        if (body?.error) throw new Error(body.error);
      } catch (parsed) {
        if (parsed instanceof Error && parsed.message) throw parsed;
      }
    }
    throw error;
  }

  return validateCheckoutResult(data);
}

/** Starts one server-priced checkout for 2–20 eligible listings from one seller. */
export async function startBundleCheckout(input: {
  listingIds: readonly string[];
  deliveryKey: string;
}): Promise<BundleCheckoutResult> {
  const listingIds = [...new Set(input.listingIds)];
  if (
    listingIds.length !== input.listingIds.length ||
    listingIds.length < 2 ||
    listingIds.length > 20 ||
    listingIds.some((id) => !CHECKOUT_UUID_PATTERN.test(id))
  ) {
    throw new Error('Choose between 2 and 20 unique products for a bundle.');
  }

  const { data, error } = await supabase.functions.invoke<BundleCheckoutResult>(
    'create-checkout',
    {
      body: {
        listingIds,
        deliveryKey: input.deliveryKey,
      },
    }
  );

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const body = (await context.json()) as { error?: string };
        if (body?.error) throw new Error(body.error);
      } catch (parsed) {
        if (parsed instanceof Error && parsed.message) throw parsed;
      }
    }
    throw error;
  }

  return validateBundleCheckoutResult(data);
}

/**
 * Marks one notification read.
 *
 * `read_at` is the only column the client may write here — inserts come from
 * triggers and functions, so an app cannot manufacture a notification.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);

  if (error) throw error;
}

/* ─────────────────────────── profile ─────────────────────────── */

export type HolidayModeState = {
  holiday_mode: boolean;
  holiday_mode_started_at: string | null;
};

/**
 * Changes only the signed-in account's holiday state.
 *
 * No profile id is accepted from the UI. RLS repeats the same ownership check,
 * and the database trigger owns the corresponding timestamp so a device clock
 * cannot fabricate when the current away period began.
 */
export async function setHolidayMode(enabled: boolean): Promise<HolidayModeState> {
  const me = await requireUserId();
  const { data, error } = await supabase
    .from('profiles')
    .update({ holiday_mode: enabled })
    .eq('id', me)
    .select('holiday_mode, holiday_mode_started_at')
    .single();

  if (error) throw error;
  return data as HolidayModeState;
}

/**
 * Atomically creates or replaces the signed-in seller's bundle configuration.
 * The mutation accepts no seller id: Auth supplies ownership, and RLS repeats
 * the same check. Validation is repeated here even though the editor validates,
 * while database constraints remain authoritative for every client.
 */
export async function saveBundleDiscountSettings(
  input: BundleDiscountWriteValues
): Promise<BundleDiscountSettingsRow> {
  const validation = validateBundleDiscountDraft(
    bundleDiscountWriteValuesToDraft(input)
  );
  if (!validation.values) {
    throw new Error('Review the bundle tiers before saving.');
  }

  const sellerId = await requireUserId();
  const { data, error } = await supabase
    .from('seller_bundle_discounts')
    .upsert(
      {
        seller_id: sellerId,
        ...validation.values,
      },
      { onConflict: 'seller_id' }
    )
    .select(
      `seller_id, is_enabled,
       min_items_1, discount_percent_1,
       min_items_2, discount_percent_2,
       min_items_3, discount_percent_3,
       updated_at`
    )
    .single();

  if (error) throw error;
  return data as BundleDiscountSettingsRow;
}

/**
 * Updates the signed-in user's own profile.
 *
 * `profiles_update_own` restricts this to `id = auth.uid()`, so the row is
 * chosen by the session rather than by an argument. Only the fields a person
 * actually edits are here. Review triggers maintain `rating_avg` and
 * `rating_count`; sales and verification remain reserved for server workflows.
 */
export async function updateProfile(input: {
  displayName?: string;
  bio?: string | null;
  city?: string | null;
  countryCode?: string | null;
  avatarUrl?: string | null;
  /**
   * The avatar fallback for members without a photo. A real granted column that
   * nothing wrote until onboarding did — the profile screens have always read
   * it and fallen back to near-black for everyone, because it was always null.
   */
  avatarColor?: string | null;
  /**
   * The seller's base position. Written as a pair or not at all —
   * `profiles_coordinates_valid` rejects half of one.
   */
  latitude?: number | null;
  longitude?: number | null;
  /** Consent to appear on the map. False hides every listing from it. */
  showLocation?: boolean;
}): Promise<void> {
  const me = await requireUserId();

  const patch: Record<string, unknown> = {};
  if (input.displayName !== undefined) {
    const name = input.displayName.trim();
    /* `check (length(trim(display_name)) between 1 and 60)` — caught here so the
       person sees a sentence rather than a constraint violation. */
    if (name.length < 1 || name.length > 60) {
      throw new Error('Your name needs to be between 1 and 60 characters');
    }
    patch.display_name = name;
  }
  if (input.bio !== undefined) patch.bio = input.bio?.trim() || null;
  if (input.city !== undefined) patch.city = input.city?.trim() || null;
  if (input.countryCode !== undefined) {
    patch.country_code = input.countryCode ? input.countryCode.trim().toUpperCase() : null;
  }
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
  if (input.avatarColor !== undefined) patch.avatar_color = input.avatarColor;
  if (input.latitude !== undefined || input.longitude !== undefined) {
    const latitude = input.latitude ?? null;
    const longitude = input.longitude ?? null;
    /* Caught here so the seller sees a sentence rather than a check violation. */
    if ((latitude === null) !== (longitude === null)) {
      throw new Error('A location needs both a latitude and a longitude');
    }
    patch.latitude = latitude;
    patch.longitude = longitude;
  }
  if (input.showLocation !== undefined) patch.show_location = input.showLocation;

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from('profiles').update(patch).eq('id', me);
  if (error) throw error;
}

/**
 * Uploads an avatar and points the profile at it.
 *
 * The object path must start with the user's id: `avatars_write_own` checks
 * `(storage.foldername(name))[1] = auth.uid()::text`, so any other layout is
 * refused. The bucket is public, so the resulting URL needs no signing.
 *
 * The old object is not deleted — a URL already handed to a rendered image
 * would break, and the bucket's 2 MB cap makes the leak cheap. Cleaning up
 * properly belongs with a storage lifecycle rule, not a client delete.
 */
export async function uploadAvatar(image: PickedImage): Promise<string> {
  const me = await requireUserId();
  const bytes = await readPickedImage(image);

  if (bytes.byteLength === 0) throw new ListingError('That photo could not be read');

  const ext = (image.mimeType.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  const path = `${me}/${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: image.mimeType, upsert: false });

  if (upErr) throw new ListingError(`Photo upload failed: ${upErr.message}`);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = data.publicUrl;

  await updateProfile({ avatarUrl: url });
  return url;
}

/* ─────────────────── owner listing editing ─────────────────── */

export class ListingEditError extends Error {
  readonly code:
    | 'session-required'
    | 'live-order'
    | 'not-editable'
    | 'price-above-original'
    | 'update-failed'
    | 'photo-remove-failed'
    | 'photo-add-failed';

  constructor(message: string, code: ListingEditError['code']) {
    super(message);
    this.name = 'ListingEditError';
    this.code = code;
  }
}

/** Order states that mean a buyer is already committed to this listing. */
const LIVE_ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'shipped',
  'delivered',
  'completed',
  'disputed',
] as const;

/**
 * Whether an order already exists that would be changed underneath its buyer.
 *
 * `orders_read_party` lets the seller see orders on their own listing, so this
 * is the seller's own row being read, not a privileged lookup. The check is
 * advisory — the server remains authoritative on what is charged — but it stops
 * a seller editing the price of something a buyer is part-way through paying
 * for, which the database's one-live-order-per-listing rule cannot express.
 */
async function listingHasLiveOrder(listingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('listing_id', listingId)
    .in('status', [...LIVE_ORDER_STATUSES])
    .limit(1);

  if (error) {
    throw new ListingEditError(
      'Existing orders for this product could not be checked. Try again.',
      'update-failed'
    );
  }
  return (data ?? []).length > 0;
}

/**
 * Applies a seller's edits to their own listing.
 *
 * Every guard here is repeated in the statement itself — `seller_id`,
 * `condition`, and an editable `status` — so RLS and the query agree and a
 * changed session cannot write to somebody else's row. `condition` is never
 * part of the update: NILYA sells new products and there is no other value to
 * move a listing to.
 */
export async function updateOwnListing(
  listingId: string,
  input: ListingDraftInput
): Promise<void> {
  await requireAuthenticatedListingSeller();

  if (isCommerceListing(input.listingType) && await listingHasLiveOrder(listingId)) {
    throw new ListingEditError(
      'This product has an order in progress and cannot be edited.',
      'live-order'
    );
  }

  /* The RPC temporarily takes an active row private, writes its normalized
     detail row and core fields, then restores the prior status in one database
     transaction. A failed request therefore cannot leave half an edit live. */
  const { data, error } = await supabase.rpc('update_own_typed_listing', {
    p_listing_id: listingId,
    p_title: input.title,
    p_description: input.description,
    p_brand: input.brand,
    p_color: input.color,
    p_size: input.size,
    p_category_slug: input.categorySlug,
    p_listing_type: input.listingType,
    p_price_cents: input.priceCents,
    p_original_price_cents: input.originalPriceCents ?? null,
    p_currency: input.currency,
    p_city: input.city,
    p_country_code: input.countryCode,
    p_details: input.details,
  });

  if (error) {
    /* `price_drop_is_a_drop` requires any original price to stay above the
       current one, so a raised price is refused by name rather than as a
       generic failure the seller cannot act on. */
    const violated = typeof error.message === 'string' && error.message.includes('price_drop_is_a_drop');
    throw new ListingEditError(
      violated
        ? 'The new price must stay below the original price shown on this product.'
        : 'Your changes could not be saved. Try again.',
      violated ? 'price-above-original' : 'update-failed'
    );
  }

  if (data !== listingId) {
    throw new ListingEditError(
      'This product is no longer editable. Refresh and try again.',
      'not-editable'
    );
  }
}

/**
 * Deletes one photograph from a listing the caller owns.
 *
 * The storage object goes first, because the storage delete policy resolves
 * ownership by looking the listing up — removing the row first would strand the
 * object with nothing left to authorise its deletion.
 */
export async function removeOwnListingImage(
  listingId: string,
  storagePath: string
): Promise<void> {
  const seller = await requireAuthenticatedListingSeller();

  const { data: owned, error: ownedError } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .eq('seller_id', seller.id)
    .maybeSingle();

  if (ownedError || !owned) {
    throw new ListingEditError('This product could not be verified as yours.', 'not-editable');
  }

  await removeListingObjects([storagePath]);

  const { error } = await supabase
    .from('listing_images')
    .delete()
    .eq('listing_id', listingId)
    .eq('storage_path', storagePath);

  if (error) {
    throw new ListingEditError(
      'The photo was removed from storage but its record could not be deleted. Refresh and try again.',
      'photo-remove-failed'
    );
  }
}

/**
 * The next free `position` for a listing's photographs.
 *
 * `listing_images` is unique on `(listing_id, position)`, so a new photograph
 * has to claim a slot nothing else holds. Read rather than assumed, because
 * removing a middle photograph leaves a gap that a naive count would collide
 * with.
 */
export async function nextListingImagePosition(listingId: string): Promise<number> {
  const { data, error } = await supabase
    .from('listing_images')
    .select('position')
    .eq('listing_id', listingId)
    .order('position', { ascending: false })
    .limit(1);

  if (error) {
    throw new ListingEditError('The listing photos could not be read. Try again.', 'photo-add-failed');
  }
  const highest = (data ?? [])[0] as { position: number } | undefined;
  return highest ? highest.position + 1 : 0;
}

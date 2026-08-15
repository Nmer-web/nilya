import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { ListingCondition } from '@/lib/database.types';
import type { MessageRow } from '@/lib/queries';

/**
 * Writes. Every one of these runs under the publishable key and therefore
 * under RLS — `listings_insert_own` and the storage policies decide what is
 * allowed, and none of it is re-checked here.
 */

export type NewListing = {
  title: string;
  description: string;
  brand: string;
  categorySlug: string;
  condition: ListingCondition;
  /** Whole currency units as typed; converted to cents on the way in. */
  price: string;
  city: string;
  countryCode: string;
};

/** A photograph chosen on the device, before it has been uploaded. */
export type PickedImage = {
  /** Local file URI from the picker. */
  uri: string;
  mimeType: string;
};

export class ListingError extends Error {}

/** €45.50 → 4550. Rejects anything that is not a positive amount. */
export function priceToCents(price: string): number {
  const n = Number(price.replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0) throw new ListingError('Enter a price above zero');
  return Math.round(n * 100);
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
export async function createDraftListing(input: NewListing): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const sellerId = auth.user?.id;
  if (!sellerId) throw new ListingError('Sign in to publish a listing');

  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: sellerId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      brand: input.brand.trim() || null,
      category_slug: input.categorySlug,
      condition: input.condition,
      price_cents: priceToCents(input.price),
      city: input.city.trim() || null,
      country_code: input.countryCode,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) throw new ListingError(error.message);
  return (data as { id: string }).id;
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
async function readPickedImage(image: PickedImage): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const res = await fetch(image.uri);
    if (!res.ok) throw new ListingError('Could not read the selected photo');
    return new Uint8Array(await res.arrayBuffer());
  }

  try {
    const file = new File(image.uri);
    return await file.bytes();
  } catch (e) {
    throw new ListingError(
      e instanceof Error ? `Could not read the selected photo: ${e.message}` : 'Could not read the selected photo'
    );
  }
}

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
export async function uploadListingImage(
  listingId: string,
  image: PickedImage,
  position: number
): Promise<string> {
  const bytes = await readPickedImage(image);

  if (bytes.byteLength === 0) throw new ListingError('The selected photo was empty');

  const ext = (image.mimeType.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  const path = `${listingId}/${position}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('listing-images')
    .upload(path, bytes, { contentType: image.mimeType, upsert: false });

  if (upErr) throw new ListingError(`Photo upload failed: ${upErr.message}`);

  const { error: rowErr } = await supabase
    .from('listing_images')
    .insert({ listing_id: listingId, storage_path: path, position });

  if (rowErr) {
    /* Keep the bucket consistent with the table: the object is orphaned if its
       row never lands, so remove it before reporting the failure. */
    await supabase.storage.from('listing-images').remove([path]);
    throw new ListingError(`Photo upload failed: ${rowErr.message}`);
  }

  return path;
}

/**
 * Flips a draft to active. Sets `published_at` in the same statement, because
 * `active_listings_are_published` rejects an active row without one.
 */
export async function publishListing(listingId: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'active', published_at: new Date().toISOString() })
    .eq('id', listingId);

  if (error) throw new ListingError(error.message);
}

/**
 * Removes a listing that never made it live.
 *
 * Used when uploads fail partway: the draft and any objects already stored
 * would otherwise linger invisibly. `on delete cascade` clears listing_images,
 * and the storage objects are removed first since the policy that authorises it
 * depends on the listing still existing.
 */
export async function discardDraftListing(listingId: string, paths: string[]): Promise<void> {
  if (paths.length > 0) {
    await supabase.storage.from('listing-images').remove(paths);
  }
  await supabase.from('listings').delete().eq('id', listingId);
}

/**
 * Creates a listing end to end: draft, photographs, publish.
 *
 * Ordered this way because the storage policy needs the listing to exist before
 * anything can be written under its id. If any photograph fails the whole thing
 * is rolled back, so a half-uploaded listing never appears in the feed.
 */
export async function createListing(
  input: NewListing,
  images: PickedImage[],
  onProgress?: (done: number, total: number) => void
): Promise<string> {
  if (images.length === 0) throw new ListingError('Add at least one photo');

  const listingId = await createDraftListing(input);
  const uploaded: string[] = [];

  try {
    for (let i = 0; i < images.length; i++) {
      uploaded.push(await uploadListingImage(listingId, images[i], i));
      onProgress?.(i + 1, images.length);
    }
    await publishListing(listingId);
    return listingId;
  } catch (e) {
    await discardDraftListing(listingId, uploaded);
    throw e;
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
 * what will apply rather than saving a choice there is nowhere to put.
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
  if (!id) throw new Error('Sign in to send messages');
  return id;
}

/**
 * Finds the thread for a listing, or opens it.
 *
 * `conversations` is unique on `(listing_id, buyer_id)`, so a buyer has exactly
 * one thread per item and reopening a chat is a lookup rather than a new row.
 * The select comes first because it is the common case; the insert races only
 * on a genuine first message, and a 23505 there means someone else won the race
 * — the second read returns their row rather than surfacing an error.
 *
 * `conversations_insert_as_buyer` also enforces what is deliberately not
 * re-checked here: the opener must be the buyer, must not be the seller, and
 * the listing must be visible.
 */
export async function findOrCreateConversation(
  listingId: string,
  sellerId: string
): Promise<string> {
  const me = await requireUserId();
  if (me === sellerId) throw new Error('This is your own listing');

  const existing = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', me)
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
 * Unlike orders, offers are genuinely client-writable: `offers_insert_participant`
 * lets either party insert as long as they are one of the two, the two differ,
 * and they belong to the conversation. Everything below is therefore checked by
 * the database as well — the guards here are for a clear message, not for
 * safety.
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
    .select('id, listing_id, buyer_id, seller_id, listing:listings ( status )')
    .eq('id', conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation) throw new Error('That conversation no longer exists');

  const row = conversation as unknown as {
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    listing: { status: string } | null;
  };

  if (row.listing?.status !== 'active') throw new Error('That listing is no longer available');
  if (me !== row.buyer_id && me !== row.seller_id) throw new Error('This is not your conversation');

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
 * `grant update (state, responded_at)` is the entire writable surface — an
 * amount cannot be edited after the fact, which is why countering means
 * inserting a new offer rather than rewriting the old one.
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
    .select('id, buyer_id, seller_id, state')
    .eq('id', offerId)
    .maybeSingle();

  if (readError) throw readError;
  if (!data) throw new Error('That offer no longer exists');

  const offer = data as { buyer_id: string; seller_id: string; state: string };
  if (offer.state !== 'open' && offer.state !== 'countered') {
    throw new Error('That offer has already been answered');
  }

  const isAuthor = me === offer.buyer_id;
  if (action === 'withdrawn' && !isAuthor) throw new Error('Only the sender can withdraw an offer');
  if (action !== 'withdrawn' && isAuthor) throw new Error('Only the seller can answer this offer');

  const { error } = await supabase
    .from('offers')
    .update({ state: action, responded_at: new Date().toISOString() })
    .eq('id', offerId);

  if (error) throw error;
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

  if (!data) throw new Error('Checkout did not start');
  return data;
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

/**
 * Updates the signed-in user's own profile.
 *
 * `profiles_update_own` restricts this to `id = auth.uid()`, so the row is
 * chosen by the session rather than by an argument. Only the fields a person
 * actually edits are here — `rating_avg`, `lifetime_sales` and `is_verified`
 * are maintained elsewhere and are not the account holder's to set.
 */
export async function updateProfile(input: {
  displayName?: string;
  bio?: string | null;
  city?: string | null;
  countryCode?: string | null;
  avatarUrl?: string | null;
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

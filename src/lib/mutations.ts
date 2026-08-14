import { supabase } from '@/lib/supabase';
import type { ListingCondition } from '@/lib/database.types';

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
 * The bytes go up as an ArrayBuffer. `fetch(uri)` on a local file gives a Blob
 * whose size React Native reports correctly, whereas passing the Blob straight
 * to supabase-js has historically uploaded zero bytes on Android.
 */
export async function uploadListingImage(
  listingId: string,
  image: PickedImage,
  position: number
): Promise<string> {
  const res = await fetch(image.uri);
  if (!res.ok) throw new ListingError('Could not read the selected photo');
  const bytes = await res.arrayBuffer();

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

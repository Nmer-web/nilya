/**
 * Creates the order and the Stripe Checkout Session for a purchase.
 *
 * This exists because the client cannot be trusted with any of it, and the
 * schema enforces that: `revoke insert, update, delete on orders from anon,
 * authenticated` means no browser or phone can write an order at all. Price,
 * seller, availability and fees are all resolved here from the database, so a
 * tampered request body cannot buy a €400 coat for €4.
 *
 * The payment itself is confirmed by `stripe-webhook`, never by this function
 * and never by the client. All this does is put a `pending_payment` order in
 * front of Stripe with `order_id` in the PaymentIntent metadata — which is the
 * exact field the deployed webhook already reads, so it needed no changes.
 *
 * Secrets: STRIPE_SECRET_KEY, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
 * read from Edge Function secrets. None of them may ever be returned to the
 * caller; the response carries a Checkout URL and nothing else.
 *
 * Deployed with verify_jwt = false, and the JWT is verified in code instead —
 * see `authenticate` below. That is not a relaxation: the platform check only
 * accepts or rejects, whereas this function also needs the return page (a plain
 * GET that Stripe redirects the buyer to) to be reachable without a token.
 */

import Stripe from 'npm:stripe@^18';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/** service_role: the only role with any write grant on `orders`. */
const db = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

type CheckoutRequest = {
  listingId?: string;
  deliveryKey?: string;
  /** Optional: an accepted offer whose amount replaces the list price. */
  offerId?: string;
};

Deno.serve(async (req) => {
  const url = new URL(req.url);

  /* Stripe sends the buyer back here; it is a browser navigation with no JWT. */
  if (req.method === 'GET' && url.pathname.endsWith('/return')) {
    return returnPage(url.searchParams.get('status') === 'success');
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let buyerId: string;
  try {
    buyerId = await authenticate(req);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unauthorized' }, 401);
  }

  let body: CheckoutRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : '';
  const deliveryKey = typeof body.deliveryKey === 'string' ? body.deliveryKey.trim() : '';
  if (!listingId || !deliveryKey) {
    return json({ error: 'listingId and deliveryKey are required' }, 400);
  }
  if (!UUID_PATTERN.test(listingId)) {
    return json({ error: 'That listing reference is not valid' }, 400);
  }

  if (body.offerId !== undefined && typeof body.offerId !== 'string') {
    return json({ error: 'offerId must be a valid identifier' }, 400);
  }

  const offerId = body.offerId?.trim() || null;
  if (offerId && !UUID_PATTERN.test(offerId)) {
    return json({ error: 'That offer reference is not valid' }, 400);
  }

  try {
    return await createCheckout(buyerId, listingId, deliveryKey, offerId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    /* Deliberately not logging the body: it is a purchase request tied to a
       named person, and nothing in it helps debugging that the ids do not. */
    console.error('checkout failed', { listingId, message });
    return json({ error: message }, 400);
  }
});

/**
 * Resolves the caller from their access token.
 *
 * `getUser(token)` asks the auth server to validate the signature and expiry,
 * so this is a real verification rather than decoding a claim the client sent.
 */
async function authenticate(req: Request): Promise<string> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new Error('Sign in to check out');

  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error('Session is not valid');
  return data.user.id;
}

async function createCheckout(
  buyerId: string,
  listingId: string,
  deliveryKey: string,
  offerId: string | null
): Promise<Response> {
  /* ── the item, as the database has it ── */
  const { data: listing, error: listingError } = await db
    .from('listings')
    .select('id, seller_id, title, price_cents, currency, condition, status, country_code')
    .eq('id', listingId)
    .maybeSingle();

  if (listingError) throw new Error(listingError.message);
  if (!listing) throw new Error('That listing no longer exists');
  if (listing.status !== 'active') throw new Error('That listing is no longer available');
  if (listing.condition !== 'new') throw new Error('That listing is not available on NILYA');
  if (listing.seller_id === buyerId) throw new Error('You cannot buy your own listing');
  if (!Number.isSafeInteger(listing.price_cents) || listing.price_cents <= 0) {
    throw new Error('That listing does not have a valid price');
  }

  /* Holiday mode is an availability state on the seller, not a listing status.
     Check it before reading payout details or creating/reusing an order so a
     direct or stale client cannot bypass the hidden Buy button. */
  const { data: sellerProfile, error: sellerProfileError } = await db
    .from('profiles')
    .select('holiday_mode')
    .eq('id', listing.seller_id)
    .maybeSingle();

  if (sellerProfileError || !sellerProfile) {
    throw new Error('Seller availability could not be confirmed');
  }
  if (sellerProfile.holiday_mode === true) {
    throw new Error('Seller is currently away');
  }

  /* Seller payout readiness is private. The trusted function checks it and
     returns one generic availability error rather than exposing Connect data. */
  const { data: sellerAccount, error: sellerAccountError } = await db
    .from('seller_accounts')
    .select('stripe_account_id, charges_enabled, payouts_enabled, details_submitted')
    .eq('profile_id', listing.seller_id)
    .maybeSingle();

  if (sellerAccountError) throw new Error('Seller payment availability could not be confirmed');
  if (
    !sellerAccount?.stripe_account_id ||
    !sellerAccount.charges_enabled ||
    !sellerAccount.payouts_enabled ||
    !sellerAccount.details_submitted
  ) {
    throw new Error("This product isn't available for checkout right now");
  }

  /* ── price: an accepted offer overrides the list price ── */
  let itemPriceCents = listing.price_cents as number;
  if (offerId) {
    const { data: offer, error: offerError } = await db
      .from('offers')
      .select('id, amount_cents, state, buyer_id, seller_id, listing_id, expires_at')
      .eq('id', offerId)
      .maybeSingle();

    if (offerError) throw new Error(offerError.message);
    if (!offer) throw new Error('That offer no longer exists');
    if (
      offer.buyer_id !== buyerId ||
      offer.seller_id !== listing.seller_id ||
      offer.listing_id !== listingId
    ) {
      throw new Error('That offer does not belong to this purchase');
    }
    if (offer.state !== 'accepted') throw new Error('That offer has not been accepted');
    if (offer.expires_at) {
      const expiry = Date.parse(offer.expires_at as string);
      if (!Number.isFinite(expiry) || expiry <= Date.now()) {
        throw new Error('That offer is no longer available');
      }
    }
    if (!Number.isSafeInteger(offer.amount_cents) || offer.amount_cents <= 0) {
      throw new Error('That offer does not have a valid amount');
    }
    itemPriceCents = offer.amount_cents as number;
  }

  /* ── delivery and fees, from reference data rather than constants ── */
  const { data: options, error: optionsError } = await db
    .from('delivery_options')
    .select('key, kind, name, price_cents, waives_protection_fee, country_code')
    .in('country_code', [listing.country_code, '**'])
    .eq('is_active', true)
    .order('country_code', { ascending: false });

  if (optionsError) throw new Error(optionsError.message);

  const ladder = (options ?? []).filter((o) => o.country_code === listing.country_code);
  const applicable = ladder.length > 0 ? ladder : (options ?? []);
  const option = applicable.find((o) => o.key === deliveryKey);
  if (!option) throw new Error('That delivery option is not available for this item');

  const { data: settings, error: settingsError } = await db
    .from('platform_settings')
    .select('protection_fee_cents, base_currency')
    .eq('id', true)
    .single();

  if (settingsError) throw new Error(settingsError.message);

  const listingCurrency = String(listing.currency).trim().toUpperCase();
  const baseCurrency = String(settings.base_currency).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(listingCurrency) || listingCurrency !== baseCurrency) {
    throw new Error('That listing currency is not supported for checkout');
  }

  const shippingCents = option.price_cents as number;
  const protectionFeeCents = option.waives_protection_fee
    ? 0
    : (settings.protection_fee_cents as number);
  const currency = listingCurrency;

  /* ── the order ──
   *
   * `orders_one_live_per_listing` is a unique index over listing_id for every
   * status except cancelled and refunded. It is what stops two buyers holding
   * the same item: the second insert fails at the database rather than after a
   * check that another request could have raced past.
   */
  const existing = await db
    .from('orders')
    .select(
      'id, buyer_id, status, offer_id, item_price_cents, shipping_cents, protection_fee_cents, currency, delivery_kind, delivery_key'
    )
    .eq('listing_id', listingId)
    .not('status', 'in', '("cancelled","refunded")')
    .maybeSingle();

  if (existing.error) throw new Error(existing.error.message);

  let orderId: string;
  if (existing.data) {
    const order = existing.data as {
      id: string;
      buyer_id: string;
      status: string;
      offer_id: string | null;
      item_price_cents: number;
      shipping_cents: number;
      protection_fee_cents: number;
      currency: string;
      delivery_kind: string;
      delivery_key: string;
    };
    if (order.buyer_id !== buyerId) throw new Error('Someone else is already buying this item');
    if (order.status !== 'pending_payment') throw new Error('This order has already been paid');
    if (
      order.offer_id !== offerId ||
      order.item_price_cents !== itemPriceCents ||
      order.shipping_cents !== shippingCents ||
      order.protection_fee_cents !== protectionFeeCents ||
      order.currency.trim().toUpperCase() !== currency ||
      order.delivery_kind !== option.kind ||
      order.delivery_key !== option.key
    ) {
      throw new Error('This checkout was already prepared with different purchase details');
    }
    /* The buyer came back to an unfinished checkout: reuse the order rather
       than orphaning it, so one listing does not accumulate dead orders. */
    orderId = order.id;
  } else {
    const created = await db
      .from('orders')
      .insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: listing.seller_id,
        offer_id: offerId,
        item_price_cents: itemPriceCents,
        shipping_cents: shippingCents,
        protection_fee_cents: protectionFeeCents,
        currency,
        delivery_kind: option.kind,
        delivery_key: option.key,
        status: 'pending_payment',
      })
      .select('id')
      .single();

    if (created.error) {
      if (created.error.code === '23505') throw new Error('Someone else is already buying this item');
      throw new Error(created.error.message);
    }
    orderId = (created.data as { id: string }).id;
  }

  const totalCents = itemPriceCents + shippingCents + protectionFeeCents;

  /* ── Stripe ──
   *
   * Line items are itemised so the buyer sees the same breakdown Stripe
   * charges. `payment_intent_data.metadata.order_id` is the whole contract with
   * the webhook: it reads exactly that field to find the order, which is why
   * this integration needed no change there.
   *
   * The idempotency key is the order id, so a double tap produces one session.
   */
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: itemPriceCents,
        product_data: { name: listing.title as string },
      },
    },
  ];

  if (shippingCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: shippingCents,
        product_data: { name: option.name as string },
      },
    });
  }

  if (protectionFeeCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: protectionFeeCents,
        product_data: { name: 'Buyer protection' },
      },
    });
  }

  const base = `${SUPABASE_URL}/functions/v1/create-checkout/return`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: lineItems,
      success_url: `${base}?status=success`,
      cancel_url: `${base}?status=cancelled`,
      client_reference_id: orderId,
      payment_intent_data: { metadata: { order_id: orderId } },
      metadata: { order_id: orderId },
    },
    { idempotencyKey: `checkout:${orderId}` }
  );

  if (!session.url) throw new Error('Stripe did not return a checkout URL');

  return json({
    orderId,
    checkoutUrl: session.url,
    itemPriceCents,
    shippingCents,
    protectionFeeCents,
    totalCents,
    currency,
  });
}

/**
 * The page Stripe redirects the buyer to.
 *
 * It deliberately reports nothing about payment state beyond what Stripe's own
 * redirect said, and the app does not believe it either — the order becomes
 * paid when the webhook says so. This is a courtesy page, not a receipt.
 */
function returnPage(success: boolean): Response {
  /*
   * Plain text, not HTML, and not by preference.
   *
   * The edge gateway rewrites this route's Content-Type to `text/plain`
   * whatever the function sets — verified against the deployed function, where
   * the JSON responses keep `application/json` but a styled HTML page came back
   * as text/plain and rendered as raw markup. Supabase does not intend
   * functions to serve web pages on its domain. Since a marked-up page would
   * reach the buyer as angle brackets, this says the same thing in words that
   * read correctly as text.
   *
   * It deliberately reports nothing about payment state beyond what Stripe's
   * redirect said, and the app does not believe it either — the order becomes
   * paid when the webhook says so. A courtesy page, not a receipt.
   */
  const text = success
    ? 'Checkout submitted.\n\nYou can close this window and return to NILYA. Your order updates only after Stripe confirms the payment.'
    : 'Checkout cancelled.\n\nYou can close this window and return to NILYA to see the current order status.';

  return new Response(text, {
    status: 200,
    headers: new Headers({ 'Content-Type': 'text/plain;charset=UTF-8' }),
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

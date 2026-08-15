/**
 * Stripe webhook → SAWA order and payment state.
 *
 * Three things that break this function if you change them carelessly:
 *
 *   1. The signature is computed over the RAW request body. `await req.text()`
 *      before anything else — parsing to JSON and re-stringifying produces a
 *      different byte sequence and every signature check fails.
 *
 *   2. `constructEventAsync` with a SubtleCrypto provider, not `constructEvent`.
 *      The synchronous variant reaches for Node's sync crypto, which does not
 *      exist in the edge runtime.
 *
 *   3. This function must be deployed with JWT verification OFF. Stripe does
 *      not send a Supabase JWT. See supabase/config.toml, or deploy with
 *      `--no-verify-jwt`. The webhook signature IS the authentication.
 *
 * Secrets required (set them yourself; never commit them):
 *   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
 *   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
 */

import Stripe from 'npm:stripe@^18';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  // Fetch-based client: the edge runtime has no Node http agent.
  httpClient: Stripe.createFetchHttpClient(),
});

// Web Crypto is async-only, hence constructEventAsync below.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// service_role: this function is the only writer for orders and payments, and
// their RLS policies grant no INSERT or UPDATE to any client role.
const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      WEBHOOK_SECRET,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    // 400 tells Stripe not to retry — a bad signature will never become good.
    console.error('signature verification failed', err instanceof Error ? err.message : err);
    return new Response('Invalid signature', { status: 400 });
  }

  // Stripe delivers at least once, and retries on any non-2xx. Claim the event
  // id first; a duplicate delivery collides on the primary key and exits early.
  const { error: claimError } = await db
    .from('webhook_events')
    .insert({ id: event.id, type: event.type });

  if (claimError) {
    if (claimError.code === '23505') {
      return json({ received: true, duplicate: true });
    }
    // Could not record the event — 500 so Stripe retries rather than silently
    // processing something we have no record of.
    console.error('failed to claim event', event.id, claimError);
    return new Response('Could not record event', { status: 500 });
  }

  try {
    await handle(event);
  } catch (err) {
    // Release the claim so the retry can do real work instead of short-circuiting.
    await db.from('webhook_events').delete().eq('id', event.id);
    console.error('handler failed', event.type, event.id, err);
    return new Response('Handler failed', { status: 500 });
  }

  return json({ received: true });
});

async function handle(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'payment_intent.processing': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await upsertPayment(pi, 'processing');
      break;
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = requireOrderId(pi);

      await upsertPayment(pi, 'succeeded');

      // Order and listing move together: a paid order marks the item sold, and
      // orders_one_live_per_listing guarantees no second order can claim it.
      const paidAt = new Date(event.created * 1000).toISOString();
      await update('orders', { status: 'paid', paid_at: paidAt }, (q) =>
        q.eq('id', orderId).eq('status', 'pending_payment')
      );

      const { data: order } = await db
        .from('orders')
        .select('listing_id')
        .eq('id', orderId)
        .single();

      if (order?.listing_id) {
        await update('listings', { status: 'sold' }, (q) => q.eq('id', order.listing_id));
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await upsertPayment(pi, 'failed', pi.last_payment_error?.message ?? null);
      break;
    }

    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = requireOrderId(pi);
      await update(
        'orders',
        { status: 'cancelled', cancelled_at: new Date(event.created * 1000).toISOString() },
        (q) => q.eq('id', orderId).eq('status', 'pending_payment')
      );
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (!paymentIntentId) break;

      await applyRefund(paymentIntentId, charge.amount_refunded, charge.amount);
      break;
    }

    /*
     * The endpoint is configured for refund.created and refund.updated, not
     * charge.refunded — verified against the live test-mode endpoint, whose
     * enabled_events are payment_intent.succeeded, payment_intent.payment_failed,
     * checkout.session.completed, refund.created and refund.updated. Handling
     * only charge.refunded meant every refund landed in the default branch and
     * changed nothing. Both shapes are handled now, so the integration works
     * whichever set is enabled.
     *
     * A Refund carries no running total, so the charge is re-read for the
     * authoritative amount_refunded rather than accumulating it here — refunds
     * arrive at least once and can be superseded.
     */
    case 'refund.created':
    case 'refund.updated': {
      const refund = event.data.object as Stripe.Refund;

      // Pending and failed refunds move no money; only a settled one counts.
      if (refund.status !== 'succeeded') break;

      const paymentIntentId =
        typeof refund.payment_intent === 'string'
          ? refund.payment_intent
          : refund.payment_intent?.id;
      const chargeId = typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;
      if (!paymentIntentId || !chargeId) break;

      const charge = await stripe.charges.retrieve(chargeId);
      await applyRefund(paymentIntentId, charge.amount_refunded, charge.amount);
      break;
    }

    // Stripe Connect onboarding progress for sellers.
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      await update(
        'seller_accounts',
        {
          charges_enabled: account.charges_enabled ?? false,
          payouts_enabled: account.payouts_enabled ?? false,
          details_submitted: account.details_submitted ?? false,
          country_code: account.country ?? null,
        },
        (q) => q.eq('stripe_account_id', account.id)
      );
      break;
    }

    default:
      // Unhandled types are still recorded in webhook_events, so enabling a new
      // event type in the Stripe dashboard shows up here rather than vanishing.
      console.log('unhandled event type', event.type);
  }
}

/**
 * Records a refund against the payment, and unwinds the order once it is whole.
 *
 * Shared by `charge.refunded` and the `refund.*` events so both report the same
 * state. `amount_refunded` is Stripe's running total for the charge, not this
 * refund's amount, which is what makes a partial refund followed by another one
 * land correctly without the webhook keeping a tally of its own.
 */
async function applyRefund(
  paymentIntentId: string,
  amountRefunded: number,
  chargeAmount: number
): Promise<void> {
  const fullyRefunded = amountRefunded >= chargeAmount;

  const { data: payment, error } = await db
    .from('payments')
    .update({
      amount_refunded_cents: amountRefunded,
      status: fullyRefunded ? 'refunded' : 'partially_refunded',
    })
    .eq('stripe_payment_intent_id', paymentIntentId)
    .select('order_id')
    .maybeSingle();

  if (error) throw new Error(`payments refund update failed: ${error.message}`);

  /* The order only unwinds on a full refund; a partial one leaves it paid,
     which is what `partially_refunded` on the payment is there to express. */
  if (fullyRefunded && payment?.order_id) {
    await update('orders', { status: 'refunded' }, (q) => q.eq('id', payment.order_id));
  }
}

/** The order this PaymentIntent belongs to, set as metadata at creation time. */
function requireOrderId(pi: Stripe.PaymentIntent): string {
  const orderId = pi.metadata?.order_id;
  if (!orderId) {
    throw new Error(`PaymentIntent ${pi.id} has no order_id metadata`);
  }
  return orderId;
}

async function upsertPayment(
  pi: Stripe.PaymentIntent,
  status: string,
  lastError: string | null = null
): Promise<void> {
  const orderId = requireOrderId(pi);
  const chargeId =
    typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null;

  const { error } = await db.from('payments').upsert(
    {
      order_id: orderId,
      stripe_payment_intent_id: pi.id,
      stripe_charge_id: chargeId,
      amount_cents: pi.amount,
      currency: pi.currency.toUpperCase(),
      status,
      last_error: lastError,
    },
    { onConflict: 'stripe_payment_intent_id' }
  );

  if (error) throw new Error(`payments upsert failed: ${error.message}`);
}

type Filter = (q: ReturnType<ReturnType<typeof db.from>['update']>) => unknown;

async function update(table: string, patch: Record<string, unknown>, filter: Filter): Promise<void> {
  const { error } = (await filter(db.from(table).update(patch))) as { error: unknown };
  if (error) {
    throw new Error(`${table} update failed: ${JSON.stringify(error)}`);
  }
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

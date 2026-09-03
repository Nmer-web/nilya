import { ArrowLeft, CreditCard, Scale } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Currency } from "@/components/currency";
import { PageHeader } from "@/components/page-header";
import {
  DisputeStateBadge,
  ListingStatusBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { formatDateTime, shortId } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  DISPUTE_REASON_LABEL,
  type AdminDisputeRow,
  type AdminOrderRow,
  type PaymentRow,
} from "@/lib/types";

const DELIVERY_LABEL = { local: "Local pickup", dom: "Domestic", intl: "International" } as const;

export default async function OrderDetailPage(props: PageProps<"/orders/[id]">) {
  await requireAdmin();
  const { id } = await props.params;

  const supabase = await createClient();
  const [orderResult, disputesResult, paymentResult] = await Promise.all([
    supabase.from("admin_order_feed").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("admin_dispute_feed")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("payments").select("*").eq("order_id", id).maybeSingle(),
  ]);

  if (!orderResult.data) notFound();
  const order = orderResult.data as AdminOrderRow;
  const disputes = (disputesResult.data ?? []) as AdminDisputeRow[];
  const payment = paymentResult.data as PaymentRow | null;

  const timeline: [string, string | null][] = [
    ["Placed", order.placed_at],
    ["Paid", order.paid_at],
    ["Completed", order.completed_at],
    ["Cancelled", order.cancelled_at],
  ];

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All orders
          </Link>
        }
        title={`Order ${shortId(order.id)}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <Currency
              cents={order.total_cents ?? order.item_price_cents}
              currency={order.currency}
              className="font-medium text-foreground"
            />
            <span>· Placed {formatDateTime(order.placed_at)}</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Listing</h2>
              <Link
                href={`/listings/${order.listing_id}`}
                className="block rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="block font-medium text-foreground underline-offset-4 hover:underline">
                  {order.listing_title ?? "Listing no longer exists"}
                </span>
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                <Currency cents={order.item_price_cents} currency={order.currency} />
              </p>
              {order.listing_status ? (
                <div className="mt-2">
                  <ListingStatusBadge status={order.listing_status} />
                </div>
              ) : null}
            </Card>

            <PartyCard
              heading="Buyer"
              id={order.buyer_id}
              name={order.buyer_name}
              avatarPath={order.buyer_avatar_url}
              color={order.buyer_avatar_color}
            />
            <PartyCard
              heading="Seller"
              id={order.seller_id}
              name={order.seller_name}
              avatarPath={order.seller_avatar_url}
              color={order.seller_avatar_color}
            />
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Amount</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Line label="Item">
                <Currency cents={order.item_price_cents} currency={order.currency} />
              </Line>
              <Line label={`Shipping · ${DELIVERY_LABEL[order.delivery_kind] ?? order.delivery_kind}`}>
                <Currency cents={order.shipping_cents} currency={order.currency} />
              </Line>
              <Line label="Buyer protection">
                <Currency cents={order.protection_fee_cents} currency={order.currency} />
              </Line>
              <div className="flex justify-between gap-4 border-t pt-2 font-semibold">
                <dt>Total</dt>
                <dd>
                  <Currency
                    cents={order.total_cents ?? order.item_price_cents + order.shipping_cents + order.protection_fee_cents}
                    currency={order.currency}
                  />
                </dd>
              </div>
            </dl>

            <h3 className="mt-5 text-sm font-semibold text-foreground">Timeline</h3>
            <dl className="mt-2 space-y-1.5 text-sm">
              {timeline.map(([label, at]) => (
                <Line key={label} label={label}>
                  {at ? formatDateTime(at) : <span className="text-muted-foreground">—</span>}
                </Line>
              ))}
            </dl>
            {order.offer_id ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Priced by accepted offer <span className="font-mono">{shortId(order.offer_id)}</span>.
              </p>
            ) : null}
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CreditCard className="size-4 text-muted-foreground" aria-hidden />
              Payment
            </h2>
            {payment ? (
              <dl className="mt-3 space-y-1.5 text-sm">
                <Line label="Status">
                  <PaymentStatusBadge status={payment.status} />
                </Line>
                <Line label="Charged">
                  <Currency cents={payment.amount_cents} currency={payment.currency} />
                </Line>
                {payment.amount_refunded_cents > 0 ? (
                  <Line label="Refunded">
                    <Currency cents={payment.amount_refunded_cents} currency={payment.currency} />
                  </Line>
                ) : null}
                <Line label="Payment intent">
                  <span className="font-mono text-xs">{payment.stripe_payment_intent_id}</span>
                </Line>
                {payment.stripe_charge_id ? (
                  <Line label="Charge">
                    <span className="font-mono text-xs">{payment.stripe_charge_id}</span>
                  </Line>
                ) : null}
                {payment.last_error ? (
                  <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                    {payment.last_error}
                  </p>
                ) : null}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No payment record. One is written by the webhook when Stripe
                reports a payment intent for this order.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Scale className="size-4 text-muted-foreground" aria-hidden />
              Dispute
            </h2>
            {disputes.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {disputes.map((dispute) => (
                  <li key={dispute.id}>
                    <Link
                      href={`/disputes/${dispute.id}`}
                      className="block rounded-lg border p-3 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {DISPUTE_REASON_LABEL[dispute.reason] ?? dispute.reason}
                        </span>
                        <DisputeStateBadge state={dispute.state} />
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Opened by {dispute.opener_name ?? dispute.opener_email ?? "—"} ·{" "}
                        {formatDateTime(dispute.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No dispute filed.</p>
            )}
          </Card>

          <p className="text-xs text-muted-foreground">
            Orders are read-only in the admin. The app never marks an order
            paid, and neither does this dashboard — only the verified Stripe
            webhook does.
          </p>
        </aside>
      </div>
    </>
  );
}

function PartyCard({
  heading,
  id,
  name,
  avatarPath,
  color,
}: {
  heading: string;
  id: string;
  name: string | null;
  avatarPath: string | null;
  color: string | null;
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{heading}</h2>
      <Link
        href={`/users/${id}`}
        className="flex items-center gap-3 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <UserAvatar name={name} avatarPath={avatarPath} color={color} className="size-10" />
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground underline-offset-4 hover:underline">
            {name ?? <span className="text-muted-foreground italic">No profile</span>}
          </span>
          <span className="block font-mono text-xs text-muted-foreground">{shortId(id)}</span>
        </span>
      </Link>
    </Card>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

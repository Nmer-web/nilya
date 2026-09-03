import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Currency } from "@/components/currency";
import { DisputeActions } from "@/components/dispute-actions";
import { PageHeader } from "@/components/page-header";
import { DisputeStateBadge, OrderStatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { formatDateTime, shortId } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  CLOSED_DISPUTE_STATES,
  DISPUTE_REASON_LABEL,
  type AdminDisputeRow,
} from "@/lib/types";

export default async function DisputeDetailPage(props: PageProps<"/disputes/[id]">) {
  await requireAdmin();
  const { id } = await props.params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_dispute_feed")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const dispute = data as AdminDisputeRow;
  const isClosed = CLOSED_DISPUTE_STATES.includes(dispute.state);

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link
            href="/disputes"
            className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All disputes
          </Link>
        }
        title={`Dispute ${shortId(dispute.id)}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <DisputeStateBadge state={dispute.state} />
            <span>{DISPUTE_REASON_LABEL[dispute.reason] ?? dispute.reason}</span>
            <span>· Opened {formatDateTime(dispute.created_at)}</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Opened by</h2>
              <Link
                href={`/users/${dispute.opened_by}`}
                className="flex items-center gap-3 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <UserAvatar
                  name={dispute.opener_name}
                  email={dispute.opener_email}
                  avatarPath={dispute.opener_avatar_url}
                  color={dispute.opener_avatar_color}
                  className="size-10"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground underline-offset-4 hover:underline">
                    {dispute.opener_name ?? dispute.opener_email ?? "Account"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {dispute.opener_email}
                    {dispute.opened_by === dispute.buyer_id
                      ? " · buyer"
                      : dispute.opened_by === dispute.seller_id
                        ? " · seller"
                        : ""}
                  </span>
                </span>
              </Link>
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Related order</h2>
              <Link
                href={`/orders/${dispute.order_id}`}
                className="block rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="block truncate font-medium text-foreground underline-offset-4 hover:underline">
                  {dispute.listing_title ?? "Listing no longer exists"}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{shortId(dispute.order_id)}</span>
                  {dispute.order_total_cents !== null ? (
                    <Currency cents={dispute.order_total_cents} currency={dispute.order_currency} />
                  ) : null}
                  {dispute.order_status ? <OrderStatusBadge status={dispute.order_status} /> : null}
                </span>
              </Link>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">What they said</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Reason: {DISPUTE_REASON_LABEL[dispute.reason] ?? dispute.reason}
            </p>
            {dispute.body ? (
              <p className="mt-3 rounded-lg bg-muted p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {dispute.body}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground italic">
                No description was written.
              </p>
            )}
          </Card>
        </div>

        <aside>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Resolution</h2>
            {isClosed ? (
              <div className="mt-3 rounded-lg border border-[#0F6E56]/20 bg-[#E7F1EE] p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-[#0B5442]">
                  <CheckCircle2 className="size-4" aria-hidden />
                  <DisputeStateBadge state={dispute.state} />
                </p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">When</dt>
                    <dd className="text-right font-medium">{formatDateTime(dispute.resolved_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">By</dt>
                    <dd className="text-right font-medium">
                      {dispute.resolved_by_email ?? (
                        <span className="font-normal text-muted-foreground">
                          Not recorded
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
                {dispute.resolution_note ? (
                  <p className="mt-3 border-t border-[#0F6E56]/15 pt-3 text-sm whitespace-pre-wrap text-[#0B5442]">
                    {dispute.resolution_note}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  Record which party the evidence favours. Refunds are issued in
                  Stripe, not here.
                </p>
                <DisputeActions disputeId={dispute.id} />
              </>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Package,
  Receipt,
  Scale,
  ShoppingBag,
  Star,
  Wallet,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Currency } from "@/components/currency";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StarRating } from "@/components/star-rating";
import { StatCard } from "@/components/stat-card";
import {
  DisputeStateBadge,
  ListingStatusBadge,
  OrderStatusBadge,
  RemovedBadge,
  SuspendedBadge,
} from "@/components/status-badge";
import { SuspendControl } from "@/components/suspend-dialog";
import { TabPanels } from "@/components/tab-panels";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { formatDate, formatDateTime, formatMoney, formatRelative, shortId, truncate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  DISPUTE_REASON_LABEL,
  type AdminDisputeRow,
  type AdminListingRow,
  type AdminOrderRow,
  type AdminReviewRow,
  type AdminSellerRow,
} from "@/lib/types";

export default async function SellerDetailPage(props: PageProps<"/sellers/[id]">) {
  const session = await requireAdmin();
  const { id } = await props.params;

  const supabase = await createClient();
  const [sellerResult, listingsResult, ordersResult, reviewsResult, disputesResult] =
    await Promise.all([
      supabase.from("admin_seller_directory").select("*").eq("profile_id", id).maybeSingle(),
      supabase
        .from("listings")
        .select(
          `id,title,brand,price_cents,currency,status,category_slug,created_at,published_at,seller_id,
           category:categories!listings_category_slug_fkey(slug,label)`
        )
        .eq("seller_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("admin_order_feed")
        .select("*")
        .eq("seller_id", id)
        .order("placed_at", { ascending: false }),
      supabase
        .from("reviews")
        .select(
          `id,order_id,author_id,subject_id,rating,body,created_at,removed_at,removed_reason,
           author:profiles!reviews_author_id_fkey(id,display_name,avatar_url,avatar_color)`
        )
        .eq("subject_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("admin_dispute_feed")
        .select("*")
        .eq("seller_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!sellerResult.data) notFound();

  const seller = sellerResult.data as AdminSellerRow;
  const listings = (listingsResult.data ?? []) as unknown as AdminListingRow[];
  const orders = (ordersResult.data ?? []) as AdminOrderRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as AdminReviewRow[];
  const disputes = (disputesResult.data ?? []) as AdminDisputeRow[];

  const name = seller.display_name ?? seller.email ?? "This seller";
  const suspendBlockedBy =
    seller.profile_id === session.userId ? "This is your own account." : undefined;

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link
            href="/sellers"
            className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All sellers
          </Link>
        }
        title={name}
        actions={
          <a
            href={`nilya://seller/${seller.profile_id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-zinc-50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            title="Opens the seller's public profile in the Nilya app on this device"
          >
            <ExternalLink className="size-4" aria-hidden />
            View as buyer
          </a>
        }
      />

      <Card className="mb-6 flex flex-row flex-wrap items-center gap-4 p-5">
        <UserAvatar
          name={seller.display_name}
          email={seller.email}
          avatarPath={seller.avatar_url}
          color={seller.avatar_color}
          className="size-14"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">
            {seller.display_name ?? <span className="text-muted-foreground italic">No profile row</span>}
          </p>
          <p className="truncate text-sm text-muted-foreground">{seller.email ?? "—"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {seller.suspended_at ? <SuspendedBadge /> : null}
            {seller.is_verified ? (
              <Badge variant="outline" className="font-medium">Verified</Badge>
            ) : null}
            {seller.rating_count && seller.rating_count > 0 && seller.rating_avg !== null ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <StarRating rating={seller.rating_avg} />
                {seller.rating_avg.toFixed(1)} ({seller.rating_count})
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Not yet rated</span>
            )}
          </div>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-muted-foreground">Joined</dt>
            <dd className="font-medium">{formatDate(seller.profile_created_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Seller since</dt>
            <dd className="font-medium">{formatDate(seller.seller_since)}</dd>
          </div>
        </dl>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total listings" value={seller.listings_count} icon={Package} tone="zinc" />
        <StatCard label="Active listings" value={seller.active_listings_count} icon={ShoppingBag} tone="green" />
        <StatCard label="Orders" value={seller.orders_count} icon={Receipt} tone="blue" />
        <Card className="flex flex-row items-center gap-4 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E7F1EE] text-[#0F6E56]" aria-hidden>
            <Wallet className="size-5" strokeWidth={2} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="tabular text-2xl leading-none font-semibold text-foreground">
              {formatMoney(seller.paid_revenue_cents, seller.default_currency)}
            </span>
            <span className="mt-1.5 truncate text-sm text-muted-foreground">Paid revenue</span>
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <TabPanels
          panels={[
            {
              value: "listings",
              label: "Listings",
              count: listings.length,
              content: (
                <DataTable
                  caption={`Listings by ${name}`}
                  columns={LISTING_COLUMNS}
                  rows={listings}
                  rowKey={(row) => row.id}
                  rowHref={(row) => `/listings/${row.id}`}
                  empty={<EmptyState icon={ShoppingBag} title="No listings" description="This seller has not created a listing." />}
                />
              ),
            },
            {
              value: "orders",
              label: "Orders",
              count: orders.length,
              content: (
                <DataTable
                  caption={`Orders sold by ${name}`}
                  columns={ORDER_COLUMNS}
                  rows={orders}
                  rowKey={(row) => row.id}
                  rowHref={(row) => `/orders/${row.id}`}
                  empty={<EmptyState icon={Receipt} title="No orders" description="Nobody has bought from this seller yet." />}
                />
              ),
            },
            {
              value: "reviews",
              label: "Reviews received",
              count: reviews.length,
              content: (
                <DataTable
                  caption={`Reviews of ${name}`}
                  columns={REVIEW_COLUMNS}
                  rows={reviews}
                  rowKey={(row) => row.id}
                  rowHref={(row) => `/reviews/${row.id}`}
                  empty={<EmptyState icon={Star} title="No reviews" description="No buyer has reviewed this seller." />}
                />
              ),
            },
            {
              value: "disputes",
              label: "Disputes",
              count: disputes.length,
              content: (
                <DataTable
                  caption={`Disputes on ${name}'s orders`}
                  columns={DISPUTE_COLUMNS}
                  rows={disputes}
                  rowKey={(row) => row.id}
                  rowHref={(row) => `/disputes/${row.id}`}
                  empty={<EmptyState icon={Scale} title="No disputes" description="No order from this seller has been disputed." />}
                />
              ),
            },
          ]}
        />

        <aside className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Account standing</h2>
            {seller.suspended_at ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-900">
                  Suspended {formatRelative(seller.suspended_at)}
                </p>
                {seller.suspended_reason ? (
                  <p className="mt-1 text-sm text-red-800">{seller.suspended_reason}</p>
                ) : null}
                <p className="mt-1 text-xs text-red-700">{formatDateTime(seller.suspended_at)}</p>
              </div>
            ) : (
              <p className="mt-1 mb-4 text-sm text-muted-foreground">In good standing.</p>
            )}
            <div className="mt-4">
              <SuspendControl
                userId={seller.profile_id}
                displayName={name}
                suspendedAt={seller.suspended_at}
                disabledReason={suspendBlockedBy}
                subject="seller"
              />
            </div>
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              Suspension is recorded here; the Nilya app does not yet act on it.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Stripe Connect</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Flag label="Details submitted" on={seller.details_submitted} />
              <Flag label="Charges enabled" on={seller.charges_enabled} />
              <Flag label="Payouts enabled" on={seller.payouts_enabled} />
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Currency</dt>
                <dd className="font-medium">{seller.default_currency.trim()}</dd>
              </div>
              {seller.stripe_account_id ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Account</dt>
                  <dd className="font-mono text-xs">{seller.stripe_account_id}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1 font-medium">
        {on ? (
          <CheckCircle2 className="size-4 text-[#0F6E56]" aria-hidden />
        ) : (
          <XCircle className="size-4 text-zinc-400" aria-hidden />
        )}
        {on ? "Yes" : "No"}
      </dd>
    </div>
  );
}

const LISTING_COLUMNS: Column<AdminListingRow>[] = [
  { key: "title", header: "Title", cell: (row) => <span className="font-medium text-foreground">{row.title}</span> },
  { key: "category", header: "Category", cell: (row) => <span className="text-muted-foreground">{row.category?.label ?? row.category_slug}</span> },
  { key: "price", header: "Price", className: "w-28 text-right", cell: (row) => <Currency cents={row.price_cents} currency={row.currency} className="font-medium" /> },
  { key: "status", header: "Status", className: "w-32", cell: (row) => <ListingStatusBadge status={row.status} /> },
  { key: "created", header: "Created", className: "w-32 text-right", cell: (row) => <span className="text-muted-foreground">{formatDate(row.created_at)}</span> },
];

const ORDER_COLUMNS: Column<AdminOrderRow>[] = [
  { key: "id", header: "Order", className: "w-28", cell: (row) => <span className="font-mono text-xs">{shortId(row.id)}</span> },
  { key: "listing", header: "Listing", cell: (row) => <span className="block truncate font-medium text-foreground">{row.listing_title ?? "—"}</span> },
  { key: "buyer", header: "Buyer", cell: (row) => <span className="truncate">{row.buyer_name ?? "—"}</span> },
  { key: "amount", header: "Amount", className: "w-28 text-right", cell: (row) => <Currency cents={row.item_price_cents} currency={row.currency} className="font-medium" /> },
  { key: "status", header: "Status", className: "w-36", cell: (row) => <OrderStatusBadge status={row.status} /> },
  { key: "date", header: "Date", className: "w-32 text-right", cell: (row) => <span className="text-muted-foreground">{formatDate(row.placed_at)}</span> },
];

const REVIEW_COLUMNS: Column<AdminReviewRow>[] = [
  { key: "rating", header: "Rating", className: "w-28", cell: (row) => <StarRating rating={row.rating} /> },
  { key: "author", header: "Reviewer", cell: (row) => <span className="truncate">{row.author?.display_name ?? "—"}</span> },
  { key: "body", header: "Body", cell: (row) => <span className="block max-w-md truncate text-muted-foreground">{row.body ? truncate(row.body, 80) : "—"}</span> },
  { key: "status", header: "Status", className: "w-28", cell: (row) => (row.removed_at ? <RemovedBadge /> : <span className="text-muted-foreground">Standing</span>) },
  { key: "date", header: "Date", className: "w-32 text-right", cell: (row) => <span className="text-muted-foreground">{formatDate(row.created_at)}</span> },
];

const DISPUTE_COLUMNS: Column<AdminDisputeRow>[] = [
  { key: "reason", header: "Reason", cell: (row) => <span className="font-medium text-foreground">{DISPUTE_REASON_LABEL[row.reason] ?? row.reason}</span> },
  { key: "listing", header: "Listing", cell: (row) => <span className="block truncate text-muted-foreground">{row.listing_title ?? "—"}</span> },
  { key: "opener", header: "Opened by", cell: (row) => <span className="truncate">{row.opener_name ?? row.opener_email ?? "—"}</span> },
  { key: "state", header: "State", className: "w-40", cell: (row) => <DisputeStateBadge state={row.state} /> },
  { key: "date", header: "Opened", className: "w-32 text-right", cell: (row) => <span className="text-muted-foreground">{formatRelative(row.created_at)}</span> },
];

import { Receipt, TriangleAlert } from "lucide-react";

import { Currency } from "@/components/currency";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { OrderStatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/admin";
import { escapeFilterValue, firstParam, formatDate, pageParam, shortId } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AdminOrderRow } from "@/lib/types";

export const metadata = { title: "Orders" };

const PAGE_SIZE = 25;

export default async function OrdersPage(props: PageProps<"/orders">) {
  await requireAdmin();
  const searchParams = await props.searchParams;

  const page = pageParam(searchParams.page);
  const query = firstParam(searchParams.q)?.trim() ?? "";

  const supabase = await createClient();

  let orderQuery = supabase
    .from("admin_order_feed")
    .select("*", { count: "exact" })
    .order("placed_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (query) {
    const safe = escapeFilterValue(query);
    if (safe) {
      orderQuery = orderQuery.or(
        `listing_title.ilike.%${safe}%,buyer_name.ilike.%${safe}%,seller_name.ilike.%${safe}%`
      );
    }
  }

  const { data, error, count } = await orderQuery;
  const orders = (data ?? []) as AdminOrderRow[];
  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Read-only. Payment state changes only through the Stripe webhook."
      />

      <div className="mb-4">
        <SearchInput placeholder="Search listing, buyer or seller" className="max-w-sm" />
      </div>

      {error ? (
        <div className="rounded-xl border bg-card">
          <ErrorState icon={TriangleAlert} title="Could not load orders" message={error.message} />
        </div>
      ) : (
        <>
          <DataTable
            caption="Orders"
            columns={COLUMNS}
            rows={orders}
            rowKey={(row) => row.id}
            rowHref={(row) => `/orders/${row.id}`}
            empty={
              <EmptyState
                icon={Receipt}
                title={query ? "No matching orders" : "No orders yet"}
                description={
                  query
                    ? "Try a different listing title or username."
                    : "Orders placed through checkout will appear here."
                }
              />
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/orders"
            params={{ q: query || undefined }}
          />
        </>
      )}
    </>
  );
}

const COLUMNS: Column<AdminOrderRow>[] = [
  {
    key: "id",
    header: "Order ID",
    className: "w-28",
    cell: (row) => (
      <span className="font-mono text-xs text-foreground" title={row.id}>
        {shortId(row.id)}
      </span>
    ),
  },
  {
    key: "listing",
    header: "Listing",
    cell: (row) => (
      <span className="block truncate font-medium text-foreground">
        {row.listing_title ?? <span className="text-muted-foreground italic">Listing gone</span>}
      </span>
    ),
  },
  {
    key: "buyer",
    header: "Buyer",
    cell: (row) => <span className="truncate">{row.buyer_name ?? "—"}</span>,
  },
  {
    key: "seller",
    header: "Seller",
    cell: (row) => <span className="truncate">{row.seller_name ?? "—"}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    className: "w-28 text-right",
    cell: (row) => (
      <Currency cents={row.item_price_cents} currency={row.currency} className="font-medium" />
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-36",
    cell: (row) => <OrderStatusBadge status={row.status} />,
  },
  {
    key: "date",
    header: "Date",
    className: "w-32 text-right",
    cell: (row) => <span className="text-muted-foreground">{formatDate(row.placed_at)}</span>,
  },
];

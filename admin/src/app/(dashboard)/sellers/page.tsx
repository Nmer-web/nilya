import { Store, TriangleAlert } from "lucide-react";

import { DataTable, type Column } from "@/components/data-table";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { FilterSelect } from "@/components/filter-select";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { SuspendedBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/admin";
import { escapeFilterValue, firstParam, formatDate, pageParam } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AdminSellerRow } from "@/lib/types";

export const metadata = { title: "Sellers" };

const PAGE_SIZE = 25;
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
] as const;

export default async function SellersPage(props: PageProps<"/sellers">) {
  await requireAdmin();
  const searchParams = await props.searchParams;

  const page = pageParam(searchParams.page);
  const query = firstParam(searchParams.q)?.trim() ?? "";
  const statusParam = firstParam(searchParams.status);
  const status =
    statusParam === "active" || statusParam === "suspended" ? statusParam : undefined;

  const supabase = await createClient();

  // A seller is an account that has started Stripe Connect onboarding — that
  // is what `seller_accounts` records. Users who list without onboarding are
  // on the Users page, not here.
  let sellerQuery = supabase
    .from("admin_seller_directory")
    .select("*", { count: "exact" })
    .order("seller_since", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (status === "active") sellerQuery = sellerQuery.is("suspended_at", null);
  if (status === "suspended") sellerQuery = sellerQuery.not("suspended_at", "is", null);
  if (query) {
    const safe = escapeFilterValue(query);
    if (safe) sellerQuery = sellerQuery.or(`display_name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  const { data, error, count } = await sellerQuery;
  const sellers = (data ?? []) as AdminSellerRow[];
  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Sellers"
        description="Accounts that have started Stripe Connect onboarding and can be paid out."
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput placeholder="Search username or email" className="sm:max-w-xs sm:flex-1" />
        <FilterSelect
          paramName="status"
          ariaLabel="Filter by status"
          allLabel="All sellers"
          options={STATUS_OPTIONS}
        />
      </div>

      {error ? (
        <div className="rounded-xl border bg-card">
          <ErrorState icon={TriangleAlert} title="Could not load sellers" message={error.message} />
        </div>
      ) : (
        <>
          <DataTable
            caption="Sellers"
            columns={COLUMNS}
            rows={sellers}
            rowKey={(row) => row.profile_id}
            rowHref={(row) => `/sellers/${row.profile_id}`}
            empty={
              <EmptyState
                icon={Store}
                title={query || status ? "No matching sellers" : "No sellers have onboarded yet"}
                description={
                  query || status
                    ? "Try a different name, email or status."
                    : "A seller appears here once they begin Stripe Connect onboarding from the app. Listings can exist before that — see Users."
                }
              />
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/sellers"
            params={{ q: query || undefined, status }}
          />
        </>
      )}
    </>
  );
}

const COLUMNS: Column<AdminSellerRow>[] = [
  {
    key: "seller",
    header: "Seller",
    cell: (row) => (
      <span className="flex items-center gap-2.5">
        <UserAvatar
          name={row.display_name}
          email={row.email}
          avatarPath={row.avatar_url}
          color={row.avatar_color}
        />
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">
            {row.display_name ?? <span className="text-muted-foreground italic">No profile</span>}
          </span>
          {row.city ? <span className="text-xs text-muted-foreground">{row.city}</span> : null}
        </span>
      </span>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (row) => <span className="text-muted-foreground">{row.email ?? "—"}</span>,
  },
  {
    key: "listings",
    header: "Listings",
    className: "w-24 text-right",
    cell: (row) => (
      <span className="tabular">
        {row.active_listings_count}
        {row.listings_count !== row.active_listings_count ? (
          <span className="text-muted-foreground"> / {row.listings_count}</span>
        ) : null}
      </span>
    ),
  },
  {
    key: "sales",
    header: "Total sales",
    className: "w-28 text-right",
    cell: (row) => <span className="tabular">{row.orders_count}</span>,
  },
  {
    key: "joined",
    header: "Seller since",
    className: "w-32",
    cell: (row) => <span className="text-muted-foreground">{formatDate(row.seller_since)}</span>,
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    cell: (row) =>
      row.suspended_at ? (
        <SuspendedBadge />
      ) : (
        <Badge variant="outline" className="border-[#0F6E56]/20 bg-[#E7F1EE] font-medium text-[#0B5442]">
          Active
        </Badge>
      ),
  },
];

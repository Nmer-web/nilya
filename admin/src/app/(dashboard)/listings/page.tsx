import { ShoppingBag, TriangleAlert } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/empty-state";
import { FilterSelect } from "@/components/filter-select";
import { ListingsTable } from "@/components/listings-table";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { requireAdmin } from "@/lib/admin";
import { escapeFilterValue, firstParam, pageParam } from "@/lib/format";
import { isListingType } from "@/lib/marketplace";
import { createClient } from "@/lib/supabase/server";
import {
  LISTING_STATUSES,
  LISTING_STATUS_LABEL,
  LISTING_TYPES,
  LISTING_TYPE_LABEL,
  type AdminListingRow,
  type CategoryRow,
  type ListingStatus,
} from "@/lib/types";

export const metadata = { title: "Listings" };

const PAGE_SIZE = 25;

const STATUS_OPTIONS = LISTING_STATUSES.map((status) => ({
  value: status,
  label: LISTING_STATUS_LABEL[status],
}));

const TYPE_OPTIONS = LISTING_TYPES.map((type) => ({
  value: type,
  label: LISTING_TYPE_LABEL[type],
}));

export default async function ListingsPage(
  props: PageProps<"/listings">
) {
  await requireAdmin();
  const searchParams = await props.searchParams;

  const page = pageParam(searchParams.page);
  const query = firstParam(searchParams.q)?.trim() ?? "";
  const statusParam = firstParam(searchParams.status);
  const status = (LISTING_STATUSES as readonly string[]).includes(
    statusParam ?? ""
  )
    ? (statusParam as ListingStatus)
    : undefined;
  const category = firstParam(searchParams.category);
  const typeParam = firstParam(searchParams.type);
  const listingType = isListingType(typeParam) ? typeParam : undefined;

  const supabase = await createClient();

  // Categories drive the filter dropdown; departments and children both appear
  // because a listing can sit on either.
  const { data: categoryRows } = await supabase
    .from("categories")
    .select("slug,label,parent_id,is_active,listing_type,requires_perfume_details")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  const categories = (categoryRows ?? []) as Pick<
    CategoryRow,
    | "slug"
    | "label"
    | "parent_id"
    | "is_active"
    | "listing_type"
    | "requires_perfume_details"
  >[];

  let listingQuery = supabase
    .from("listings")
    .select(
      `id,title,brand,price_cents,currency,listing_type,status,category_slug,created_at,published_at,seller_id,
       seller:profiles!listings_seller_id_fkey(id,display_name,avatar_url,avatar_color),
       category:categories!listings_category_slug_fkey(slug,label,listing_type,requires_perfume_details),
       images:listing_images(storage_path,position),
       food_details(price_unit,quantity),
       job_details(employer,salary_min_cents,salary_max_cents,salary_currency),
       service_details(pricing_mode)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (status) listingQuery = listingQuery.eq("status", status);
  if (listingType) listingQuery = listingQuery.eq("listing_type", listingType);
  if (category) listingQuery = listingQuery.eq("category_slug", category);
  if (query) {
    const safe = escapeFilterValue(query);
    if (safe) listingQuery = listingQuery.or(`title.ilike.%${safe}%,brand.ilike.%${safe}%`);
  }

  const { data, error, count } = await listingQuery;

  const listings = ((data ?? []) as unknown as AdminListingRow[]).map(
    (listing) => ({
      ...listing,
      // PostgREST cannot order an embedded resource here, so the cover photo is
      // chosen after the fact rather than assumed to be first.
      images: [...(listing.images ?? [])].sort((a, b) => a.position - b.position),
    })
  );

  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Listings"
        description={
          total > 0
            ? `${total.toLocaleString("en-GB")} listing${total === 1 ? "" : "s"} match the current filters.`
            : "Moderate what sellers have published."
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search title or brand"
          className="sm:max-w-xs sm:flex-1"
        />
        <FilterSelect
          paramName="status"
          ariaLabel="Filter by status"
          allLabel="All statuses"
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          paramName="type"
          ariaLabel="Filter by listing type"
          allLabel="All listing types"
          options={TYPE_OPTIONS}
        />
        <FilterSelect
          paramName="category"
          ariaLabel="Filter by category"
          allLabel="All categories"
          options={categories.map((row) => ({
            value: row.slug,
            label: row.parent_id ? `— ${row.label}` : row.label,
          }))}
          className="min-w-48"
        />
      </div>

      {error ? (
        <div className="rounded-xl border bg-card">
          <ErrorState
            icon={TriangleAlert}
            title="Could not load listings"
            message={error.message}
          />
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={ShoppingBag}
            title={query || status || listingType || category ? "No matching listings" : "No listings yet"}
            description={
              query || status || listingType || category
                ? "Try a broader search or clear the filters."
                : "Listings published from the app will appear here."
            }
          />
        </div>
      ) : (
        <>
          <ListingsTable listings={listings} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/listings"
            params={{ q: query || undefined, status, type: listingType, category }}
          />
        </>
      )}
    </>
  );
}

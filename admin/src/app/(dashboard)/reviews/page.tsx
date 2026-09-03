import { Star, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { DataTable, type Column } from "@/components/data-table";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StarRating } from "@/components/star-rating";
import { RemovedBadge, StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { requireAdmin } from "@/lib/admin";
import { firstParam, formatDate, pageParam, truncate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AdminReviewRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reviews" };

const PAGE_SIZE = 25;
const FILTERS = ["all", "low", "mid", "high"] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  low: "1–2 stars",
  mid: "3 stars",
  high: "4–5 stars",
};

const REVIEW_SELECT = `id,order_id,author_id,subject_id,rating,body,created_at,removed_at,removed_reason,
  author:profiles!reviews_author_id_fkey(id,display_name,avatar_url,avatar_color),
  subject:profiles!reviews_subject_id_fkey(id,display_name,avatar_url,avatar_color)`;

export default async function ReviewsPage(props: PageProps<"/reviews">) {
  await requireAdmin();
  const searchParams = await props.searchParams;

  const page = pageParam(searchParams.page);
  const filterParam = firstParam(searchParams.rating);
  const filter: Filter = (FILTERS as readonly string[]).includes(filterParam ?? "")
    ? (filterParam as Filter)
    : "all";

  const supabase = await createClient();

  let query = supabase
    .from("reviews")
    .select(REVIEW_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (filter === "low") query = query.lte("rating", 2);
  if (filter === "mid") query = query.eq("rating", 3);
  if (filter === "high") query = query.gte("rating", 4);

  const { data, error, count } = await query;
  const reviews = (data ?? []) as unknown as AdminReviewRow[];
  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Left by buyers after a completed order. A removed review stays on record but no longer counts toward the seller's rating."
      />

      <nav
        className="mb-4 flex flex-wrap gap-1 rounded-xl border bg-card p-1"
        aria-label="Filter reviews by rating"
      >
        {FILTERS.map((value) => {
          const active = value === filter;
          return (
            <Link
              key={value}
              href={value === "all" ? "/reviews" : `/reviews?rating=${value}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active
                  ? "bg-[#0F6E56] text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {FILTER_LABEL[value]}
            </Link>
          );
        })}
      </nav>

      {error ? (
        <div className="rounded-xl border bg-card">
          <ErrorState icon={TriangleAlert} title="Could not load reviews" message={error.message} />
        </div>
      ) : (
        <>
          <DataTable
            caption="Reviews"
            columns={COLUMNS}
            rows={reviews}
            rowKey={(row) => row.id}
            rowHref={(row) => `/reviews/${row.id}`}
            empty={
              <EmptyState
                icon={Star}
                title={filter === "all" ? "No reviews yet" : `No ${FILTER_LABEL[filter]} reviews`}
                description={
                  filter === "all"
                    ? "Reviews are written after an order completes. None has been left yet."
                    : "Nothing in this rating band."
                }
              />
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/reviews"
            params={{ rating: filter === "all" ? undefined : filter }}
          />
        </>
      )}
    </>
  );
}

function Person({
  person,
}: {
  person: AdminReviewRow["author"];
}) {
  if (!person) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-2">
      <UserAvatar
        name={person.display_name}
        avatarPath={person.avatar_url}
        color={person.avatar_color}
        className="size-6"
      />
      <span className="truncate">{person.display_name}</span>
    </span>
  );
}

const COLUMNS: Column<AdminReviewRow>[] = [
  {
    key: "rating",
    header: "Rating",
    className: "w-28",
    cell: (row) => <StarRating rating={row.rating} />,
  },
  { key: "author", header: "Reviewer", cell: (row) => <Person person={row.author} /> },
  { key: "subject", header: "Subject", cell: (row) => <Person person={row.subject} /> },
  {
    key: "body",
    header: "Body",
    cell: (row) => (
      <span className="block max-w-md truncate text-muted-foreground">
        {row.body ? truncate(row.body, 80) : <span className="italic">No text</span>}
      </span>
    ),
  },
  {
    key: "date",
    header: "Date",
    className: "w-32",
    cell: (row) => <span className="text-muted-foreground">{formatDate(row.created_at)}</span>,
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    cell: (row) =>
      row.removed_at ? (
        <RemovedBadge />
      ) : (
        <StatusBadge status="standing" />
      ),
  },
];

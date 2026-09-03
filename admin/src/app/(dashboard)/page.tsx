import {
  Clock,
  Flag,
  ShoppingBag,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";

import { ActivityChart, type ActivityDay } from "@/components/activity-chart";
import { DataTable, TABLE_CARD, type Column } from "@/components/data-table";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  ListingStatusBadge,
  ReportStatusBadge,
  TargetTypeBadge,
} from "@/components/status-badge";
import { requireAdmin } from "@/lib/admin";
import { formatMoney, formatRelative, listingImageUrl } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  REPORT_REASON_LABEL,
  type AdminListingRow,
  type AdminReportRow,
  type OverviewStats,
} from "@/lib/types";

export const metadata = { title: "Overview" };

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export default async function OverviewPage() {
  await requireAdmin();
  const supabase = await createClient();

  // The chart covers the seven calendar days ending today, in UTC — the same
  // clock `created_at` is stored in.
  const today = new Date();
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 6)
  );

  const [statsResult, reportsResult, recentResult, weekResult] =
    await Promise.all([
      supabase.from("admin_overview_stats").select("*").maybeSingle(),
      supabase
        .from("admin_report_feed")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("listings")
        .select(
          `id,title,brand,price_cents,currency,status,category_slug,created_at,published_at,seller_id,
           seller:profiles!listings_seller_id_fkey(id,display_name,avatar_url,avatar_color),
           category:categories!listings_category_slug_fkey(slug,label),
           images:listing_images(storage_path,position)`
        )
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("listings")
        .select("created_at")
        .gte("created_at", start.toISOString()),
    ]);

  const stats = statsResult.data as OverviewStats | null;
  const reports = (reportsResult.data ?? []) as AdminReportRow[];
  const recent = (recentResult.data ?? []) as unknown as AdminListingRow[];
  const days = bucketByDay(
    (weekResult.data ?? []) as { created_at: string }[],
    start
  );

  return (
    <>
      <PageHeader
        title="Overview"
        description="Marketplace health and the moderation queue."
      />

      {statsResult.error || !stats ? (
        <div className={TABLE_CARD}>
          <ErrorState
            icon={TriangleAlert}
            title="Could not load the overview statistics"
            message={
              statsResult.error?.message ??
              "admin_overview_stats returned no row for this account."
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Users"
            value={stats.total_users}
            icon={Users}
            dark
            href="/users"
            trend={
              stats.new_users_week > 0
                ? `+${stats.new_users_week.toLocaleString("en-GB")} this week`
                : "No new users this week"
            }
            trendUp={stats.new_users_week > 0}
          />
          <StatCard
            label="Active Listings"
            value={stats.active_listings}
            icon={ShoppingBag}
            accent="green"
            href="/listings?status=active"
            trend={
              stats.listings_today > 0
                ? `+${stats.listings_today.toLocaleString("en-GB")} published today`
                : "None published today"
            }
            trendUp={stats.listings_today > 0}
          />
          <StatCard
            label="Open Reports"
            value={stats.open_reports}
            icon={Flag}
            accent={stats.open_reports > 0 ? "red" : "green"}
            href="/reports?status=open"
            trend={stats.open_reports > 0 ? "Needs attention" : "Queue clear"}
            trendUp={stats.open_reports === 0}
          />
          <StatCard
            label="Under Review"
            value={stats.listings_under_review}
            icon={Clock}
            accent={stats.listings_under_review > 0 ? "amber" : "green"}
            href="/listings?status=under_review"
            trend={
              stats.listings_under_review > 0
                ? "Awaiting a decision"
                : "Nothing waiting"
            }
            trendUp={stats.listings_under_review === 0}
          />
        </div>
      )}

      <section className={`${TABLE_CARD} mt-6 p-6`}>
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Listing Activity
            </h2>
            <p className="text-sm text-muted-foreground">
              Listings created per day, last 7 days.
            </p>
          </div>
          <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Last 7 days
          </span>
        </div>
        {weekResult.error ? (
          <ErrorState
            icon={TriangleAlert}
            title="Could not load listing activity"
            message={weekResult.error.message}
          />
        ) : (
          <ActivityChart days={days} />
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="min-w-0 xl:col-span-3">
          <SectionHeading
            title="Recent Reports"
            description="Open reports, newest first."
            href="/reports"
          />
          {reportsResult.error ? (
            <div className={TABLE_CARD}>
              <ErrorState
                icon={TriangleAlert}
                title="Could not load reports"
                message={reportsResult.error.message}
              />
            </div>
          ) : (
            <DataTable
              caption="Most recent open reports"
              columns={RECENT_REPORT_COLUMNS}
              rows={reports}
              rowKey={(row) => row.id}
              rowHref={(row) => `/reports/${row.id}`}
              empty={
                <EmptyState
                  icon={Flag}
                  title="No open reports"
                  description="Nothing is waiting on moderation. Reports filed from the app will appear here."
                />
              }
            />
          )}
        </section>

        <section className="min-w-0 xl:col-span-2">
          <SectionHeading
            title="Recent Listings"
            description="The last five created."
            href="/listings"
          />
          <div className={TABLE_CARD}>
            {recentResult.error ? (
              <ErrorState
                icon={TriangleAlert}
                title="Could not load listings"
                message={recentResult.error.message}
              />
            ) : recent.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No listings yet"
                description="Listings created in the app will appear here."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((listing) => (
                  <RecentListingRow key={listing.id} listing={listing} />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function SectionHeading({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        href={href}
        className="shrink-0 rounded-md text-sm font-medium text-[#0F6E56] underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        View all →
      </Link>
    </div>
  );
}

function RecentListingRow({ listing }: { listing: AdminListingRow }) {
  const cover = [...listing.images].sort((a, b) => a.position - b.position)[0];
  const src = cover ? listingImageUrl(cover.storage_path) : null;
  return (
    <li>
      <Link
        href={`/listings/${listing.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase public storage, sized by CSS
          <img
            src={src}
            alt=""
            className="size-10 shrink-0 rounded-lg bg-muted object-cover"
          />
        ) : (
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            aria-hidden
          >
            <ShoppingBag className="size-4" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {listing.title}
          </span>
          <span className="tabular block text-xs text-muted-foreground">
            {formatMoney(listing.price_cents, listing.currency)}
            {listing.brand ? ` · ${listing.brand}` : ""}
          </span>
        </span>
        <ListingStatusBadge status={listing.status} />
      </Link>
    </li>
  );
}

/** Counts rows into the seven UTC days starting at `start`. */
function bucketByDay(
  rows: { created_at: string }[],
  start: Date
): ActivityDay[] {
  const todayKey = new Date().toISOString().slice(0, 10);
  const days: ActivityDay[] = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const key = date.toISOString().slice(0, 10);
    return {
      day: WEEKDAY[date.getUTCDay()],
      date: key,
      count: 0,
      today: key === todayKey,
    };
  });
  const index = new Map(days.map((day, i) => [day.date, i]));
  for (const row of rows) {
    const slot = index.get(row.created_at.slice(0, 10));
    if (slot !== undefined) days[slot].count += 1;
  }
  return days;
}

const RECENT_REPORT_COLUMNS: Column<AdminReportRow>[] = [
  {
    key: "type",
    header: "Type",
    className: "w-24",
    cell: (row) => <TargetTypeBadge type={row.target_type} />,
  },
  {
    key: "target",
    header: "Target",
    cell: (row) => (
      <span className="font-medium text-foreground">
        {row.target_label ?? (
          <span className="text-muted-foreground italic">Deleted target</span>
        )}
      </span>
    ),
  },
  {
    key: "reason",
    header: "Reason",
    cell: (row) => (
      <span className="text-muted-foreground">
        {REPORT_REASON_LABEL[row.reason] ?? row.reason}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    cell: (row) => <ReportStatusBadge status={row.status} />,
  },
  {
    key: "date",
    header: "Date",
    className: "w-28 text-right",
    cell: (row) => (
      <span className="text-muted-foreground">
        {formatRelative(row.created_at)}
      </span>
    ),
  },
];

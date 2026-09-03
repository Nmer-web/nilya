import {
  CheckCircle2,
  Clock,
  Flag,
  ShoppingBag,
  TrendingUp,
  Users,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { DataTable, type Column } from "@/components/data-table";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ReportStatusBadge, TargetTypeBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/admin";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  REPORT_REASON_LABEL,
  type AdminReportRow,
  type OverviewStats,
} from "@/lib/types";

export const metadata = { title: "Overview" };

export default async function OverviewPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [statsResult, reportsResult] = await Promise.all([
    supabase.from("admin_overview_stats").select("*").maybeSingle(),
    supabase
      .from("admin_report_feed")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const stats = statsResult.data as OverviewStats | null;
  const reports = (reportsResult.data ?? []) as AdminReportRow[];

  return (
    <>
      <PageHeader
        title="Overview"
        description="Marketplace health and the moderation queue."
      />

      {statsResult.error || !stats ? (
        <div className="rounded-xl border bg-card">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total users"
            value={stats.total_users}
            icon={Users}
            tone="blue"
            href="/users"
          />
          <StatCard
            label="New this week"
            value={stats.new_users_week}
            icon={TrendingUp}
            tone="green"
            href="/users"
          />
          <StatCard
            label="Active listings"
            value={stats.active_listings}
            icon={ShoppingBag}
            tone="green"
            href="/listings?status=active"
          />
          <StatCard
            label="Under review"
            value={stats.listings_under_review}
            icon={Clock}
            tone="amber"
            href="/listings?status=under_review"
          />
          <StatCard
            label="Published today"
            value={stats.listings_today}
            icon={CheckCircle2}
            tone="green"
            href="/listings?status=active"
          />
          <StatCard
            label="Open reports"
            value={stats.open_reports}
            icon={Flag}
            tone="red"
            href="/reports?status=open"
          />
        </div>
      )}

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Open reports
            </h2>
            <p className="text-sm text-muted-foreground">
              The ten most recent, newest first.
            </p>
          </div>
          <Link
            href="/reports"
            className="rounded-md text-sm font-medium text-[#0F6E56] underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            View all
          </Link>
        </div>

        {reportsResult.error ? (
          <div className="rounded-xl border bg-card">
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
    </>
  );
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
    key: "reporter",
    header: "Reported by",
    cell: (row) => (
      <span className="text-muted-foreground">
        {row.reporter_name ?? row.reporter_email ?? "—"}
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
    className: "w-32 text-right",
    cell: (row) => (
      <span className="text-muted-foreground">
        {formatRelative(row.created_at)}
      </span>
    ),
  },
];

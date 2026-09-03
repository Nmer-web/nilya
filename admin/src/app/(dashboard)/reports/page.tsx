import { Flag, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { DataTable, type Column } from "@/components/data-table";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { ReportStatusBadge, TargetTypeBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/admin";
import { firstParam, formatRelative, pageParam } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  REPORT_REASON_LABEL,
  REPORT_STATUSES,
  REPORT_STATUS_LABEL,
  type AdminReportRow,
  type ReportStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reports" };

const PAGE_SIZE = 25;

export default async function ReportsPage(props: PageProps<"/reports">) {
  await requireAdmin();
  const searchParams = await props.searchParams;

  const page = pageParam(searchParams.page);
  const statusParam = firstParam(searchParams.status);
  // The queue defaults to what needs attention, not to everything.
  const status = (REPORT_STATUSES as readonly string[]).includes(
    statusParam ?? ""
  )
    ? (statusParam as ReportStatus)
    : "open";

  const supabase = await createClient();

  const [countsResult, listResult] = await Promise.all([
    supabase.from("reports").select("status"),
    supabase
      .from("admin_report_feed")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);

  const counts = new Map<ReportStatus, number>(
    REPORT_STATUSES.map((value) => [value, 0])
  );
  for (const row of (countsResult.data ?? []) as { status: ReportStatus }[]) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  const reports = (listResult.data ?? []) as AdminReportRow[];
  const total = listResult.count ?? 0;

  return (
    <>
      <PageHeader
        title="Reports"
        description="What the community has flagged, newest first."
      />

      <nav
        className="mb-4 flex flex-wrap gap-1 rounded-xl border bg-card p-1"
        aria-label="Filter reports by status"
      >
        {REPORT_STATUSES.map((value) => {
          const active = value === status;
          const count = counts.get(value) ?? 0;
          return (
            <Link
              key={value}
              href={value === "open" ? "/reports" : `/reports?status=${value}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active
                  ? "bg-[#0F6E56] text-white"
                  : "text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
              )}
            >
              {REPORT_STATUS_LABEL[value]}
              <span
                className={cn(
                  "tabular rounded-full px-1.5 text-[11px] font-semibold",
                  active ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600"
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {listResult.error ? (
        <div className="rounded-xl border bg-card">
          <ErrorState
            icon={TriangleAlert}
            title="Could not load reports"
            message={listResult.error.message}
          />
        </div>
      ) : (
        <>
          <DataTable
            caption={`${REPORT_STATUS_LABEL[status]} reports`}
            columns={REPORT_COLUMNS}
            rows={reports}
            rowKey={(row) => row.id}
            rowHref={(row) => `/reports/${row.id}`}
            empty={
              <EmptyState
                icon={Flag}
                title={`No ${REPORT_STATUS_LABEL[status].toLowerCase()} reports`}
                description={
                  status === "open"
                    ? "The queue is clear. Reports filed from the app arrive here."
                    : "Nothing in this state right now."
                }
              />
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/reports"
            params={{ status: status === "open" ? undefined : status }}
          />
        </>
      )}
    </>
  );
}

const REPORT_COLUMNS: Column<AdminReportRow>[] = [
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
    header: "Reporter",
    className: "w-52",
    cell: (row) => (
      <span className="truncate text-muted-foreground">
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

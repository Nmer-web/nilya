import { Scale, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { DataTable, type Column } from "@/components/data-table";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { DisputeStateBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { requireAdmin } from "@/lib/admin";
import { firstParam, formatRelative, pageParam, shortId } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  CLOSED_DISPUTE_STATES,
  DISPUTE_REASON_LABEL,
  OPEN_DISPUTE_STATES,
  type AdminDisputeRow,
  type DisputeState,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Disputes" };

const PAGE_SIZE = 25;
const TABS = ["open", "resolved", "all"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { open: "Open", resolved: "Resolved", all: "All" };

export default async function DisputesPage(props: PageProps<"/disputes">) {
  await requireAdmin();
  const searchParams = await props.searchParams;

  const page = pageParam(searchParams.page);
  const tabParam = firstParam(searchParams.state);
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as Tab)
    : "open";

  const supabase = await createClient();

  let query = supabase
    .from("admin_dispute_feed")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (tab === "open") query = query.in("state", [...OPEN_DISPUTE_STATES]);
  if (tab === "resolved") query = query.in("state", [...CLOSED_DISPUTE_STATES]);

  const [{ data, error, count }, statesResult] = await Promise.all([
    query,
    supabase.from("disputes").select("state"),
  ]);

  const counts: Record<Tab, number> = { open: 0, resolved: 0, all: 0 };
  for (const row of (statesResult.data ?? []) as { state: DisputeState }[]) {
    counts.all += 1;
    if (OPEN_DISPUTE_STATES.includes(row.state)) counts.open += 1;
    else counts.resolved += 1;
  }

  const disputes = (data ?? []) as AdminDisputeRow[];
  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Disputes"
        description="Buyer and seller disagreements on an order, oldest decisions last."
      />

      <nav
        className="mb-4 flex flex-wrap gap-1 rounded-xl border bg-card p-1"
        aria-label="Filter disputes by state"
      >
        {TABS.map((value) => {
          const active = value === tab;
          return (
            <Link
              key={value}
              href={value === "open" ? "/disputes" : `/disputes?state=${value}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active
                  ? "bg-[#0F6E56] text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {TAB_LABEL[value]}
              <span
                className={cn(
                  "tabular rounded-full px-1.5 text-[11px] font-semibold",
                  active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {counts[value]}
              </span>
            </Link>
          );
        })}
      </nav>

      {error ? (
        <div className="rounded-xl border bg-card">
          <ErrorState icon={TriangleAlert} title="Could not load disputes" message={error.message} />
        </div>
      ) : (
        <>
          <DataTable
            caption={`${TAB_LABEL[tab]} disputes`}
            columns={COLUMNS}
            rows={disputes}
            rowKey={(row) => row.id}
            rowHref={(row) => `/disputes/${row.id}`}
            empty={
              <EmptyState
                icon={Scale}
                title={tab === "open" ? "No open disputes" : `No ${TAB_LABEL[tab].toLowerCase()} disputes`}
                description={
                  tab === "open"
                    ? "Nothing is waiting on a decision. Disputes opened in the app arrive here."
                    : "Nothing in this state yet."
                }
              />
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/disputes"
            params={{ state: tab === "open" ? undefined : tab }}
          />
        </>
      )}
    </>
  );
}

const COLUMNS: Column<AdminDisputeRow>[] = [
  {
    key: "dispute",
    header: "Dispute",
    cell: (row) => (
      <span className="block">
        <span className="font-mono text-xs text-muted-foreground">{shortId(row.id)}</span>
        <span className="block truncate font-medium text-foreground">
          {row.listing_title ?? <span className="text-muted-foreground italic">Listing gone</span>}
        </span>
      </span>
    ),
  },
  {
    key: "order",
    header: "Order",
    className: "w-28",
    cell: (row) => (
      <span className="relative z-10">
        <Link
          href={`/orders/${row.order_id}`}
          className="rounded font-mono text-xs text-[#0F6E56] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          title={row.order_id}
        >
          {shortId(row.order_id)}
        </Link>
      </span>
    ),
  },
  {
    key: "opener",
    header: "Opened by",
    cell: (row) => (
      <span className="flex items-center gap-2">
        <UserAvatar
          name={row.opener_name}
          email={row.opener_email}
          avatarPath={row.opener_avatar_url}
          color={row.opener_avatar_color}
          className="size-6"
        />
        <span className="truncate">{row.opener_name ?? row.opener_email ?? "—"}</span>
      </span>
    ),
  },
  {
    key: "reason",
    header: "Reason",
    cell: (row) => (
      <span className="text-muted-foreground">
        {DISPUTE_REASON_LABEL[row.reason] ?? row.reason}
      </span>
    ),
  },
  {
    key: "state",
    header: "State",
    className: "w-40",
    cell: (row) => <DisputeStateBadge state={row.state} />,
  },
  {
    key: "created",
    header: "Created",
    className: "w-32 text-right",
    cell: (row) => <span className="text-muted-foreground">{formatRelative(row.created_at)}</span>,
  },
];

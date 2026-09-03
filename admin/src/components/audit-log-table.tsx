"use client";

import { ChevronRight, History, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { JsonViewer } from "@/components/json-viewer";
import { AuditTargetBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, shortId, truncate } from "@/lib/format";
import type { AdminAuditRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Where a target type's detail page lives, when it has one. */
const TARGET_HREF: Record<string, (id: string) => string> = {
  listing: (id) => `/listings/${id}`,
  user: (id) => `/users/${id}`,
  report: (id) => `/reports/${id}`,
  dispute: (id) => `/disputes/${id}`,
  review: (id) => `/reviews/${id}`,
  admin_user: (id) => `/users/${id}`,
};

/**
 * The loaded page of audit rows with a client-side action filter and an
 * inline before/after expansion. Date range and paging are URL params handled
 * by the Server Component; this never queries.
 */
export function AuditLogTable({ rows }: { rows: AdminAuditRow[] }) {
  const [actionFilter, setActionFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const visible = useMemo(() => {
    const needle = actionFilter.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.action.toLowerCase().includes(needle));
  }, [rows, actionFilter]);

  function toggle(id: number) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="relative mb-4 max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          placeholder="Filter this page by action"
          aria-label="Filter this page by action"
          className="h-9 bg-card pl-9"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={History}
            title={rows.length === 0 ? "No audit entries" : "No matching actions"}
            description={
              rows.length === 0
                ? "Every moderation decision made here is recorded. None has been made in this range."
                : "Nothing on this page matches that action filter."
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <caption className="sr-only">Audit log</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["", "Actor", "Action", "Target", "Target ID", "Note", "Date"].map(
                    (header, index) => (
                      <TableHead
                        key={index}
                        className={cn(
                          "h-11 bg-zinc-50/80 text-xs font-medium tracking-wide text-muted-foreground uppercase",
                          index === 0 && "w-8",
                          index === 6 && "w-40 text-right"
                        )}
                      >
                        {header || <span className="sr-only">Expand</span>}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => {
                  const isOpen = expanded.has(row.id);
                  const href = TARGET_HREF[row.target_type]?.(row.target_id);
                  return (
                    <RowPair
                      key={row.id}
                      row={row}
                      isOpen={isOpen}
                      href={href}
                      onToggle={() => toggle(row.id)}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
}

function RowPair({
  row,
  isOpen,
  href,
  onToggle,
}: {
  row: AdminAuditRow;
  isOpen: boolean;
  href?: string;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        onClick={onToggle}
        className="cursor-pointer"
        data-state={isOpen ? "open" : "closed"}
      >
        <TableCell className="py-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Hide details" : "Show details"}
            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-zinc-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronRight
              className={cn("size-4 transition-transform", isOpen && "rotate-90")}
              aria-hidden
            />
          </button>
        </TableCell>
        <TableCell className="py-3">
          <span className="block truncate font-medium text-foreground">
            {row.actor_email ?? row.actor_name ?? shortId(row.actor_id)}
          </span>
        </TableCell>
        <TableCell className="py-3">
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-foreground">
            {row.action}
          </code>
        </TableCell>
        <TableCell className="py-3">
          <AuditTargetBadge type={row.target_type} />
        </TableCell>
        <TableCell className="py-3">
          {href ? (
            <Link
              href={href}
              onClick={(event) => event.stopPropagation()}
              className="rounded font-mono text-xs text-[#0F6E56] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              title={row.target_id}
            >
              {shortId(row.target_id)}
            </Link>
          ) : (
            <span className="font-mono text-xs text-muted-foreground" title={row.target_id}>
              {shortId(row.target_id)}
            </span>
          )}
        </TableCell>
        <TableCell className="max-w-64 py-3 text-muted-foreground">
          <span className="block truncate" title={row.note ?? undefined}>
            {row.note ? truncate(row.note, 60) : "—"}
          </span>
        </TableCell>
        <TableCell className="py-3 text-right whitespace-nowrap text-muted-foreground">
          {formatDateTime(row.created_at)}
        </TableCell>
      </TableRow>

      {isOpen ? (
        <TableRow className="bg-zinc-50/60 hover:bg-zinc-50/60">
          <TableCell />
          <TableCell colSpan={6} className="py-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <JsonViewer label="Before" value={row.before} open />
              <JsonViewer label="After" value={row.after} open />
            </div>
            {row.note ? (
              <p className="mt-3 text-sm whitespace-pre-wrap text-foreground">
                <span className="font-medium">Note: </span>
                {row.note}
              </p>
            ) : null}
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              entry #{row.id} · target {row.target_id}
            </p>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

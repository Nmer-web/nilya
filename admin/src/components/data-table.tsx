import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Column<T> = {
  /** Stable key; also used for the React key of the cell. */
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Extra classes for both the header cell and the body cells. */
  className?: string;
  /** Header-only classes, e.g. `sr-only` for an icon column. */
  headerClassName?: string;
};

/** The one card shell every table sits in. */
export const TABLE_CARD =
  "overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)]";

/**
 * The one table shell every list uses, so column rhythm, hover, empty state and
 * row linking behave identically across the dashboard.
 *
 * A row is made navigable by `rowHref`. That renders a real anchor inside the
 * first cell and stretches it across the row, rather than putting an onClick on
 * a `<tr>` — the link stays keyboard reachable, focusable and openable in a new
 * tab, which a click handler is not.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  empty,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  empty: ReactNode;
  caption?: string;
}) {
  if (rows.length === 0) {
    return <div className={TABLE_CARD}>{empty}</div>;
  }

  return (
    <div className={TABLE_CARD}>
      <div className="overflow-x-auto">
        <Table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <TableHeader>
            <TableRow className="hover:bg-muted">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(column.className, column.headerClassName)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <TableRow
                  key={rowKey(row)}
                  className={cn("group h-14", href && "relative cursor-pointer")}
                >
                  {columns.map((column, index) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "align-middle",
                        index === 0 && "font-medium text-foreground",
                        column.className
                      )}
                    >
                      {href && index === 0 ? (
                        <>
                          {/* Stretched anchor: covers the row, stays a real link. */}
                          <a
                            href={href}
                            className="absolute inset-0 z-0 rounded-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          >
                            <span className="sr-only">Open</span>
                          </a>
                          <span className="pointer-events-none relative z-10">
                            {column.cell(row)}
                          </span>
                        </>
                      ) : (
                        column.cell(row)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Matches the table shell above so a page does not jump when data lands. */
export function TableSkeleton({
  columns,
  rows = 8,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <div className={TABLE_CARD}>
      <div className="h-11 border-b border-border bg-muted" />
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex h-14 items-center gap-4 px-4">
            {Array.from({ length: columns }).map((__, cellIndex) => (
              <Skeleton
                key={cellIndex}
                className={cn(
                  "h-4",
                  cellIndex === 0 ? "w-40" : "w-24",
                  cellIndex === columns - 1 && "ml-auto"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

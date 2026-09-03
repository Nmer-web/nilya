import { TriangleAlert } from "lucide-react";

import { AuditLogTable } from "@/components/audit-log-table";
import { ErrorState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdmin } from "@/lib/admin";
import { firstParam, pageParam } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AdminAuditRow } from "@/lib/types";

export const metadata = { title: "Audit log" };

const PAGE_SIZE = 50;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function dateParam(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw && ISO_DATE.test(raw) ? raw : undefined;
}

export default async function AuditLogPage(props: PageProps<"/audit-log">) {
  await requireAdmin();
  const searchParams = await props.searchParams;

  const page = pageParam(searchParams.page);
  const from = dateParam(searchParams.from);
  const to = dateParam(searchParams.to);

  const supabase = await createClient();

  let query = supabase
    .from("admin_audit_feed")
    .select("*", { count: "exact" })
    .order("id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  // Dates are whole days in UTC; the end bound is inclusive of its last moment.
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data, error, count } = await query;
  const rows = (data ?? []) as AdminAuditRow[];
  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every decision made in this dashboard, newest first. Read-only: rows are written by the database, not by any client."
      />

      <form
        method="get"
        action="/audit-log"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3"
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-from" className="text-xs">From</Label>
          <Input id="audit-from" type="date" name="from" defaultValue={from} className="h-9 w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-to" className="text-xs">To</Label>
          <Input id="audit-to" type="date" name="to" defaultValue={to} className="h-9 w-40" />
        </div>
        <Button type="submit" variant="outline" className="h-9">
          Apply
        </Button>
        {from || to ? (
          <Button
            type="button"
            variant="ghost"
            className="h-9"
            nativeButton={false}
            render={<a href="/audit-log" />}
          >
            Clear
          </Button>
        ) : null}
        <p className="ml-auto text-xs text-muted-foreground">
          {total.toLocaleString("en-GB")} entr{total === 1 ? "y" : "ies"}
          {from || to ? " in range" : ""}
        </p>
      </form>

      {error ? (
        <div className="rounded-xl border bg-card">
          <ErrorState icon={TriangleAlert} title="Could not load the audit log" message={error.message} />
        </div>
      ) : (
        <>
          <AuditLogTable rows={rows} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/audit-log"
            params={{ from, to }}
          />
        </>
      )}
    </>
  );
}

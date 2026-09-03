import { TriangleAlert, Users } from "lucide-react";

import { DataTable, type Column } from "@/components/data-table";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { StatusBadge, SuspendedBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { ROLE_LABEL, requireAdmin } from "@/lib/admin";
import { escapeFilterValue, firstParam, formatDate, pageParam } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AdminUserRow } from "@/lib/types";

export const metadata = { title: "Users" };

const PAGE_SIZE = 25;

export default async function UsersPage(props: PageProps<"/users">) {
  await requireAdmin();
  const searchParams = await props.searchParams;

  const page = pageParam(searchParams.page);
  const query = firstParam(searchParams.q)?.trim() ?? "";

  const supabase = await createClient();

  // `admin_user_directory` exists because auth.users — and therefore the email
  // column — is not reachable over PostgREST. See the access-repair migration.
  let userQuery = supabase
    .from("admin_user_directory")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (query) {
    const safe = escapeFilterValue(query);
    if (safe) {
      userQuery = userQuery.or(
        `email.ilike.%${safe}%,display_name.ilike.%${safe}%`
      );
    }
  }

  const { data, error, count } = await userQuery;
  const users = (data ?? []) as AdminUserRow[];
  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Users"
        description={
          total > 0
            ? `${total.toLocaleString("en-GB")} account${total === 1 ? "" : "s"}.`
            : "Everyone with a Nilya account."
        }
      />

      <div className="mb-4">
        <SearchInput
          placeholder="Search email or username"
          className="max-w-sm"
        />
      </div>

      {error ? (
        <div className="rounded-xl border bg-card">
          <ErrorState
            icon={TriangleAlert}
            title="Could not load users"
            message={error.message}
          />
        </div>
      ) : (
        <>
          <DataTable
            caption="Nilya accounts"
            columns={USER_COLUMNS}
            rows={users}
            rowKey={(row) => row.id}
            rowHref={(row) => `/users/${row.id}`}
            empty={
              <EmptyState
                icon={Users}
                title={query ? "No matching accounts" : "No accounts yet"}
                description={
                  query
                    ? "Try a different email address or username."
                    : "Accounts created in the app will appear here."
                }
              />
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/users"
            params={{ q: query || undefined }}
          />
        </>
      )}
    </>
  );
}

const USER_COLUMNS: Column<AdminUserRow>[] = [
  {
    key: "user",
    header: "Username",
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
            {row.display_name ?? (
              <span className="text-muted-foreground italic">No profile</span>
            )}
          </span>
          {row.admin_role ? (
            <span className="text-xs text-muted-foreground">
              {ROLE_LABEL[row.admin_role]}
            </span>
          ) : null}
        </span>
      </span>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (row) => (
      <span className="text-muted-foreground">{row.email ?? "—"}</span>
    ),
  },
  {
    key: "joined",
    header: "Joined",
    className: "w-32",
    cell: (row) => (
      <span className="text-muted-foreground">{formatDate(row.created_at)}</span>
    ),
  },
  {
    key: "listings",
    header: "Listings",
    className: "w-24 text-right",
    cell: (row) => <span className="tabular">{row.listings_count}</span>,
  },
  {
    key: "reports",
    header: "Reports",
    className: "w-24 text-right",
    cell: (row) => (
      <span
        className={cnCount(row.reports_count)}
      >
        {row.reports_count}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    cell: (row) =>
      row.suspended_at ? (
        <SuspendedBadge />
      ) : (
        <StatusBadge status="active" />
      ),
  },
];

/** A report count above zero is the reason an operator opens this row. */
function cnCount(count: number) {
  return count > 0 ? "tabular font-medium text-destructive" : "tabular";
}

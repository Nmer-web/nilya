import { ArrowLeft, Flag, MapPin, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ListingStatusBadge, ReportStatusBadge, StatusBadge, SuspendedBadge } from "@/components/status-badge";
import { SuspendControl } from "@/components/suspend-dialog";
import { TabPanels } from "@/components/tab-panels";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { ROLE_LABEL, requireAdmin } from "@/lib/admin";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatRelative,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  REPORT_REASON_LABEL,
  type AdminListingRow,
  type AdminReportRow,
  type AdminUserRow,
} from "@/lib/types";

export default async function UserDetailPage(props: PageProps<"/users/[id]">) {
  const session = await requireAdmin();
  const { id } = await props.params;

  const supabase = await createClient();

  const [userResult, listingsResult, reportsResult] = await Promise.all([
    supabase.from("admin_user_directory").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("listings")
      .select(
        `id,title,brand,price_cents,currency,status,category_slug,created_at,published_at,seller_id,
         category:categories!listings_category_slug_fkey(slug,label)`
      )
      .eq("seller_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("admin_report_feed")
      .select("*")
      .eq("target_type", "user")
      .eq("target_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!userResult.data) notFound();

  const user = userResult.data as AdminUserRow;
  const listings = (listingsResult.data ?? []) as unknown as AdminListingRow[];
  const reports = (reportsResult.data ?? []) as AdminReportRow[];

  const name = user.display_name ?? user.email ?? "This account";

  // Why suspension may be unavailable. Rendering a dead button instead would
  // violate Principle V; the RPC refuses both cases anyway.
  const suspendBlockedBy =
    user.id === session.userId
      ? "This is your own account."
      : user.admin_role
        ? `Admin accounts cannot be suspended from here. ${name} holds the ${ROLE_LABEL[user.admin_role]} role.`
        : undefined;

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link
            href="/users"
            className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All users
          </Link>
        }
        title={name}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <Card className="mb-6 flex flex-row flex-wrap items-center gap-4 p-5">
            <UserAvatar
              name={user.display_name}
              email={user.email}
              avatarPath={user.avatar_url}
              color={user.avatar_color}
              className="size-14"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-foreground">
                {user.display_name ?? (
                  <span className="text-muted-foreground italic">
                    No profile row
                  </span>
                )}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email ?? "—"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {user.suspended_at ? <SuspendedBadge /> : null}
                {user.admin_role ? (
                  <StatusBadge status={user.admin_role} />
                ) : null}
                {user.is_verified ? (
                  <StatusBadge status="verified" />
                ) : null}
                {user.city || user.country_code ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" aria-hidden />
                    {[user.city, user.country_code].filter(Boolean).join(", ")}
                  </span>
                ) : null}
              </div>
            </div>
            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-muted-foreground">Joined</dt>
                <dd className="font-medium">{formatDate(user.created_at)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last sign-in</dt>
                <dd className="font-medium">
                  {user.last_sign_in_at
                    ? formatRelative(user.last_sign_in_at)
                    : "Never"}
                </dd>
              </div>
            </dl>
          </Card>

          <TabPanels
            panels={[
              {
                value: "listings",
                label: "Listings",
                count: listings.length,
                content: (
                  <DataTable
                    caption={`Listings by ${name}`}
                    columns={LISTING_COLUMNS}
                    rows={listings}
                    rowKey={(row) => row.id}
                    rowHref={(row) => `/listings/${row.id}`}
                    empty={
                      <EmptyState
                        icon={ShoppingBag}
                        title="No listings"
                        description="This account has not created a listing."
                      />
                    }
                  />
                ),
              },
              {
                value: "reports",
                label: "Reports",
                count: reports.length,
                content: (
                  <DataTable
                    caption={`Reports filed against ${name}`}
                    columns={REPORT_COLUMNS}
                    rows={reports}
                    rowKey={(row) => row.id}
                    rowHref={(row) => `/reports/${row.id}`}
                    empty={
                      <EmptyState
                        icon={Flag}
                        title="No reports"
                        description="Nobody has reported this account."
                      />
                    }
                  />
                ),
              },
            ]}
          />
        </div>

        <aside>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Account standing
            </h2>
            {user.suspended_at ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-900">
                  Suspended {formatRelative(user.suspended_at)}
                </p>
                {user.suspended_reason ? (
                  <p className="mt-1 text-sm text-red-800">
                    {user.suspended_reason}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-red-700">
                  {formatDateTime(user.suspended_at)}
                </p>
              </div>
            ) : (
              <p className="mt-1 mb-4 text-sm text-muted-foreground">
                This account is in good standing.
              </p>
            )}

            <div className="mt-4">
              <SuspendControl
                userId={user.id}
                displayName={name}
                suspendedAt={user.suspended_at}
                disabledReason={suspendBlockedBy}
              />
            </div>

            {/*
              Honest scope note. The admin records suspension; the Expo app's
              read paths do not consult `suspended_at` yet, so a suspended
              seller is not yet locked out of the mobile app. Enforcing it there
              is app work outside this dashboard.
            */}
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              Suspension is recorded here and visible to moderators. The Nilya
              app does not yet act on it — enforcing sign-in and listing blocks
              is a separate change in the mobile app.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}

const LISTING_COLUMNS: Column<AdminListingRow>[] = [
  {
    key: "title",
    header: "Title",
    cell: (row) => (
      <span className="font-medium text-foreground">{row.title}</span>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (row) => (
      <span className="text-muted-foreground">
        {row.category?.label ?? row.category_slug}
      </span>
    ),
  },
  {
    key: "price",
    header: "Price",
    className: "w-28 text-right",
    cell: (row) => (
      <span className="tabular font-medium">
        {formatMoney(row.price_cents, row.currency)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-32",
    cell: (row) => <ListingStatusBadge status={row.status} />,
  },
  {
    key: "created",
    header: "Created",
    className: "w-32 text-right",
    cell: (row) => (
      <span className="text-muted-foreground">{formatDate(row.created_at)}</span>
    ),
  },
];

const REPORT_COLUMNS: Column<AdminReportRow>[] = [
  {
    key: "reason",
    header: "Reason",
    cell: (row) => (
      <span className="font-medium text-foreground">
        {REPORT_REASON_LABEL[row.reason] ?? row.reason}
      </span>
    ),
  },
  {
    key: "detail",
    header: "Detail",
    cell: (row) => (
      <span className="line-clamp-1 text-muted-foreground">
        {row.detail ?? "—"}
      </span>
    ),
  },
  {
    key: "reporter",
    header: "Reported by",
    className: "w-44",
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

import { ArrowLeft, ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ReportActions } from "@/components/report-actions";
import {
  ListingStatusBadge,
  ReportStatusBadge,
  SuspendedBadge,
  TargetTypeBadge,
} from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  listingImageUrl,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  REPORT_REASON_LABEL,
  type AdminListingRow,
  type AdminReportRow,
  type AdminUserRow,
} from "@/lib/types";

export default async function ReportDetailPage(
  props: PageProps<"/reports/[id]">
) {
  await requireAdmin();
  const { id } = await props.params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_report_feed")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const report = data as AdminReportRow;

  // Only one of these is fetched, decided by what the report points at.
  const [listingResult, userResult] = await Promise.all([
    report.target_type === "listing"
      ? supabase
          .from("listings")
          .select(
            `id,title,brand,price_cents,currency,status,category_slug,created_at,published_at,seller_id,
             seller:profiles!listings_seller_id_fkey(id,display_name,avatar_url,avatar_color),
             category:categories!listings_category_slug_fkey(slug,label),
             images:listing_images(storage_path,position)`
          )
          .eq("id", report.target_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    report.target_type === "user"
      ? supabase
          .from("admin_user_directory")
          .select("*")
          .eq("id", report.target_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const listing = listingResult.data as unknown as AdminListingRow | null;
  const user = userResult.data as AdminUserRow | null;
  const cover = listing
    ? [...(listing.images ?? [])].sort((a, b) => a.position - b.position)[0]
    : undefined;
  const coverSrc = listingImageUrl(cover?.storage_path);

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All reports
          </Link>
        }
        title={REPORT_REASON_LABEL[report.reason] ?? report.reason}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ReportStatusBadge status={report.status} />
            <TargetTypeBadge type={report.target_type} />
            <span>Filed {formatDateTime(report.created_at)}</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">
              What was reported
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Reason</dt>
                <dd className="text-right font-medium">
                  {REPORT_REASON_LABEL[report.reason] ?? report.reason}
                </dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Reported by</dt>
                <dd className="text-right font-medium">
                  {report.reporter_name ?? report.reporter_email ?? "—"}
                  {report.reporter_name && report.reporter_email ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {report.reporter_email}
                    </span>
                  ) : null}
                </dd>
              </div>
              {report.resolved_at ? (
                <div className="flex justify-between gap-6">
                  <dt className="text-muted-foreground">Closed</dt>
                  <dd className="text-right font-medium">
                    {formatDateTime(report.resolved_at)}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-4 border-t pt-4">
              <p className="mb-1.5 text-sm font-medium text-foreground">
                Their description
              </p>
              {report.detail ? (
                <p className="rounded-lg bg-zinc-50 p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {report.detail}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  The reporter did not add a description.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {report.target_type === "listing"
                ? "Reported listing"
                : report.target_type === "user"
                  ? "Reported account"
                  : "Reported item"}
            </h2>

            {report.target_type === "listing" && listing ? (
              <Link
                href={`/listings/${listing.id}`}
                className="flex items-start gap-4 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="relative size-20 shrink-0 overflow-hidden rounded-lg border bg-zinc-100">
                  {coverSrc ? (
                    <Image
                      src={coverSrc}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-zinc-400">
                      <ImageOff className="size-5" aria-hidden />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground underline-offset-4 hover:underline">
                    {listing.title}
                  </span>
                  <span className="tabular mt-0.5 block text-sm text-muted-foreground">
                    {formatMoney(listing.price_cents, listing.currency)}
                    {" · "}
                    {listing.category?.label ?? listing.category_slug}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <ListingStatusBadge status={listing.status} />
                    {listing.seller ? (
                      <span className="text-xs text-muted-foreground">
                        by {listing.seller.display_name}
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            ) : report.target_type === "user" && user ? (
              <Link
                href={`/users/${user.id}`}
                className="flex items-center gap-3 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <UserAvatar
                  name={user.display_name}
                  email={user.email}
                  avatarPath={user.avatar_url}
                  color={user.avatar_color}
                  className="size-12"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground underline-offset-4 hover:underline">
                    {user.display_name ?? user.email ?? "Account"}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {user.email}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {user.suspended_at ? <SuspendedBadge /> : null}
                    <Badge variant="outline" className="font-medium">
                      {user.listings_count} listing
                      {user.listings_count === 1 ? "" : "s"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Joined {formatDate(user.created_at)}
                    </span>
                  </span>
                </span>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {report.target_type === "review"
                  ? "Reported reviews have no detail view in the admin yet."
                  : "The reported item no longer exists."}
              </p>
            )}
          </Card>
        </div>

        <aside>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Decision</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Removing a listing or suspending an account are separate actions on
              their own pages — recording an outcome here does not perform one.
            </p>
            <ReportActions reportId={report.id} status={report.status} />
          </Card>
        </aside>
      </div>
    </>
  );
}

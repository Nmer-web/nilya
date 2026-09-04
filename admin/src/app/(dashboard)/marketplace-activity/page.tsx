import {
  BriefcaseBusiness,
  CalendarCheck,
  Inbox,
  MessageSquareQuote,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { EmptyState, ErrorState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pill, StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin";
import { formatDateTime, truncate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminJobApplication,
  AdminServiceBooking,
  AdminServiceQuoteRequest,
  MarketplaceActivityListing,
  MarketplaceActor,
} from "@/lib/types";

export const metadata = { title: "Marketplace activity" };

type ActivityKind = "application" | "quote" | "booking";

type ActivityRow = {
  id: string;
  kind: ActivityKind;
  status: string;
  createdAt: string;
  listing: MarketplaceActivityListing | null;
  actor: MarketplaceActor | null;
  detail: string | null;
};

const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  application: "Job application",
  quote: "Quote request",
  booking: "Service booking",
};

const ACTIVITY_TONE = {
  application: "blue",
  quote: "amber",
  booking: "green",
} as const;

export default async function MarketplaceActivityPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [applicationsResult, quotesResult, bookingsResult] = await Promise.all([
    supabase
      .from("job_applications")
      .select(
        `id,listing_id,applicant_id,status,created_at,updated_at,
         listing:listings!job_applications_listing_id_fkey(id,title,listing_type,status),
         applicant:profiles!job_applications_applicant_id_fkey(
           id,display_name,avatar_url,avatar_color)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("service_quote_requests")
      .select(
        `id,listing_id,requester_id,message,status,created_at,updated_at,
         listing:listings!service_quote_requests_listing_id_fkey(id,title,listing_type,status),
         requester:profiles!service_quote_requests_requester_id_fkey(
           id,display_name,avatar_url,avatar_color)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("service_bookings")
      .select(
        `id,listing_id,customer_id,requested_for,note,status,created_at,updated_at,
         listing:listings!service_bookings_listing_id_fkey(id,title,listing_type,status),
         customer:profiles!service_bookings_customer_id_fkey(
           id,display_name,avatar_url,avatar_color)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const error =
    applicationsResult.error ?? quotesResult.error ?? bookingsResult.error;
  const applications = (applicationsResult.data ?? []) as unknown as AdminJobApplication[];
  const quotes = (quotesResult.data ?? []) as unknown as AdminServiceQuoteRequest[];
  const bookings = (bookingsResult.data ?? []) as unknown as AdminServiceBooking[];

  const activities: ActivityRow[] = [
    ...applications.map((row) => ({
      id: row.id,
      kind: "application" as const,
      status: row.status,
      createdAt: row.created_at,
      listing: row.listing,
      actor: row.applicant,
      detail: null,
    })),
    ...quotes.map((row) => ({
      id: row.id,
      kind: "quote" as const,
      status: row.status,
      createdAt: row.created_at,
      listing: row.listing,
      actor: row.requester,
      detail: row.message,
    })),
    ...bookings.map((row) => ({
      id: row.id,
      kind: "booking" as const,
      status: row.status,
      createdAt: row.created_at,
      listing: row.listing,
      actor: row.customer,
      detail: [
        row.requested_for
          ? `Requested for ${formatDateTime(row.requested_for)}`
          : null,
        row.note,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    })),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  const total =
    (applicationsResult.count ?? applications.length) +
    (quotesResult.count ?? quotes.length) +
    (bookingsResult.count ?? bookings.length);

  return (
    <>
      <PageHeader
        title="Marketplace activity"
        description={
          total > 0
            ? `${total.toLocaleString("en-GB")} applications, quote requests and bookings across Nilya.`
            : "Applications, quote requests and bookings across Nilya."
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <ActivitySummary
          icon={BriefcaseBusiness}
          label="Job applications"
          value={applicationsResult.count ?? applications.length}
        />
        <ActivitySummary
          icon={MessageSquareQuote}
          label="Quote requests"
          value={quotesResult.count ?? quotes.length}
        />
        <ActivitySummary
          icon={CalendarCheck}
          label="Service bookings"
          value={bookingsResult.count ?? bookings.length}
        />
      </div>

      {error ? (
        <Card>
          <ErrorState
            icon={TriangleAlert}
            title="Could not load marketplace activity"
            message={error.message}
          />
        </Card>
      ) : activities.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title="No marketplace activity yet"
            description="Real Nilya applications, quote requests and bookings will appear here."
          />
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <caption className="sr-only">Latest marketplace activity</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {[
                    "Activity",
                    "Nilya listing",
                    "Customer / applicant",
                    "Details",
                    "Status",
                    "Created",
                  ].map((heading) => (
                    <TableHead
                      key={heading}
                      className="h-11 bg-muted text-xs font-medium tracking-wide text-muted-foreground uppercase last:text-right"
                    >
                      {heading}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={`${activity.kind}-${activity.id}`}>
                    <TableCell className="py-3">
                      <Pill tone={ACTIVITY_TONE[activity.kind]}>
                        {ACTIVITY_LABEL[activity.kind]}
                      </Pill>
                    </TableCell>
                    <TableCell className="max-w-56 py-3">
                      {activity.listing ? (
                        <Link
                          href={`/listings/${activity.listing.id}`}
                          className="block truncate rounded font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          {activity.listing.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unavailable</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      {activity.actor ? (
                        <Link
                          href={`/users/${activity.actor.id}`}
                          className="flex items-center gap-2 rounded underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <UserAvatar
                            name={activity.actor.display_name}
                            avatarPath={activity.actor.avatar_url}
                            color={activity.actor.avatar_color}
                            className="size-7"
                          />
                          <span className="max-w-40 truncate">
                            {activity.actor.display_name}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unavailable</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-72 py-3 text-muted-foreground">
                      {activity.detail ? truncate(activity.detail, 120) : "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusBadge status={activity.status} />
                    </TableCell>
                    <TableCell className="tabular py-3 text-right text-muted-foreground">
                      {formatDateTime(activity.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activities.length >= 150 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Showing the latest 50 records from each activity type.
        </p>
      ) : null}
    </>
  );
}

function ActivitySummary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BriefcaseBusiness;
  label: string;
  value: number;
}) {
  return (
    <Card className="flex-row items-center gap-3 p-4">
      <span className="flex size-10 items-center justify-center rounded-lg bg-[#E7F1EE] text-[#0F6E56]">
        <Icon className="size-5" aria-hidden />
      </span>
      <span>
        <span className="tabular block text-xl font-semibold text-foreground">
          {value.toLocaleString("en-GB")}
        </span>
        <span className="block text-xs text-muted-foreground">{label}</span>
      </span>
    </Card>
  );
}

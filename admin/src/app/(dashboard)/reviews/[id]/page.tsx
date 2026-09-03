import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ReviewActions } from "@/components/review-actions";
import { StarRating } from "@/components/star-rating";
import { RemovedBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { formatDateTime, shortId } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AdminReviewRow } from "@/lib/types";

export default async function ReviewDetailPage(props: PageProps<"/reviews/[id]">) {
  await requireAdmin();
  const { id } = await props.params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(
      `id,order_id,author_id,subject_id,rating,body,created_at,removed_at,removed_reason,
       author:profiles!reviews_author_id_fkey(id,display_name,avatar_url,avatar_color),
       subject:profiles!reviews_subject_id_fkey(id,display_name,avatar_url,avatar_color)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const review = data as unknown as AdminReviewRow;

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link
            href="/reviews"
            className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All reviews
          </Link>
        }
        title={`Review ${shortId(review.id)}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StarRating rating={review.rating} size="md" />
            {review.removed_at ? <RemovedBadge /> : null}
            <span>· Left {formatDateTime(review.created_at)}</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Review</h2>
            {review.body ? (
              <p className="mt-3 text-base leading-relaxed whitespace-pre-wrap text-foreground">
                {review.body}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground italic">
                A rating with no written text.
              </p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              On order{" "}
              <Link
                href={`/orders/${review.order_id}`}
                className="rounded font-mono text-[#0F6E56] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {shortId(review.order_id)}
              </Link>
            </p>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <PersonCard heading="Reviewer" id={review.author_id} person={review.author} />
            <PersonCard heading="Subject" id={review.subject_id} person={review.subject} />
          </div>
        </div>

        <aside>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Moderation</h2>
            {review.removed_at ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-900">
                  Removed {formatDateTime(review.removed_at)}
                </p>
                {review.removed_reason ? (
                  <p className="mt-1 text-sm whitespace-pre-wrap text-red-800">
                    {review.removed_reason}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-red-700">
                  No longer counts toward the subject&apos;s rating.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  Removing keeps the text on record and drops it from the
                  seller&apos;s rating. It cannot be undone from here.
                </p>
                <ReviewActions reviewId={review.id} />
              </>
            )}
            {/*
              Honest scope note. `reviews_read_all` still returns removed rows
              to app clients; hiding them in the app is app-side work.
            */}
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              The Nilya app does not yet hide removed reviews from its own
              screens — that filter is a separate change in the mobile app.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}

function PersonCard({
  heading,
  id,
  person,
}: {
  heading: string;
  id: string;
  person: AdminReviewRow["author"];
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{heading}</h2>
      <Link
        href={`/users/${id}`}
        className="flex items-center gap-3 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <UserAvatar
          name={person?.display_name}
          avatarPath={person?.avatar_url}
          color={person?.avatar_color}
          className="size-10"
        />
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground underline-offset-4 hover:underline">
            {person?.display_name ?? <span className="text-muted-foreground italic">No profile</span>}
          </span>
          <span className="block font-mono text-xs text-muted-foreground">{shortId(id)}</span>
        </span>
      </Link>
    </Card>
  );
}

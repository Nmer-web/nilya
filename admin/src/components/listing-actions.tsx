"use client";

import { AlertCircle, CheckCircle2, Clock, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
import { setListingStatus } from "@/app/actions";
import { REMOVAL_REASONS, type ListingStatus } from "@/lib/types";

/**
 * The three moderation decisions for one listing. Approve and Mark under review
 * are reversible and act immediately; Remove takes a listing out of the
 * marketplace and so goes through the reason dialog.
 *
 * A button is not rendered when it would be a no-op — a listing that is already
 * active has no Approve.
 */
export function ListingActions({
  listingId,
  status,
}: {
  listingId: string;
  status: ListingStatus;
}) {
  const router = useRouter();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ListingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply(next: ListingStatus, note: string) {
    setPendingStatus(next);
    setError(null);
    const result = await setListingStatus(listingId, next, note);
    setPendingStatus(null);
    if (!result.success) {
      setError(result.error ?? "Could not update the listing");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status !== "active" ? (
          <Button
            onClick={() => apply("active", "")}
            disabled={pendingStatus !== null}
          >
            {pendingStatus === "active" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="size-4" aria-hidden />
            )}
            Approve
          </Button>
        ) : null}

        {status !== "under_review" ? (
          <Button
            variant="outline"
            onClick={() => apply("under_review", "")}
            disabled={pendingStatus !== null}
          >
            {pendingStatus === "under_review" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Clock className="size-4" aria-hidden />
            )}
            Mark under review
          </Button>
        ) : null}

        {status !== "removed" ? (
          <Button
            variant="outline"
            className="text-destructive hover:bg-red-50"
            onClick={() => setRemoveOpen(true)}
            disabled={pendingStatus !== null}
          >
            <Trash2 className="size-4" aria-hidden />
            Remove
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <ReasonDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove this listing?"
        description="It stops being visible in the marketplace. This is recorded against your account and can be undone by setting it active again."
        confirmLabel="Remove listing"
        options={REMOVAL_REASONS}
        noteLabel="Note"
        notePlaceholder="Anything the seller or the next moderator should know"
        onConfirm={async (reason) => {
          const result = await setListingStatus(listingId, "removed", reason);
          if (result.success) router.refresh();
          return result;
        }}
      />
    </div>
  );
}

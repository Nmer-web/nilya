"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
import { removeReview } from "@/app/actions";

export function ReviewActions({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="text-destructive hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" aria-hidden />
        Remove review
      </Button>

      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Remove this review?"
        description="The review is marked removed and drops out of the seller's rating. The text stays on the record with your reason."
        confirmLabel="Remove review"
        noteLabel="Reason"
        notePlaceholder="Which guideline does it break?"
        noteRequired
        minLength={10}
        onConfirm={async (reason) => {
          const result = await removeReview(reviewId, reason);
          if (result.success) router.refresh();
          return result;
        }}
      />
    </>
  );
}

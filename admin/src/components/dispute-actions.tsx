"use client";

import { Store, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
import { resolveDispute } from "@/app/actions";

/**
 * The two decisions an open dispute can receive. Each needs a note of at
 * least ten characters, which becomes the audit-log entry and the
 * `resolution_note` the dispute page shows afterwards.
 *
 * Neither touches the order or the payment — a refund is a Stripe event that
 * reaches the database through the webhook. The dialog copy says so.
 */
export function DisputeActions({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [favourOf, setFavourOf] = useState<"buyer" | "seller" | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setFavourOf("buyer")}>
          <User className="size-4" aria-hidden />
          Resolve in buyer&apos;s favour
        </Button>
        <Button variant="outline" onClick={() => setFavourOf("seller")}>
          <Store className="size-4" aria-hidden />
          Resolve in seller&apos;s favour
        </Button>
      </div>

      <ReasonDialog
        open={favourOf !== null}
        onOpenChange={(open) => {
          if (!open) setFavourOf(null);
        }}
        title={
          favourOf === "seller"
            ? "Resolve in the seller's favour"
            : "Resolve in the buyer's favour"
        }
        description="This records the decision on the dispute. It does not move money: any refund is issued in Stripe and reaches the order through the webhook."
        confirmLabel="Record decision"
        destructive={false}
        noteLabel="Decision note"
        notePlaceholder="What did you find, and why does it favour this party?"
        noteRequired
        minLength={10}
        onConfirm={async (note) => {
          if (!favourOf) return { success: false, error: "Choose a party" };
          const result = await resolveDispute(disputeId, favourOf, note);
          if (result.success) router.refresh();
          return result;
        }}
      />
    </>
  );
}

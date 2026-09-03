"use client";

import { AlertCircle, Loader2, ShieldBan, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
import {
  reinstateSeller,
  reinstateUser,
  suspendSeller,
  suspendUser,
} from "@/app/actions";

/**
 * Suspension writes `profiles.suspended_at` and `profiles.suspended_reason`
 * through an audited RPC. The columns are admin-only: a suspended user cannot
 * clear them from the app.
 *
 * `disabledReason`, when given, is why this account cannot be suspended — an
 * admin account, or the operator's own. The control is then not rendered at
 * all rather than rendered dead (constitution Principle V).
 */
export function SuspendControl({
  userId,
  displayName,
  suspendedAt,
  disabledReason,
  subject = "user",
}: {
  userId: string;
  displayName: string;
  suspendedAt: string | null;
  disabledReason?: string;
  /** Which pair of actions to call; both hit the same RPC and audit row. */
  subject?: "user" | "seller";
}) {
  const suspend = subject === "seller" ? suspendSeller : suspendUser;
  const reinstate = subject === "seller" ? reinstateSeller : reinstateUser;
  const noun = subject === "seller" ? "seller" : "account";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (disabledReason) {
    return (
      <p className="text-sm text-muted-foreground">{disabledReason}</p>
    );
  }

  if (suspendedAt) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            setPending(true);
            setError(null);
            const result = await reinstate(userId);
            setPending(false);
            if (!result.success) {
              setError(result.error ?? "Could not reinstate the account");
              return;
            }
            router.refresh();
          }}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ShieldCheck className="size-4" aria-hidden />
          )}
          Reinstate {noun}
        </Button>
        {error ? (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className="text-destructive hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <ShieldBan className="size-4" aria-hidden />
        Suspend {noun}
      </Button>

      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={`Suspend ${displayName}?`}
        description="The account is marked suspended and the reason is recorded against your account. You can reinstate it from this page."
        confirmLabel={`Suspend ${noun}`}
        noteLabel="Reason"
        notePlaceholder="Why is this account being suspended?"
        noteRequired
        minLength={10}
        onConfirm={async (reason) => {
          const result = await suspend(userId, reason);
          if (result.success) router.refresh();
          return result;
        }}
      />
    </>
  );
}

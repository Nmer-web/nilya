"use client";

import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
import { resolveReport, setReportStatus } from "@/app/actions";
import { RESOLUTION_ACTIONS, type ReportStatus } from "@/lib/types";

/**
 * Dismiss, Mark reviewing and Resolve. Resolve asks what was actually done, so
 * the audit log records an outcome rather than only a state change — and the
 * options describe actions the operator has taken elsewhere, which is why
 * choosing "Listing removed" here does not itself remove anything.
 */
export function ReportActions({
  reportId,
  status,
}: {
  reportId: string;
  status: ReportStatus;
}) {
  const router = useRouter();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [pending, setPending] = useState<ReportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markReviewing() {
    setPending("reviewing");
    setError(null);
    const result = await setReportStatus(reportId, "reviewing", "");
    setPending(null);
    if (!result.success) {
      setError(result.error ?? "Could not update the report");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status !== "resolved" ? (
          <Button onClick={() => setResolveOpen(true)} disabled={pending !== null}>
            <CheckCircle2 className="size-4" aria-hidden />
            Resolve
          </Button>
        ) : null}

        {status !== "reviewing" && status !== "resolved" ? (
          <Button
            variant="outline"
            onClick={markReviewing}
            disabled={pending !== null}
          >
            {pending === "reviewing" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Clock className="size-4" aria-hidden />
            )}
            Mark reviewing
          </Button>
        ) : null}

        {status !== "dismissed" ? (
          <Button
            variant="outline"
            onClick={() => setDismissOpen(true)}
            disabled={pending !== null}
          >
            <XCircle className="size-4" aria-hidden />
            Dismiss
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
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        title="Resolve this report"
        description="Record what was done about it. The outcome and your note go to the audit log."
        confirmLabel="Resolve report"
        destructive={false}
        options={RESOLUTION_ACTIONS}
        noteLabel="Note"
        notePlaceholder="What did you do, and why?"
        onConfirm={async (reason) => {
          const result = await resolveReport(reportId, reason, reason);
          if (result.success) router.refresh();
          return result;
        }}
      />

      <ReasonDialog
        open={dismissOpen}
        onOpenChange={setDismissOpen}
        title="Dismiss this report"
        description="Use this when the report does not describe a problem. It stays on the record with your reason."
        confirmLabel="Dismiss report"
        destructive={false}
        noteLabel="Reason"
        notePlaceholder="Why is no action needed?"
        noteRequired
        onConfirm={async (reason) => {
          const result = await setReportStatus(reportId, "dismissed", reason);
          if (result.success) router.refresh();
          return result;
        }}
      />
    </div>
  );
}

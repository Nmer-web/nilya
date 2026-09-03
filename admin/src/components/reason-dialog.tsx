"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

export type ReasonOption = { value: string; label: string };

type ReasonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  options?: readonly ReasonOption[];
  noteLabel?: string;
  notePlaceholder?: string;
  noteRequired?: boolean;
  onConfirm: (reason: string) => Promise<ActionResult>;
};

/**
 * The single confirmation surface for destructive work. Every such action in
 * the dashboard goes through it, so "requires a typed reason" is enforced in
 * one place rather than remembered five times.
 *
 * `options` turns the free-text note into a categorised reason plus optional
 * detail; without it the typed note is the reason and Confirm stays disabled
 * until something is typed.
 *
 * The form lives in a child that only mounts while the dialog is open, so
 * reopening starts clean without an effect resetting state after the fact.
 */
export function ReasonDialog(props: ReasonDialogProps) {
  const { open, onOpenChange, title, description } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {open ? <ReasonForm {...props} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ReasonForm({
  onOpenChange,
  confirmLabel,
  destructive = true,
  options,
  noteLabel = "Reason",
  notePlaceholder,
  noteRequired = true,
  onConfirm,
}: ReasonDialogProps) {
  const noteId = useId();
  const groupId = useId();
  const [choice, setChoice] = useState<string | null>(options?.[0]?.value ?? null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noteSatisfied = options ? true : !noteRequired || note.trim().length > 0;

  async function confirm() {
    setPending(true);
    setError(null);

    const label = options?.find((option) => option.value === choice)?.label;
    const reason = [label, note.trim()].filter(Boolean).join(" — ");

    const result = await onConfirm(reason);
    if (result.success) {
      onOpenChange(false);
      return;
    }
    setError(result.error ?? "Something went wrong");
    setPending(false);
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {options ? (
          <fieldset className="flex flex-col gap-2">
            <legend id={groupId} className="mb-2 text-sm font-medium">
              Reason
            </legend>
            <div role="radiogroup" aria-labelledby={groupId} className="grid gap-1.5">
              {options.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                    choice === option.value
                      ? "border-[#0F6E56] bg-[#E7F1EE] text-[#0B5442]"
                      : "hover:bg-zinc-50"
                  )}
                >
                  <input
                    type="radio"
                    name={groupId}
                    value={option.value}
                    checked={choice === option.value}
                    onChange={() => setChoice(option.value)}
                    className="size-4 accent-[#0F6E56]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={noteId}>
            {noteLabel}
            {options ? (
              <span className="font-normal text-muted-foreground"> (optional)</span>
            ) : null}
          </Label>
          <Textarea
            id={noteId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={notePlaceholder}
            rows={3}
            aria-invalid={error ? true : undefined}
          />
          <p className="text-xs text-muted-foreground">
            This is written to the audit log against your account.
          </p>
        </div>

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" disabled={pending} />}>
          Cancel
        </DialogClose>
        <Button
          onClick={confirm}
          disabled={pending || !noteSatisfied}
          className={cn(
            destructive &&
              "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
          )}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Working…
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Emptiness is a shippable state, not a failure (constitution Principle II).
 * Nothing here invents a row to make a screen look busy.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span
        className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"
        aria-hidden
      >
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** A failed read is a state too — say what broke instead of showing "0". */
export function ErrorState({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span
        className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600"
        aria-hidden
      >
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-md font-mono text-xs break-words text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

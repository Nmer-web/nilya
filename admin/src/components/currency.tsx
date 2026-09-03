import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Cents to a localised currency string, e.g. 4900 → "€49.00". */
export function Currency({
  cents,
  currency = "EUR",
  className,
}: {
  cents: number;
  currency?: string | null;
  className?: string;
}) {
  return (
    <span className={cn("tabular", className)}>
      {formatMoney(cents, currency ?? "EUR")}
    </span>
  );
}

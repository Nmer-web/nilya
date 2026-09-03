import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type StatAccent = "green" | "amber" | "red" | "blue";

export type StatCardProps = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** A short, factual line under the number — computed, never invented. */
  trend?: string;
  trendUp?: boolean;
  accent?: StatAccent;
  /** Dark green card, used for the lead statistic. */
  dark?: boolean;
  /** Where the corner arrow goes. Without it the arrow is not rendered. */
  href?: string;
};

const ICON_TINT: Record<StatAccent, string> = {
  green: "bg-[#0F6E56]/10 text-[#0F6E56]",
  amber: "bg-[#EF9F27]/12 text-[#9A5B00]",
  red: "bg-[#B42318]/10 text-[#B42318]",
  blue: "bg-[#1D4ED8]/10 text-[#1D4ED8]",
};

const TREND_TINT: Record<StatAccent, string> = {
  green: "bg-[#0F6E56]/12 text-[#0F6E56]",
  amber: "bg-[#EF9F27]/14 text-[#9A5B00]",
  red: "bg-[#B42318]/10 text-[#B42318]",
  blue: "bg-[#1D4ED8]/10 text-[#1D4ED8]",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  accent = "green",
  dark = false,
  href,
}: StatCardProps) {
  const number =
    typeof value === "number" ? value.toLocaleString("en-GB") : value;

  // The trend pill takes its colour from direction when one is given, and from
  // the card's accent otherwise (an "awaiting review" line is amber, not green).
  const trendTone =
    trendUp === true ? "green" : trendUp === false ? accent : accent;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
        dark ? "bg-[#0F6E56] text-white" : "bg-card text-foreground"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            dark ? "bg-white/15 text-white" : ICON_TINT[accent]
          )}
          aria-hidden
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <span
          className={cn(
            "flex-1 truncate text-[13px] font-medium",
            dark ? "text-white/80" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
        {href ? (
          <Link
            href={href}
            aria-label={`Open ${label.toLowerCase()}`}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              dark
                ? "border-white/30 text-white hover:bg-white/15"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            <ArrowUpRight className="size-4" strokeWidth={2} />
          </Link>
        ) : null}
      </div>

      <p className="tabular mt-5 text-[40px] leading-none font-bold tracking-tight">
        {number}
      </p>

      {trend ? (
        <p className="mt-4">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] leading-none font-medium",
              dark ? "bg-white/15 text-white" : TREND_TINT[trendTone]
            )}
          >
            {trend}
          </span>
        </p>
      ) : null}
    </div>
  );
}

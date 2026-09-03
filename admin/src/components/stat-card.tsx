import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTone = "green" | "amber" | "blue" | "red" | "zinc";

const TONE: Record<StatTone, string> = {
  green: "bg-[#E7F1EE] text-[#0F6E56]",
  amber: "bg-[#FDF1DE] text-[#8A5A0B]",
  blue: "bg-blue-50 text-blue-700",
  red: "bg-red-50 text-red-700",
  zinc: "bg-zinc-100 text-zinc-700",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "zinc",
  href,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: StatTone;
  href?: string;
}) {
  const body = (
    <Card
      className={cn(
        "flex flex-row items-center gap-4 p-5 transition-colors",
        href && "hover:border-zinc-300 hover:bg-zinc-50/60"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          TONE[tone]
        )}
        aria-hidden
      >
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="tabular text-2xl leading-none font-semibold text-foreground">
          {value.toLocaleString("en-GB")}
        </span>
        <span className="mt-1.5 truncate text-sm text-muted-foreground">
          {label}
        </span>
      </span>
    </Card>
  );

  if (!href) return body;
  return (
    <Link
      href={href}
      className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {body}
    </Link>
  );
}

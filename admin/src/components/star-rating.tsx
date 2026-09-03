import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Read-only 1–5 star display. Brand amber is the fill, as the app uses it. */
export function StarRating({
  rating,
  size = "sm",
  className,
}: {
  rating: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  const dimension = size === "md" ? "size-5" : "size-3.5";

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${clamped} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          aria-hidden
          className={cn(
            dimension,
            index < clamped
              ? "fill-[#EF9F27] text-[#EF9F27]"
              : "fill-transparent text-zinc-300"
          )}
        />
      ))}
    </span>
  );
}

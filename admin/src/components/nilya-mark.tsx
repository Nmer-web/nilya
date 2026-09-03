import { cn } from "@/lib/utils";

/**
 * The Nilya icon, geometry copied verbatim from
 * `assets/brand/nilya-icon-1024.svg` — the canonical mark under constitution
 * Principle VI. The amber dot stays amber; it is the only accent.
 */
export function NilyaMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      role="img"
      aria-label="Nilya"
      className={cn("shrink-0", className)}
    >
      <rect width="1024" height="1024" rx="230" fill="#0F6E56" />
      <path
        d="M354 700V370L670 700V370"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="80"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="670" cy="315" r="43" fill="#EF9F27" />
    </svg>
  );
}

/**
 * Mark plus wordmark. The tagline is omitted at every size used here, which the
 * brand rules require below 32px and permit above it.
 */
export function NilyaLockup({
  label,
  size = 32,
  className,
}: {
  label?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <NilyaMark size={size} />
      <span className="flex items-baseline gap-1.5">
        <span
          className="font-medium lowercase text-foreground"
          style={{ fontSize: size * 0.56, letterSpacing: "-0.02em" }}
        >
          nilya
        </span>
        {label ? (
          <span
            className="font-medium text-muted-foreground"
            style={{ fontSize: size * 0.4 }}
          >
            {label}
          </span>
        ) : null}
      </span>
    </span>
  );
}

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Server-rendered pagination: both controls are plain links carrying the
 * existing filters, so paging survives a refresh and works without JavaScript.
 */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  const hrefFor = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) next.set(key, value);
    }
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  if (total === 0) return null;

  return (
    <nav
      className="mt-4 flex items-center justify-between gap-4"
      aria-label="Pagination"
    >
      <p className="tabular text-sm text-muted-foreground">
        {from}–{to} of {total.toLocaleString("en-GB")}
      </p>
      <div className="flex items-center gap-2">
        <PageLink
          href={hrefFor(page - 1)}
          disabled={page <= 1}
          label="Previous page"
        >
          <ChevronLeft className="size-4" />
          Previous
        </PageLink>
        <PageLink
          href={hrefFor(page + 1)}
          disabled={page >= lastPage}
          label="Next page"
        >
          Next
          <ChevronRight className="size-4" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex h-8 items-center gap-1 rounded-lg border bg-card px-2.5 text-sm font-medium transition-colors",
    disabled
      ? "cursor-not-allowed text-muted-foreground/50"
      : "text-foreground hover:bg-zinc-50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  );
}

"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

/** Section titles by route prefix; a detail page shows its section's title. */
const TITLES: readonly [prefix: string, title: string][] = [
  ["/users", "Users"],
  ["/listings", "Listings"],
  ["/reports", "Reports"],
  ["/categories", "Categories"],
  ["/disputes", "Disputes"],
  ["/orders", "Orders"],
  ["/audit-log", "Audit Log"],
  ["/reviews", "Reviews"],
  ["/sellers", "Sellers"],
  ["/admin-users", "Admin Users"],
];

/**
 * Lists whose page reads `?q=`. The search box submits to the current one, or
 * to Users from any other page, so it is a real control everywhere.
 */
const SEARCHABLE: Record<string, string> = {
  "/users": "Search email or username",
  "/listings": "Search listings",
  "/orders": "Search orders",
  "/sellers": "Search sellers",
};

export function Topbar({
  email,
  openReports,
}: {
  email: string | null;
  openReports: number;
}) {
  const pathname = usePathname();
  const section = TITLES.find(([prefix]) => pathname.startsWith(prefix));
  const title = section ? section[1] : "Overview";

  const searchBase =
    Object.keys(SEARCHABLE).find((prefix) => pathname.startsWith(prefix)) ??
    "/users";

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:px-8">
      <h2 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>

      <form
        action={searchBase}
        method="get"
        role="search"
        className="relative hidden w-64 md:block"
      >
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          placeholder={SEARCHABLE[searchBase]}
          aria-label={SEARCHABLE[searchBase]}
          className="h-10 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </form>

      <Link
        href="/reports?status=open"
        aria-label={
          openReports > 0
            ? `${openReports} open report${openReports === 1 ? "" : "s"}`
            : "Reports"
        }
        className="relative flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Bell className="size-[18px]" strokeWidth={2} aria-hidden />
        {openReports > 0 ? (
          <span
            className={cn(
              "tabular absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EF9F27] px-1 text-[11px] font-semibold text-[#141413]"
            )}
          >
            {openReports > 99 ? "99+" : openReports}
          </span>
        ) : null}
      </Link>

      <UserAvatar email={email} name={email} className="size-10" />
    </header>
  );
}

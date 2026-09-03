"use client";

import {
  Flag,
  Grid3x3,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { NilyaLockup, NilyaMark } from "@/components/nilya-mark";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, type AdminRole } from "@/lib/types";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/listings", label: "Listings", icon: ShoppingBag },
  { href: "/reports", label: "Reports", icon: Flag },
  { href: "/categories", label: "Categories", icon: Grid3x3 },
  { href: "/disputes", label: "Disputes", icon: Scale },
  { href: "/orders", label: "Orders", icon: Receipt },
  { href: "/audit-log", label: "Audit Log", icon: History },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/sellers", label: "Sellers", icon: Store },
  { href: "/admin-users", label: "Admin Users", icon: ShieldCheck, ownerOnly: true },
] as const;

export function SidebarNav({
  email,
  role,
  openReports,
}: {
  email: string | null;
  role: AdminRole;
  openReports: number;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // A navigation should not leave the mobile sheet hanging open behind it.
  // Closing on the click that causes the navigation, rather than reacting to
  // the pathname afterwards, keeps this out of an effect.
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile: the sidebar collapses to a top bar. */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-sidebar px-4 lg:hidden">
        <Link
          href="/"
          onClick={closeMobile}
          className="flex items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <NilyaLockup label="Admin" size={28} />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="admin-nav"
          className="flex size-9 items-center justify-center rounded-lg border text-foreground transition-colors hover:bg-zinc-50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          <span className="sr-only">
            {mobileOpen ? "Close navigation" : "Open navigation"}
          </span>
        </button>
      </div>

      <aside
        id="admin-nav"
        className={cn(
          "z-20 flex w-full shrink-0 flex-col border-b bg-sidebar lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:border-r lg:border-b-0",
          mobileOpen ? "flex" : "hidden lg:flex"
        )}
      >
        <div className="hidden h-16 items-center px-5 lg:flex">
          <Link
            href="/"
            className="flex items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <NilyaLockup label="Admin" size={30} />
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 p-3 lg:px-3 lg:py-2" aria-label="Primary">
          {NAV.filter(
            (item) => !("ownerOnly" in item && item.ownerOnly) || role === "owner"
          ).map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "bg-[#0F6E56] text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={2} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.href === "/reports" && openReports > 0 ? (
                  <span
                    className={cn(
                      "tabular flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                      active ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
                    )}
                  >
                    {openReports}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <Separator className="lg:mt-auto" />

        <div className="p-3">
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <UserAvatar email={email} name={email} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {email ?? "Signed in"}
              </p>
              <Badge
                variant="outline"
                className="mt-1 border-[#0F6E56]/20 bg-[#E7F1EE] text-[11px] font-medium text-[#0B5442]"
              >
                {ROLE_LABEL[role]}
              </Badge>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}

function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={signingOut || pending}
      className="mt-1 flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
    >
      <LogOut className="size-4 shrink-0" strokeWidth={2} />
      {signingOut || pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

/** Small mark for the login screen, kept next to its lockup sibling. */
export { NilyaMark };

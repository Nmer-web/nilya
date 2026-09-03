"use client";

import {
  ExternalLink,
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
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { NilyaLockup, NilyaMark } from "@/components/nilya-mark";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { type AdminRole } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
};

type NavSection = { label: string; items: readonly NavItem[] };

const SECTIONS: readonly NavSection[] = [
  {
    label: "Menu",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/users", label: "Users", icon: Users },
      { href: "/listings", label: "Listings", icon: ShoppingBag },
      { href: "/reports", label: "Reports", icon: Flag },
      { href: "/categories", label: "Categories", icon: Grid3x3 },
    ],
  },
  {
    label: "General",
    items: [
      { href: "/disputes", label: "Disputes", icon: Scale },
      { href: "/orders", label: "Orders", icon: Receipt },
      { href: "/audit-log", label: "Audit Log", icon: History },
      { href: "/reviews", label: "Reviews", icon: Star },
      { href: "/sellers", label: "Sellers", icon: Store },
      { href: "/admin-users", label: "Admin Users", icon: ShieldCheck, ownerOnly: true },
    ],
  },
];

/** The URL the promo card opens. Points at the live admin until a store listing exists. */
const APP_URL = "https://nilya.vercel.app";

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
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 lg:hidden">
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
          className="flex size-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
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
          "z-20 flex w-full shrink-0 flex-col border-b border-border bg-sidebar lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:border-r lg:border-b-0",
          mobileOpen ? "flex" : "hidden lg:flex"
        )}
      >
        {/* Brand block */}
        <div className="hidden h-16 items-center px-5 lg:flex">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <NilyaMark size={32} />
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                Nilya
              </span>
              <span className="mt-1 text-[11px] font-medium tracking-[1.5px] text-label uppercase">
                Admin
              </span>
            </span>
          </Link>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-4 pb-2 lg:pt-2"
          aria-label="Primary"
        >
          {SECTIONS.map((section) => {
            const items = section.items.filter(
              (item) => !item.ownerOnly || role === "owner"
            );
            return (
              <div key={section.label} className="mt-6 first:mt-3 lg:first:mt-4">
                <p className="mb-2 px-3 text-[11px] font-medium tracking-[1.5px] text-label uppercase">
                  {section.label}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={closeMobile}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                            active
                              ? "bg-[#0F6E56] text-white"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-[18px] shrink-0",
                              active ? "text-white" : "text-muted-foreground"
                            )}
                            strokeWidth={2}
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.href === "/reports" && openReports > 0 ? (
                            <span
                              className={cn(
                                "tabular flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                                active
                                  ? "bg-white/20 text-white"
                                  : "bg-[#0F6E56] text-white"
                              )}
                            >
                              {openReports}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Account + sign out */}
        <div className="border-t border-border px-4 pt-3">
          <div className="flex items-center gap-2.5 px-1">
            <UserAvatar email={email} name={email} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {email ?? "Signed in"}
              </p>
            </div>
            <StatusBadge status={role} className="px-2 py-1 text-[11px]" />
          </div>
          <SignOutButton />
        </div>

        {/* Promo card */}
        <div className="m-4 rounded-xl bg-[#0F6E56] p-4 text-white">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold">Nilya Mobile</p>
            <NilyaMark size={22} className="rounded-md ring-1 ring-white/25" />
          </div>
          <p className="mt-1 mb-3 text-[12px] text-white/70">
            Monitor your marketplace
          </p>
          <a
            href={APP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#0F6E56] transition-colors hover:bg-white/90 focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            View app
            <ExternalLink className="size-3" aria-hidden />
          </a>
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
      className="mt-2 flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
    >
      <LogOut className="size-[18px] shrink-0" strokeWidth={2} />
      {signingOut || pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

/** Small mark for the login screen, kept next to its lockup sibling. */
export { NilyaMark };

import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";

/**
 * Rendered in place of a page the signed-in admin's role may not open. The
 * response is still a 200 — Next's `forbidden()` interrupt needs the
 * `authInterrupts` experiment, which this project has not opted into — so the
 * page says 403 rather than sending it.
 */
export function Forbidden({ requiredRole }: { requiredRole: string }) {
  return (
    <>
      <PageHeader title="403 — Not available to your role" />
      <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center">
        <span
          className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600"
          aria-hidden
        >
          <ShieldAlert className="size-5" />
        </span>
        <p className="mt-4 text-sm font-medium text-foreground">
          This page is only available to the {requiredRole} role.
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Your account is an admin, but not at the level this page needs. An
          owner can change that from Admin Users.
        </p>
        <Link
          href="/"
          className="mt-5 rounded-md text-sm font-medium text-[#0F6E56] underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Back to overview
        </Link>
      </div>
    </>
  );
}

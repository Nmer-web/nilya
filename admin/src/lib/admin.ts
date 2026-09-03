import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/types";

export type AdminSession = {
  userId: string;
  email: string | null;
  role: AdminRole;
};

/**
 * The authorisation boundary for the whole dashboard.
 *
 * The proxy only establishes that *someone* is signed in. This establishes that
 * they are an admin, and it is called by the dashboard layout, by every page
 * that reads privileged data, and by every server action — an action is a
 * public HTTP endpoint and must never trust that a page ran first.
 *
 * `cache` de-duplicates it within a single render pass, so the layout and its
 * pages share one round trip.
 *
 * This is defence in depth, not the only defence: even if it were bypassed,
 * every admin view is gated by `is_admin()` in Postgres and would return no
 * rows, and every mutation RPC raises 42501.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    role: data.role as AdminRole,
  };
});

/** Redirects to the login page rather than rendering a page with no data. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/login?error=unauthorized");
  return session;
}

export { ROLE_LABEL } from "@/lib/types";

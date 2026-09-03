import { ShieldCheck, TriangleAlert } from "lucide-react";

import { AdminUsersManager, type AdminUserRecord } from "@/components/admin-users-manager";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { AdminRole, AdminUserRow } from "@/lib/types";

export const metadata = { title: "Admin users" };

export default async function AdminUsersPage() {
  const session = await requireAdmin();

  // Owner-only. The RPCs enforce this in Postgres as well; this is what the
  // other roles see instead of an empty page with dead buttons.
  if (session.role !== "owner") return <Forbidden requiredRole="owner" />;

  const supabase = await createClient();

  // admin_users carries the grant date; the directory view carries identity.
  const [membersResult, identityResult] = await Promise.all([
    supabase
      .from("admin_users")
      .select("user_id,role,created_at")
      .order("created_at", { ascending: true }),
    supabase.from("admin_user_directory").select("*").not("admin_role", "is", null),
  ]);

  const error = membersResult.error ?? identityResult.error;
  const identity = new Map(
    ((identityResult.data ?? []) as AdminUserRow[]).map((row) => [row.id, row])
  );

  const rows: AdminUserRecord[] = (
    (membersResult.data ?? []) as { user_id: string; role: AdminRole; created_at: string }[]
  ).map((member) => {
    const who = identity.get(member.user_id);
    return {
      user_id: member.user_id,
      role: member.role,
      added_at: member.created_at,
      email: who?.email ?? null,
      display_name: who?.display_name ?? null,
      avatar_url: who?.avatar_url ?? null,
      avatar_color: who?.avatar_color ?? null,
    };
  });

  return (
    <>
      <PageHeader
        title="Admin users"
        description="Who can sign in here, and at what level. Owners are managed in SQL, not from this page."
      />

      {error ? (
        <div className="rounded-xl border bg-card">
          <ErrorState icon={TriangleAlert} title="Could not load admin users" message={error.message} />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={ShieldCheck}
            title="No admin users"
            description="This should not be reachable — you are signed in as one."
          />
        </div>
      ) : (
        <AdminUsersManager rows={rows} currentUserId={session.userId} />
      )}
    </>
  );
}

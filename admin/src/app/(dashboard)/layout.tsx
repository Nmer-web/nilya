import { SidebarNav } from "@/components/sidebar-nav";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/">) {
  // The real authorisation gate. The proxy only knows that someone is signed
  // in; this is what establishes that they are an admin.
  const session = await requireAdmin();

  // The open-report count badges the nav on every page, so it is read here.
  const supabase = await createClient();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <SidebarNav
        email={session.email}
        role={session.role}
        openReports={count ?? 0}
      />
      <main className="min-w-0 flex-1 overflow-y-auto bg-zinc-50 p-5 sm:p-8">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}

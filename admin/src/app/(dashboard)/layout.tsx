import { SidebarNav } from "@/components/sidebar-nav";
import { Topbar } from "@/components/topbar";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/">) {
  // The real authorisation gate. The proxy only knows that someone is signed
  // in; this is what establishes that they are an admin.
  const session = await requireAdmin();

  // The open-report count badges the nav and the bell on every page.
  const supabase = await createClient();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  const openReports = count ?? 0;

  return (
    <div className="min-h-dvh bg-background">
      <SidebarNav
        email={session.email}
        role={session.role}
        openReports={openReports}
      />
      <div className="flex min-h-dvh flex-col lg:pl-60">
        <Topbar email={session.email} openReports={openReports} />
        <main className="min-w-0 flex-1 px-5 pt-6 pb-12 sm:px-8 sm:pt-8">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

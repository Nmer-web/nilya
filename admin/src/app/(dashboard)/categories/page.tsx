import { Grid3x3, TriangleAlert } from "lucide-react";

import { CategoryTree } from "@/components/category-tree";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { CategoryNode, CategoryRow, CategoryStats } from "@/lib/types";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [categoriesResult, statsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id,slug,label,parent_id,icon_key,sort_order,is_active,created_at")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true }),
    supabase.from("admin_category_stats").select("*"),
  ]);

  const error = categoriesResult.error ?? statsResult.error;
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const stats = new Map(
    ((statsResult.data ?? []) as CategoryStats[]).map((row) => [row.id, row])
  );

  // Two levels, as the table renders and as `admin_create_category` enforces.
  const nodes = new Map<string, CategoryNode>(
    categories.map((category) => [
      category.id,
      {
        ...category,
        active_listings: stats.get(category.id)?.active_listings ?? 0,
        total_listings: stats.get(category.id)?.total_listings ?? 0,
        children: [],
      },
    ])
  );

  const departments: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      // Includes a child whose parent is missing, which would otherwise vanish
      // from the page entirely.
      departments.push(node);
    }
  }

  const bySortThenLabel = (a: CategoryNode, b: CategoryNode) =>
    a.sort_order - b.sort_order || a.label.localeCompare(b.label);
  departments.sort(bySortThenLabel);
  for (const department of departments) department.children.sort(bySortThenLabel);

  const totalActive = categories.filter((c) => c.is_active).length;

  return (
    <>
      <PageHeader
        title="Categories"
        description={
          categories.length > 0
            ? `${departments.length} department${departments.length === 1 ? "" : "s"}, ${categories.length} categories, ${totalActive} active.`
            : "The taxonomy shoppers browse."
        }
      />

      {error ? (
        <div className="rounded-xl border bg-card">
          <ErrorState
            icon={TriangleAlert}
            title="Could not load categories"
            message={error.message}
          />
        </div>
      ) : departments.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={Grid3x3}
            title="No categories"
            description="Nothing has been defined yet. Add a department to get started."
          />
        </div>
      ) : (
        <CategoryTree departments={departments} />
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Categories are never deleted — a category with history stays on the
        record and is deactivated instead. One holding active listings cannot be
        deactivated until those listings move.
      </p>
    </>
  );
}

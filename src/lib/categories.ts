import type { IconName } from '@/components/icon';
import type { CategoryRow } from '@/lib/database.types';

export const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Reject malformed route values before any category request reaches Supabase. */
export function isCanonicalCategorySlug(value: string): boolean {
  return value.length > 0 && value.length <= 120 && CATEGORY_SLUG_PATTERN.test(value);
}

export function sortCategories(rows: readonly CategoryRow[]): CategoryRow[] {
  return [...rows].sort(
    (left, right) => left.sort_order - right.sort_order || left.label.localeCompare(right.label)
  );
}

export function categoryChildren(
  rows: readonly CategoryRow[],
  parentId: string | null
): CategoryRow[] {
  return sortCategories(rows.filter((row) => row.parent_id === parentId && row.is_active));
}

export function categoryBySlug(
  rows: readonly CategoryRow[],
  slug: string | null
): CategoryRow | null {
  if (!slug) return null;
  return rows.find((row) => row.slug === slug && row.is_active) ?? null;
}

export function categoryHasChildren(rows: readonly CategoryRow[], categoryId: string): boolean {
  return rows.some((row) => row.parent_id === categoryId && row.is_active);
}

/**
 * Resolve a branch from category rows already returned by Supabase. The SQL
 * resolver remains the normal path; this is the compatibility path for a
 * deployment where the hierarchy columns have landed before its RPC (or where
 * the legacy flat schema is still live). Cycles are ignored defensively.
 */
export function categoryDescendantSlugs(
  rows: readonly CategoryRow[],
  rootSlug: string
): string[] {
  const root = categoryBySlug(rows, rootSlug);
  if (!root) return [];

  const childrenByParent = new Map<string, CategoryRow[]>();
  for (const row of rows) {
    if (!row.is_active || !row.parent_id) continue;
    const children = childrenByParent.get(row.parent_id) ?? [];
    children.push(row);
    childrenByParent.set(row.parent_id, children);
  }

  const slugs: string[] = [];
  const pending = [root];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const category = pending.pop();
    if (!category || seen.has(category.id)) continue;
    seen.add(category.id);
    slugs.push(category.slug);
    pending.push(...(childrenByParent.get(category.id) ?? []));
  }
  return slugs;
}

/** Root-to-leaf path, guarded against corrupt cyclic parent references. */
export function categoryPath(rows: readonly CategoryRow[], slug: string | null): CategoryRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const leaf = categoryBySlug(rows, slug);
  if (!leaf) return [];

  const seen = new Set<string>();
  const reversePath: CategoryRow[] = [];
  let current: CategoryRow | undefined = leaf;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    reversePath.push(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return reversePath.reverse();
}

/**
 * Backend icon keys are semantic values, not React component names. This is
 * the only bridge from those stable values to NILYA's canonical icon library.
 */
const CATEGORY_ICON_MAP: Readonly<Record<string, IconName>> = {
  accessories: 'necklace',
  appliance: 'appliance',
  art: 'palette',
  audio: 'headphones',
  baby: 'person',
  bags: 'bag',
  beauty: 'beauty',
  bedding: 'bed',
  books: 'book',
  cameras: 'camera',
  clothing: 'clothing',
  collectables: 'star',
  computers: 'computer',
  cookware: 'cookware',
  crafts: 'palette',
  decor: 'decor',
  education: 'book',
  electronics: 'phone',
  equipment: 'package',
  fashion: 'clothing',
  fitness: 'dumbbell',
  football: 'star',
  food: 'cookware',
  fragrance: 'beauty',
  furniture: 'furniture',
  briefcase: 'office',
  games: 'gamepad',
  gaming: 'gamepad',
  grooming: 'beauty',
  haircare: 'beauty',
  hobbies: 'palette',
  home: 'home',
  'household-care': 'householdCare',
  instruments: 'musicNote',
  kids: 'person',
  kitchen: 'cookware',
  'kitchen-tools': 'kitchenTools',
  lighting: 'lamp',
  makeup: 'beauty',
  movies: 'image',
  music: 'musicNote',
  outdoor: 'outdoor',
  office: 'office',
  'personal-care': 'beauty',
  phones: 'phone',
  running: 'shoe',
  shoes: 'shoe',
  skincare: 'beauty',
  services: 'tools',
  'smart-devices': 'phone',
  sports: 'dumbbell',
  storage: 'storage',
  sudan: 'sparkle',
  tableware: 'tableware',
  textiles: 'textiles',
  celebration: 'celebration',
  tools: 'tools',
  toys: 'package',
};

export function categoryIconName(iconKey: string | null): IconName {
  return (iconKey && CATEGORY_ICON_MAP[iconKey]) || 'grid';
}

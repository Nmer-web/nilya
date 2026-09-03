"use client";

import {
  AlertCircle,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createCategory, updateCategory, type CategoryInput } from "@/app/actions";
import { slugify } from "@/lib/format";
import type { CategoryNode } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoryTree({ departments }: { departments: CategoryNode[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(
    // Departments that hold something start open; empty ones stay out of the way.
    () => new Set(departments.filter((d) => d.children.length > 0).map((d) => d.id))
  );
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [creatingUnder, setCreatingUnder] = useState<CategoryNode | null | "root">(
    null
  );

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreatingUnder("root")}>
          <Plus className="size-4" aria-hidden />
          Add category
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex h-11 items-center gap-4 border-b bg-zinc-50/80 px-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <span className="flex-1">Category</span>
          <span className="hidden w-56 sm:block">Slug</span>
          <span className="w-24 text-right">Listings</span>
          <span className="w-20 text-center">Active</span>
          <span className="w-20 text-right">Edit</span>
        </div>

        <ul className="divide-y">
          {departments.map((department) => {
            const open = expanded.has(department.id);
            return (
              <li key={department.id}>
                <CategoryRow
                  node={department}
                  depth={0}
                  expanded={open}
                  onToggleExpand={
                    department.children.length > 0
                      ? () =>
                          setExpanded((previous) => {
                            const next = new Set(previous);
                            if (next.has(department.id)) next.delete(department.id);
                            else next.add(department.id);
                            return next;
                          })
                      : undefined
                  }
                  onEdit={() => setEditing(department)}
                  onAddChild={() => setCreatingUnder(department)}
                />
                {open && department.children.length > 0 ? (
                  <ul className="divide-y border-t bg-zinc-50/40">
                    {department.children.map((child) => (
                      <li key={child.id}>
                        <CategoryRow
                          node={child}
                          depth={1}
                          onEdit={() => setEditing(child)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {editing ? (
        <CategoryDialog
          key={editing.id}
          mode="edit"
          node={editing}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      ) : null}

      {creatingUnder ? (
        <CategoryDialog
          key={creatingUnder === "root" ? "new-root" : `new-${creatingUnder.id}`}
          mode="create"
          parent={creatingUnder === "root" ? null : creatingUnder}
          open
          onOpenChange={(next) => {
            if (!next) setCreatingUnder(null);
          }}
        />
      ) : null}
    </>
  );
}

function CategoryRow({
  node,
  depth,
  expanded,
  onToggleExpand,
  onEdit,
  onAddChild,
}: {
  node: CategoryNode;
  depth: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onEdit: () => void;
  onAddChild?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deactivating a category that still holds active listings would orphan them
  // in the app, so the database refuses it and the control says so up front.
  const blocked = node.is_active && node.active_listings > 0;

  async function toggleActive(next: boolean) {
    setPending(true);
    setError(null);
    const result = await updateCategory(node.id, {
      label: node.label,
      slug: node.slug,
      iconKey: node.icon_key,
      sortOrder: node.sort_order,
      isActive: next,
    });
    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Could not update the category");
      return;
    }
    router.refresh();
  }

  const toggle = (
    <Checkbox
      checked={node.is_active}
      disabled={pending || blocked}
      onCheckedChange={toggleActive}
      aria-label={`${node.is_active ? "Deactivate" : "Activate"} ${node.label}`}
    />
  );

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-2.5",
        !node.is_active && "opacity-60"
      )}
    >
      <div
        className="flex min-w-0 flex-1 items-center gap-2"
        style={{ paddingLeft: depth * 24 }}
      >
        {onToggleExpand ? (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronRight
              className={cn("size-4 transition-transform", expanded && "rotate-90")}
              aria-hidden
            />
            <span className="sr-only">
              {expanded ? "Collapse" : "Expand"} {node.label}
            </span>
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}

        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 font-mono text-[10px] text-zinc-500"
          title={node.icon_key ? `Icon key: ${node.icon_key}` : "No icon key"}
          aria-hidden
        >
          {node.icon_key ? node.icon_key.slice(0, 2) : "··"}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {node.label}
          </span>
          <span className="block truncate font-mono text-xs text-muted-foreground sm:hidden">
            {node.slug}
          </span>
        </span>

        {error ? (
          <span
            role="alert"
            className="ml-2 flex items-center gap-1 text-xs text-destructive"
          >
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            {error}
          </span>
        ) : null}
      </div>

      <span className="hidden w-56 truncate font-mono text-xs text-muted-foreground sm:block">
        {node.slug}
      </span>

      <span className="tabular w-24 text-right text-sm">
        {node.total_listings > 0 ? (
          <>
            {node.active_listings}
            {node.total_listings !== node.active_listings ? (
              <span className="text-muted-foreground">
                {" "}
                / {node.total_listings}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </span>

      <span className="flex w-20 justify-center">
        {pending ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        ) : blocked ? (
          <Tooltip>
            {/* A disabled input takes no pointer events, so the tooltip needs a wrapper. */}
            <TooltipTrigger render={<span tabIndex={0} className="rounded" />}>
              {toggle}
            </TooltipTrigger>
            <TooltipContent>
              {node.active_listings} active listing
              {node.active_listings === 1 ? "" : "s"}
            </TooltipContent>
          </Tooltip>
        ) : (
          toggle
        )}
      </span>

      <span className="flex w-20 items-center justify-end gap-1">
        {onAddChild ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onAddChild}
            aria-label={`Add a subcategory under ${node.label}`}
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label={`Edit ${node.label}`}
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
      </span>
    </div>
  );
}

function CategoryDialog({
  mode,
  node,
  parent,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  node?: CategoryNode;
  parent?: CategoryNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const labelId = useId();
  const slugId = useId();
  const iconId = useId();
  const sortId = useId();

  const [label, setLabel] = useState(node?.label ?? "");
  const [slug, setSlug] = useState(node?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [iconKey, setIconKey] = useState(node?.icon_key ?? "");
  const [sortOrder, setSortOrder] = useState(String(node?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(node?.is_active ?? true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The slug is the primary key and `listings.category_slug` references it, so
  // it can only be renamed while nothing points at it.
  const slugLocked = mode === "edit" && (node?.total_listings ?? 0) > 0;

  function onLabelChange(value: string) {
    setLabel(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const payload: CategoryInput = {
      label,
      slug,
      iconKey: iconKey.trim() || null,
      sortOrder: Number.parseInt(sortOrder, 10),
      isActive,
    };

    const result =
      mode === "edit" && node
        ? await updateCategory(node.id, payload)
        : await createCategory({ ...payload, parentId: parent?.id ?? null });

    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Could not save the category");
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? `Edit ${node?.label}` : "New category"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Changes take effect in the app immediately."
              : parent
                ? `A subcategory under ${parent.label}.`
                : "A new top-level department."}
          </DialogDescription>
        </DialogHeader>

        <form id="category-form" onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={labelId}>Label</Label>
            <Input
              id={labelId}
              value={label}
              onChange={(event) => onLabelChange(event.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={slugId}>Slug</Label>
            <Input
              id={slugId}
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              disabled={slugLocked}
              required
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {slugLocked
                ? `Locked: ${node?.total_listings} listing${node?.total_listings === 1 ? "" : "s"} reference this slug.`
                : "Lowercase words separated by single hyphens."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={iconId}>Icon key</Label>
              <Input
                id={iconId}
                value={iconKey}
                onChange={(event) => setIconKey(event.target.value)}
                placeholder="Optional"
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={sortId}>Sort order</Label>
              <Input
                id={sortId}
                type="number"
                min={0}
                max={32767}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                required
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={isActive}
              onCheckedChange={setIsActive}
              aria-label="Active"
            />
            Active — shown to shoppers in the app
          </label>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            Cancel
          </DialogClose>
          <Button type="submit" form="category-form" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : mode === "edit" ? (
              "Save changes"
            ) : (
              "Create category"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { AlertCircle, CheckCircle2, ImageOff, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ReasonDialog } from "@/components/reason-dialog";
import { ListingStatusBadge, Pill } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { approveListings, removeListings } from "@/app/actions";
import { formatDate, listingImageUrl } from "@/lib/format";
import { listingPriceText } from "@/lib/marketplace";
import {
  LISTING_TYPE_LABEL,
  REMOVAL_REASONS,
  type AdminListingRow,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Client component because of the selection state and the bulk action bar. The
 * rows themselves are rendered from data the Server Component fetched — nothing
 * is queried here.
 */
export function ListingsTable({ listings }: { listings: AdminListingRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removeOpen, setRemoveOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ids = useMemo(() => listings.map((listing) => listing.id), [listings]);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;
  const selectedIds = useMemo(
    () => ids.filter((id) => selected.has(id)),
    [ids, selected]
  );

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(ids) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function approve() {
    setApproving(true);
    setError(null);
    const result = await approveListings(selectedIds);
    setApproving(false);
    if (!result.success) {
      setError(result.error ?? "Could not approve the listings");
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  return (
    <>
      {selected.size > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-[#0F6E56]/20 bg-[#E7F1EE] px-4 py-2.5">
          <p className="text-sm font-medium text-[#0B5442]">
            {selected.size} selected
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={approve}
              disabled={approving}
              className="bg-white"
            >
              {approving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 className="size-4" aria-hidden />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRemoveOpen(true)}
              className="bg-white text-destructive hover:bg-red-50"
            >
              <Trash2 className="size-4" aria-hidden />
              Remove
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <caption className="sr-only">Listings</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 bg-muted">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all listings on this page"
                  />
                </TableHead>
                <TableHead className="w-14 bg-muted">
                  <span className="sr-only">Photo</span>
                </TableHead>
                {["Title", "Seller", "Price / pay", "Category", "Status", "Created"].map(
                  (header) => (
                    <TableHead
                      key={header}
                      className={cn(
                        "h-11 bg-muted text-xs font-medium tracking-wide text-muted-foreground uppercase",
                        header === "Price / pay" && "text-right",
                        header === "Created" && "text-right"
                      )}
                    >
                      {header}
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((listing) => {
                const cover = listing.images[0];
                const src = listingImageUrl(cover?.storage_path);
                const isSelected = selected.has(listing.id);
                return (
                  <TableRow
                    key={listing.id}
                    data-selected={isSelected || undefined}
                    className="data-selected:bg-[#E7F1EE]/50"
                  >
                    <TableCell className="py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          toggleOne(listing.id, checked)
                        }
                        aria-label={`Select ${listing.title}`}
                      />
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="relative size-10 overflow-hidden rounded-lg border bg-muted">
                        {src ? (
                          <Image
                            src={src}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-label">
                            <ImageOff className="size-4" aria-hidden />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="rounded font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {listing.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Pill className="px-2 py-1 text-[10px]">
                          {LISTING_TYPE_LABEL[listing.listing_type]}
                        </Pill>
                      </div>
                      {listing.listing_type === "job" && listing.job_details ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {listing.job_details.employer}
                        </p>
                      ) : listing.brand ? (
                        <p className="text-xs text-muted-foreground">
                          {listing.brand}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-3">
                      {listing.seller ? (
                        <Link
                          href={`/users/${listing.seller.id}`}
                          className="flex items-center gap-2 rounded text-sm text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <UserAvatar
                            name={listing.seller.display_name}
                            avatarPath={listing.seller.avatar_url}
                            color={listing.seller.avatar_color}
                            className="size-6"
                          />
                          <span className="truncate">
                            {listing.seller.display_name}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular py-3 text-right font-medium">
                      {listingPriceText(listing)}
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground">
                      {listing.category?.label ?? listing.category_slug}
                    </TableCell>
                    <TableCell className="py-3">
                      <ListingStatusBadge status={listing.status} />
                    </TableCell>
                    <TableCell className="py-3 text-right text-muted-foreground">
                      {formatDate(listing.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <ReasonDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Remove ${selectedIds.length} listing${selectedIds.length === 1 ? "" : "s"}?`}
        description="The listings stop being visible in the marketplace. This is recorded against your account and can be undone by setting them active again."
        confirmLabel="Remove listings"
        options={REMOVAL_REASONS}
        noteLabel="Note"
        notePlaceholder="Anything the next moderator should know"
        onConfirm={async (reason) => {
          const result = await removeListings(selectedIds, reason);
          if (result.success) {
            setSelected(new Set());
            router.refresh();
          }
          return result;
        }}
      />
    </>
  );
}

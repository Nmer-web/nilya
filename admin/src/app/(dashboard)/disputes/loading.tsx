import { TableSkeleton } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-9 w-full max-w-xs" />
      </div>
      <TableSkeleton columns={6} />
    </>
  );
}

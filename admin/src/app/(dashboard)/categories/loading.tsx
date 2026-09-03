import { TableSkeleton } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <TableSkeleton columns={5} rows={10} />
    </>
  );
}

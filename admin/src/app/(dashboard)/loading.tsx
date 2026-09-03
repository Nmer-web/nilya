import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/data-table";

export default function Loading() {
  return (
    <>
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[86px] rounded-xl" />
        ))}
      </div>
      <div className="mt-10">
        <Skeleton className="mb-3 h-5 w-32" />
        <TableSkeleton columns={6} rows={5} />
      </div>
    </>
  );
}

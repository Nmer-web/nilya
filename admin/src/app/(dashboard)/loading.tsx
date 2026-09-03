import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/data-table";

export default function Loading() {
  return (
    <>
      <div className="mb-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[172px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-[340px] rounded-xl" />
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Skeleton className="mb-3 h-5 w-32" />
          <TableSkeleton columns={5} rows={5} />
        </div>
        <div className="xl:col-span-2">
          <Skeleton className="mb-3 h-5 w-32" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    </>
  );
}

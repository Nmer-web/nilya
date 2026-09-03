import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LISTING_STATUS_LABEL,
  REPORT_STATUS_LABEL,
  type ListingStatus,
  type ReportStatus,
  type ReportTargetType,
} from "@/lib/types";

/**
 * Status colours are semantic, never brand-amber-for-everything: green reads
 * "live", amber "needs a human", red "taken down", zinc "finished", blue
 * "not yet public" (constitution Principle VI).
 */
const LISTING_TONE: Record<ListingStatus, string> = {
  active: "border-[#0F6E56]/20 bg-[#E7F1EE] text-[#0B5442]",
  under_review: "border-[#EF9F27]/30 bg-[#FDF1DE] text-[#8A5A0B]",
  removed: "border-red-200 bg-red-50 text-red-800",
  sold: "border-zinc-200 bg-zinc-100 text-zinc-700",
  reserved: "border-zinc-200 bg-zinc-100 text-zinc-700",
  draft: "border-blue-200 bg-blue-50 text-blue-800",
};

export function ListingStatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", LISTING_TONE[status], className)}
    >
      {LISTING_STATUS_LABEL[status]}
    </Badge>
  );
}

const REPORT_TONE: Record<ReportStatus, string> = {
  open: "border-red-200 bg-red-50 text-red-800",
  reviewing: "border-[#EF9F27]/30 bg-[#FDF1DE] text-[#8A5A0B]",
  resolved: "border-[#0F6E56]/20 bg-[#E7F1EE] text-[#0B5442]",
  dismissed: "border-zinc-200 bg-zinc-100 text-zinc-700",
};

export function ReportStatusBadge({
  status,
  className,
}: {
  status: ReportStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", REPORT_TONE[status], className)}
    >
      {REPORT_STATUS_LABEL[status]}
    </Badge>
  );
}

const TARGET_LABEL: Record<ReportTargetType, string> = {
  listing: "Listing",
  user: "User",
  review: "Review",
};

export function TargetTypeBadge({ type }: { type: ReportTargetType }) {
  return (
    <Badge variant="outline" className="border-zinc-200 bg-white font-medium text-zinc-700">
      {TARGET_LABEL[type] ?? type}
    </Badge>
  );
}

export function SuspendedBadge() {
  return (
    <Badge variant="outline" className="border-red-200 bg-red-50 font-medium text-red-800">
      Suspended
    </Badge>
  );
}

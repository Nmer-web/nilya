import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DISPUTE_STATE_LABEL,
  LISTING_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  REPORT_STATUS_LABEL,
  type AuditTargetType,
  type DisputeState,
  type ListingStatus,
  type OrderStatus,
  type PaymentStatus,
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

// ───────────────────────── operations ─────────────────────────

const GREEN = "border-[#0F6E56]/20 bg-[#E7F1EE] text-[#0B5442]";
const AMBER = "border-[#EF9F27]/30 bg-[#FDF1DE] text-[#8A5A0B]";
const RED = "border-red-200 bg-red-50 text-red-800";
const ZINC = "border-zinc-200 bg-zinc-100 text-zinc-700";
const BLUE = "border-blue-200 bg-blue-50 text-blue-800";
const PURPLE = "border-purple-200 bg-purple-50 text-purple-800";

const DISPUTE_TONE: Record<DisputeState, string> = {
  open: RED,
  under_review: AMBER,
  resolved_buyer: GREEN,
  resolved_seller: GREEN,
  closed: ZINC,
};

export function DisputeStateBadge({ state }: { state: DisputeState }) {
  return (
    <Badge variant="outline" className={cn("font-medium", DISPUTE_TONE[state])}>
      {DISPUTE_STATE_LABEL[state]}
    </Badge>
  );
}

const ORDER_TONE: Record<OrderStatus, string> = {
  pending_payment: AMBER,
  paid: GREEN,
  shipped: BLUE,
  delivered: BLUE,
  completed: GREEN,
  cancelled: ZINC,
  refunded: ZINC,
  disputed: RED,
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", ORDER_TONE[status])}>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  );
}

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  requires_payment_method: AMBER,
  processing: AMBER,
  succeeded: GREEN,
  failed: RED,
  refunded: ZINC,
  partially_refunded: ZINC,
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", PAYMENT_TONE[status])}>
      {PAYMENT_STATUS_LABEL[status]}
    </Badge>
  );
}

const AUDIT_TARGET_TONE: Record<AuditTargetType, string> = {
  listing: BLUE,
  user: PURPLE,
  report: RED,
  dispute: AMBER,
  category: GREEN,
  review: ZINC,
  admin_user: PURPLE,
};

const AUDIT_TARGET_LABEL: Record<AuditTargetType, string> = {
  listing: "Listing",
  user: "User",
  report: "Report",
  dispute: "Dispute",
  category: "Category",
  review: "Review",
  admin_user: "Admin user",
};

export function AuditTargetBadge({ type }: { type: string }) {
  const known = (type in AUDIT_TARGET_TONE ? type : null) as AuditTargetType | null;
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", known ? AUDIT_TARGET_TONE[known] : ZINC)}
    >
      {known ? AUDIT_TARGET_LABEL[known] : type}
    </Badge>
  );
}

export function RemovedBadge() {
  return (
    <Badge variant="outline" className={cn("font-medium", RED)}>
      Removed
    </Badge>
  );
}

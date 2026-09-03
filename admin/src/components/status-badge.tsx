import { cn } from "@/lib/utils";
import {
  DISPUTE_STATE_LABEL,
  LISTING_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  REPORT_STATUS_LABEL,
  ROLE_LABEL,
  type AuditTargetType,
  type DisputeState,
  type ListingStatus,
  type OrderStatus,
  type PaymentStatus,
  type ReportStatus,
  type ReportTargetType,
} from "@/lib/types";

/**
 * One pill for every status in the dashboard.
 *
 * Colours are semantic, never brand-amber-for-everything: green reads "live or
 * settled", amber "needs a human", red "taken down or contested", grey
 * "finished or not yet public", blue "in transit". Backgrounds are the colour
 * at ~12% over the surface, text is the colour at full strength, no border
 * (constitution Principle VI).
 */
export type PillTone = "green" | "amber" | "red" | "gray" | "blue" | "dark";

const PILL_BASE =
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] leading-none font-medium whitespace-nowrap";

const PILL_TONE: Record<PillTone, string> = {
  green: "bg-[#0F6E56]/12 text-[#0F6E56]",
  amber: "bg-[#EF9F27]/14 text-[#9A5B00]",
  red: "bg-[#B42318]/10 text-[#B42318]",
  gray: "bg-foreground/8 text-muted-foreground",
  blue: "bg-[#1D4ED8]/10 text-[#1D4ED8]",
  dark: "bg-[#0F6E56] text-white",
};

/** Every status string the dashboard shows, mapped to a tone. */
const STATUS_TONE: Record<string, PillTone> = {
  // green — live, settled, in the operator's favour
  active: "green",
  standing: "green",
  resolved: "green",
  resolved_buyer: "green",
  resolved_seller: "green",
  verified: "green",
  succeeded: "green",
  completed: "green",
  paid: "green",
  // amber — waiting on a human or on money
  under_review: "amber",
  reviewing: "amber",
  pending: "amber",
  pending_payment: "amber",
  processing: "amber",
  requires_payment_method: "amber",
  moderator: "amber",
  // red — taken down, contested, or failed
  removed: "red",
  blocked: "red",
  suspended: "red",
  open: "red",
  failed: "red",
  disputed: "red",
  // grey — finished, withdrawn, or not yet public
  draft: "gray",
  sold: "gray",
  reserved: "gray",
  dismissed: "gray",
  cancelled: "gray",
  refunded: "gray",
  partially_refunded: "gray",
  closed: "gray",
  support: "gray",
  // roles and transit
  owner: "dark",
  admin: "blue",
  shipped: "blue",
  delivered: "blue",
};

const STATUS_LABEL: Record<string, string> = {
  ...LISTING_STATUS_LABEL,
  ...REPORT_STATUS_LABEL,
  ...DISPUTE_STATE_LABEL,
  ...ORDER_STATUS_LABEL,
  ...PAYMENT_STATUS_LABEL,
  ...ROLE_LABEL,
  verified: "Verified",
  standing: "Standing",
  suspended: "Suspended",
  blocked: "Blocked",
  pending: "Pending",
};

function humanize(status: string) {
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function StatusBadge({
  status,
  label,
  tone,
  className,
}: {
  status: string;
  /** Overrides the label looked up from the status enums. */
  label?: string;
  /** Overrides the tone looked up from the status. */
  tone?: PillTone;
  className?: string;
}) {
  const resolvedTone = tone ?? STATUS_TONE[status] ?? "gray";
  return (
    <span className={cn(PILL_BASE, PILL_TONE[resolvedTone], className)}>
      {label ?? STATUS_LABEL[status] ?? humanize(status)}
    </span>
  );
}

/** A plain pill for labels that are not statuses (types, counts). */
export function Pill({
  tone = "gray",
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn(PILL_BASE, PILL_TONE[tone], className)}>{children}</span>
  );
}

// ───────────── typed wrappers, so call sites keep their enum safety ─────────────

export function ListingStatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  return <StatusBadge status={status} className={className} />;
}

export function ReportStatusBadge({
  status,
  className,
}: {
  status: ReportStatus;
  className?: string;
}) {
  return <StatusBadge status={status} className={className} />;
}

const TARGET_LABEL: Record<ReportTargetType, string> = {
  listing: "Listing",
  user: "User",
  review: "Review",
};

export function TargetTypeBadge({ type }: { type: ReportTargetType }) {
  return <Pill tone="gray">{TARGET_LABEL[type] ?? type}</Pill>;
}

export function SuspendedBadge() {
  return <StatusBadge status="suspended" />;
}

export function DisputeStateBadge({ state }: { state: DisputeState }) {
  return <StatusBadge status={state} />;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge status={status} />;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <StatusBadge status={status} />;
}

const AUDIT_TARGET_TONE: Record<AuditTargetType, PillTone> = {
  listing: "blue",
  user: "gray",
  report: "red",
  dispute: "amber",
  category: "green",
  review: "gray",
  admin_user: "dark",
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
    <Pill tone={known ? AUDIT_TARGET_TONE[known] : "gray"}>
      {known ? AUDIT_TARGET_LABEL[known] : type}
    </Pill>
  );
}

export function RemovedBadge() {
  return <StatusBadge status="removed" />;
}

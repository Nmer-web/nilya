/**
 * Row shapes for what the admin reads.
 *
 * Hand-written, like `src/lib/database.types.ts` in the mobile app, and taken
 * from the live schema rather than assumed: every enum member below was read
 * back from `pg_type` on project tggnhpvrvnmrvmsdyxyu. The schema is the source
 * of truth (constitution Principle III) — when the Supabase CLI is available,
 * replace this with generated output.
 */

export const LISTING_STATUSES = [
  "draft",
  "active",
  "under_review",
  "reserved",
  "sold",
  "removed",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const REPORT_STATUSES = [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_REASONS = [
  "prohibited_item",
  "counterfeit",
  "spam",
  "inappropriate_content",
  "wrong_category",
  "fraud",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportTargetType = "listing" | "user" | "review";

export const ADMIN_ROLES = ["owner", "admin", "moderator", "support"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type ListingCondition = "new" | "very_good" | "good";

/** The only condition Nilya sells (constitution Principle I). */
export const NEW_CONDITION: ListingCondition = "new";

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  prohibited_item: "Prohibited item",
  counterfeit: "Counterfeit",
  spam: "Spam",
  inappropriate_content: "Inappropriate content",
  wrong_category: "Wrong category",
  fraud: "Fraud",
  other: "Other",
};

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  active: "Active",
  under_review: "Under review",
  reserved: "Reserved",
  sold: "Sold",
  removed: "Removed",
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

/**
 * Reasons offered when removing a listing. These are operator vocabulary
 * written into `admin_audit_log.note`, not database enum members.
 */
export const REMOVAL_REASONS = [
  { value: "prohibited_item", label: "Prohibited item" },
  { value: "counterfeit", label: "Counterfeit" },
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "other", label: "Other" },
] as const;

/** Outcomes offered when resolving a report. Written to the audit log. */
export const RESOLUTION_ACTIONS = [
  { value: "warning", label: "Warning issued" },
  { value: "listing_removed", label: "Listing removed" },
  { value: "user_suspended", label: "User suspended" },
  { value: "no_action", label: "No action needed" },
] as const;

// ─────────────────────────────── row shapes ───────────────────────────────

/** `public.admin_overview_stats` — one row, admin-gated. */
export type OverviewStats = {
  total_users: number;
  new_users_week: number;
  active_listings: number;
  listings_under_review: number;
  listings_today: number;
  open_reports: number;
};

/** `public.admin_user_directory` — auth.users joined to profiles. */
export type AdminUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  city: string | null;
  country_code: string | null;
  is_verified: boolean | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  admin_role: AdminRole | null;
  listings_count: number;
  reports_count: number;
};

/** `public.admin_report_feed` — reports with reporter identity + target label. */
export type AdminReportRow = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter_email: string | null;
  reporter_name: string | null;
  reporter_avatar_url: string | null;
  target_label: string | null;
};

export type ListingImage = {
  storage_path: string;
  position: number;
};

export type ListingSeller = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_color: string | null;
  city: string | null;
  country_code: string | null;
  is_verified: boolean;
  suspended_at: string | null;
  created_at: string;
  rating_avg: number | null;
  rating_count: number;
  lifetime_sales: number;
};

export type AdminListingRow = {
  id: string;
  title: string;
  brand: string | null;
  price_cents: number;
  currency: string;
  status: ListingStatus;
  category_slug: string;
  created_at: string;
  published_at: string | null;
  seller_id: string;
  seller: Pick<ListingSeller, "id" | "display_name" | "avatar_url" | "avatar_color"> | null;
  category: { slug: string; label: string } | null;
  images: ListingImage[];
};

export type AdminListingDetail = AdminListingRow & {
  description: string | null;
  condition: ListingCondition;
  original_price_cents: number | null;
  size: string | null;
  color: string | null;
  city: string | null;
  country_code: string;
  tagline: string | null;
  updated_at: string;
  seller: ListingSeller | null;
};

export type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  parent_id: string | null;
  icon_key: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type CategoryStats = {
  id: string;
  slug: string;
  active_listings: number;
  total_listings: number;
};

/** A department with its children, as the Categories page renders it. */
export type CategoryNode = CategoryRow & {
  active_listings: number;
  total_listings: number;
  children: CategoryNode[];
};

export type AuditLogRow = {
  id: number;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  note: string | null;
  created_at: string;
};

/** Uniform result of every server action in `src/app/actions.ts`. */
export type ActionResult = { success: boolean; error?: string };

// ───────────────────── operations (disputes, orders, …) ─────────────────────

export const DISPUTE_STATES = [
  "open",
  "under_review",
  "resolved_buyer",
  "resolved_seller",
  "closed",
] as const;
export type DisputeState = (typeof DISPUTE_STATES)[number];

export const DISPUTE_STATE_LABEL: Record<DisputeState, string> = {
  open: "Open",
  under_review: "Under review",
  resolved_buyer: "Resolved — buyer",
  resolved_seller: "Resolved — seller",
  closed: "Closed",
};

/** States that still need a decision. */
export const OPEN_DISPUTE_STATES: readonly DisputeState[] = ["open", "under_review"];
export const CLOSED_DISPUTE_STATES: readonly DisputeState[] = [
  "resolved_buyer",
  "resolved_seller",
  "closed",
];

export const DISPUTE_REASONS = [
  "not_received",
  "not_as_described",
  "damaged",
  "other",
] as const;
export type DisputeReason = (typeof DISPUTE_REASONS)[number];

export const DISPUTE_REASON_LABEL: Record<DisputeReason, string> = {
  not_received: "Item not received",
  not_as_described: "Not as described",
  damaged: "Arrived damaged",
  other: "Other",
};

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
  "disputed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
};

export const PAYMENT_STATUSES = [
  "requires_payment_method",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  requires_payment_method: "Awaiting payment method",
  processing: "Processing",
  succeeded: "Succeeded",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

export type DeliveryKind = "local" | "dom" | "intl";

/** `public.admin_order_feed` — orders denormalised with listing + parties. */
export type AdminOrderRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_id: string | null;
  item_price_cents: number;
  shipping_cents: number;
  protection_fee_cents: number;
  total_cents: number | null;
  currency: string;
  status: OrderStatus;
  delivery_kind: DeliveryKind;
  delivery_key: string;
  placed_at: string;
  paid_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  listing_title: string | null;
  listing_status: ListingStatus | null;
  buyer_name: string | null;
  buyer_avatar_url: string | null;
  buyer_avatar_color: string | null;
  seller_name: string | null;
  seller_avatar_url: string | null;
  seller_avatar_color: string | null;
};

/** `public.admin_dispute_feed`. `resolved_by` comes from the audit log. */
export type AdminDisputeRow = {
  id: string;
  order_id: string;
  opened_by: string;
  reason: DisputeReason;
  body: string | null;
  state: DisputeState;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  opener_name: string | null;
  opener_avatar_url: string | null;
  opener_avatar_color: string | null;
  opener_email: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  order_total_cents: number | null;
  order_currency: string | null;
  order_status: OrderStatus | null;
  listing_title: string | null;
  resolved_by: string | null;
  resolved_by_email: string | null;
  resolution_note: string | null;
};

/** `public.payments`. */
export type PaymentRow = {
  id: string;
  order_id: string;
  stripe_payment_intent_id: string;
  stripe_charge_id: string | null;
  amount_cents: number;
  amount_refunded_cents: number;
  currency: string;
  status: PaymentStatus;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

/** `public.admin_audit_feed` — audit log with the actor's identity. */
export type AdminAuditRow = AuditLogRow & {
  actor_email: string | null;
  actor_name: string | null;
};

export const AUDIT_TARGET_TYPES = [
  "listing",
  "user",
  "report",
  "dispute",
  "category",
  "review",
  "admin_user",
] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

/** `public.reviews` with author/subject embeds. */
export type AdminReviewRow = {
  id: string;
  order_id: string;
  author_id: string;
  subject_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  removed_at: string | null;
  removed_reason: string | null;
  author: Pick<ListingSeller, "id" | "display_name" | "avatar_url" | "avatar_color"> | null;
  subject: Pick<ListingSeller, "id" | "display_name" | "avatar_url" | "avatar_color"> | null;
};

/** `public.admin_seller_directory` — seller_accounts + profile + identity. */
export type AdminSellerRow = {
  seller_account_id: string;
  profile_id: string;
  stripe_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  default_currency: string;
  country_code: string | null;
  seller_since: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  city: string | null;
  is_verified: boolean | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  profile_created_at: string | null;
  email: string | null;
  listings_count: number;
  active_listings_count: number;
  orders_count: number;
  paid_revenue_cents: number;
};

export const ROLE_LABEL: Record<AdminRole, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
  support: "Support",
};

/** Roles the dashboard may grant. Owner is deliberately absent. */
export const ASSIGNABLE_ROLES = ["admin", "moderator", "support"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

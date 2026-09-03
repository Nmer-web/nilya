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

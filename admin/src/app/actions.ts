"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  LISTING_STATUSES,
  REPORT_STATUSES,
  type ActionResult,
  type ListingStatus,
  type ReportStatus,
} from "@/lib/types";

/**
 * Every privileged mutation in the admin.
 *
 * Each one:
 *   1. builds a server Supabase client carrying the caller's session,
 *   2. verifies the caller is in `admin_users` — a server action is a public
 *      HTTP endpoint, so it never assumes a page checked first,
 *   3. performs the mutation through a SECURITY DEFINER RPC that also writes
 *      the `admin_audit_log` row in the same transaction,
 *   4. returns `{ success, error? }`.
 *
 * Why an RPC rather than a direct `update`: `admin_audit_log` is not writable
 * by any client role, so a mutation and its audit entry cannot come apart, and
 * `listings` has no admin UPDATE policy, so a moderator cannot reach columns
 * moderation does not own (a seller's price or title). See
 * `supabase/migrations/20260903181808_admin_access_repair.sql`.
 *
 * The check in step 2 is defence in depth. Removing it would not open the door:
 * each RPC re-checks `is_admin()` in Postgres and raises 42501.
 */

async function authorize() {
  const session = await getAdminSession();
  if (!session) return null;
  return session;
}

const DENIED: ActionResult = {
  success: false,
  error: "You don't have admin access",
};

/** Postgres messages are operator-facing here; pass them through unchanged. */
function failure(message: string | undefined, fallback: string): ActionResult {
  return { success: false, error: message?.trim() || fallback };
}

function isListingStatus(value: string): value is ListingStatus {
  return (LISTING_STATUSES as readonly string[]).includes(value);
}

function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value);
}

// ─────────────────────────────── listings ───────────────────────────────

async function setListingStatuses(
  ids: string[],
  status: ListingStatus,
  note: string | null
): Promise<ActionResult> {
  if (!(await authorize())) return DENIED;
  if (ids.length === 0) {
    return { success: false, error: "Select at least one listing" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_listing_status", {
    p_ids: ids,
    p_status: status,
    p_note: note,
  });

  if (error) return failure(error.message, "Could not update the listings");

  revalidatePath("/listings");
  revalidatePath("/");
  for (const id of ids) revalidatePath(`/listings/${id}`);
  return { success: true };
}

export async function approveListings(ids: string[]): Promise<ActionResult> {
  return setListingStatuses(ids, "active", null);
}

export async function removeListings(
  ids: string[],
  reason: string
): Promise<ActionResult> {
  const trimmed = reason.trim();
  if (!trimmed) {
    return { success: false, error: "A reason is required to remove a listing" };
  }
  return setListingStatuses(ids, "removed", trimmed);
}

export async function setListingStatus(
  id: string,
  status: string,
  note: string
): Promise<ActionResult> {
  if (!isListingStatus(status)) {
    return { success: false, error: `Unknown listing status: ${status}` };
  }
  if (status === "removed" && !note.trim()) {
    return { success: false, error: "A reason is required to remove a listing" };
  }
  return setListingStatuses([id], status, note.trim() || null);
}

// ───────────────────────────────── users ─────────────────────────────────

export async function suspendUser(
  id: string,
  reason: string
): Promise<ActionResult> {
  if (!(await authorize())) return DENIED;

  const trimmed = reason.trim();
  if (!trimmed) {
    return { success: false, error: "A reason is required to suspend an account" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_suspend_user", {
    p_user_id: id,
    p_reason: trimmed,
    p_suspend: true,
  });

  if (error) return failure(error.message, "Could not suspend the account");

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return { success: true };
}

export async function reinstateUser(id: string): Promise<ActionResult> {
  if (!(await authorize())) return DENIED;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_suspend_user", {
    p_user_id: id,
    p_reason: "",
    p_suspend: false,
  });

  if (error) return failure(error.message, "Could not reinstate the account");

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return { success: true };
}

// ──────────────────────────────── reports ────────────────────────────────

/**
 * `action` is the outcome recorded against the report ("warning",
 * "listing_removed", …). It is written to the audit log; it does not itself
 * remove a listing or suspend an account — those are separate, audited actions
 * the operator takes on the relevant page, so the log never claims something
 * happened that did not.
 */
export async function resolveReport(
  id: string,
  action: string,
  note: string
): Promise<ActionResult> {
  return setReportStatusInternal(id, "resolved", action, note);
}

export async function setReportStatus(
  id: string,
  status: string,
  note: string
): Promise<ActionResult> {
  if (!isReportStatus(status)) {
    return { success: false, error: `Unknown report status: ${status}` };
  }
  return setReportStatusInternal(id, status, null, note);
}

async function setReportStatusInternal(
  id: string,
  status: ReportStatus,
  action: string | null,
  note: string
): Promise<ActionResult> {
  if (!(await authorize())) return DENIED;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_report_status", {
    p_report_id: id,
    p_status: status,
    p_action: action,
    p_note: note.trim() || null,
  });

  if (error) return failure(error.message, "Could not update the report");

  revalidatePath("/reports");
  revalidatePath(`/reports/${id}`);
  revalidatePath("/");
  return { success: true };
}

// ─────────────────────────────── categories ───────────────────────────────

export type CategoryInput = {
  label: string;
  slug: string;
  iconKey: string | null;
  sortOrder: number;
  isActive: boolean;
};

export async function updateCategory(
  id: string,
  data: CategoryInput
): Promise<ActionResult> {
  if (!(await authorize())) return DENIED;

  const invalid = validateCategory(data);
  if (invalid) return { success: false, error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_category", {
    p_id: id,
    p_label: data.label,
    p_slug: data.slug,
    p_icon_key: data.iconKey,
    p_sort_order: data.sortOrder,
    p_is_active: data.isActive,
  });

  if (error) return failure(error.message, "Could not save the category");

  revalidatePath("/categories");
  return { success: true };
}

export async function createCategory(
  data: CategoryInput & { parentId: string | null }
): Promise<ActionResult> {
  if (!(await authorize())) return DENIED;

  const invalid = validateCategory(data);
  if (invalid) return { success: false, error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_category", {
    p_slug: data.slug,
    p_label: data.label,
    p_parent_id: data.parentId,
    p_icon_key: data.iconKey,
    p_sort_order: data.sortOrder,
    p_is_active: data.isActive,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: `The slug "${data.slug}" is already taken` };
    }
    return failure(error.message, "Could not create the category");
  }

  revalidatePath("/categories");
  return { success: true };
}

/**
 * Mirrors the CHECK constraints on `categories` so the operator sees the
 * problem in the form instead of a Postgres error after a round trip.
 */
function validateCategory(data: CategoryInput): string | null {
  if (!data.label.trim()) return "A label is required";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) {
    return "The slug must be lowercase words separated by single hyphens";
  }
  if (data.iconKey && !/^[a-z][a-z0-9-]{0,31}$/.test(data.iconKey)) {
    return "The icon key must start with a letter and use lowercase letters, digits and hyphens";
  }
  if (!Number.isInteger(data.sortOrder) || data.sortOrder < 0 || data.sortOrder > 32767) {
    return "The sort order must be a whole number between 0 and 32767";
  }
  return null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * Public object URL for a storage path. `listing-images` and `avatars` are
 * public buckets, so no signing is involved.
 */
export function storageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, "")}`;
}

export const listingImageUrl = (path: string | null | undefined) =>
  storageUrl("listing-images", path);

export const avatarUrl = (path: string | null | undefined) =>
  storageUrl("avatars", path);

export function formatMoney(cents: number, currency: string) {
  const code = (currency || "EUR").trim().toUpperCase();
  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: code,
    }).format(cents / 100);
  } catch {
    // An unexpected currency code should show the number, not throw a page away.
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return DATE.format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return DATE_TIME.format(new Date(iso));
}

/** "3 days ago" / "in 2 hours", for report and audit recency. */
export function formatRelative(iso: string | null | undefined) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const seconds = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(seconds, "second");
}

/** Initials for an avatar fallback. Never invents a name. */
export function initials(name: string | null | undefined, email?: string | null) {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";
  const parts = source.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return source[0]!.toUpperCase();
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Reads one search param that may arrive repeated. */
export function firstParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Parses a 1-based page number, clamping anything unusable to 1. */
export function pageParam(value: string | string[] | undefined) {
  const raw = Number.parseInt(firstParam(value) ?? "1", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

/** PostgREST treats , . : ( ) as syntax inside an `or=` filter. */
export function escapeFilterValue(value: string) {
  return value.replace(/[,.:()\\]/g, " ").trim();
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The first block of a uuid — enough to recognise a row, short enough to scan. */
export function shortId(id: string) {
  return id.split("-")[0] ?? id.slice(0, 8);
}

/** Truncates to `max` characters with an ellipsis; never splits a surrogate pair. */
export function truncate(value: string | null | undefined, max: number) {
  if (!value) return "";
  const chars = Array.from(value);
  return chars.length <= max ? value : chars.slice(0, max).join("").trimEnd() + "…";
}

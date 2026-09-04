import { formatMoney } from "@/lib/format";
import {
  LISTING_TYPES,
  type AdminListingCategory,
  type AdminListingRow,
  type ListingType,
} from "@/lib/types";

export type ListingDetailKind =
  | "product"
  | "food"
  | "perfume"
  | "job"
  | "service";

export function isListingType(value: string | undefined): value is ListingType {
  return (LISTING_TYPES as readonly string[]).includes(value ?? "");
}

export function humanizeMarketplaceValue(value: string): string {
  const words = value.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function detailKindForCategory(
  category: AdminListingCategory | null | undefined
): ListingDetailKind {
  if (!category) return "product";
  if (category.listing_type === "food") return "food";
  if (category.listing_type === "job") return "job";
  if (category.listing_type === "service") return "service";
  return category.requires_perfume_details ? "perfume" : "product";
}

/** The truthful price or compensation text for every Nilya listing type. */
export function listingPriceText(
  listing: Pick<
    AdminListingRow,
    | "listing_type"
    | "price_cents"
    | "currency"
    | "food_details"
    | "job_details"
    | "service_details"
  >
): string {
  if (listing.listing_type === "job" && listing.job_details) {
    const details = listing.job_details;
    const minimum = formatMoney(
      details.salary_min_cents,
      details.salary_currency
    );
    return details.salary_min_cents === details.salary_max_cents
      ? minimum
      : `${minimum}–${formatMoney(
          details.salary_max_cents,
          details.salary_currency
        )}`;
  }

  if (
    listing.listing_type === "service" &&
    listing.service_details?.pricing_mode === "quote"
  ) {
    return "Quote required";
  }

  if (listing.price_cents == null) return "Price unavailable";

  const amount = formatMoney(listing.price_cents, listing.currency);
  if (listing.listing_type === "food" && listing.food_details) {
    return `${amount} / ${listing.food_details.price_unit}`;
  }
  if (listing.listing_type === "service" && listing.service_details) {
    if (listing.service_details.pricing_mode === "hourly") {
      return `${amount} / hour`;
    }
    if (listing.service_details.pricing_mode === "daily") {
      return `${amount} / day`;
    }
  }
  return amount;
}

export function ownerLabel(type: ListingType): string {
  if (type === "job") return "Employer";
  if (type === "service") return "Provider";
  return "Seller";
}

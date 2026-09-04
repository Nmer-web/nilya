import type { CategoryRow, ListingCondition, ListingType } from '@/lib/database.types';

export type ListingDetailKind = 'product' | 'food' | 'perfume' | 'job' | 'service';

/** PostgREST form of the database's `listings_typed_core_fields` invariant. */
export const CANONICAL_LISTING_FILTER =
  'and(listing_type.in.(product,food),condition.eq.new),and(listing_type.in.(job,service),condition.is.null)';

export const LISTING_TYPE_LABEL: Record<ListingType, string> = {
  product: 'Product',
  food: 'Food',
  job: 'Job',
  service: 'Service',
};

export function isCommerceListing(type: ListingType): boolean {
  return type === 'product' || type === 'food';
}

export function listingNoun(type: ListingType, plural = false): string {
  if (type === 'job') return plural ? 'jobs' : 'job';
  if (type === 'service') return plural ? 'services' : 'service';
  if (type === 'food') return plural ? 'food listings' : 'food listing';
  return plural ? 'products' : 'product';
}

export function conditionForListingType(type: ListingType): ListingCondition | null {
  return isCommerceListing(type) ? 'new' : null;
}

export function isCanonicalListing(
  type: ListingType,
  condition: ListingCondition | null
): boolean {
  return condition === conditionForListingType(type);
}

export function detailKindForCategory(
  category: Pick<CategoryRow, 'listing_type' | 'requires_perfume_details'> | null | undefined
): ListingDetailKind {
  if (!category) return 'product';
  if (category.listing_type === 'food') return 'food';
  if (category.listing_type === 'job') return 'job';
  if (category.listing_type === 'service') return 'service';
  return category.requires_perfume_details ? 'perfume' : 'product';
}

export type ListingPrimaryAction =
  | 'buy_now'
  | 'message_seller'
  | 'apply_now'
  | 'contact_employer'
  | 'save_job'
  | 'request_quote'
  | 'book_service'
  | 'message_provider';

/** One source for card/detail CTA decisions, kept pure so it can be tested. */
export function actionsForListingType(type: ListingType): readonly ListingPrimaryAction[] {
  if (type === 'job') return ['apply_now', 'contact_employer', 'save_job'];
  if (type === 'service') return ['request_quote', 'book_service', 'message_provider'];
  return ['buy_now', 'message_seller'];
}

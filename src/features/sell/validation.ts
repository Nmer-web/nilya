import { attributeFieldsFor } from '@/config/categoryAttributes';
import type { ListingDraft } from '@/features/sell/draft';
import { ISO_3166_1_ALPHA_2 } from '@/lib/countries';
import type { LocalListingPhoto } from '@/lib/listing-photos';
import { parseEuroCents } from '@/lib/listing-publication';

export const SELL_STEP_COUNT = 6;
export type SellStep = 1 | 2 | 3 | 4 | 5 | 6;

export const TITLE_MIN = 5;
export const TITLE_MAX = 80;
export const BRAND_MAX = 60;
export const DESCRIPTION_MAX = 1000;
export const PHOTO_MAX = 8;

/** Errors keyed by the field they belong to, for inline placement. */
export type StepErrors = Partial<Record<string, string>>;

const COUNTRY_CODES = new Set(ISO_3166_1_ALPHA_2);

function priceCents(value: string): number | null {
  try {
    return parseEuroCents(value);
  } catch {
    return null;
  }
}

/**
 * What stops each step from continuing.
 *
 * Pure: the same draft always yields the same errors, so the footer button and
 * the inline messages can never disagree. Step 6 is the whole listing.
 */
export function validateStepFields(
  step: SellStep,
  draft: ListingDraft,
  photos: readonly LocalListingPhoto[]
): StepErrors {
  const errors: StepErrors = {};

  const checkPhotos = () => {
    if (photos.length === 0) errors.photos = 'Add at least 1 photo.';
    else if (photos.length > PHOTO_MAX) errors.photos = `Keep it to ${PHOTO_MAX} photos.`;
    else if (photos.some((photo) => photo.state === 'error')) errors.photos = 'Remove or retry the photos that could not be prepared.';
    else if (photos.some((photo) => photo.state !== 'ready' || !photo.prepared)) errors.photos = 'Wait for every photo to finish preparing.';
  };

  const checkDetails = () => {
    const title = draft.title.trim();
    if (title.length < TITLE_MIN) errors.title = `Give it a title of at least ${TITLE_MIN} characters.`;
    else if (title.length > TITLE_MAX) errors.title = `Keep the title under ${TITLE_MAX} characters.`;
    if (draft.brand.trim().length > BRAND_MAX) errors.brand = `Keep the brand under ${BRAND_MAX} characters.`;
    if (draft.description.length > DESCRIPTION_MAX) errors.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;
  };

  const checkCategory = () => {
    if (!draft.categorySlug) errors.category = 'Choose a category.';
  };

  const checkAttributes = () => {
    for (const field of attributeFieldsFor(draft.categorySlug)) {
      if (field.required && !draft.attributes[field.key]?.trim()) {
        errors[field.key] = `Choose a ${field.label.toLowerCase()}.`;
      }
    }
  };

  const checkPricing = () => {
    const price = priceCents(draft.price);
    if (price === null) errors.price = 'Enter a price above zero, with at most two decimals.';
    if (draft.originalPrice.trim()) {
      const original = priceCents(draft.originalPrice);
      if (original === null) errors.originalPrice = 'Enter the original price with at most two decimals.';
      else if (price !== null && original <= price) errors.originalPrice = 'The original price has to be higher than the price.';
    }
    if (!draft.countryCode || !COUNTRY_CODES.has(draft.countryCode)) errors.countryCode = 'Choose the country the product ships from.';
  };

  switch (step) {
    case 1:
      checkPhotos();
      break;
    case 2:
      checkDetails();
      break;
    case 3:
      checkCategory();
      break;
    case 4:
      checkAttributes();
      break;
    case 5:
      checkPricing();
      break;
    case 6:
      checkPhotos();
      checkDetails();
      checkCategory();
      checkAttributes();
      checkPricing();
      break;
  }

  return errors;
}

/** The same checks as messages, in the order the fields appear. */
export function validateStep(
  step: SellStep,
  draft: ListingDraft,
  photos: readonly LocalListingPhoto[]
): string[] {
  return Object.values(validateStepFields(step, draft, photos)).filter(
    (message): message is string => typeof message === 'string'
  );
}

/** The first step that still has errors, for the review screen's edit links. */
export function firstIncompleteStep(
  draft: ListingDraft,
  photos: readonly LocalListingPhoto[]
): SellStep | null {
  for (const step of [1, 2, 3, 4, 5] as const) {
    if (validateStep(step, draft, photos).length > 0) return step;
  }
  return null;
}

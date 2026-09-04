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
    if ((draft.listingType === 'job' || draft.listingType === 'service') && !draft.description.trim()) {
      errors.description = 'Add a clear description.';
    }
    if (draft.detailKind === 'perfume' && !draft.brand.trim()) errors.brand = 'Add the perfume brand.';
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

    const positive = (value: string) => {
      const normalized = value.trim().replace(',', '.');
      return /^\d+(?:\.\d{1,3})?$/.test(normalized) && Number(normalized) > 0;
    };
    const today = new Date().toISOString().slice(0, 10);
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today;

    if (draft.detailKind === 'food') {
      const food = draft.specialized.food;
      if (!food.priceUnit) errors.priceUnit = 'Choose how this food is priced.';
      if (!positive(food.quantity)) errors.quantity = 'Enter a quantity above zero.';
      if (!food.ingredients.trim()) errors.ingredients = 'List the ingredients.';
      if (!food.allergens.trim()) errors.allergens = 'State the allergens, or enter “None known”.';
      if (!validDate(food.expiryDate)) errors.expiryDate = 'Choose today or a future expiry date.';
      if (!food.halalStatus) errors.halalStatus = 'Choose a halal status.';
      if (!food.preparationType) errors.preparationType = 'Choose homemade or packaged.';
      if (!food.storageRequirements.trim()) errors.storageRequirements = 'Add storage requirements.';
      if (!food.deliveryRequirements.trim()) errors.deliveryRequirements = 'Add delivery requirements.';
    } else if (draft.detailKind === 'perfume') {
      const perfume = draft.specialized.perfume;
      if (!perfume.fragranceName.trim()) errors.fragranceName = 'Add the fragrance name.';
      if (!perfume.fragranceType) errors.fragranceType = 'Choose a fragrance type.';
      if (!positive(perfume.volumeMl)) errors.volumeMl = 'Enter a volume above zero.';
      if (!perfume.authenticityDeclared) errors.authenticityDeclared = 'Confirm the authenticity declaration.';
      if (!perfume.fragranceNotes.trim()) errors.fragranceNotes = 'Add the fragrance notes.';
      if (!perfume.targetAudience) errors.targetAudience = 'Choose a target audience.';
    } else if (draft.detailKind === 'job') {
      const job = draft.specialized.job;
      if (!job.employer.trim()) errors.employer = 'Add the employer.';
      if (!job.sector.trim()) errors.sector = 'Add the sector.';
      if (!job.contractType) errors.contractType = 'Choose a contract type.';
      if (!job.schedule.trim()) errors.schedule = 'Add the work schedule.';
      if (!job.workMode) errors.workMode = 'Choose a work mode.';
      if (!job.location.trim()) errors.location = 'Add the job location.';
      if (!job.requiredExperience.trim()) errors.requiredExperience = 'Add the required experience.';
      if (!job.applicationMethod) errors.applicationMethod = 'Choose an application method.';
      if (!validDate(job.applicationDeadline)) errors.applicationDeadline = 'Choose today or a future deadline.';
      const target = job.applicationValue.trim();
      if (job.applicationMethod === 'external_url' && !/^https:\/\/\S+$/i.test(target)) {
        errors.applicationValue = 'Enter a complete https:// application URL.';
      } else if (job.applicationMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
        errors.applicationValue = 'Enter a valid application email.';
      } else if (job.applicationMethod === 'phone' && !/^\+?[0-9][0-9 ()-]{5,24}$/.test(target)) {
        errors.applicationValue = 'Enter a valid application phone number.';
      }
    } else if (draft.detailKind === 'service') {
      const service = draft.specialized.service;
      if (!service.pricingMode) errors.pricingMode = 'Choose a pricing mode.';
      if (!service.serviceArea.trim()) errors.serviceArea = 'Add the service area.';
      if (!service.deliveryMode) errors.deliveryMode = 'Choose how the service is delivered.';
      if (!service.availability.trim()) errors.availability = 'Add your availability.';
      if (!service.experience.trim()) errors.experience = 'Describe your experience.';
    }
  };

  const checkPricing = () => {
    const job = draft.specialized.job;
    const service = draft.specialized.service;
    const priceRequired = draft.listingType !== 'job' && service.pricingMode !== 'quote';
    const price = priceRequired ? priceCents(draft.price) : null;
    if (priceRequired && price === null) errors.price = 'Enter a price above zero, with at most two decimals.';
    if (draft.listingType !== 'job' && service.pricingMode !== 'quote' && draft.originalPrice.trim()) {
      const original = priceCents(draft.originalPrice);
      if (original === null) errors.originalPrice = 'Enter the original price with at most two decimals.';
      else if (price !== null && original <= price) errors.originalPrice = 'The original price has to be higher than the price.';
    }
    if (draft.listingType === 'job') {
      const minimum = priceCents(job.salaryMin);
      const maximum = priceCents(job.salaryMax);
      if (minimum === null) errors.salaryMin = 'Enter the minimum salary.';
      if (maximum === null) errors.salaryMax = 'Enter the maximum salary.';
      else if (minimum !== null && maximum < minimum) errors.salaryMax = 'Maximum salary must be at least the minimum.';
    }
    if (!draft.countryCode || !COUNTRY_CODES.has(draft.countryCode)) {
      errors.countryCode = draft.listingType === 'job'
        ? 'Choose the job country.'
        : draft.listingType === 'service'
          ? 'Choose the provider country.'
          : 'Choose the country the product ships from.';
    }
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

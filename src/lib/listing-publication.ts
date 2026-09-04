import { ISO_3166_1_ALPHA_2 } from '@/lib/countries';
import type { ListingType } from '@/lib/database.types';
import type { SpecializedDraft } from '@/features/sell/draft';
import type { ListingDetailKind } from '@/lib/listing-types';
import { isCanonicalListing } from '@/lib/listing-types';
import {
  LISTING_PHOTO_LIMIT,
  LISTING_PHOTO_MAX_BYTES,
  LISTING_PHOTO_MIME,
  readPreparedPhotoBytes,
  type LocalListingPhoto,
} from '@/lib/listing-photos';
import {
  clearPublicationRecovery,
  savePublicationStartGuard,
  savePublicationRecovery,
  type PublicationRecoveryRecordV1,
} from '@/lib/listing-recovery';
import {
  activateDraftListing,
  createDraftListing,
  deleteOwnerDraft,
  insertListingImage,
  listListingObjectPaths,
  ListingError,
  removeListingObjects,
  requireAuthenticatedListingSeller,
  uploadListingObject,
  type AuthenticatedListingSeller,
  type ListingDraftInput,
} from '@/lib/mutations';
import { fetchOwnerPublicationState, type OwnerPublicationState } from '@/lib/queries';

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 4000;
const POSTGRES_INTEGER_MAX = 2_147_483_647;
const COUNTRY_CODES = new Set(ISO_3166_1_ALPHA_2);

export type PublishListingForm = {
  title: string;
  categorySlug: string;
  brand: string;
  color: string;
  size: string;
  description: string;
  price: string;
  /** Optional; when present it must sit above `price`, as `price_drop_is_a_drop` requires. */
  originalPrice?: string;
  city: string;
  countryCode: string;
  currency: string;
  listingType: ListingType;
  detailKind: ListingDetailKind;
  specialized: SpecializedDraft;
};

export type PublicationPhase =
  | { kind: 'validating' }
  | { kind: 'preparing'; current: number; total: number }
  | { kind: 'creating-draft' }
  | { kind: 'uploading'; current: number; total: number }
  | { kind: 'activating' }
  | { kind: 'confirming' }
  | { kind: 'cleaning-up' };

export type PublicationOutcome =
  | { kind: 'success'; listingId: string }
  | ({ kind: 'failed-clean'; message: string } & PublicationFailureContext)
  | ({
      kind: 'recovery-required';
      listingId: string;
      message: string;
      recoveryRecord: PublicationRecoveryRecordV1;
    } & PublicationFailureContext)
  | ({ kind: 'integrity-error'; listingId: string | null; message: string } & PublicationFailureContext)
  | ({ kind: 'session-required'; message: string } & PublicationFailureContext);

export type PublicationFailureStage =
  | 'validation'
  | 'session'
  | 'profile'
  | 'draft'
  | 'journal'
  | 'photo-read'
  | 'upload'
  | 'image-row'
  | 'activation'
  | 'confirmation'
  | 'cleanup'
  | 'integrity';

export type PublicationFailureAction =
  | 'retry-publication'
  | 'review-photo'
  | 'edit-profile'
  | 'sign-in'
  | 'retry-recovery'
  | 'contact-support';

export type PublicationFailureContext = {
  stage: PublicationFailureStage;
  action: PublicationFailureAction;
  photoPosition?: number;
};

export type CleanupOutcome =
  | { kind: 'clean' }
  | { kind: 'incomplete'; remainingPaths: string[]; message: string }
  | { kind: 'active'; message: string }
  | { kind: 'integrity-error'; message: string };

export type FaultBoundary =
  | 'photo-read'
  | 'before-upload'
  | 'after-object-upload-before-row'
  | 'before-activation'
  | 'after-activation-before-response'
  | 'before-confirmation'
  | 'before-object-removal';

export type PublicationFaultController = {
  reach(boundary: FaultBoundary, context: { listingId?: string; index?: number }): void | Promise<void>;
};

const NO_FAULTS: PublicationFaultController = { reach: () => undefined };

export type PublicationDependencies = {
  requireSeller: typeof requireAuthenticatedListingSeller;
  createDraft: typeof createDraftListing;
  readBytes: typeof readPreparedPhotoBytes;
  uploadObject: typeof uploadListingObject;
  insertImage: typeof insertListingImage;
  activateDraft: typeof activateDraftListing;
  fetchState: typeof fetchOwnerPublicationState;
  removeObjects: typeof removeListingObjects;
  listObjects: typeof listListingObjectPaths;
  deleteDraft: typeof deleteOwnerDraft;
  saveRecovery: typeof savePublicationRecovery;
  saveStartGuard: typeof savePublicationStartGuard;
  clearRecovery: typeof clearPublicationRecovery;
};

const DEFAULT_DEPENDENCIES: PublicationDependencies = {
  requireSeller: requireAuthenticatedListingSeller,
  createDraft: createDraftListing,
  readBytes: readPreparedPhotoBytes,
  uploadObject: uploadListingObject,
  insertImage: insertListingImage,
  activateDraft: activateDraftListing,
  fetchState: fetchOwnerPublicationState,
  removeObjects: removeListingObjects,
  listObjects: listListingObjectPaths,
  deleteDraft: deleteOwnerDraft,
  saveRecovery: savePublicationRecovery,
  saveStartGuard: savePublicationStartGuard,
  clearRecovery: clearPublicationRecovery,
};

export class PublicationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicationValidationError';
  }
}

function actionForStage(
  stage: PublicationFailureStage,
  error?: unknown
): PublicationFailureAction {
  if (stage === 'session') return 'sign-in';
  if (stage === 'photo-read') return 'review-photo';
  if (stage === 'profile' && error instanceof ListingError && error.message.includes('required')) {
    return 'edit-profile';
  }
  if (stage === 'confirmation' || stage === 'cleanup') return 'retry-recovery';
  if (stage === 'integrity' || stage === 'journal') return 'contact-support';
  return 'retry-publication';
}

function stageForError(
  error: unknown,
  fallback: PublicationFailureStage
): PublicationFailureStage {
  if (!(error instanceof ListingError)) return fallback;
  switch (error.code) {
    case 'session-required': return 'session';
    case 'profile-required': return 'profile';
    case 'draft-create-failed': return 'draft';
    case 'object-upload-failed': return 'upload';
    case 'image-row-failed': return 'image-row';
    case 'activation-failed': return 'activation';
    case 'object-remove-failed':
    case 'draft-delete-failed':
    case 'object-list-failed':
      return 'cleanup';
  }
}

function safeFailure(
  error: unknown,
  fallbackStage: PublicationFailureStage,
  photoPosition?: number
): PublicationFailureContext & { message: string } {
  const stage = stageForError(error, fallbackStage);
  const photo = photoPosition ? `Photo ${photoPosition}` : 'A photo';
  let message: string;
  switch (stage) {
    case 'validation':
      message = error instanceof PublicationValidationError
        ? error.message
        : 'Review the listing details and try again.';
      break;
    case 'session':
      message = 'Your session expired. Sign in again to continue.';
      break;
    case 'profile':
      message = error instanceof ListingError && error.message.includes('required')
        ? 'A real seller profile is required before publication. Open your profile to continue.'
        : 'Your seller profile could not be checked. Try again.';
      break;
    case 'draft':
      message = 'The private listing draft could not be created. Check your connection and try again.';
      break;
    case 'journal':
      message = 'The private draft could not be journaled safely. No upload started; cleanup must finish before another publication.';
      break;
    case 'photo-read':
      message = `${photo} is no longer readable. Remove it and select it again.`;
      break;
    case 'upload':
      message = `${photo} could not be uploaded. NILYA will clean up before you retry.`;
      break;
    case 'image-row':
      message = `${photo} uploaded, but its listing record could not be created. NILYA will clean up before you retry.`;
      break;
    case 'activation':
      message = 'The listing could not be activated. NILYA will confirm cleanup before you retry.';
      break;
    case 'confirmation':
      message = 'NILYA could not confirm whether publication completed. Retry recovery; do not publish again.';
      break;
    case 'cleanup':
      message = 'Publication failed and cleanup could not be confirmed. The draft remains private; retry cleanup.';
      break;
    case 'integrity':
      message = 'Publication state did not match the expected listing. Nothing active was deleted; return Home and review your listings before trying again.';
      break;
  }
  return { stage, action: actionForStage(stage, error), photoPosition, message };
}

export function parseEuroCents(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new PublicationValidationError('Enter a price with no more than two decimal places.');
  }
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > POSTGRES_INTEGER_MAX) {
    throw new PublicationValidationError('Enter a valid price above zero.');
  }
  return cents;
}

export function normalizePublishForm(form: PublishListingForm): ListingDraftInput {
  const title = form.title.trim();
  const description = form.description.trim();
  const brand = form.brand.trim();
  const color = form.color.trim();
  const size = form.size.trim();
  const categorySlug = form.categorySlug.trim();
  const city = form.city.trim();
  const countryCode = form.countryCode.trim().toUpperCase();
  const currency = form.currency.trim().toUpperCase();

  if (!title || title.length > TITLE_MAX) {
    throw new PublicationValidationError(`Title must be between 1 and ${TITLE_MAX} characters.`);
  }
  if (!categorySlug) throw new PublicationValidationError('Choose a category from NILYA.');
  if (description.length > DESCRIPTION_MAX) {
    throw new PublicationValidationError(`Description must be ${DESCRIPTION_MAX} characters or fewer.`);
  }
  if (!COUNTRY_CODES.has(countryCode)) {
    throw new PublicationValidationError('Choose a valid country.');
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new PublicationValidationError('The marketplace currency is not valid.');
  }

  const quoteService = form.listingType === 'service' && form.specialized.service.pricingMode === 'quote';
  const priceCents = form.listingType === 'job' || quoteService ? null : parseEuroCents(form.price);
  const originalPriceCents = form.listingType === 'product' && form.originalPrice?.trim()
    ? parseEuroCents(form.originalPrice)
    : null;
  if (originalPriceCents !== null && (priceCents === null || originalPriceCents <= priceCents)) {
    throw new PublicationValidationError('The original price has to be higher than the price.');
  }

  return {
    title,
    categorySlug,
    brand: form.detailKind === 'product' || form.detailKind === 'food' || form.detailKind === 'perfume'
      ? brand || null
      : null,
    color: form.listingType === 'product' ? color || null : null,
    size: form.listingType === 'product' ? size || null : null,
    description: description || null,
    priceCents,
    originalPriceCents,
    currency,
    listingType: form.listingType,
    city: city || null,
    countryCode,
    details: normalizeSpecializedDetails(form, brand, currency),
  };
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new PublicationValidationError(`${label} is required.`);
  return normalized;
}

function positiveDecimal(value: string, label: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized) || Number(normalized) <= 0) {
    throw new PublicationValidationError(`${label} must be above zero.`);
  }
  return Number(normalized);
}

function requiredChoice<T extends string>(value: T | '', label: string): T {
  if (!value) throw new PublicationValidationError(`${label} is required.`);
  return value;
}

function normalizeSpecializedDetails(
  form: PublishListingForm,
  brand: string,
  currency: string
): ListingDraftInput['details'] {
  if (form.detailKind === 'product') return { kind: 'product' };

  if (form.detailKind === 'food') {
    const food = form.specialized.food;
    return {
      kind: 'food',
      values: {
        price_unit: requiredChoice(food.priceUnit, 'Price unit'),
        quantity: positiveDecimal(food.quantity, 'Quantity'),
        ingredients: required(food.ingredients, 'Ingredients'),
        allergens: required(food.allergens, 'Allergens'),
        expiry_date: required(food.expiryDate, 'Expiry date'),
        halal_status: requiredChoice(food.halalStatus, 'Halal status'),
        preparation_type: requiredChoice(food.preparationType, 'Preparation type'),
        storage_requirements: required(food.storageRequirements, 'Storage requirements'),
        delivery_requirements: required(food.deliveryRequirements, 'Delivery requirements'),
      },
    };
  }

  if (form.detailKind === 'perfume') {
    const perfume = form.specialized.perfume;
    if (!perfume.authenticityDeclared) {
      throw new PublicationValidationError('Confirm the authenticity declaration.');
    }
    return {
      kind: 'perfume',
      values: {
        brand: required(brand, 'Brand'),
        fragrance_name: required(perfume.fragranceName, 'Fragrance name'),
        fragrance_type: requiredChoice(perfume.fragranceType, 'Fragrance type'),
        volume_ml: positiveDecimal(perfume.volumeMl, 'Volume'),
        sealed: perfume.sealed,
        authenticity_declared: true,
        fragrance_notes: required(perfume.fragranceNotes, 'Fragrance notes'),
        target_audience: requiredChoice(perfume.targetAudience, 'Target audience'),
      },
    };
  }

  if (form.detailKind === 'job') {
    const job = form.specialized.job;
    const method = requiredChoice(job.applicationMethod, 'Application method');
    const target = job.applicationValue.trim();
    if (method === 'external_url' && !/^https:\/\/\S+$/i.test(target)) {
      throw new PublicationValidationError('Enter a complete application URL.');
    }
    if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      throw new PublicationValidationError('Enter a valid application email.');
    }
    if (method === 'phone' && !/^\+?[0-9][0-9 ()-]{5,24}$/.test(target)) {
      throw new PublicationValidationError('Enter a valid application phone number.');
    }
    return {
      kind: 'job',
      values: {
        employer: required(job.employer, 'Employer'),
        sector: required(job.sector, 'Sector'),
        contract_type: requiredChoice(job.contractType, 'Contract type'),
        schedule: required(job.schedule, 'Schedule'),
        work_mode: requiredChoice(job.workMode, 'Work mode'),
        location: required(job.location, 'Location'),
        salary_min_cents: parseEuroCents(job.salaryMin),
        salary_max_cents: parseEuroCents(job.salaryMax),
        salary_currency: currency,
        required_experience: required(job.requiredExperience, 'Required experience'),
        application_method: method,
        application_value: method === 'in_app' ? null : target,
        application_deadline: required(job.applicationDeadline, 'Application deadline'),
      },
    };
  }

  const service = form.specialized.service;
  return {
    kind: 'service',
    values: {
      pricing_mode: requiredChoice(service.pricingMode, 'Pricing mode'),
      service_area: required(service.serviceArea, 'Service area'),
      delivery_mode: requiredChoice(service.deliveryMode, 'Delivery mode'),
      availability: required(service.availability, 'Availability'),
      experience: required(service.experience, 'Experience'),
    },
  };
}

function validatePhotos(photos: readonly LocalListingPhoto[]): void {
  if (photos.length < 1 || photos.length > LISTING_PHOTO_LIMIT) {
    throw new PublicationValidationError(`Add between 1 and ${LISTING_PHOTO_LIMIT} photos.`);
  }
  for (const photo of photos) {
    if (photo.state !== 'ready' || !photo.prepared) {
      throw new PublicationValidationError('Wait for every photo to finish preparing or remove failed photos.');
    }
    if (
      photo.prepared.mimeType !== LISTING_PHOTO_MIME ||
      photo.prepared.byteLength <= 0 ||
      photo.prepared.byteLength > LISTING_PHOTO_MAX_BYTES ||
      photo.prepared.width <= 0 ||
      photo.prepared.height <= 0
    ) {
      throw new PublicationValidationError('One prepared photo is not valid for upload.');
    }
  }
}

function intendedPaths(listingId: string, count: number): string[] {
  const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return Array.from({ length: count }, (_, index) => `${listingId}/${index}-${nonce}-${index}.jpg`);
}

function stateMatchesExpected(
  state: OwnerPublicationState,
  sellerId: string,
  paths: readonly string[]
): boolean {
  return (
    state.seller_id === sellerId &&
    state.status === 'active' &&
    isCanonicalListing(state.listing_type, state.condition) &&
    state.published_at !== null &&
    state.images.length === paths.length &&
    state.images.every(
      (image, index) =>
        image.position === index && image.storage_path === paths[index] && image.width !== null && image.height !== null
    )
  );
}

async function safeFetchState(
  listingId: string,
  dependencies: PublicationDependencies
): Promise<{ kind: 'available'; state: OwnerPublicationState | null } | { kind: 'unavailable' }> {
  try {
    return { kind: 'available', state: await dependencies.fetchState(listingId) };
  } catch {
    return { kind: 'unavailable' };
  }
}

async function cleanupDraft(
  record: PublicationRecoveryRecordV1,
  dependencies: PublicationDependencies,
  faults: PublicationFaultController,
  onPhase?: (phase: PublicationPhase) => void
): Promise<CleanupOutcome> {
  onPhase?.({ kind: 'cleaning-up' });
  try {
    await dependencies.saveRecovery({
      sellerId: record.sellerId,
      listingId: record.listingId,
      intendedPaths: record.intendedPaths,
      stage: 'cleanup-required',
    });
  } catch {
    // A prior journal already contains the same exact paths. Continue the
    // in-process cleanup; remote safety must not depend on a second local write.
  }

  try {
    await faults.reach('before-object-removal', { listingId: record.listingId });
    await dependencies.removeObjects(record.intendedPaths);
    const remaining = (await dependencies.listObjects(record.listingId)).filter((path) =>
      record.intendedPaths.includes(path)
    );
    if (remaining.length > 0) {
      return {
        kind: 'incomplete',
        remainingPaths: remaining,
        message: 'Some uploaded photos still need cleanup. NILYA kept the draft private and will retry.',
      };
    }
  } catch {
    return {
      kind: 'incomplete',
      remainingPaths: [...record.intendedPaths],
      message: 'Photo cleanup could not be confirmed. NILYA kept the draft private and will retry.',
    };
  }

  const beforeDelete = await safeFetchState(record.listingId, dependencies);
  if (beforeDelete.kind === 'unavailable') {
    return {
      kind: 'incomplete',
      remainingPaths: [],
      message: 'Photo cleanup finished, but the private draft could not be checked yet.',
    };
  }
  if (beforeDelete.state === null) {
    try { await dependencies.clearRecovery(record.sellerId); } catch { /* remote state is already clean */ }
    return { kind: 'clean' };
  }
  if (beforeDelete.state.seller_id !== record.sellerId) {
    return { kind: 'integrity-error', message: 'The saved draft does not belong to this seller.' };
  }
  if (beforeDelete.state.status === 'active') {
    return { kind: 'active', message: 'The listing is active and was not deleted.' };
  }
  if (beforeDelete.state.status !== 'draft') {
    return { kind: 'integrity-error', message: 'The saved listing is no longer a recoverable draft.' };
  }

  try {
    const deleted = await dependencies.deleteDraft(record.listingId);
    if (!deleted) {
      const afterDelete = await safeFetchState(record.listingId, dependencies);
      if (afterDelete.kind === 'available' && afterDelete.state === null) {
        try { await dependencies.clearRecovery(record.sellerId); } catch { /* remote state is already clean */ }
        return { kind: 'clean' };
      }
      return {
        kind: 'incomplete',
        remainingPaths: [],
        message: 'Photos were removed, but the private draft still needs cleanup.',
      };
    }
    try { await dependencies.clearRecovery(record.sellerId); } catch { /* retry on the next Sell entry */ }
    return { kind: 'clean' };
  } catch {
    return {
      kind: 'incomplete',
      remainingPaths: [],
      message: 'Photos were removed, but the private draft still needs cleanup.',
    };
  }
}

export async function resumePublicationRecovery(
  record: PublicationRecoveryRecordV1,
  options: {
    dependencies?: PublicationDependencies;
    faults?: PublicationFaultController;
    onPhase?: (phase: PublicationPhase) => void;
  } = {}
): Promise<PublicationOutcome> {
  const dependencies = options.dependencies ?? DEFAULT_DEPENDENCIES;
  const faults = options.faults ?? NO_FAULTS;
  const stateResult = await safeFetchState(record.listingId, dependencies);
  if (stateResult.kind === 'unavailable') {
    return {
      kind: 'recovery-required',
      listingId: record.listingId,
      message: 'NILYA cannot confirm the previous publication yet. Check your connection and retry.',
      recoveryRecord: record,
      stage: 'confirmation',
      action: 'retry-recovery',
    };
  }
  const state = stateResult.state;
  if (state === null) {
    try { await dependencies.clearRecovery(record.sellerId); } catch { /* remote state is already clean */ }
    return { kind: 'failed-clean', message: 'The previous private draft is already cleared.', stage: 'cleanup', action: 'retry-publication' };
  }
  if (state.seller_id !== record.sellerId) {
    return { kind: 'integrity-error', listingId: record.listingId, message: 'Recovery ownership did not match.', stage: 'integrity', action: 'contact-support' };
  }
  if (stateMatchesExpected(state, record.sellerId, record.intendedPaths)) {
    try { await dependencies.clearRecovery(record.sellerId); } catch { /* retry on the next Sell entry */ }
    return { kind: 'success', listingId: record.listingId };
  }
  if (state.status === 'active') {
    return {
      kind: 'integrity-error',
      listingId: record.listingId,
      message: 'The listing is active, but its publication data is incomplete. It was not deleted.',
      stage: 'integrity',
      action: 'contact-support',
    };
  }
  if (state.status !== 'draft') {
    return {
      kind: 'integrity-error',
      listingId: record.listingId,
      message: 'The previous listing is not in a recoverable state.',
      stage: 'integrity',
      action: 'contact-support',
    };
  }

  const cleanup = await cleanupDraft(record, dependencies, faults, options.onPhase);
  if (cleanup.kind === 'clean') {
    return { kind: 'failed-clean', message: 'The previous private draft was safely cleared.', stage: 'cleanup', action: 'retry-publication' };
  }
  if (cleanup.kind === 'active') {
    return { kind: 'recovery-required', listingId: record.listingId, message: cleanup.message, recoveryRecord: record, stage: 'confirmation', action: 'retry-recovery' };
  }
  if (cleanup.kind === 'integrity-error') {
    return { kind: 'integrity-error', listingId: record.listingId, message: cleanup.message, stage: 'integrity', action: 'contact-support' };
  }
  return { kind: 'recovery-required', listingId: record.listingId, message: cleanup.message, recoveryRecord: record, stage: 'cleanup', action: 'retry-recovery' };
}

export async function publishRealListing(
  form: PublishListingForm,
  photos: readonly LocalListingPhoto[],
  options: {
    dependencies?: PublicationDependencies;
    faults?: PublicationFaultController;
    onPhase?: (phase: PublicationPhase) => void;
  } = {}
): Promise<PublicationOutcome> {
  const dependencies = options.dependencies ?? DEFAULT_DEPENDENCIES;
  const faults = options.faults ?? NO_FAULTS;
  const onPhase = options.onPhase;
  let seller: AuthenticatedListingSeller | null = null;
  let listingId: string | null = null;
  let record: PublicationRecoveryRecordV1 | null = null;
  let activationAttempted = false;
  let failureStage: PublicationFailureStage = 'validation';
  let failurePhotoPosition: number | undefined;

  try {
    onPhase?.({ kind: 'validating' });
    const draftInput = normalizePublishForm(form);
    validatePhotos(photos);
    failureStage = 'session';
    seller = await dependencies.requireSeller();

    // Re-read every prepared URI before creating server state. This catches a
    // revoked blob or evicted native cache file while there is still no draft.
    for (let index = 0; index < photos.length; index += 1) {
      failureStage = 'photo-read';
      failurePhotoPosition = index + 1;
      onPhase?.({ kind: 'preparing', current: index + 1, total: photos.length });
      await faults.reach('photo-read', { index });
      const prepared = photos[index].prepared!;
      const bytes = await dependencies.readBytes(prepared.uri);
      if (bytes.byteLength !== prepared.byteLength || bytes.byteLength > LISTING_PHOTO_MAX_BYTES) {
        throw new PublicationValidationError('A prepared photo changed or is no longer readable. Prepare it again.');
      }
    }

    // A small owner-scoped guard exists before the server draft does. The
    // exact journal replaces it after draft creation. If the process stops in
    // between, the next Sell entry remains fail-closed instead of treating the
    // missing exact journal as permission to create another draft.
    failureStage = 'journal';
    await dependencies.saveStartGuard(seller.id);

    onPhase?.({ kind: 'creating-draft' });
    failureStage = 'draft';
    failurePhotoPosition = undefined;
    listingId = await dependencies.createDraft(seller, draftInput);
    const paths = intendedPaths(listingId, photos.length);
    record = {
      version: 1,
      sellerId: seller.id,
      listingId,
      intendedPaths: paths,
      stage: 'draft-created',
      updatedAt: new Date().toISOString(),
    };
    failureStage = 'journal';
    record = await dependencies.saveRecovery({
      sellerId: seller.id,
      listingId,
      intendedPaths: paths,
      stage: 'draft-created',
    });

    for (let index = 0; index < photos.length; index += 1) {
      failurePhotoPosition = index + 1;
      onPhase?.({ kind: 'uploading', current: index + 1, total: photos.length });
      failureStage = 'journal';
      await dependencies.saveRecovery({
        sellerId: seller.id,
        listingId,
        intendedPaths: paths,
        stage: 'uploading',
      });
      failureStage = 'upload';
      await faults.reach('before-upload', { listingId, index });
      failureStage = 'photo-read';
      const prepared = photos[index].prepared!;
      const bytes = await dependencies.readBytes(prepared.uri);
      if (bytes.byteLength !== prepared.byteLength) {
        throw new PublicationValidationError('A prepared photo changed before upload.');
      }
      failureStage = 'upload';
      await dependencies.uploadObject(paths[index], bytes);
      failureStage = 'image-row';
      await faults.reach('after-object-upload-before-row', { listingId, index });
      await dependencies.insertImage({
        listingId,
        path: paths[index],
        position: index,
        width: prepared.width,
        height: prepared.height,
      });
    }

    onPhase?.({ kind: 'activating' });
    failurePhotoPosition = undefined;
    failureStage = 'journal';
    await dependencies.saveRecovery({
      sellerId: seller.id,
      listingId,
      intendedPaths: paths,
      stage: 'activating',
    });
    failureStage = 'activation';
    await faults.reach('before-activation', { listingId });
    activationAttempted = true;
    await dependencies.activateDraft(listingId);
    await faults.reach('after-activation-before-response', { listingId });

    onPhase?.({ kind: 'confirming' });
    failureStage = 'journal';
    await dependencies.saveRecovery({
      sellerId: seller.id,
      listingId,
      intendedPaths: paths,
      stage: 'confirming',
    });
    failureStage = 'confirmation';
    await faults.reach('before-confirmation', { listingId });
    const confirmed = await dependencies.fetchState(listingId);
    if (!confirmed || !stateMatchesExpected(confirmed, seller.id, paths)) {
      if (confirmed?.status === 'active') {
        return {
          kind: 'integrity-error',
          listingId,
          message: 'The listing activated, but its persisted publication data is incomplete. It was not deleted.',
          stage: 'integrity',
          action: 'contact-support',
        };
      }
      throw new Error('Publication confirmation did not match the draft.');
    }
    try { await dependencies.clearRecovery(seller.id); } catch { /* publication is authoritatively confirmed */ }
    return { kind: 'success', listingId };
  } catch (error) {
    const failure = safeFailure(error, failureStage, failurePhotoPosition);
    if (!listingId) {
      if (failure.stage === 'session') return { kind: 'session-required', ...failure };
      if (seller) {
        try {
          await dependencies.clearRecovery(seller.id);
        } catch {
          return {
            kind: 'integrity-error',
            listingId: null,
            message: 'Publication did not create a listing, but its local safety guard could not be cleared. Retry the recovery check before publishing again.',
            stage: 'journal',
            action: 'contact-support',
          };
        }
      }
      if (failure.stage === 'journal') {
        return {
          kind: 'failed-clean',
          message: 'Publication could not begin safely. No listing was created; retry publication.',
          stage: 'journal',
          action: 'retry-publication',
        };
      }
      return { kind: 'failed-clean', ...failure };
    }

    // The in-memory record is constructed before the first durable journal
    // write. If AsyncStorage fails, this exact attempt remains retryable in the
    // mounted composer and no "no journal" reload may silently unblock Sell.
    if (!record) throw new Error('Publication recovery record was not constructed.');

    if (activationAttempted) {
      const reconciled = await resumePublicationRecovery(record, { dependencies, faults, onPhase });
      if (reconciled.kind === 'success') return reconciled;
      if (reconciled.kind === 'recovery-required' && reconciled.stage === 'cleanup') {
        return {
          ...reconciled,
          message: `${failure.message} ${reconciled.message}`,
          photoPosition: failure.photoPosition,
        };
      }
      if (reconciled.kind !== 'failed-clean') return reconciled;
      return { ...reconciled, ...failure, action: 'retry-publication' };
    }

    const cleanup = await cleanupDraft(record, dependencies, faults, onPhase);
    if (cleanup.kind === 'clean') return { kind: 'failed-clean', ...failure, action: 'retry-publication' };
    if (cleanup.kind === 'integrity-error') {
      return { kind: 'integrity-error', listingId, message: cleanup.message, stage: 'integrity', action: 'contact-support' };
    }
    return {
      kind: 'recovery-required',
      listingId,
      message: `${failure.message} ${cleanup.message}`,
      recoveryRecord: record,
      stage: cleanup.kind === 'active' ? 'confirmation' : failure.stage,
      action: 'retry-recovery',
      photoPosition: failure.photoPosition,
    };
  }
}

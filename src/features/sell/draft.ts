import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AttributeKey } from '@/config/categoryAttributes';
import type { ListingDetailKind } from '@/lib/listing-types';
import type { ListingType } from '@/lib/database.types';

export type FoodDraft = {
  priceUnit: '' | 'item' | 'kg' | 'g' | 'litre' | 'ml' | 'pack' | 'dozen';
  quantity: string;
  ingredients: string;
  allergens: string;
  expiryDate: string;
  halalStatus: '' | 'halal' | 'not_halal' | 'not_specified';
  preparationType: '' | 'homemade' | 'packaged';
  storageRequirements: string;
  deliveryRequirements: string;
};

export type PerfumeDraft = {
  fragranceName: string;
  fragranceType: '' | 'parfum' | 'eau_de_parfum' | 'eau_de_toilette' | 'cologne' | 'perfume_oil' | 'attar' | 'oud' | 'incense' | 'bakhoor' | 'other';
  volumeMl: string;
  sealed: boolean;
  authenticityDeclared: boolean;
  fragranceNotes: string;
  targetAudience: '' | 'women' | 'men' | 'unisex' | 'kids';
};

export type JobDraft = {
  employer: string;
  sector: string;
  contractType: '' | 'full_time' | 'part_time' | 'fixed_term' | 'temporary' | 'freelance' | 'internship';
  schedule: string;
  workMode: '' | 'onsite' | 'hybrid' | 'remote';
  location: string;
  salaryMin: string;
  salaryMax: string;
  requiredExperience: string;
  applicationMethod: '' | 'in_app' | 'external_url' | 'email' | 'phone';
  applicationValue: string;
  applicationDeadline: string;
};

export type ServiceDraft = {
  pricingMode: '' | 'fixed' | 'hourly' | 'daily' | 'quote';
  serviceArea: string;
  deliveryMode: '' | 'onsite' | 'remote' | 'either';
  availability: string;
  experience: string;
};

export type SpecializedDraft = {
  food: FoodDraft;
  perfume: PerfumeDraft;
  job: JobDraft;
  service: ServiceDraft;
};

export const EMPTY_SPECIALIZED: SpecializedDraft = {
  food: {
    priceUnit: '', quantity: '', ingredients: '', allergens: '', expiryDate: '',
    halalStatus: '', preparationType: '', storageRequirements: '', deliveryRequirements: '',
  },
  perfume: {
    fragranceName: '', fragranceType: '', volumeMl: '', sealed: false,
    authenticityDeclared: false, fragranceNotes: '', targetAudience: '',
  },
  job: {
    employer: '', sector: '', contractType: '', schedule: '', workMode: '', location: '',
    salaryMin: '', salaryMax: '', requiredExperience: '', applicationMethod: '',
    applicationValue: '', applicationDeadline: '',
  },
  service: {
    pricingMode: '', serviceArea: '', deliveryMode: '', availability: '', experience: '',
  },
};

/**
 * The seller's in-progress listing.
 *
 * Every field here lands in a real `listings` column when the draft is
 * published: `attributes` carries only the two attribute columns the table
 * has, `originalPrice` is `original_price_cents`, and the category is a
 * `categories.slug`. There is no condition — NILYA sells new products and the
 * column is written as such — and no quantity, variants or shipping, because
 * one listing is one item and delivery is country-level reference data.
 */
export type ListingDraft = {
  title: string;
  brand: string;
  description: string;
  categorySlug: string | null;
  listingType: ListingType;
  detailKind: ListingDetailKind;
  attributes: Record<AttributeKey, string | null>;
  specialized: SpecializedDraft;
  /** Kept as typed so a half-entered "12." survives a save; parsed at publish. */
  price: string;
  originalPrice: string;
  countryCode: string | null;
  /** The city the listing is offered from, resolved from the map or typed. */
  city: string | null;
  /*
   * Coordinates for `listings.latitude` / `listings.longitude`. Both or
   * neither, which is what `listings_coordinates_valid` enforces in the
   * database — a half-set pair would be rejected at publish rather than here.
   */
  latitude: number | null;
  longitude: number | null;
};

export const EMPTY_DRAFT: ListingDraft = {
  title: '',
  brand: '',
  description: '',
  categorySlug: null,
  listingType: 'product',
  detailKind: 'product',
  attributes: { size: null, color: null },
  specialized: EMPTY_SPECIALIZED,
  price: '',
  originalPrice: '',
  countryCode: null,
  city: null,
  latitude: null,
  longitude: null,
};

export function isDraftEmpty(draft: ListingDraft): boolean {
  return (
    draft.title === '' &&
    draft.brand === '' &&
    draft.description === '' &&
    draft.categorySlug === null &&
    draft.listingType === 'product' &&
    draft.detailKind === 'product' &&
    draft.attributes.size === null &&
    draft.attributes.color === null &&
    draft.price === '' &&
    draft.originalPrice === '' &&
    draft.countryCode === null &&
    draft.city === null &&
    draft.latitude === null &&
    draft.longitude === null &&
    JSON.stringify(draft.specialized) === JSON.stringify(EMPTY_SPECIALIZED)
  );
}

/**
 * Local draft storage.
 *
 * Deliberately on-device only: there is no drafts table, and a seller's
 * unfinished listing is not something another device needs. Photographs are
 * not stored — their URIs are temporary picker files and web object URLs that
 * do not survive a relaunch — so a resumed draft asks for photos again.
 */
const KEY = 'nilya:draft-listing';
/* 3 adds city and coordinates. An older record is dropped rather than
   migrated: it predates the location step and has no coordinates to keep. */
const VERSION = 3;

type StoredDraft = { version: typeof VERSION; savedAt: string; draft: ListingDraft };

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function nullableText(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.trim() ? value.slice(0, max) : null;
}

/** A stored coordinate is only kept if it is a real number in range. */
function coordinate(value: unknown, limit: 90 | 180): number | null {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit
    ? value
    : null;
}

export async function readStoredDraft(): Promise<ListingDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (parsed.version !== VERSION || !parsed.draft || typeof parsed.draft !== 'object') return null;
    const stored = parsed.draft as Partial<ListingDraft>;
    const attributes = (stored.attributes ?? {}) as Partial<Record<AttributeKey, unknown>>;
    const specialized = (stored.specialized ?? {}) as Partial<Record<keyof SpecializedDraft, Record<string, unknown>>>;
    const food = specialized.food ?? {};
    const perfume = specialized.perfume ?? {};
    const job = specialized.job ?? {};
    const service = specialized.service ?? {};
    /* Kept as a pair. One coordinate without the other cannot be published —
       `listings_coordinates_valid` rejects it — so a half record is dropped
       here rather than carried to the review step and failed there. */
    const storedLat = coordinate(stored.latitude, 90);
    const storedLng = coordinate(stored.longitude, 180);
    const hasCoordinates = storedLat !== null && storedLng !== null;
    /* Read field by field so a record from an earlier build cannot smuggle
       shapes the current draft does not have. */
    const draft: ListingDraft = {
      title: text(stored.title, 80),
      brand: text(stored.brand, 60),
      description: text(stored.description, 1000),
      categorySlug: nullableText(stored.categorySlug, 64),
      listingType: ['product', 'food', 'job', 'service'].includes(String(stored.listingType))
        ? stored.listingType as ListingType
        : 'product',
      detailKind: ['product', 'food', 'perfume', 'job', 'service'].includes(String(stored.detailKind))
        ? stored.detailKind as ListingDetailKind
        : 'product',
      attributes: {
        size: nullableText(attributes.size, 40),
        color: nullableText(attributes.color, 40),
      },
      specialized: {
        food: {
          priceUnit: text(food.priceUnit, 16) as FoodDraft['priceUnit'],
          quantity: text(food.quantity, 20),
          ingredients: text(food.ingredients, 4000),
          allergens: text(food.allergens, 1000),
          expiryDate: text(food.expiryDate, 10),
          halalStatus: text(food.halalStatus, 20) as FoodDraft['halalStatus'],
          preparationType: text(food.preparationType, 20) as FoodDraft['preparationType'],
          storageRequirements: text(food.storageRequirements, 1000),
          deliveryRequirements: text(food.deliveryRequirements, 1000),
        },
        perfume: {
          fragranceName: text(perfume.fragranceName, 160),
          fragranceType: text(perfume.fragranceType, 32) as PerfumeDraft['fragranceType'],
          volumeMl: text(perfume.volumeMl, 20),
          sealed: perfume.sealed === true,
          authenticityDeclared: perfume.authenticityDeclared === true,
          fragranceNotes: text(perfume.fragranceNotes, 2000),
          targetAudience: text(perfume.targetAudience, 16) as PerfumeDraft['targetAudience'],
        },
        job: {
          employer: text(job.employer, 160), sector: text(job.sector, 120),
          contractType: text(job.contractType, 24) as JobDraft['contractType'],
          schedule: text(job.schedule, 500), workMode: text(job.workMode, 16) as JobDraft['workMode'],
          location: text(job.location, 240), salaryMin: text(job.salaryMin, 20),
          salaryMax: text(job.salaryMax, 20), requiredExperience: text(job.requiredExperience, 2000),
          applicationMethod: text(job.applicationMethod, 24) as JobDraft['applicationMethod'],
          applicationValue: text(job.applicationValue, 500),
          applicationDeadline: text(job.applicationDeadline, 10),
        },
        service: {
          pricingMode: text(service.pricingMode, 16) as ServiceDraft['pricingMode'],
          serviceArea: text(service.serviceArea, 500),
          deliveryMode: text(service.deliveryMode, 16) as ServiceDraft['deliveryMode'],
          availability: text(service.availability, 1000),
          experience: text(service.experience, 2000),
        },
      },
      price: text(stored.price, 12),
      originalPrice: text(stored.originalPrice, 12),
      countryCode: nullableText(stored.countryCode, 2)?.toUpperCase() ?? null,
      city: nullableText(stored.city, 120),
      latitude: hasCoordinates ? storedLat : null,
      longitude: hasCoordinates ? storedLng : null,
    };
    return isDraftEmpty(draft) ? null : draft;
  } catch {
    return null;
  }
}

export async function writeStoredDraft(draft: ListingDraft): Promise<void> {
  try {
    const record: StoredDraft = { version: VERSION, savedAt: new Date().toISOString(), draft };
    await AsyncStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    /* Storage unavailable: the draft lives for this session only. */
  }
}

export async function clearStoredDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* Nothing to clear, or nothing that can be. */
  }
}

export async function hasStoredDraft(): Promise<boolean> {
  return (await readStoredDraft()) !== null;
}

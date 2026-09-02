import type { BundleDiscountSettingsRow } from '@/lib/database.types';

export const BUNDLE_DISCOUNT_TIER_COUNT = 3;
export const MAX_BUNDLE_DISCOUNT_PERCENT = 50;
const MAX_BUNDLE_ITEM_THRESHOLD = 32767;

export type BundleDiscountTierDraft = {
  minItems: string;
  discountPercent: string;
};

export type BundleDiscountDraft = {
  isEnabled: boolean;
  tiers: BundleDiscountTierDraft[];
};

export type BundleDiscountTierErrors = {
  minItems?: string;
  discountPercent?: string;
};

export type BundleDiscountWriteValues = Omit<
  BundleDiscountSettingsRow,
  'seller_id' | 'updated_at'
>;

export type BundleDiscountValidation = {
  errors: BundleDiscountTierErrors[];
  formError: string | null;
  values: BundleDiscountWriteValues | null;
};

type ParsedTier = {
  minItems: number | null;
  discountPercent: number | null;
};

const EMPTY_TIER = (): BundleDiscountTierDraft => ({ minItems: '', discountPercent: '' });

export function bundleDiscountSettingsToDraft(
  settings: BundleDiscountSettingsRow | null
): BundleDiscountDraft {
  if (!settings) {
    return {
      isEnabled: false,
      tiers: Array.from({ length: BUNDLE_DISCOUNT_TIER_COUNT }, EMPTY_TIER),
    };
  }

  return bundleDiscountWriteValuesToDraft(settings);
}

export function bundleDiscountWriteValuesToDraft(
  settings: BundleDiscountWriteValues
): BundleDiscountDraft {
  return {
    isEnabled: settings.is_enabled,
    tiers: [
      tierToDraft(settings.min_items_1, settings.discount_percent_1),
      tierToDraft(settings.min_items_2, settings.discount_percent_2),
      tierToDraft(settings.min_items_3, settings.discount_percent_3),
    ],
  };
}

function tierToDraft(
  minItems: number | null,
  discountPercent: number | null
): BundleDiscountTierDraft {
  return {
    minItems: minItems === null ? '' : String(minItems),
    discountPercent: discountPercent === null ? '' : String(discountPercent),
  };
}

function parseWholeNumber(value: string, maximum: number): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

export function validateBundleDiscountDraft(
  draft: BundleDiscountDraft
): BundleDiscountValidation {
  const tiers = Array.from(
    { length: BUNDLE_DISCOUNT_TIER_COUNT },
    (_, index) => draft.tiers[index] ?? EMPTY_TIER()
  );
  const errors: BundleDiscountTierErrors[] = tiers.map(() => ({}));
  const parsed: ParsedTier[] = tiers.map(() => ({ minItems: null, discountPercent: null }));
  let previousThreshold: number | null = null;
  let encounteredEmptyTier = false;
  let ruleCount = 0;

  tiers.forEach((tier, index) => {
    const minText = tier.minItems.trim();
    const discountText = tier.discountPercent.trim();
    const empty = minText.length === 0 && discountText.length === 0;

    if (empty) {
      encounteredEmptyTier = true;
      return;
    }

    ruleCount += 1;
    if (encounteredEmptyTier) {
      errors[index].minItems = 'Complete the earlier tier first.';
    }

    if (!minText) {
      errors[index].minItems = 'Enter a minimum item count.';
    } else {
      const minItems = parseWholeNumber(minText, MAX_BUNDLE_ITEM_THRESHOLD);
      if (minItems === null) {
        errors[index].minItems = 'Enter a valid whole number.';
      } else if (minItems < 2) {
        errors[index].minItems = 'Minimum is 2 items.';
      } else {
        parsed[index].minItems = minItems;
        if (previousThreshold !== null) {
          if (minItems === previousThreshold) {
            errors[index].minItems = 'Use a different item count.';
          } else if (minItems < previousThreshold) {
            errors[index].minItems = 'Must be greater than the previous tier.';
          }
        }
        previousThreshold = minItems;
      }
    }

    if (!discountText) {
      errors[index].discountPercent = 'Enter a discount.';
    } else {
      const discountPercent = parseWholeNumber(
        discountText,
        MAX_BUNDLE_DISCOUNT_PERCENT
      );
      if (discountPercent === null) {
        errors[index].discountPercent = `Enter a whole number up to ${MAX_BUNDLE_DISCOUNT_PERCENT}.`;
      } else if (discountPercent <= 0) {
        errors[index].discountPercent = 'Discount must be above 0%.';
      } else {
        parsed[index].discountPercent = discountPercent;
      }
    }
  });

  const formError = draft.isEnabled && ruleCount === 0
    ? 'Add at least one valid tier before turning bundle discounts on.'
    : null;
  const hasFieldErrors = errors.some(
    (error) => Boolean(error.minItems) || Boolean(error.discountPercent)
  );

  if (formError || hasFieldErrors) {
    return { errors, formError, values: null };
  }

  return {
    errors,
    formError: null,
    values: {
      is_enabled: draft.isEnabled,
      min_items_1: parsed[0].minItems,
      discount_percent_1: parsed[0].discountPercent,
      min_items_2: parsed[1].minItems,
      discount_percent_2: parsed[1].discountPercent,
      min_items_3: parsed[2].minItems,
      discount_percent_3: parsed[2].discountPercent,
    },
  };
}

export function bundleDiscountDraftsEqual(
  left: BundleDiscountDraft,
  right: BundleDiscountDraft
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function hasActiveBundleDiscount(
  settings: BundleDiscountSettingsRow | null
): boolean {
  if (!settings?.is_enabled) return false;
  return validateBundleDiscountDraft(bundleDiscountSettingsToDraft(settings)).values !== null;
}

/**
 * DEFERRED PAYMENT INTEGRATION
 *
 * These settings are informational only until checkout accepts a real bundle.
 * The future server-side checkout path must verify that every listing belongs
 * to one seller, is active and NEW, select a persisted tier, and compute the
 * discount itself. A client-supplied percentage or discounted total must never
 * be authoritative.
 */

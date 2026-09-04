import type { BundleDiscountSettingsRow } from '@/lib/database.types';

export const BUNDLE_DISCOUNT_TIER_COUNT = 3;
export const MAX_BUNDLE_DISCOUNT_PERCENT = 50;
export const MAX_BUNDLE_ITEMS = 20;

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
      const minItems = parseWholeNumber(minText, MAX_BUNDLE_ITEMS);
      if (minItems === null) {
        errors[index].minItems = `Enter a whole number up to ${MAX_BUNDLE_ITEMS}.`;
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

export type BundlePricing = {
  itemCount: number;
  discountPercent: number;
  listSubtotalCents: number;
  discountedSubtotalCents: number;
  discountCents: number;
  itemPricesCents: number[];
};

/** Highest persisted seller tier whose minimum is met by this item count. */
export function resolveBundleDiscountPercent(
  settings: BundleDiscountSettingsRow | null,
  itemCount: number
): number | null {
  if (!Number.isSafeInteger(itemCount) || itemCount < 2) return null;
  if (!hasActiveBundleDiscount(settings) || !settings) return null;

  const tiers = [
    [settings.min_items_1, settings.discount_percent_1],
    [settings.min_items_2, settings.discount_percent_2],
    [settings.min_items_3, settings.discount_percent_3],
  ] as const;

  for (let index = tiers.length - 1; index >= 0; index -= 1) {
    const [minimum, percent] = tiers[index]!;
    if (minimum !== null && percent !== null && minimum <= itemCount) {
      return percent;
    }
  }
  return null;
}

/**
 * Client preview of the database's bundle calculation.
 *
 * The trusted checkout repeats this calculation from locked listing rows and
 * saved seller settings. No amount or percentage from this result is sent to
 * Stripe, so changing JavaScript cannot change what a buyer is charged.
 */
export function calculateBundlePricing(
  listPricesCents: readonly number[],
  settings: BundleDiscountSettingsRow | null
): BundlePricing | null {
  if (
    listPricesCents.length < 2 ||
    listPricesCents.length > 20 ||
    listPricesCents.some(
      (price) => !Number.isSafeInteger(price) || price <= 0
    )
  ) {
    return null;
  }

  const discountPercent = resolveBundleDiscountPercent(
    settings,
    listPricesCents.length
  );
  if (discountPercent === null) return null;

  const itemPricesCents = listPricesCents.map((price) =>
    Math.max(1, Math.floor((price * (100 - discountPercent)) / 100))
  );
  const listSubtotalCents = listPricesCents.reduce(
    (total, price) => total + price,
    0
  );
  const discountedSubtotalCents = itemPricesCents.reduce(
    (total, price) => total + price,
    0
  );
  const discountCents = listSubtotalCents - discountedSubtotalCents;

  if (discountCents <= 0) return null;
  return {
    itemCount: listPricesCents.length,
    discountPercent,
    listSubtotalCents,
    discountedSubtotalCents,
    discountCents,
    itemPricesCents,
  };
}

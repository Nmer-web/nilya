import React, { useCallback, useMemo, useState } from 'react';
import { usePathname } from 'expo-router';
import { ScrollView, TextInput, View } from 'react-native';

import { CategoryTreePicker } from '@/components/category-tree-picker';
import { Icon, type IconName } from '@/components/icon';
import { Scrim, Sheet, SheetClose, SheetGrabber, Toast } from '@/components/sheet';
import { Button, Chip, InlineError, SectionLabel, T, Tap } from '@/components/ui';
import { attributeFieldsFor, type AttributeKey } from '@/config/categoryAttributes';
import { useAsync } from '@/hooks/use-async';
import { categoryPath } from '@/lib/categories';
import { countryName } from '@/lib/countries';
import {
  fetchCategoryTree,
  fetchListingFilterOptions,
  fetchListings,
} from '@/lib/queries';
import {
  activeFilterCount,
  EMPTY_FILTERS,
  emptyFiltersForCategory,
  SORTS,
  useApp,
  type Filters,
} from '@/store/app-store';
import { color as C, radius, space, touch, type as typography } from '@/theme/tokens';

/**
 * Dismissal, separated from the store action.
 *
 * `closeSheet` clears the store immediately, which unmounts the overlay with
 * no chance to animate. Everything inside a sheet therefore calls `useDismiss`
 * instead: it starts the exit, and the store is only cleared once the sheet
 * reports that it has finished travelling.
 */
const DismissContext = React.createContext<() => void>(() => {});

export const useDismiss = () => React.use(DismissContext);

/**
 * Every screen-level overlay lives here, above the nav — the design renders
 * sheets and the toast as siblings of the screens rather than inside them.
 */
export function Overlays() {
  const { sheet, toast, closeSheet } = useApp();

  /**
   * Which sheet is on its way out, rather than a bare boolean.
   *
   * Recording the identity means a sheet opened straight after a dismissal
   * cannot inherit the flag and animate itself away on arrival: the store hands
   * back a new object, so the comparison below is simply false for it. A
   * boolean would need an effect to reset it, and resetting state from an
   * effect is the cascading-render pattern the compiler rejects.
   */
  const [closingFor, setClosingFor] = useState<typeof sheet>(null);

  const closing = sheet !== null && closingFor === sheet;

  const dismiss = useCallback(() => setClosingFor(sheet), [sheet]);

  const exited = useCallback(() => {
    setClosingFor(null);
    closeSheet();
  }, [closeSheet]);

  const phase = { closing, onExited: exited };

  return (
    <DismissContext.Provider value={dismiss}>
      {sheet && <Scrim onPress={dismiss} closing={closing} />}
      {/*
        Two sheets, not six. Offer, Share, Report and Done were built around
        `getProduct(1)` and a fabricated counterparty — an offer sheet that
        toasted "sent to Leila", a confirmation naming an order that was never
        placed. Offers are now rows in `offers`, made and answered inside the
        conversation they belong to, so the sheet had nothing left to do.
      */}
      {sheet?.kind === 'filters' && <FiltersSheet {...phase} />}
      {sheet?.kind === 'sort' && <SortSheet {...phase} />}
      {!!toast && <Toast message={toast} />}
    </DismissContext.Provider>
  );
}

/** Exit plumbing passed from `Overlays` down to each sheet's `<Sheet>`. */
type Phase = { closing: boolean; onExited: () => void };

/* ─────────────────────────── shared sheet parts ─────────────────────────── */

/**
 * Title row with a close affordance — the same header on every sheet, so they
 * are recognisable as one family rather than six separate designs.
 */
function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.space12 }}>
      <T variant="sectionTitle" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </T>
      <SheetClose onPress={onClose} />
    </View>
  );
}

/**
 * A selectable or tappable row inside a sheet.
 *
 * `selected` draws a checkmark rather than a radio dot: at this size a filled
 * circle and an empty one are hard to tell apart at a glance, and the tick
 * reads instantly. Selection is also carried by weight, not by the mark alone.
 */
function SheetRow({
  label,
  sub,
  icon,
  selected,
  destructive,
  last,
  onPress,
}: {
  label: string;
  sub?: string;
  icon?: IconName;
  selected?: boolean;
  destructive?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole={selected === undefined ? 'button' : 'radio'}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: touch.minimum,
        gap: space.space12,
        paddingVertical: space.space12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      {!!icon && <Icon name={icon} role="inline" color={destructive ? C.error : C.textPrimary} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="bodyMedium" color={destructive ? C.errorText : selected ? C.primary : C.textPrimary}>
          {label}
        </T>
        {!!sub && (
          <T variant="caption" color={C.textSecondary} style={{ marginTop: space.space4 }}>
            {sub}
          </T>
        )}
      </View>
      {selected && <Icon name="check" role="inline" color={C.primary} />}
    </Tap>
  );
}

/* ─────────────────────────── sort ─────────────────────────── */

/**
 * Sort options.
 *
 * Explore used to cycle through these on each tap of the label, which meant
 * the full set was never visible and reaching the third option took three
 * presses with the list re-sorting under you each time.
 */
function SortSheet(phase: Phase) {
  const { sort, setSort, filters } = useApp();
  const dismiss = useDismiss();
  const sorts = filters.listingType === 'job'
    ? SORTS.filter((option) => option.key === 'recent')
    : SORTS;
  return (
    <Sheet {...phase} accessibilityLabel="Sort listings" style={{ paddingTop: space.space12, paddingHorizontal: space.space24, paddingBottom: space.space16 }}>
      <SheetGrabber style={{ marginBottom: space.space16 }} />
      <SheetHeader title="Sort by" onClose={dismiss} />

      {/* Each key maps to an ORDER BY in `fetchListings`, not a client sort. */}
      <View style={{ marginTop: space.space8 }}>
        {sorts.map((s, i) => (
          <SheetRow
            key={s.key}
            label={s.label}
            selected={sort === s.key}
            last={i === sorts.length - 1}
            onPress={() => {
              setSort(s.key);
              dismiss();
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}

/* ─────────────────────────── filters ─────────────────────────── */

/*
 * No condition filter. Every NILYA listing is new — `fetchListings` pins
 * `condition = 'new'` on every read — so a control offering any other enum
 * value would filter a marketplace that does not exist and return nothing.
 */

/** €12.50 → 1250, and '' → null so an empty field clears the bound. */
type ParsedPrice = { cents: number | null; error: string | null };

/** Parse decimal display text into integer cents without using a float as storage. */
function parsePriceCents(text: string): ParsedPrice {
  const normalized = text.trim().replace(',', '.');
  if (!normalized) return { cents: null, error: null };
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) {
    return { cents: null, error: 'Use a valid amount with no more than two decimal places.' };
  }

  const [whole = '0', fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > 2_147_483_647) {
    return { cents: null, error: 'This amount is too large.' };
  }
  return { cents, error: null };
}

const fromCents = (cents: number | null) => (cents == null ? '' : String(cents / 100));

const optionLabel = (value: string) => ({
  value,
  label: value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()),
});

/**
 * Filters, applied to the database.
 *
 * Every control here writes a field that `fetchListings` turns into a `where`
 * clause — the category through the shared descendant resolver, the bounds
 * into `price_cents`, the place into `country_code`. The sheet
 * holds a working copy and commits it on apply, so a half-set price range never
 * re-queries mid-typing.
 */
function FiltersSheet(phase: Phase) {
  const { filters, q, setFilters, resetFilters, setSort } = useApp();
  const pathname = usePathname();
  const dismiss = useDismiss();
  const [draft, setDraft] = useState<Filters>(filters);
  const [minText, setMinText] = useState(fromCents(filters.minCents));
  const [maxText, setMaxText] = useState(fromCents(filters.maxCents));
  const parsedMin = parsePriceCents(minText);
  const parsedMax = parsePriceCents(maxText);
  const priceError =
    parsedMin.error ??
    parsedMax.error ??
    (parsedMin.cents !== null && parsedMax.cents !== null && parsedMax.cents < parsedMin.cents
      ? 'Maximum price must be greater than or equal to minimum price.'
      : null);
  const previewQuery = pathname === '/search' ? q : '';
  const categoryScoped = pathname.startsWith('/category/');

  const categories = useAsync(fetchCategoryTree, 'categories:tree');
  const options = useAsync(
    () => fetchListingFilterOptions({ category: draft.categorySlug, query: previewQuery }),
    JSON.stringify(['listing-filter-options', draft.categorySlug, previewQuery])
  );
  const filterOptions = options.data;
  const selectedCategory = (categories.data ?? []).find(
    (category) => category.slug === draft.categorySlug
  );
  const effectiveType = selectedCategory?.listing_type ?? draft.listingType;
  const categoryFields = selectedCategory ? attributeFieldsFor(selectedCategory.slug) : [];
  const categoryRootSlug = selectedCategory
    ? categoryPath(categories.data ?? [], selectedCategory.slug)[0]?.slug
    : null;
  const categorySupports = (key: AttributeKey) =>
    categoryFields.some((field) => field.key === key);
  const showSize =
    Boolean(selectedCategory) &&
    categorySupports('size') &&
    (filterOptions?.sizes.length ?? 0) > 0;
  const showColor =
    categoryRootSlug !== 'electronics' &&
    (!selectedCategory || categorySupports('color')) &&
    (filterOptions?.colors.length ?? 0) > 0;
  const cityOptions = useMemo(
    () =>
      (filterOptions?.locations ?? []).filter(
        (location) => !draft.countryCode || location.countryCode === draft.countryCode
      ),
    [draft.countryCode, filterOptions?.locations]
  );
  const previewFilters: Filters = {
    ...draft,
    minCents: parsedMin.cents,
    maxCents: parsedMax.cents,
  };

  /** Counts what the current draft would return, so the CTA is not a guess. */
  const preview = useAsync(
    () =>
      priceError
        ? Promise.resolve({ rows: [], hasMore: false, total: null })
        : fetchListings(
            {
              query: previewQuery,
              category: previewFilters.categorySlug,
              minPriceCents: previewFilters.minCents,
              maxPriceCents: previewFilters.maxCents,
              countryCode: previewFilters.countryCode,
              city: previewFilters.city,
              brand: previewFilters.brand,
              size: previewFilters.size,
              color: previewFilters.color,
              deliveryKey: previewFilters.deliveryKey,
              listingType: previewFilters.listingType,
              halalStatus: previewFilters.halalStatus,
              preparationType: previewFilters.preparationType,
              fragranceType: previewFilters.fragranceType,
              targetAudience: previewFilters.targetAudience,
              sealed: previewFilters.sealed,
              contractType: previewFilters.contractType,
              workMode: previewFilters.workMode,
              sector: previewFilters.sector,
              pricingMode: previewFilters.pricingMode,
              serviceDeliveryMode: previewFilters.serviceDeliveryMode,
            },
            0
          ),
    JSON.stringify(['filter-preview', previewQuery, previewFilters, priceError])
  );

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const selectCategory = (categorySlug: string | null) => {
    const nextCategory = (categories.data ?? []).find((category) => category.slug === categorySlug);
    if (nextCategory?.listing_type === 'job') {
      setMinText('');
      setMaxText('');
    }
    const supported = categorySlug ? attributeFieldsFor(categorySlug) : [];
    const nextRootSlug = categorySlug
      ? categoryPath(categories.data ?? [], categorySlug)[0]?.slug
      : null;
    setDraft((current) => ({
      ...current,
      categorySlug,
      listingType: nextCategory?.listing_type ?? null,
      halalStatus: null,
      preparationType: null,
      fragranceType: null,
      targetAudience: null,
      sealed: null,
      contractType: null,
      workMode: null,
      sector: null,
      pricingMode: null,
      serviceDeliveryMode: null,
      minCents: nextCategory?.listing_type === 'job' ? null : current.minCents,
      maxCents: nextCategory?.listing_type === 'job' ? null : current.maxCents,
      deliveryKey: nextCategory && (nextCategory.listing_type === 'job' || nextCategory.listing_type === 'service') ? null : current.deliveryKey,
      size: categorySlug && supported.some((field) => field.key === 'size') ? current.size : null,
      color:
        nextRootSlug !== 'electronics' &&
        (!categorySlug || supported.some((field) => field.key === 'color'))
          ? current.color
          : null,
    }));
  };

  const apply = () => {
    if (priceError) return;
    setFilters(previewFilters);
    if (previewFilters.listingType === 'job') setSort('recent');
    dismiss();
  };

  const clearAll = () => {
    const scopedCategory = filters.categorySlug ?? draft.categorySlug;
    const cleared =
      categoryScoped && scopedCategory ? emptyFiltersForCategory(scopedCategory) : EMPTY_FILTERS;
    if (categoryScoped) setFilters(cleared);
    else resetFilters();
    setDraft(cleared);
    setMinText('');
    setMaxText('');
  };

  const count = preview.data?.total;
  const hasDraftFilters =
    activeFilterCount(previewFilters, !categoryScoped, !categoryScoped) > 0 ||
    minText.trim().length > 0 ||
    maxText.trim().length > 0;

  return (
    <Sheet
      {...phase}
      top={78}
      accessibilityLabel="Filter listings"
      style={{
        overflow: 'hidden',
        backgroundColor: C.surface,
        borderTopLeftRadius: radius.radiusHero,
        borderTopRightRadius: radius.radiusHero,
      }}
    >
      <View
        className="bg-nilya-surface"
        style={{
          paddingHorizontal: space.space24,
          paddingTop: space.space12,
          paddingBottom: space.space12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <SheetGrabber style={{ marginBottom: space.space12 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {hasDraftFilters ? (
            <Tap
              onPress={clearAll}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              hitSlop={8}
              style={{ minWidth: 72, minHeight: touch.minimum, justifyContent: 'center' }}
            >
              <T variant="button" color={C.primary}>
                Clear all
              </T>
            </Tap>
          ) : (
            <View style={{ width: 72 }} />
          )}
          <T variant="sectionTitle">
            Filters
          </T>
          <SheetClose onPress={dismiss} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.space24, paddingTop: space.space8, paddingBottom: space.space20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!categoryScoped ? (
          <>
            <SectionLabel style={{ paddingTop: space.space16, paddingBottom: space.space12 }}>
              Category
            </SectionLabel>
            {categories.loading ? (
              <T variant="metadata" color={C.textSecondary}>
                Loading categories…
              </T>
            ) : categories.error ? (
              <InlineError
                message="Categories could not be loaded."
                actionLabel="Retry"
                onAction={categories.refetch}
              />
            ) : (
              <View>
                <Chip
                  label="Any"
                  active={draft.categorySlug === null}
                  onPress={() => selectCategory(null)}
                />
                <View style={{ marginTop: space.space8 }}>
                  <CategoryTreePicker
                    categories={categories.data ?? []}
                    selectedSlug={draft.categorySlug}
                    allowParentSelection
                    onSelect={(category) => selectCategory(category.slug)}
                  />
                </View>
              </View>
            )}
          </>
        ) : null}

        {!selectedCategory && (filterOptions?.listingTypes.length ?? 0) > 1 ? (
          <FilterChoiceGroup
            title="Listing type"
            anyLabel="All types"
            value={draft.listingType}
            options={(filterOptions?.listingTypes ?? []).map((value) => ({
              value,
              label: value === 'product' ? 'Products' : value === 'food' ? 'Food' : value === 'job' ? 'Jobs' : 'Services',
            }))}
            onChange={(value) => {
              const listingType = value as Filters['listingType'];
              if (listingType === 'job') { setMinText(''); setMaxText(''); }
              setDraft((current) => ({
                ...current,
                listingType,
                halalStatus: null,
                preparationType: null,
                fragranceType: null,
                targetAudience: null,
                sealed: null,
                contractType: null,
                workMode: null,
                sector: null,
                pricingMode: null,
                serviceDeliveryMode: null,
                minCents: listingType === 'job' ? null : current.minCents,
                maxCents: listingType === 'job' ? null : current.maxCents,
                deliveryKey: listingType === 'job' || listingType === 'service' ? null : current.deliveryKey,
              }));
            }}
          />
        ) : null}

        {effectiveType !== 'job' && draft.pricingMode !== 'quote' ? <><SectionLabel style={{ paddingTop: space.space24, paddingBottom: space.space12 }}>Price range</SectionLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space12 }}>
          <PriceInput label="Minimum" value={minText} invalid={Boolean(parsedMin.error)} onChange={setMinText} />
          <View style={{ width: 12, height: 1, backgroundColor: C.borderStrong }} />
          <PriceInput label="Maximum" value={maxText} invalid={Boolean(parsedMax.error)} onChange={setMaxText} />
        </View>

        {priceError ? (
          <T accessibilityRole="alert" variant="caption" color={C.errorText} style={{ marginTop: space.space8 }}>
            {priceError}
          </T>
        ) : null}</> : null}

        {options.error ? (
          <View style={{ marginTop: space.space20 }}>
            <InlineError
              message="Filter options could not be loaded."
              actionLabel="Retry"
              onAction={options.refetch}
            />
          </View>
        ) : options.loading ? (
          <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space24 }}>
            Loading available filters...
          </T>
        ) : null}

        {(filterOptions?.countries.length ?? 0) > 0 ? (
          <FilterChoiceGroup
            title="Country"
            anyLabel="Anywhere"
            value={draft.countryCode}
            options={(filterOptions?.countries ?? []).map((value) => ({
              value,
              label: countryName(value),
            }))}
            onChange={(value) =>
              setDraft((current) => ({ ...current, countryCode: value, city: null }))
            }
          />
        ) : null}

        {draft.countryCode && cityOptions.length > 0 ? (
          <FilterChoiceGroup
            title="City"
            anyLabel="Any city"
            value={draft.city}
            options={cityOptions.map((location) => ({
              value: location.city,
              label: location.city,
            }))}
            onChange={(value) => set('city', value)}
          />
        ) : null}

        {(effectiveType === null || effectiveType === 'product' || effectiveType === 'food') && (filterOptions?.brands.length ?? 0) > 0 ? (
          <FilterChoiceGroup
            title="Brand"
            value={draft.brand}
            options={(filterOptions?.brands ?? []).map((value) => ({ value, label: value }))}
            onChange={(value) => set('brand', value)}
          />
        ) : null}

        {showSize ? (
          <FilterChoiceGroup
            title="Size"
            value={draft.size}
            options={(filterOptions?.sizes ?? []).map((value) => ({ value, label: value }))}
            onChange={(value) => set('size', value)}
          />
        ) : null}

        {showColor ? (
          <FilterChoiceGroup
            title="Colour"
            value={draft.color}
            options={(filterOptions?.colors ?? []).map((value) => ({ value, label: value }))}
            onChange={(value) => set('color', value)}
          />
        ) : null}

        {(effectiveType === null || effectiveType === 'product' || effectiveType === 'food') && (filterOptions?.delivery.length ?? 0) > 0 ? (
          <FilterChoiceGroup
            title="Delivery"
            value={draft.deliveryKey}
            options={(filterOptions?.delivery ?? []).map((option) => ({
              value: option.key,
              label: option.label,
            }))}
            onChange={(value) => set('deliveryKey', value)}
          />
        ) : null}

        {(filterOptions?.halalStatuses.length ?? 0) > 0 && effectiveType === 'food' ? (
          <FilterChoiceGroup title="Halal status" value={draft.halalStatus} options={(filterOptions?.halalStatuses ?? []).map(optionLabel)} onChange={(value) => set('halalStatus', value)} />
        ) : null}
        {(filterOptions?.preparationTypes.length ?? 0) > 0 && effectiveType === 'food' ? (
          <FilterChoiceGroup title="Preparation" value={draft.preparationType} options={(filterOptions?.preparationTypes ?? []).map(optionLabel)} onChange={(value) => set('preparationType', value)} />
        ) : null}
        {(filterOptions?.fragranceTypes.length ?? 0) > 0 && selectedCategory?.requires_perfume_details ? (
          <FilterChoiceGroup title="Fragrance type" value={draft.fragranceType} options={(filterOptions?.fragranceTypes ?? []).map(optionLabel)} onChange={(value) => set('fragranceType', value)} />
        ) : null}
        {(filterOptions?.targetAudiences.length ?? 0) > 0 && selectedCategory?.requires_perfume_details ? (
          <FilterChoiceGroup title="Target audience" value={draft.targetAudience} options={(filterOptions?.targetAudiences ?? []).map(optionLabel)} onChange={(value) => set('targetAudience', value)} />
        ) : null}
        {(filterOptions?.sealedValues.length ?? 0) > 0 && selectedCategory?.requires_perfume_details ? (
          <FilterChoiceGroup title="Packaging" value={draft.sealed === null ? null : String(draft.sealed)} options={(filterOptions?.sealedValues ?? []).map((value) => ({ value: String(value), label: value ? 'Sealed' : 'Not sealed' }))} onChange={(value) => set('sealed', value === null ? null : value === 'true')} />
        ) : null}
        {(filterOptions?.contractTypes.length ?? 0) > 0 && effectiveType === 'job' ? (
          <FilterChoiceGroup title="Contract type" value={draft.contractType} options={(filterOptions?.contractTypes ?? []).map(optionLabel)} onChange={(value) => set('contractType', value)} />
        ) : null}
        {(filterOptions?.workModes.length ?? 0) > 0 && effectiveType === 'job' ? (
          <FilterChoiceGroup title="Work mode" value={draft.workMode} options={(filterOptions?.workModes ?? []).map(optionLabel)} onChange={(value) => set('workMode', value)} />
        ) : null}
        {(filterOptions?.sectors.length ?? 0) > 0 && effectiveType === 'job' ? (
          <FilterChoiceGroup title="Sector" value={draft.sector} options={(filterOptions?.sectors ?? []).map((value) => ({ value, label: value }))} onChange={(value) => set('sector', value)} />
        ) : null}
        {(filterOptions?.pricingModes.length ?? 0) > 0 && effectiveType === 'service' ? (
          <FilterChoiceGroup
            title="Pricing mode"
            value={draft.pricingMode}
            options={(filterOptions?.pricingModes ?? []).map(optionLabel)}
            onChange={(value) => {
              if (value === 'quote') {
                setMinText('');
                setMaxText('');
                setDraft((current) => ({ ...current, pricingMode: value, minCents: null, maxCents: null }));
              } else {
                set('pricingMode', value);
              }
            }}
          />
        ) : null}
        {(filterOptions?.serviceDeliveryModes.length ?? 0) > 0 && effectiveType === 'service' ? (
          <FilterChoiceGroup title="Delivery mode" value={draft.serviceDeliveryMode} options={(filterOptions?.serviceDeliveryModes ?? []).map(optionLabel)} onChange={(value) => set('serviceDeliveryMode', value)} />
        ) : null}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: space.space24,
          paddingTop: space.space12,
          paddingBottom: space.space16,
          borderTopWidth: 1,
          borderTopColor: C.border,
          backgroundColor: C.surface,
        }}
      >
        {/* PostgREST returns the exact total alongside the first result page. */}
        <Button
          label={
            priceError
              ? 'Check price range'
              : preview.loading
              ? 'Counting…'
              : preview.error
                ? 'Show results'
                : count === null || count === undefined
                  ? 'Show results'
                  : `Show ${count} result${count === 1 ? '' : 's'}`
          }
          onPress={apply}
          disabled={Boolean(priceError)}
        />
      </View>
    </Sheet>
  );
}

function PriceInput({
  label,
  value,
  invalid,
  onChange,
}: {
  label: string;
  value: string;
  invalid?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: touch.large,
        borderRadius: radius.radiusMedium,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: invalid ? C.error : C.border,
        justifyContent: 'center',
        paddingHorizontal: space.space16,
      }}
    >
      <T variant="caption" color={C.textSecondary}>
        {label}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space4 }}>
        <T variant="bodyMedium">
          €
        </T>
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.replace(/[^0-9.,]/g, ''))}
          accessibilityLabel={`${label} price in euros`}
          accessibilityHint={invalid ? 'Enter a valid amount with no more than two decimal places.' : undefined}
          placeholder="Any"
          placeholderTextColor={C.textSecondary}
          selectionColor={C.primary}
          keyboardType="decimal-pad"
          style={[typography.bodyMedium, { flex: 1, minWidth: 0, color: C.textPrimary, padding: 0 }]}
        />
      </View>
    </View>
  );
}

function FilterChoiceGroup({
  title,
  value,
  options,
  anyLabel = 'Any',
  onChange,
}: {
  title: string;
  value: string | null;
  options: { value: string; label: string }[];
  anyLabel?: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <View className="bg-nilya-surface">
      <SectionLabel style={{ paddingTop: space.space24, paddingBottom: space.space12 }}>
        {title}
      </SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.space8 }}>
        <Chip label={anyLabel} active={value === null} onPress={() => onChange(null)} />
        {options.map((option) => (
          <Chip
            key={`${title}:${option.value}`}
            label={option.label}
            active={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

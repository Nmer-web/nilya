import React, { useCallback, useState } from 'react';
import { usePathname } from 'expo-router';
import { ScrollView, TextInput, View } from 'react-native';

import { CategoryTreePicker } from '@/components/category-tree-picker';
import { Icon, type IconName } from '@/components/icon';
import { Scrim, Sheet, SheetClose, SheetGrabber, Toast } from '@/components/sheet';
import { Button, Chip, InlineError, SectionLabel, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import {
  fetchCategoryTree,
  fetchListingBrands,
  fetchListingColors,
  fetchListingCountries,
  fetchListings,
} from '@/lib/queries';
import { EMPTY_FILTERS, SORTS, useApp, type Filters } from '@/store/app-store';
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
        <T variant="bodyMedium" color={destructive ? C.errorText : C.textPrimary}>
          {label}
        </T>
        {!!sub && (
          <T variant="caption" color={C.textSecondary} style={{ marginTop: space.space4 }}>
            {sub}
          </T>
        )}
      </View>
      {selected && <Icon name="check" role="inline" color={C.textPrimary} />}
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
  const { sort, setSort } = useApp();
  const dismiss = useDismiss();
  return (
    <Sheet {...phase} accessibilityLabel="Sort listings" style={{ paddingTop: space.space12, paddingHorizontal: space.space24, paddingBottom: space.space16 }}>
      <SheetGrabber style={{ marginBottom: space.space16 }} />
      <SheetHeader title="Sort by" onClose={dismiss} />

      {/* Each key maps to an ORDER BY in `fetchListings`, not a client sort. */}
      <View style={{ marginTop: space.space8 }}>
        {SORTS.map((s, i) => (
          <SheetRow
            key={s.key}
            label={s.label}
            selected={sort === s.key}
            last={i === SORTS.length - 1}
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
function toCents(text: string): number | null {
  const n = Number(text.replace(',', '.').trim());
  return text.trim() === '' || !Number.isFinite(n) || n < 0 ? null : Math.round(n * 100);
}

const fromCents = (cents: number | null) => (cents == null ? '' : String(cents / 100));

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
  const { filters, q, setFilters, resetFilters } = useApp();
  const pathname = usePathname();
  const dismiss = useDismiss();
  const [draft, setDraft] = useState<Filters>(filters);
  const [minText, setMinText] = useState(fromCents(filters.minCents));
  const [maxText, setMaxText] = useState(fromCents(filters.maxCents));
  const draftMinCents = toCents(minText);
  const draftMaxCents = toCents(maxText);
  const previewQuery = pathname === '/search' ? q : '';
  const categoryScoped = pathname.startsWith('/category/');

  const categories = useAsync(fetchCategoryTree, 'categories:tree');
  const countries = useAsync(fetchListingCountries, 'listing-countries');
  const brands = useAsync(fetchListingBrands, 'listing-brands');
  const colors = useAsync(fetchListingColors, 'listing-colors');

  /** Counts what the current draft would return, so the CTA is not a guess. */
  const preview = useAsync(
    () =>
      fetchListings(
        {
          query: previewQuery,
          category: draft.categorySlug,
          minPriceCents: draftMinCents,
          maxPriceCents: draftMaxCents,
          countryCode: draft.countryCode,
          brand: draft.brand,
          color: draft.color,
        },
        0
      ),
    `filter-preview:${previewQuery}:${draft.categorySlug}:${draftMinCents}:${draftMaxCents}:${draft.countryCode}:${draft.brand}:${draft.color}`
  );

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const apply = () => {
    setFilters({ ...draft, minCents: toCents(minText), maxCents: toCents(maxText) });
    dismiss();
  };

  const count = preview.data?.total;

  return (
    <Sheet {...phase} top={78} accessibilityLabel="Filter listings" style={{ overflow: 'hidden' }}>
      <View
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
          <Tap
            onPress={() => {
              if (categoryScoped) {
                const scopedEmpty = { ...EMPTY_FILTERS, categorySlug: filters.categorySlug };
                setFilters(scopedEmpty);
                setDraft(scopedEmpty);
              } else {
                resetFilters();
                setDraft(EMPTY_FILTERS);
              }
              setMinText('');
              setMaxText('');
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <T variant="button" color={C.textSecondary}>
              Clear
            </T>
          </Tap>
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
                  onPress={() => set('categorySlug', null)}
                />
                <View style={{ marginTop: space.space8 }}>
                  <CategoryTreePicker
                    categories={categories.data ?? []}
                    selectedSlug={draft.categorySlug}
                    allowParentSelection
                    onSelect={(category) => set('categorySlug', category.slug)}
                  />
                </View>
              </View>
            )}
          </>
        ) : null}

        <SectionLabel style={{ paddingTop: space.space24, paddingBottom: space.space12 }}>Price range</SectionLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space12 }}>
          <PriceInput label="Minimum" value={minText} onChange={setMinText} />
          <View style={{ width: 12, height: 1, backgroundColor: C.borderStrong }} />
          <PriceInput label="Maximum" value={maxText} onChange={setMaxText} />
        </View>

        <SectionLabel style={{ paddingTop: space.space24, paddingBottom: space.space12 }}>Location</SectionLabel>
        {(countries.data ?? []).length === 0 ? (
          <T variant="metadata" color={C.textSecondary}>
            {countries.loading
              ? 'Loading locations…'
              : 'Locations appear here once there are listings to filter.'}
          </T>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.space8 }}>
            <Chip
              label="Anywhere"
              active={draft.countryCode === null}
              onPress={() => set('countryCode', null)}
            />
            {(countries.data ?? []).map((cc) => (
              <Chip
                key={cc}
                label={cc}
                active={draft.countryCode === cc}
                onPress={() => set('countryCode', cc)}
              />
            ))}
          </View>
        )}

        <SectionLabel style={{ paddingTop: space.space24, paddingBottom: space.space12 }}>Brand</SectionLabel>
        {(brands.data ?? []).length === 0 ? (
          <T variant="metadata" color={C.textSecondary}>
            {brands.loading
              ? 'Loading brands...'
              : 'Brands appear here once active listings include them.'}
          </T>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.space8 }}>
            <Chip
              label="Any"
              active={draft.brand === null}
              onPress={() => set('brand', null)}
            />
            {(brands.data ?? []).map((brand) => (
              <Chip
                key={brand}
                label={brand}
                active={draft.brand === brand}
                onPress={() => set('brand', brand)}
              />
            ))}
          </View>
        )}

        <SectionLabel style={{ paddingTop: space.space24, paddingBottom: space.space12 }}>Color</SectionLabel>
        {(colors.data ?? []).length === 0 ? (
          <T variant="metadata" color={C.textSecondary}>
            {colors.loading
              ? 'Loading colors...'
              : 'Colors appear here once active listings include them.'}
          </T>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.space8 }}>
            <Chip
              label="Any"
              active={draft.color === null}
              onPress={() => set('color', null)}
            />
            {(colors.data ?? []).map((color) => (
              <Chip
                key={color}
                label={color}
                active={draft.color === color}
                onPress={() => set('color', color)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: space.space24,
          paddingTop: space.space12,
          paddingBottom: space.space16,
          borderTopWidth: 1,
          borderTopColor: C.border,
          backgroundColor: C.background,
        }}
      >
        {/* PostgREST returns the exact total alongside the first result page. */}
        <Button
          label={
            preview.loading
              ? 'Counting…'
              : preview.error
                ? 'Show results'
                : count === null || count === undefined
                  ? 'Show results'
                  : `Show ${count} result${count === 1 ? '' : 's'}`
          }
          onPress={apply}
        />
      </View>
    </Sheet>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
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
        borderColor: C.border,
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

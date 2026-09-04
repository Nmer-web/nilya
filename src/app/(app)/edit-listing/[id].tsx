import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field } from '@/components/field';
import { CategoryTreePicker } from '@/components/category-tree-picker';
import { Icon } from '@/components/icon';
import { formatPrice } from '@/components/listing-card';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import {
  Button,
  EmptyState,
  InlineError,
  ScreenError,
  T,
  Tap,
} from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { type ListingImageRow } from '@/lib/database.types';
import { categoryHasChildren, categoryPath } from '@/lib/categories';
import { EMPTY_DRAFT, EMPTY_SPECIALIZED, type SpecializedDraft } from '@/features/sell/draft';
import { ChoiceField, SpecializedFields } from '@/features/sell/SpecializedFields';
import { validateStepFields } from '@/features/sell/validation';
import { haptic } from '@/lib/haptics';
import {
  disposeListingPhoto,
  ingestListingPhotoAssets,
  LISTING_PHOTO_LIMIT,
  openListingImageLibrary,
  prepareListingPhoto,
  readPreparedPhotoBytes,
  type LocalListingPhoto,
} from '@/lib/listing-photos';
import {
  ListingEditError,
  nextListingImagePosition,
  removeOwnListingImage,
  updateOwnListing,
  uploadListingObject,
  insertListingImage,
} from '@/lib/mutations';
import { normalizePublishForm } from '@/lib/listing-publication';
import { detailKindForCategory, isCanonicalListing, isCommerceListing, listingNoun } from '@/lib/listing-types';
import { fetchCategoryTree, fetchListing, imageUrl } from '@/lib/queries';
import { useApp } from '@/store/app-store';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space, touch } from '@/theme/tokens';

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function listingIdFromParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && UUID_PATTERN.test(raw) ? raw : null;
}

export default function EditListingRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const listingId = listingIdFromParam(id);

  if (!listingId) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Edit listing" />
        <EmptyState
          icon="bag"
          title="Listing unavailable"
          body="This link does not point at one of your listings."
        />
      </View>
    );
  }

  return <EditListing key={listingId} listingId={listingId} />;
}

/**
 * The seller's own edit screen.
 *
 * Everything on it writes to the listing's real columns under
 * `listings_update_own`, so a seller can only ever change a row they own. The
 * condition is never offered: NILYA sells new products and there is no other
 * value to move a listing to. Photographs are added and removed against
 * `listing_images` and the storage bucket through the same pipeline the Sell
 * composer uses.
 *
 * Delivery is deliberately absent. `delivery_options` is country-level
 * reference data with no seller or listing column and no write policy, so a
 * seller cannot own a delivery method — see the note rendered at the foot of
 * this screen.
 */
function EditListing({ listingId }: { listingId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { flash } = useApp();

  const listing = useAsync(() => fetchListing(listingId), `edit-listing:${listingId}`);
  const categories = useAsync(fetchCategoryTree, 'categories:tree');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [specialized, setSpecializedState] = useState<SpecializedDraft>(EMPTY_SPECIALIZED);
  const [attempted, setAttempted] = useState(false);
  const [images, setImages] = useState<ListingImageRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const mounted = useRef(true);
  const savingRef = useRef(false);
  /** Set once the loaded row has seeded the form, so edits are never overwritten. */
  const seeded = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const row = listing.data;
  const editNoun = listingNoun(row?.listing_type ?? 'product');

  useEffect(() => {
    if (!row || seeded.current) return;
    seeded.current = true;
    setTitle(row.title);
    setDescription(row.description ?? '');
    setBrand(row.perfume_details?.brand ?? row.brand ?? '');
    setColor(row.color ?? '');
    setSize(row.size ?? '');
    setCategorySlug(row.category_slug);
    /* Cents to the seller's own units, so what they edit is what they see. */
    setPrice(row.price_cents == null ? '' : (row.price_cents / 100).toString());
    setOriginalPrice(row.original_price_cents == null ? '' : (row.original_price_cents / 100).toString());
    setSpecializedState({
      food: row.food_details ? {
        priceUnit: row.food_details.price_unit,
        quantity: String(row.food_details.quantity),
        ingredients: row.food_details.ingredients,
        allergens: row.food_details.allergens,
        expiryDate: row.food_details.expiry_date,
        halalStatus: row.food_details.halal_status,
        preparationType: row.food_details.preparation_type,
        storageRequirements: row.food_details.storage_requirements,
        deliveryRequirements: row.food_details.delivery_requirements,
      } : EMPTY_SPECIALIZED.food,
      perfume: row.perfume_details ? {
        fragranceName: row.perfume_details.fragrance_name,
        fragranceType: row.perfume_details.fragrance_type,
        volumeMl: String(row.perfume_details.volume_ml),
        sealed: row.perfume_details.sealed,
        authenticityDeclared: row.perfume_details.authenticity_declared,
        fragranceNotes: row.perfume_details.fragrance_notes,
        targetAudience: row.perfume_details.target_audience,
      } : EMPTY_SPECIALIZED.perfume,
      job: row.job_details ? {
        employer: row.job_details.employer,
        sector: row.job_details.sector,
        contractType: row.job_details.contract_type,
        schedule: row.job_details.schedule,
        workMode: row.job_details.work_mode,
        location: row.job_details.location,
        salaryMin: String(row.job_details.salary_min_cents / 100),
        salaryMax: String(row.job_details.salary_max_cents / 100),
        requiredExperience: row.job_details.required_experience,
        applicationMethod: row.job_details.application_method,
        applicationValue: row.job_details.application_value ?? '',
        applicationDeadline: row.job_details.application_deadline,
      } : EMPTY_SPECIALIZED.job,
      service: row.service_details ? {
        pricingMode: row.service_details.pricing_mode,
        serviceArea: row.service_details.service_area,
        deliveryMode: row.service_details.delivery_mode,
        availability: row.service_details.availability,
        experience: row.service_details.experience,
      } : EMPTY_SPECIALIZED.service,
    });
    setImages([...row.images].sort((a, b) => a.position - b.position));
  }, [row]);

  const setSpecialized = <K extends keyof SpecializedDraft,>(kind: K, changes: Partial<SpecializedDraft[K]>) => {
    setSpecializedState((current) => ({
      ...current,
      [kind]: { ...current[kind], ...changes },
    }));
  };

  const listingType = row?.listing_type ?? 'product';
  const detailKind = row?.perfume_details ? 'perfume' : detailKindForCategory(row?.category);
  const categoryRows = useMemo(() => {
    const all = categories.data ?? [];
    if (!row) return all;
    return all.filter((category) =>
      category.listing_type === row.listing_type &&
      (row.perfume_details ? category.requires_perfume_details : !category.requires_perfume_details)
    );
  }, [categories.data, row]);
  const selectedCategoryPath = useMemo(
    () => categoryPath(categoryRows, categorySlug),
    [categoryRows, categorySlug]
  );

  const priceCents = useMemo(() => {
    const parsed = Number.parseFloat(price.replace(',', '.'));
    if (!Number.isFinite(parsed)) return null;
    const cents = Math.round(parsed * 100);
    return cents > 0 ? cents : null;
  }, [price]);

  const editDraft = {
    ...EMPTY_DRAFT,
    title,
    description,
    brand,
    categorySlug: categorySlug || null,
    listingType,
    detailKind,
    attributes: { size: size || null, color: color || null },
    specialized,
    price,
    originalPrice,
    countryCode: row?.country_code ?? null,
  };
  const validationErrors = {
    ...validateStepFields(2, editDraft, []),
    ...validateStepFields(4, editDraft, []),
    ...validateStepFields(5, editDraft, []),
  };
  const selectedCategory = categoryRows.find((category) => category.slug === categorySlug);
  const categoryValid = Boolean(
    selectedCategory && !categoryHasChildren(categoryRows, selectedCategory.id)
  );
  if (!categoryValid) validationErrors.category = 'Choose a specific category.';
  const complete = Object.keys(validationErrors).length === 0;

  if (listing.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Edit listing" />
        <View style={{ padding: space.gutterCompact, gap: space.space16 }}>
          <Skeleton width="100%" height={120} round={radius.radiusLarge} />
          <Skeleton width="100%" height={72} round={radius.radiusMedium} />
          <Skeleton width="100%" height={72} round={radius.radiusMedium} />
          <Skeleton width="100%" height={72} round={radius.radiusMedium} />
        </View>
      </View>
    );
  }

  if (listing.error || !row) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Edit listing" />
        {listing.error ? (
          <ScreenError
            error={listing.error}
            title="Could not load this listing"
            onRetry={listing.refetch}
          />
        ) : (
          <EmptyState
            icon="bag"
            title="Listing unavailable"
            body="It may have been removed."
          />
        )}
      </View>
    );
  }

  /* Ownership is enforced by RLS on every write; refusing here as well means a
     seller never fills in a form whose save cannot succeed. */
  if (!user || user.id !== row.seller_id) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title={`Edit ${editNoun}`} />
        <EmptyState
          icon="shield"
          title={`This is not your ${editNoun}`}
          body={`Only the person who published this ${editNoun} can edit it.`}
          action={
            <Button
              label={`Back to the ${editNoun}`}
              variant="secondary"
              onPress={() => router.replace({ pathname: '/listing/[id]', params: { id: row.id } })}
              style={{ marginTop: space.space20 }}
            />
          }
        />
      </View>
    );
  }

  if (!isCanonicalListing(row.listing_type, row.condition)) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title={`Edit ${editNoun}`} />
        <EmptyState
          icon="info"
          title={`This ${editNoun} cannot be edited`}
          body="This record does not match Nilya’s listing-type rules."
        />
      </View>
    );
  }

  const trimmedTitle = title.trim();

  const save = async () => {
    setAttempted(true);
    if (savingRef.current || !complete) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const input = normalizePublishForm({
        title: trimmedTitle,
        description,
        brand,
        color,
        size,
        categorySlug,
        price,
        originalPrice,
        city: row.city ?? '',
        countryCode: row.country_code,
        currency: row.currency,
        listingType: row.listing_type,
        detailKind,
        specialized,
      });
      await updateOwnListing(row.id, input);
      if (!mounted.current) return;
      flash(`${row.listing_type === 'job' ? 'Job' : row.listing_type === 'service' ? 'Service' : 'Listing'} updated`);
      haptic('important-confirmation');
      router.replace({ pathname: '/listing/[id]', params: { id: row.id } });
    } catch (caught) {
      if (!mounted.current) return;
      setError(
        caught instanceof ListingEditError
          ? caught.message
          : 'Your changes could not be saved. Try again.'
      );
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const removeImage = async (image: ListingImageRow) => {
    if (photoBusy) return;
    /* A listing with no photograph cannot be shown honestly anywhere in the
       app, so the last one is kept until a replacement is added. */
    if (images.length <= 1) {
      setPhotoError(`A ${editNoun} needs at least one photo. Add another before removing this one.`);
      return;
    }
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      await removeOwnListingImage(row.id, image.storage_path);
      if (!mounted.current) return;
      setImages((previous) => previous.filter((item) => item.storage_path !== image.storage_path));
    } catch (caught) {
      if (!mounted.current) return;
      setPhotoError(
        caught instanceof ListingEditError ? caught.message : 'That photo could not be removed.'
      );
    } finally {
      if (mounted.current) setPhotoBusy(false);
    }
  };

  const addImages = async () => {
    if (photoBusy) return;
    const remaining = LISTING_PHOTO_LIMIT - images.length;
    if (remaining <= 0) {
      setPhotoError(`A ${editNoun} can have at most ${LISTING_PHOTO_LIMIT} photos.`);
      return;
    }

    setPhotoBusy(true);
    setPhotoError(null);
    let picked: LocalListingPhoto[] = [];
    try {
      const assets = await openListingImageLibrary(remaining);
      if (assets.length === 0) return;
      picked = ingestListingPhotoAssets(assets, []).slice(0, remaining);

      /* Prepared one at a time so several large decodes never run at once,
         and uploaded as each one is ready. */
      let position = await nextListingImagePosition(row.id);
      const added: ListingImageRow[] = [];
      for (const photo of picked) {
        const prepared = await prepareListingPhoto(photo);
        if (prepared.state !== 'ready' || !prepared.prepared) {
          throw new ListingEditError(
            prepared.error ?? 'That photo could not be prepared.',
            'photo-add-failed'
          );
        }
        const bytes = await readPreparedPhotoBytes(prepared.prepared.uri);
        const path = `${row.id}/${position}-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 10)}.${prepared.prepared.extension}`;
        await uploadListingObject(path, bytes);
        await insertListingImage({
          listingId: row.id,
          path,
          position,
          width: prepared.prepared.width,
          height: prepared.prepared.height,
        });
        added.push({ storage_path: path, position });
        position += 1;
        disposeListingPhoto(prepared);
      }

      if (!mounted.current) return;
      setImages((previous) => [...previous, ...added]);
    } catch (caught) {
      if (!mounted.current) return;
      setPhotoError(
        caught instanceof Error ? caught.message : 'Those photos could not be added.'
      );
    } finally {
      picked.forEach(disposeListingPhoto);
      if (mounted.current) setPhotoBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader title={`Edit ${editNoun}`} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: space.gutterCompact,
            paddingTop: space.space20,
            paddingBottom: insets.bottom + space.space48,
          }}
        >
          <T variant="sectionTitle" accessibilityRole="header">
            Photos
          </T>
          <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4 }}>
            {images.length} of {LISTING_PHOTO_LIMIT} used. The first photo is the cover.
          </T>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.space12, paddingVertical: space.space16 }}
          >
            {images.map((image, index) => (
              <View key={image.storage_path} style={{ width: 112 }}>
                <View
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={`Photo ${index + 1} of ${images.length}${index === 0 ? ', cover photo' : ''}`}
                  style={{
                    height: 140,
                    borderRadius: radius.radiusMedium,
                    borderCurve: 'continuous',
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: C.border,
                    backgroundColor: C.surface,
                  }}
                >
                  <Image
                    source={{ uri: imageUrl(image.storage_path) }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                  <Tap
                    onPress={() => void removeImage(image)}
                    disabled={photoBusy}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${index + 1}`}
                    style={{
                      position: 'absolute',
                      right: space.space4,
                      top: space.space4,
                      width: touch.minimum,
                      height: touch.minimum,
                      borderRadius: radius.radiusPill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: C.background,
                    }}
                  >
                    <Icon name="close" role="metadata" color={C.textPrimary} decorative />
                  </Tap>
                </View>
              </View>
            ))}

            {images.length < LISTING_PHOTO_LIMIT ? (
              <Tap
                onPress={() => void addImages()}
                disabled={photoBusy}
                accessibilityRole="button"
                accessibilityLabel="Add photos"
                accessibilityHint={`Opens your image library; you can choose up to ${
                  LISTING_PHOTO_LIMIT - images.length
                } more photos`}
                style={{
                  width: 112,
                  height: 140,
                  borderRadius: radius.radiusMedium,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: C.border,
                  backgroundColor: C.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: space.space8,
                }}
              >
                <Icon name="plus" role="action" color={C.primary} decorative />
                <T variant="metadataMedium" color={C.primary}>
                  {photoBusy ? 'Working…' : 'Add photos'}
                </T>
              </Tap>
            ) : null}
          </ScrollView>

          {photoError ? <InlineError message={photoError} /> : null}

          <View
            style={{
              marginTop: space.space24,
              paddingTop: space.space24,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <T variant="sectionTitle" accessibilityRole="header" style={{ marginBottom: space.space16 }}>
              {row.listing_type === 'job' ? 'Job' : row.listing_type === 'service' ? 'Service' : row.listing_type === 'food' ? 'Food listing' : 'Product'}
            </T>

            <Field
              label="Title"
              value={title}
              onChangeText={(value) => setTitle(value.slice(0, 120))}
              placeholder={row.listing_type === 'job' ? 'Job title' : row.listing_type === 'service' ? 'Service title' : 'What are you listing?'}
              maxLength={120}
              editable={!saving}
              error={attempted ? validationErrors.title : undefined}
            />
            <Field
              label="Description"
              value={description}
              onChangeText={(value) => setDescription(value.slice(0, 4000))}
              placeholder={`Describe this ${editNoun}`}
              maxLength={4000}
              multiline
              editable={!saving}
              error={attempted ? validationErrors.description : undefined}
              style={{ minHeight: 96, textAlignVertical: 'top' }}
            />
            {isCommerceListing(row.listing_type) ? <Field
              label="Brand"
              value={brand}
              onChangeText={setBrand}
              placeholder="Optional"
              editable={!saving}
              error={attempted ? validationErrors.brand : undefined}
            /> : null}
            {row.listing_type === 'product' && detailKind === 'product' ? <View style={{ flexDirection: 'row', gap: space.space12 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Colour"
                  value={color}
                  onChangeText={setColor}
                  placeholder="Optional"
                  editable={!saving}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Size"
                  value={size}
                  onChangeText={setSize}
                  placeholder="Optional"
                  editable={!saving}
                />
              </View>
            </View> : null}

            {row.listing_type === 'job' ? (
              <View style={{ flexDirection: 'row', gap: space.space12 }}>
                <View style={{ flex: 1 }}><Field label={`Minimum salary (${row.currency})`} value={specialized.job.salaryMin} onChangeText={(salaryMin) => setSpecialized('job', { salaryMin: salaryMin.replace(/[^0-9.,]/g, '') })} keyboardType="decimal-pad" editable={!saving} error={attempted ? validationErrors.salaryMin : undefined} /></View>
                <View style={{ flex: 1 }}><Field label={`Maximum salary (${row.currency})`} value={specialized.job.salaryMax} onChangeText={(salaryMax) => setSpecialized('job', { salaryMax: salaryMax.replace(/[^0-9.,]/g, '') })} keyboardType="decimal-pad" editable={!saving} error={attempted ? validationErrors.salaryMax : undefined} /></View>
              </View>
            ) : row.listing_type === 'service' ? (
              <View>
                <ChoiceField label="Pricing mode" value={specialized.service.pricingMode} options={[["fixed", "Fixed price"], ["hourly", "Per hour"], ["daily", "Per day"], ["quote", "Quote required"]] as const} onChange={(pricingMode) => { setSpecialized('service', { pricingMode }); if (pricingMode === 'quote') setPrice(''); }} error={attempted ? validationErrors.pricingMode : undefined} />
                {specialized.service.pricingMode !== 'quote' ? <Field
                  label={`Price (${row.currency})`}
                  value={price}
                  onChangeText={(value) => setPrice(value.replace(/[^0-9.,]/g, ''))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  editable={!saving}
                  error={attempted ? validationErrors.price : undefined}
                /> : null}
              </View>
            ) : <><Field
              label={`Price (${row.currency})`}
              value={price}
              onChangeText={(value) => setPrice(value.replace(/[^0-9.,]/g, ''))}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!saving}
              hint={
                priceCents === null
                  ? 'Enter a price above zero.'
                  : `Buyers will see ${formatPrice(priceCents, row.currency)}`
              }
              error={attempted ? validationErrors.price : undefined}
            />
            <Field label={`Original price (${row.currency})`} value={originalPrice} onChangeText={(value) => setOriginalPrice(value.replace(/[^0-9.,]/g, ''))} placeholder="Optional" keyboardType="decimal-pad" editable={!saving} error={attempted ? validationErrors.originalPrice : undefined} /></>}
          </View>

          {detailKind !== 'product' ? (
            <View style={{ marginTop: space.space24, paddingTop: space.space24, borderTopWidth: 1, borderTopColor: C.border }}>
              <T variant="sectionTitle" accessibilityRole="header" style={{ marginBottom: space.space16 }}>
                {detailKind === 'food' ? 'Food details' : detailKind === 'perfume' ? 'Fragrance details' : detailKind === 'job' ? 'Job details' : 'Service details'}
              </T>
              <SpecializedFields kind={detailKind} values={specialized} setValues={setSpecialized} errors={attempted ? validationErrors : {}} />
            </View>
          ) : null}

          <View
            style={{
              marginTop: space.space8,
              paddingTop: space.space24,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <T variant="sectionTitle" accessibilityRole="header">
              Category
            </T>
            {categories.loading ? (
              <View style={{ flexDirection: 'row', gap: space.space8, marginTop: space.space16 }}>
                <Skeleton width={104} height={touch.minimum} round={radius.radiusMedium} />
                <Skeleton width={92} height={touch.minimum} round={radius.radiusMedium} />
                <Skeleton width={116} height={touch.minimum} round={radius.radiusMedium} />
              </View>
            ) : categories.error ? (
              <InlineError
                message="Categories could not be loaded."
                actionLabel="Retry"
                onAction={categories.refetch}
                style={{ marginTop: space.space16 }}
              />
            ) : (
              <View style={{ marginTop: space.space12 }}>
                {selectedCategoryPath.length > 0 ? (
                  <T variant="metadataMedium" color={C.primary} style={{ marginBottom: space.space8 }}>
                    {selectedCategoryPath.map((category) => category.label).join(' › ')}
                  </T>
                ) : null}
                <CategoryTreePicker
                  categories={categoryRows}
                  selectedSlug={categorySlug}
                  disabled={saving}
                  onSelect={(category) => {
                    setCategorySlug(category.slug);
                    haptic('selection-committed');
                  }}
                />
                {attempted && validationErrors.category ? <InlineError message={validationErrors.category} style={{ marginTop: space.space8 }} /> : null}
              </View>
            )}
          </View>

          {/*
            Stated rather than silently omitted. `delivery_options` is keyed by
            `country_code` and has no `seller_id` or `listing_id` column, and no
            write policy for authenticated users, so a delivery method is not a
            thing a seller can own or change. The buyer picks one at checkout
            from the options available in this product's country.
          */}
          {isCommerceListing(row.listing_type) ? <View
            style={{
              marginTop: space.space32,
              padding: space.space16,
              borderRadius: radius.radiusLarge,
              borderCurve: 'continuous',
              backgroundColor: C.surfaceSecondary,
              flexDirection: 'row',
              gap: space.space12,
            }}
          >
            <Icon name="truck" role="inline" color={C.textPrimary} decorative />
            <View style={{ flex: 1, gap: space.space4 }}>
              <T variant="bodyMedium">Delivery is set per country</T>
              <T variant="metadata" color={C.textSecondary}>
                Buyers choose from the delivery options Nilya offers in this listing&apos;s
                country. Sellers do not set delivery methods or their prices.
              </T>
            </View>
          </View> : null}

          {error ? <InlineError message={error} style={{ marginTop: space.space24 }} /> : null}

          <Button
            label="Save changes"
            loading={saving}
            loadingLabel="Saving…"
            disabled={photoBusy}
            onPress={() => void save()}
            style={{ marginTop: space.space24 }}
          />
          <Button
            label="Cancel"
            variant="ghost"
            disabled={saving}
            onPress={() => router.back()}
            style={{ marginTop: space.space8 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

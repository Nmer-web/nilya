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
import { NEW_CONDITION, type ListingImageRow } from '@/lib/database.types';
import { categoryPath } from '@/lib/categories';
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
        <ScreenHeader title="Edit product" />
        <EmptyState
          icon="bag"
          title="Product unavailable"
          body="This link does not point at one of your products."
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

  useEffect(() => {
    if (!row || seeded.current) return;
    seeded.current = true;
    setTitle(row.title);
    setDescription(row.description ?? '');
    setBrand(row.brand ?? '');
    setColor(row.color ?? '');
    setSize(row.size ?? '');
    setCategorySlug(row.category_slug);
    /* Cents to the seller's own units, so what they edit is what they see. */
    setPrice((row.price_cents / 100).toString());
    setImages([...row.images].sort((a, b) => a.position - b.position));
  }, [row]);

  const categoryRows = useMemo(() => categories.data ?? [], [categories.data]);
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

  if (listing.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Edit product" />
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
        <ScreenHeader title="Edit product" />
        {listing.error ? (
          <ScreenError
            error={listing.error}
            title="Could not load this product"
            onRetry={listing.refetch}
          />
        ) : (
          <EmptyState
            icon="bag"
            title="Product unavailable"
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
        <ScreenHeader title="Edit product" />
        <EmptyState
          icon="shield"
          title="This is not your product"
          body="Only the seller who published a product can edit it."
          action={
            <Button
              label="Back to the product"
              variant="secondary"
              onPress={() => router.replace({ pathname: '/listing/[id]', params: { id: row.id } })}
              style={{ marginTop: space.space20 }}
            />
          }
        />
      </View>
    );
  }

  if (row.condition !== NEW_CONDITION) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader title="Edit product" />
        <EmptyState
          icon="info"
          title="This product cannot be edited"
          body="NILYA sells new products only, and this listing is not recorded as new."
        />
      </View>
    );
  }

  const trimmedTitle = title.trim();
  const categoryValid = categoryRows.some((category) => category.slug === categorySlug);
  const complete =
    trimmedTitle.length >= 1 &&
    trimmedTitle.length <= 120 &&
    description.length <= 4000 &&
    categoryValid &&
    priceCents !== null;

  const save = async () => {
    if (savingRef.current || !complete || priceCents === null) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await updateOwnListing(row.id, {
        title: trimmedTitle,
        description: description.trim() || null,
        brand: brand.trim() || null,
        color: color.trim() || null,
        size: size.trim() || null,
        categorySlug,
        priceCents,
        city: row.city,
        countryCode: row.country_code,
      });
      if (!mounted.current) return;
      flash('Product updated');
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
      setPhotoError('A product needs at least one photo. Add another before removing this one.');
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
      setPhotoError(`A product can have at most ${LISTING_PHOTO_LIMIT} photos.`);
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
      <ScreenHeader title="Edit product" />
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
              Product
            </T>

            <Field
              label="Title"
              value={title}
              onChangeText={(value) => setTitle(value.slice(0, 120))}
              placeholder="What are you selling?"
              maxLength={120}
              editable={!saving}
            />
            <Field
              label="Description"
              value={description}
              onChangeText={(value) => setDescription(value.slice(0, 4000))}
              placeholder="Describe your product"
              maxLength={4000}
              multiline
              editable={!saving}
              style={{ minHeight: 96, textAlignVertical: 'top' }}
            />
            <Field
              label="Brand"
              value={brand}
              onChangeText={setBrand}
              placeholder="Optional"
              editable={!saving}
            />
            <View style={{ flexDirection: 'row', gap: space.space12 }}>
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
            </View>

            <Field
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
            />
          </View>

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
          <View
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
                Buyers choose from the delivery options NILYA offers in this product&apos;s
                country. Sellers do not set delivery methods or their prices.
              </T>
            </View>
          </View>

          {error ? <InlineError message={error} style={{ marginTop: space.space24 }} /> : null}

          <Button
            label="Save changes"
            loading={saving}
            loadingLabel="Saving…"
            disabled={!complete || photoBusy}
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

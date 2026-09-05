import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { formatPrice } from '@/components/listing-card';
import { InlineError, Tap } from '@/components/ui';
import { useDraft } from '@/features/sell/DraftContext';
import type { ListingDraft } from '@/features/sell/draft';
import { publicationFailureMessage, useRecovery } from '@/features/sell/recovery';
import { useSellerProfile } from '@/features/sell/seller-profile';
import { validateStepFields, type SellStep } from '@/features/sell/validation';
import { EDGE, SellStepScreen, STEP_ROUTES, StepFade } from '@/features/sell/wizard';
import { useAsync } from '@/hooks/use-async';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { countryName } from '@/lib/countries';
import { categoryBySlug, categoryHasChildren, categoryPath } from '@/lib/categories';
import { haptic } from '@/lib/haptics';
import {
  publishRealListing,
  type PublicationFailureAction,
  type PublicationOutcome,
  type PublicationPhase,
} from '@/lib/listing-publication';
import { fetchCategoryTree, fetchPlatformSettings } from '@/lib/queries';
import { color as C, duration, radius, space, type } from '@/theme/tokens';

function phaseLabel(phase: PublicationPhase): string {
  switch (phase.kind) {
    case 'validating': return 'Checking listing…';
    case 'preparing': return `Preparing photo ${phase.current} of ${phase.total}…`;
    case 'creating-draft': return 'Creating private draft…';
    case 'uploading': return `Uploading photo ${phase.current} of ${phase.total}…`;
    case 'activating': return 'Activating listing…';
    case 'confirming': return 'Confirming publication…';
    case 'cleaning-up': return 'Finishing cleanup…';
  }
}

function priceOrNull(value: string, currency: string): string | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return formatPrice(Number(whole) * 100 + Number(fraction.padEnd(2, '0')), currency);
}

/**
 * Step 6: the listing as it will be published, with a way back into every
 * step, and the real publication.
 *
 * Publishing is the same pipeline as before — a private draft row, the
 * photographs uploaded one by one, activation, confirmation — with the same
 * recovery journal, so a failure part-way leaves nothing half-live. Success
 * clears the local draft and lands on the confirmation screen.
 */
export default function ReviewStep() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { reduceMotion } = useReducedMotion();
  const { draft, photos, discard } = useDraft();
  const recovery = useRecovery();
  const profile = useSellerProfile();
  const settings = useAsync(fetchPlatformSettings, 'platform-settings');
  const categories = useAsync(fetchCategoryTree, 'categories:tree');
  const [attempted, setAttempted] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<PublicationFailureAction | null>(null);
  const oneFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const currency = (settings.data?.base_currency ?? 'EUR').trim().toUpperCase();
  const categoryRows = categories.data ?? [];
  const selectedCategory = categoryBySlug(categoryRows, draft.categorySlug);
  const selectedCategoryIsLeaf = selectedCategory
    ? !categoryHasChildren(categoryRows, selectedCategory.id)
    : false;
  const errors = { ...validateStepFields(6, draft, photos) };
  if (categories.loading) errors.category = 'Wait for categories to load.';
  else if (categories.error) errors.category = 'Categories could not be loaded.';
  else if (!selectedCategory || !selectedCategoryIsLeaf) errors.category = 'Choose a more specific category.';
  const selectedCategoryPath = selectedCategoryIsLeaf
    ? categoryPath(categoryRows, selectedCategory?.slug ?? null)
    : [];
  const categoryLabel = selectedCategoryPath.length > 0
    ? selectedCategoryPath.map((category) => category.label).join(' › ')
    : draft.categorySlug ?? '';
  const price = priceOrNull(draft.price, currency);
  const original = draft.originalPrice.trim() ? priceOrNull(draft.originalPrice, currency) : null;
  const noun = draft.listingType === 'job' ? 'job' : draft.listingType === 'service' ? 'service' : 'listing';
  const cover = photos[0] ?? null;
  const coverSize = width - EDGE * 2;

  const goTo = (step: SellStep) => router.navigate(STEP_ROUTES[step]);

  const publish = async () => {
    if (oneFlight.current || Object.keys(errors).length > 0 || !draft.categorySlug || !draft.countryCode) return;
    oneFlight.current = true;
    setPublishing(true);
    setError(null);
    setAction(null);
    let succeeded = false;
    try {
      const outcome = await publishRealListing(
        {
          title: draft.title,
          description: draft.description,
          brand: draft.brand,
          color: draft.attributes.color ?? '',
          size: draft.attributes.size ?? '',
          categorySlug: draft.categorySlug,
          price: draft.price,
          originalPrice: draft.originalPrice,
          /* The location step's city wins; the profile is the fallback for a
             seller who skipped it, which is how city was always filled. */
          city: draft.city ?? profile.data?.city ?? '',
          countryCode: draft.countryCode,
          latitude: draft.latitude,
          longitude: draft.longitude,
          currency,
          listingType: draft.listingType,
          detailKind: draft.detailKind,
          specialized: draft.specialized,
        },
        [...photos],
        { onPhase: recovery.setPhase }
      );
      succeeded = outcome.kind === 'success';
      await settle(outcome);
    } finally {
      oneFlight.current = false;
      if (mounted.current && !succeeded) setPublishing(false);
    }
  };

  const settle = async (outcome: PublicationOutcome) => {
    if (outcome.kind !== 'success') {
      const message = publicationFailureMessage(outcome);
      setError(message);
      setAction(outcome.action);
      if (outcome.kind === 'recovery-required' || outcome.kind === 'integrity-error') {
        recovery.block({
          message,
          reason: outcome.kind === 'recovery-required' ? 'recovery' : 'integrity',
          recoveryRecord: outcome.kind === 'recovery-required' ? outcome.recoveryRecord : null,
        });
      }
      if (outcome.kind === 'session-required') router.push('/sign-in');
      return;
    }
    recovery.setPhase(null);
    haptic('publication-confirmed');
    await new Promise<void>((resolve) => setTimeout(resolve, reduceMotion ? 120 : 700));
    if (!mounted.current) return;
    await discard();
    router.replace({ pathname: '/sell/success', params: { id: outcome.listingId } });
  };

  const actionLabel =
    action === 'retry-publication' ? 'Retry publication'
      : action === 'review-photo' ? 'Review photos'
        : action === 'edit-profile' ? 'Open profile'
          : undefined;

  const runAction = () => {
    if (action === 'retry-publication') void publish();
    else if (action === 'review-photo') goTo(1);
    else if (action === 'edit-profile') router.push('/edit-profile');
  };

  return (
    <SellStepScreen
      step={7}
      title={`Review your ${noun}`}
      subtitle="This is what people will see on Nilya."
      errors={errors}
      onAttempt={() => setAttempted(true)}
      onContinue={() => void publish()}
      continueLabel="Publish listing"
      busy={publishing}
      busyLabel={recovery.phase ? phaseLabel(recovery.phase) : 'Publishing…'}
      footerNote={
        error ? <InlineError message={error} actionLabel={actionLabel} onAction={actionLabel ? runAction : undefined} /> : null
      }
    >
      <StepFade>
        <Section title="Photos" onEdit={() => goTo(1)} error={attempted ? errors.photos : undefined}>
          {cover ? (
            <View>
              <View style={{ width: coverSize, height: Math.round(coverSize * 0.75), borderRadius: radius.radiusXLarge, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: C.bgMuted }}>
                <Image source={{ uri: cover.previewUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={duration.standard} accessibilityLabel="Cover photo" />
              </View>
              {photos.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.space8, paddingTop: space.space8 }}>
                  {photos.map((photo, index) => (
                    <Image
                      key={photo.id}
                      source={{ uri: photo.previewUri }}
                      style={{ width: 56, height: 56, borderRadius: radius.radiusSmall }}
                      contentFit="cover"
                      accessibilityLabel={`Photo ${index + 1} of ${photos.length}`}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ) : (
            <Text style={{ ...type.metadata, color: C.textSecondary }}>No photos yet.</Text>
          )}
        </Section>

        <Section title="Details" onEdit={() => goTo(2)} error={attempted ? errors.title ?? errors.description ?? errors.brand : undefined}>
          <Text style={{ ...type.productTitle, color: C.textPrimary }}>{draft.title.trim() || 'Untitled'}</Text>
          {draft.brand.trim() ? <Row label="Brand" value={draft.brand.trim()} /> : null}
          {draft.description.trim() ? (
            <Text style={{ ...type.body, color: C.textSecondary, marginTop: space.space8 }}>{draft.description.trim()}</Text>
          ) : null}
        </Section>

        <Section title="Category" onEdit={() => goTo(3)} error={attempted ? errors.category : undefined}>
          <Row label="Category" value={categoryLabel || 'Not chosen'} />
        </Section>

        <Section title={draft.detailKind === 'job' ? 'Job details' : draft.detailKind === 'service' ? 'Service details' : draft.detailKind === 'food' ? 'Food details' : draft.detailKind === 'perfume' ? 'Fragrance details' : 'Product details'} onEdit={() => goTo(4)} error={attempted ? Object.values(errors)[0] : undefined}>
          <ReviewSpecialized draft={draft} />
        </Section>

        <Section title={draft.listingType === 'job' ? 'Compensation' : 'Price'} onEdit={() => goTo(5)} error={attempted ? errors.price ?? errors.salaryMin ?? errors.salaryMax ?? errors.originalPrice ?? errors.countryCode : undefined}>
          {draft.listingType === 'job' ? (
            <Row label="Salary" value={`${priceOrNull(draft.specialized.job.salaryMin, currency) ?? 'Not set'}–${priceOrNull(draft.specialized.job.salaryMax, currency) ?? 'Not set'}`} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.space8 }}>
              <Text style={{ ...type.detailPrice, color: C.textPrimary }}>{draft.specialized.service.pricingMode === 'quote' ? 'Quote required' : price ?? 'Not set'}</Text>
              {original && draft.listingType === 'product' ? <Text style={{ ...type.metadata, color: C.inkFaint, textDecorationLine: 'line-through' }}>{original}</Text> : null}
            </View>
          )}
          <Row label={draft.listingType === 'job' ? 'Job country' : draft.listingType === 'service' ? 'Provider country' : 'Ships from'} value={draft.countryCode ? countryName(draft.countryCode) : 'Not chosen'} />
        </Section>

        {/* Location carries no errors: a listing without one publishes
            normally, it simply does not appear on the map. */}
        <Section title="Location" onEdit={() => goTo(6)}>
          <Row label="City" value={draft.city?.trim() || 'Not set'} />
          <Row
            label="On the map"
            value={
              draft.latitude !== null && draft.longitude !== null
                ? 'Pinned'
                : 'Not pinned'
            }
          />
        </Section>
      </StepFade>
    </SellStepScreen>
  );
}

function Section({ title, onEdit, error, children }: { title: string; onEdit: () => void; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingVertical: space.space16, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.space12 }}>
        <Text accessibilityRole="header" style={{ ...type.metadataMedium, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</Text>
        <Tap onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Edit ${title.toLowerCase()}`} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
          <Text style={{ ...type.metadataMedium, color: C.primary }}>Edit</Text>
        </Tap>
      </View>
      {children}
      {error ? <Text accessibilityRole="alert" style={{ ...type.metadata, color: C.errorText, marginTop: space.space8 }}>{error}</Text> : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.space12, marginTop: space.space8 }}>
      <Text style={{ ...type.metadata, color: C.textSecondary }}>{label}</Text>
      <Text style={{ ...type.metadataMedium, color: C.textPrimary, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function readable(value: string): string {
  return value.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function ReviewSpecialized({ draft }: { draft: ListingDraft }) {
  if (draft.detailKind === 'food') {
    const food = draft.specialized.food;
    return (
      <>
        <Row label="Quantity" value={`${food.quantity || 'Not set'} ${food.priceUnit || ''}`.trim()} />
        <Row label="Ingredients" value={food.ingredients || 'Not set'} />
        <Row label="Allergens" value={food.allergens || 'Not set'} />
        <Row label="Expiry" value={food.expiryDate || 'Not set'} />
        <Row label="Halal" value={readable(food.halalStatus || 'not specified')} />
        <Row label="Preparation" value={readable(food.preparationType || 'not set')} />
        <Row label="Storage" value={food.storageRequirements || 'Not set'} />
        <Row label="Delivery" value={food.deliveryRequirements || 'Not set'} />
      </>
    );
  }

  if (draft.detailKind === 'perfume') {
    const perfume = draft.specialized.perfume;
    return (
      <>
        <Row label="Brand" value={draft.brand.trim() || 'Not set'} />
        <Row label="Fragrance" value={perfume.fragranceName || 'Not set'} />
        <Row label="Type" value={readable(perfume.fragranceType || 'not set')} />
        <Row label="Volume" value={perfume.volumeMl ? `${perfume.volumeMl} ml` : 'Not set'} />
        <Row label="Condition" value="New" />
        <Row label="Sealed" value={perfume.sealed ? 'Yes' : 'No'} />
        <Row label="Authenticity" value={perfume.authenticityDeclared ? 'Declared authentic' : 'Not declared'} />
        <Row label="Notes" value={perfume.fragranceNotes || 'Not set'} />
        <Row label="Audience" value={readable(perfume.targetAudience || 'not set')} />
      </>
    );
  }

  if (draft.detailKind === 'job') {
    const job = draft.specialized.job;
    return (
      <>
        <Row label="Employer" value={job.employer || 'Not set'} />
        <Row label="Sector" value={job.sector || 'Not set'} />
        <Row label="Contract" value={readable(job.contractType || 'not set')} />
        <Row label="Schedule" value={job.schedule || 'Not set'} />
        <Row label="Work mode" value={readable(job.workMode || 'not set')} />
        <Row label="Location" value={job.location || 'Not set'} />
        <Row label="Experience" value={job.requiredExperience || 'Not set'} />
        <Row label="Apply via" value={readable(job.applicationMethod || 'not set')} />
        <Row label="Deadline" value={job.applicationDeadline || 'Not set'} />
      </>
    );
  }

  if (draft.detailKind === 'service') {
    const service = draft.specialized.service;
    return (
      <>
        <Row label="Pricing" value={readable(service.pricingMode || 'not set')} />
        <Row label="Service area" value={service.serviceArea || 'Not set'} />
        <Row label="Delivery" value={readable(service.deliveryMode || 'not set')} />
        <Row label="Availability" value={service.availability || 'Not set'} />
        <Row label="Experience" value={service.experience || 'Not set'} />
      </>
    );
  }

  return (
    <>
      {draft.attributes.size ? <Row label="Size" value={draft.attributes.size} /> : null}
      {draft.attributes.color ? <Row label="Colour" value={draft.attributes.color} /> : null}
      <Row label="Condition" value="New" />
    </>
  );
}

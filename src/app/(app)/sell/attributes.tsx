import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { attributeFieldsFor } from '@/config/categoryAttributes';
import { AttributeRenderer } from '@/features/sell/AttributeRenderer';
import { useDraft } from '@/features/sell/DraftContext';
import { SpecializedFields } from '@/features/sell/SpecializedFields';
import { validateStepFields } from '@/features/sell/validation';
import { SellStepScreen, StepFade } from '@/features/sell/wizard';
import { useAsync } from '@/hooks/use-async';
import { fetchCategoryTree } from '@/lib/queries';
import { color as C, space, type } from '@/theme/tokens';

/**
 * Step 4: attributes, rendered from `categoryAttributes.ts`.
 *
 * This screen knows nothing about any category. It resolves the field list
 * for the chosen slug and hands each entry to the renderer; a category with
 * no fields says so and moves on.
 */
export default function AttributesStep() {
  const router = useRouter();
  const { draft, photos, setAttribute, setSpecialized } = useDraft();
  const [attempted, setAttempted] = useState(false);
  const categories = useAsync(fetchCategoryTree, 'categories:tree');

  const fields = attributeFieldsFor(draft.categorySlug);
  const errors = validateStepFields(4, draft, photos);
  const shown = attempted ? errors : {};
  const label = (categories.data ?? []).find((row) => row.slug === draft.categorySlug)?.label ?? 'this category';
  const title = draft.detailKind === 'job'
    ? 'Job details'
    : draft.detailKind === 'service'
      ? 'Service details'
      : draft.detailKind === 'food'
        ? 'Food details'
        : draft.detailKind === 'perfume'
          ? 'Fragrance details'
          : 'Product details';

  return (
    <SellStepScreen
      step={4}
      title={title}
      subtitle={draft.detailKind === 'product' && fields.length > 0 ? `What buyers filter ${label} by.` : `Help people understand this ${draft.listingType}.`}
      errors={errors}
      onAttempt={() => setAttempted(true)}
      onContinue={() => router.push('/sell/pricing')}
    >
      <StepFade>
        {draft.detailKind !== 'product' ? (
          <SpecializedFields
            kind={draft.detailKind}
            values={draft.specialized}
            setValues={setSpecialized}
            errors={shown}
          />
        ) : fields.length === 0 ? (
          <Text style={{ ...type.body, color: C.textSecondary }}>
            Nothing more to add for {label}. Continue to set the price.
          </Text>
        ) : (
          <View style={{ gap: space.space24 }}>
            {fields.map((field) => (
              <AttributeRenderer
                key={field.key}
                field={field}
                value={draft.attributes[field.key]}
                onChange={(next) => setAttribute(field.key, next)}
                error={shown[field.key]}
              />
            ))}
          </View>
        )}
      </StepFade>
    </SellStepScreen>
  );
}

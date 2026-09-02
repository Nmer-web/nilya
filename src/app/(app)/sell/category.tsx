import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { CategoryTreePicker } from '@/components/category-tree-picker';
import { Icon } from '@/components/icon';
import { Skeleton } from '@/components/skeleton';
import { InlineError, T, Tap } from '@/components/ui';
import { useDraft } from '@/features/sell/DraftContext';
import { validateStepFields } from '@/features/sell/validation';
import { ConfirmSheet, FieldError, SellStepScreen, StepFade } from '@/features/sell/wizard';
import { useAsync } from '@/hooks/use-async';
import {
  categoryBySlug,
  categoryHasChildren,
  categoryPath,
} from '@/lib/categories';
import type { CategoryRow } from '@/lib/database.types';
import { haptic } from '@/lib/haptics';
import { fetchCategoryTree } from '@/lib/queries';
import { color as C, radius, space, touch } from '@/theme/tokens';

/** Step 3: drill through the shared backend hierarchy and select a leaf. */
export default function CategoryStep() {
  const router = useRouter();
  const { draft, photos, setCategory } = useDraft();
  const categories = useAsync(fetchCategoryTree, 'categories:tree');
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState<CategoryRow | 'clear' | null>(null);

  const rows = categories.data ?? [];
  const selected = categoryBySlug(rows, draft.categorySlug);
  const selectedIsLeaf = selected ? !categoryHasChildren(rows, selected.id) : false;
  const path = selectedIsLeaf ? categoryPath(rows, selected?.slug ?? null) : [];
  const hasAttributes = draft.attributes.size !== null || draft.attributes.color !== null;
  const errors = { ...validateStepFields(3, draft, photos) };

  if (categories.loading) errors.category = 'Wait for categories to load.';
  else if (categories.error) errors.category = 'Categories could not be loaded.';
  else if (draft.categorySlug && !selected) errors.category = 'Choose an available category.';
  else if (selected && !selectedIsLeaf) errors.category = 'Choose a more specific category.';

  const choose = (category: CategoryRow) => {
    if (category.slug === draft.categorySlug) return;
    if (hasAttributes) {
      setPending(category);
      return;
    }
    haptic('selection-committed');
    setCategory(category.slug);
  };

  return (
    <SellStepScreen
      step={3}
      title="Pick a category"
      subtitle="Choose the most specific category so buyers can find your product."
      errors={errors}
      onAttempt={() => setAttempted(true)}
      onContinue={() => router.push('/sell/attributes')}
    >
      <StepFade>
        {selectedIsLeaf && selected ? (
          <View
            style={{
              minHeight: touch.minimum,
              marginBottom: space.space16,
              paddingLeft: space.space16,
              paddingRight: space.space4,
              borderRadius: radius.radiusLarge,
              backgroundColor: C.primarySoft,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.space8,
            }}
          >
            <Icon name="check" role="navigation" color={C.primary} decorative />
            <T variant="metadataMedium" numberOfLines={2} style={{ flex: 1, color: C.primary }}>
              {path.map((category) => category.label).join(' › ')}
            </T>
            <Tap
              onPress={() => (hasAttributes ? setPending('clear') : setCategory(null))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${selected.label}`}
              hitSlop={6}
              style={{ width: touch.minimum, height: touch.minimum, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="close" role="metadata" color={C.primary} decorative />
            </Tap>
          </View>
        ) : null}

        {categories.loading ? (
          <CategoryPickerSkeleton />
        ) : categories.error ? (
          <InlineError message="Categories could not be loaded." actionLabel="Retry" onAction={categories.refetch} />
        ) : rows.length > 0 ? (
          <CategoryTreePicker
            categories={rows}
            selectedSlug={selectedIsLeaf ? selected?.slug ?? null : null}
            onSelect={choose}
          />
        ) : (
          <T variant="body" color={C.textSecondary}>
            No active categories are available right now.
          </T>
        )}

        {attempted ? <FieldError message={errors.category} /> : null}
      </StepFade>

      <ConfirmSheet
        visible={pending !== null}
        title={pending === 'clear' ? 'Remove category?' : 'Change category?'}
        body="The size and colour you chose belong to the current category and will be cleared."
        actions={[
          {
            label: pending === 'clear' ? 'Remove category' : 'Change category',
            onPress: () => {
              if (pending) {
                haptic('selection-committed');
                setCategory(pending === 'clear' ? null : pending.slug);
              }
              setPending(null);
            },
          },
          { label: 'Keep it', onPress: () => setPending(null) },
        ]}
        onDismiss={() => setPending(null)}
      />
    </SellStepScreen>
  );
}

function CategoryPickerSkeleton() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading categories">
      <Skeleton width="52%" height={16} style={{ marginVertical: space.space16 }} />
      {[0, 1, 2, 3, 4].map((index) => (
        <View
          key={index}
          style={{
            minHeight: 68,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.space12,
            borderBottomWidth: index === 4 ? 0 : 1,
            borderBottomColor: C.border,
          }}
        >
          <Skeleton width={40} height={40} round={radius.radiusPill} />
          <Skeleton width={index % 2 === 0 ? '44%' : '58%'} height={14} />
        </View>
      ))}
    </View>
  );
}

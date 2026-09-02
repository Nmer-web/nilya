import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useDraft } from '@/features/sell/DraftContext';
import { BRAND_MAX, DESCRIPTION_MAX, TITLE_MAX, validateStepFields } from '@/features/sell/validation';
import { SelectPill, SellStepScreen, SellTextField, StepFade } from '@/features/sell/wizard';
import { useAsync } from '@/hooks/use-async';
import { fetchListingBrands } from '@/lib/queries';
import { color as C, space, type } from '@/theme/tokens';

const SUGGESTION_LIMIT = 6;

/**
 * Step 2: title, brand and description.
 *
 * Brand suggestions are the brands real sellers have already used on NILYA,
 * matched by prefix as the seller types; free text is always allowed. There
 * is no condition field: every product on NILYA is new, and the column is
 * written as such at publish.
 */
export default function DetailsStep() {
  const router = useRouter();
  const { draft, patch, photos } = useDraft();
  const [attempted, setAttempted] = useState(false);
  const brands = useAsync(fetchListingBrands, 'sell:brands');

  const errors = validateStepFields(2, draft, photos);
  const shown = attempted ? errors : {};

  const suggestions = useMemo(() => {
    const query = draft.brand.trim().toLowerCase();
    if (!query) return [];
    return (brands.data ?? [])
      .filter((brand) => brand.toLowerCase().startsWith(query) && brand.toLowerCase() !== query)
      .slice(0, SUGGESTION_LIMIT);
  }, [brands.data, draft.brand]);

  return (
    <SellStepScreen
      step={2}
      title="Describe your product"
      errors={errors}
      onAttempt={() => setAttempted(true)}
      onContinue={() => router.push('/sell/category')}
    >
      <StepFade>
        <SellTextField
          label="Title"
          value={draft.title}
          onChangeText={(value) => patch({ title: value.slice(0, TITLE_MAX) })}
          placeholder="What are you selling?"
          maxLength={TITLE_MAX}
          autoCapitalize="sentences"
          returnKeyType="next"
          error={shown.title}
        />

        <View style={{ marginTop: space.space20 }}>
          <SellTextField
            label="Brand"
            value={draft.brand}
            onChangeText={(value) => patch({ brand: value.slice(0, BRAND_MAX) })}
            placeholder="Optional"
            maxLength={BRAND_MAX}
            autoCapitalize="words"
            autoCorrect={false}
            error={shown.brand}
          />
          {suggestions.length > 0 ? (
            <View
              accessibilityLabel="Brand suggestions"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.space8, marginTop: space.space8 }}
            >
              {suggestions.map((brand) => (
                <SelectPill
                  key={brand}
                  label={brand}
                  onPress={() => patch({ brand })}
                  accessibilityLabel={`Use brand ${brand}`}
                />
              ))}
            </View>
          ) : null}
        </View>

        <SellTextField
          label="Description"
          value={draft.description}
          onChangeText={(value) => patch({ description: value.slice(0, DESCRIPTION_MAX) })}
          placeholder="Material, fit, what makes it special…"
          maxLength={DESCRIPTION_MAX}
          multiline
          autoCapitalize="sentences"
          error={shown.description}
          style={{ marginTop: space.space20 }}
        />

        <Text style={{ ...type.metadata, color: C.textSecondary, marginTop: space.space20 }}>
          Every product on NILYA is sold new, so there is no condition to choose.
        </Text>
      </StepFade>
    </SellStepScreen>
  );
}

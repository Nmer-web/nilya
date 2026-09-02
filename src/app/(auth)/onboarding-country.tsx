import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Button, T, Tap } from '@/components/ui';
import { listCountries, NAMES_AVAILABLE, searchCountries } from '@/lib/countries';
import { useOnboarding } from '@/store/onboarding-store';
import { color as C, radius, space, touch, type as typography } from '@/theme/tokens';

export default function OnboardingCountry() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { country, setCountry } = useOnboarding();
  const [query, setQuery] = useState('');

  const countries = useMemo(() => listCountries(), []);
  const filtered = useMemo(() => searchCountries(countries, query), [countries, query]);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader border={false} />

      <View style={{ paddingHorizontal: space.gutterRegular, paddingBottom: space.space16 }}>
        <T variant="screenTitle">Where are you based?</T>
        <T variant="body" color={C.textSecondary} style={{ marginTop: space.space8, marginBottom: space.space20 }}>
          We use your country to show relevant products, currency, and delivery options.
        </T>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.space12,
            minHeight: touch.standard,
            paddingHorizontal: space.space16,
            borderRadius: radius.radiusLarge,
            borderCurve: 'continuous',
            backgroundColor: C.surfaceSecondary,
          }}
        >
          <Icon name="search" role="inline" color={C.textSecondary} decorative />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search countries"
            placeholderTextColor={C.textSecondary}
            selectionColor={C.primary}
            accessibilityLabel="Search countries"
            style={{ flex: 1, minHeight: touch.minimum, color: C.textPrimary, padding: 0, ...typography.body }}
          />
          {query.length > 0 ? (
            <Tap
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={{
                width: 24,
                height: 24,
                borderRadius: radius.radiusPill,
                backgroundColor: C.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" role="metadata" color={C.textPrimary} decorative />
            </Tap>
          ) : null}
        </View>

        {!NAMES_AVAILABLE ? (
          <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space8 }}>
            Country names are unavailable on this device, so ISO codes are shown.
          </T>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space.gutterRegular, paddingBottom: space.space16 }}
        ListEmptyComponent={
          <View style={{ paddingVertical: space.space32, gap: space.space8 }}>
            <T variant="bodyMedium">No countries found</T>
            <T variant="metadata" color={C.textSecondary}>
              Check the spelling, or search for a nearby country.
            </T>
          </View>
        }
        renderItem={({ item }) => {
          const selected = item.code === country;
          return (
            <Tap
              onPress={() => setCountry(item.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${item.name}, ${item.code}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.space12,
                minHeight: touch.standard,
                paddingHorizontal: space.space12,
                marginVertical: 2,
                borderRadius: radius.radiusMedium,
                backgroundColor: selected ? C.primarySoft : 'transparent',
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 26,
                  borderRadius: radius.radiusSmall,
                  backgroundColor: C.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <T variant="caption" color={C.textSecondary}>
                  {item.code}
                </T>
              </View>
              <T variant="body" style={{ flex: 1 }}>
                {item.name}
              </T>
              {selected ? <Icon name="check" role="metadata" color={C.primary} decorative /> : null}
            </Tap>
          );
        }}
      />

      <View
        style={{
          padding: space.gutterRegular,
          paddingBottom: insets.bottom + space.space12,
          backgroundColor: C.background,
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        <Button label="Continue" disabled={!country} onPress={() => router.push('/onboarding-auth-choice')} />
      </View>
    </View>
  );
}

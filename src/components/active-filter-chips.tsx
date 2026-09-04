import React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale, T } from '@/components/ui';
import { countryName } from '@/lib/countries';
import type { Filters } from '@/store/app-store';
import { color as C, radius, space, touch } from '@/theme/tokens';

export type ActiveFilterChipKey =
  | 'categorySlug'
  | 'price'
  | 'countryCode'
  | 'city'
  | 'brand'
  | 'size'
  | 'color'
  | 'deliveryKey'
  | 'listingType'
  | 'halalStatus'
  | 'preparationType'
  | 'fragranceType'
  | 'targetAudience'
  | 'sealed'
  | 'contractType'
  | 'workMode'
  | 'sector'
  | 'pricingMode'
  | 'serviceDeliveryMode';

type ActiveChip = { key: ActiveFilterChipKey; label: string };

function formatEuros(cents: number): string {
  const amount = cents / 100;
  return `\u20ac${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

function priceLabel(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${formatEuros(min)}\u2013${formatEuros(max)}`;
  if (min !== null) return `From ${formatEuros(min)}`;
  if (max !== null) return `Up to ${formatEuros(max)}`;
  return null;
}

function deliveryKeyLabel(key: string): string {
  return key
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

/** Horizontal, individually removable chips for the filters currently in the query. */
export function ActiveFilterChips({
  filters,
  categoryLabel,
  includeCategory = true,
  includeListingType = true,
  deliveryLabel,
  onRemove,
  style,
}: {
  filters: Filters;
  categoryLabel?: string | null;
  includeCategory?: boolean;
  includeListingType?: boolean;
  deliveryLabel?: string | null;
  onRemove: (key: ActiveFilterChipKey) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const chips: ActiveChip[] = [];
  if (includeCategory && filters.categorySlug) {
    chips.push({ key: 'categorySlug', label: `Category: ${categoryLabel ?? filters.categorySlug}` });
  }

  const price = priceLabel(filters.minCents, filters.maxCents);
  if (price) chips.push({ key: 'price', label: price });
  if (filters.brand) chips.push({ key: 'brand', label: `Brand: ${filters.brand}` });
  if (filters.size) chips.push({ key: 'size', label: `Size: ${filters.size}` });
  if (filters.color) chips.push({ key: 'color', label: `Colour: ${filters.color}` });
  if (filters.countryCode) {
    chips.push({ key: 'countryCode', label: `Country: ${countryName(filters.countryCode)}` });
  }
  if (filters.city) chips.push({ key: 'city', label: `City: ${filters.city}` });
  if (filters.deliveryKey) {
    chips.push({
      key: 'deliveryKey',
      label: `Delivery: ${deliveryLabel ?? deliveryKeyLabel(filters.deliveryKey)}`,
    });
  }
  const typed = (value: string) => value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
  if (includeListingType && filters.listingType) chips.push({ key: 'listingType', label: `Type: ${typed(filters.listingType)}` });
  if (filters.halalStatus) chips.push({ key: 'halalStatus', label: typed(filters.halalStatus) });
  if (filters.preparationType) chips.push({ key: 'preparationType', label: typed(filters.preparationType) });
  if (filters.fragranceType) chips.push({ key: 'fragranceType', label: typed(filters.fragranceType) });
  if (filters.targetAudience) chips.push({ key: 'targetAudience', label: typed(filters.targetAudience) });
  if (filters.sealed !== null) chips.push({ key: 'sealed', label: filters.sealed ? 'Sealed' : 'Not sealed' });
  if (filters.contractType) chips.push({ key: 'contractType', label: typed(filters.contractType) });
  if (filters.workMode) chips.push({ key: 'workMode', label: typed(filters.workMode) });
  if (filters.sector) chips.push({ key: 'sector', label: `Sector: ${filters.sector}` });
  if (filters.pricingMode) chips.push({ key: 'pricingMode', label: typed(filters.pricingMode) });
  if (filters.serviceDeliveryMode) chips.push({ key: 'serviceDeliveryMode', label: typed(filters.serviceDeliveryMode) });

  if (chips.length === 0) return null;

  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.space8 }}
      >
        {chips.map((chip) => (
          <PressableScale
            key={chip.key}
            onPress={() => onRemove(chip.key)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${chip.label} filter`}
            style={{
              minHeight: touch.minimum,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.space8,
              paddingHorizontal: space.space12,
              borderRadius: radius.radiusPill,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.primary,
              backgroundColor: C.primarySoft,
            }}
          >
            <T variant="metadataMedium" color={C.primary} numberOfLines={1}>
              {chip.label}
            </T>
            <Icon name="close" role="metadata" color={C.primary} decorative />
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

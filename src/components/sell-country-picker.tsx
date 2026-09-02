import React, { useMemo, useState } from 'react';
import { FlatList, Modal, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { T, Tap } from '@/components/ui';
import { countryName, listCountries, NAMES_AVAILABLE, searchCountries } from '@/lib/countries';
import { color as C, radius, space, touch, type as typography } from '@/theme/tokens';

export function SellCountryPicker({
  value,
  onChange,
  disabled,
  variant = 'card',
}: {
  value: string;
  onChange: (countryCode: string) => void;
  disabled?: boolean;
  variant?: 'card' | 'row';
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const countries = useMemo(() => listCountries(), []);
  const filtered = useMemo(() => searchCountries(countries, query), [countries, query]);
  const label = value ? countryName(value) : 'Choose country';
  const row = variant === 'row';

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={`Country, ${label}`}
        accessibilityHint="Opens the country list"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={row ? 'min-h-16 flex-row items-center gap-3 border-b border-nilya-border' : undefined}
        style={row ? undefined : {
          minHeight: touch.large,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: radius.radiusLarge,
          paddingHorizontal: space.space16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.space12,
        }}
      >
        {row ? (
          <>
            <T variant="bodyMedium" style={{ flex: 1 }}>Country</T>
            <T variant="body" color={value ? C.textPrimary : C.textSecondary} numberOfLines={1}>{label}</T>
            <Icon name="chevronRight" role="inline" color={C.textSecondary} decorative />
          </>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <T variant="caption" color={C.textSecondary} style={{ marginBottom: space.space4 }}>
                Country
              </T>
              <T variant="bodyMedium">
                {label}{value ? ` · ${value}` : ''}
              </T>
            </View>
            <Icon name="chevronDown" role="inline" color={C.textSecondary} decorative />
          </>
        )}
      </Tap>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top }}>
          <View
            style={{
              minHeight: touch.large,
              paddingHorizontal: space.gutterCompact,
              flexDirection: 'row',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            <T variant="sectionTitle" style={{ flex: 1 }}>
              Choose country
            </T>
            <Tap
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close country list"
              style={{ width: touch.minimum, height: touch.minimum, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="close" role="metadata" decorative />
            </Tap>
          </View>

          <TextInput
            autoFocus
            accessibilityLabel="Search countries"
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or code"
            placeholderTextColor={C.textSecondary}
            selectionColor={C.primary}
            style={{
              minHeight: touch.standard,
              margin: space.gutterCompact,
              borderRadius: radius.radiusLarge,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: space.space16,
              color: C.textPrimary,
              ...typography.body,
            }}
          />

          {!NAMES_AVAILABLE && (
            <T variant="metadata" color={C.textSecondary} style={{ paddingHorizontal: space.gutterCompact, marginBottom: space.space8 }}>
              Country names are unavailable on this device, so ISO codes are shown.
            </T>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(country) => country.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: space.gutterCompact, paddingBottom: insets.bottom + space.space24 }}
            ListEmptyComponent={
              <T variant="metadata" color={C.textSecondary} style={{ paddingVertical: space.space24 }}>
                No country matches that search.
              </T>
            }
            renderItem={({ item }) => {
              const selected = item.code === value;
              return (
                <Tap
                  onPress={() => {
                    onChange(item.code);
                    close();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${item.code}`}
                  accessibilityState={{ selected }}
                  style={{
                    minHeight: touch.standard,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderBottomWidth: 1,
                    borderBottomColor: C.border,
                  }}
                >
                  <T variant={selected ? 'bodyMedium' : 'body'} style={{ flex: 1 }}>
                    {item.name}
                  </T>
                  <T variant="metadata" color={C.textSecondary}>
                    {item.code}
                  </T>
                  {selected && <Icon name="check" role="metadata" color={C.primary} decorative />}
                </Tap>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

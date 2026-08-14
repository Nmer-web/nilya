import React from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ProductGrid } from '@/components/product-card';
import { TabTitle } from '@/components/screen-header';
import { FadeIn } from '@/components/skeleton';
import { Button, Chip, EmptyState, T, Tap } from '@/components/ui';
import { EXCATS } from '@/data/catalog';
import { filtersActive, useApp, useSearchResults } from '@/store/app-store';
import { color as C, radius } from '@/theme/tokens';

export default function Explore() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const app = useApp();
  const { q, setQuery, cat, setCat, sort, cycleSort, openSheet } = app;
  const results = useSearchResults();
  const active = filtersActive(app);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top, backgroundColor: C.bg }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 12 }}>
          <TabTitle>Explore</TabTitle>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          <View
            style={{
              flex: 1,
              height: 46,
              borderRadius: radius.lg,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingHorizontal: 13,
            }}
          >
            <Icon name="search" size={17} color={C.textSecondary} />
            <TextInput
              value={q}
              onChangeText={setQuery}
              placeholder="Search items, brands, categories…"
              placeholderTextColor={C.textSecondary}
              returnKeyType="search"
              autoCorrect={false}
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 14.5,
                color: C.text,
                padding: 0,
              }}
            />
            {!!q && (
              <Tap
                onPress={() => setQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: C.well,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="close" size={11} color={C.textSecondary} strokeWidth={2.6} />
              </Tap>
            )}
          </View>

          <Tap
            onPress={() => openSheet({ kind: 'filters' })}
            accessibilityRole="button"
            accessibilityLabel="Filters"
            style={{
              width: 46,
              height: 46,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? C.text : C.surface,
              borderWidth: 1,
              borderColor: active ? C.text : C.border,
            }}
          >
            <Icon name="sliders" size={19} color={active ? C.onDark : C.text} />
          </Tap>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingVertical: 12 }}
        >
          {EXCATS.map((n) => (
            <Chip key={n} label={n} active={cat === n} onPress={() => setCat(n)} />
          ))}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <T size={13} color={C.textSecondary}>
            {results.length} items{cat !== 'All' ? ` in ${cat}` : ''}
          </T>
          <Tap
            onPress={cycleSort}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${sort}. Tap to change.`}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <T w={500} size={13}>
              {sort}
            </T>
            <Icon name="chevronDown" size={13} color={C.text} />
          </Tap>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: navClearance }}
      >
        {results.length > 0 ? (
          /* Same category transition as Home — keyed so a change replays it. */
          <FadeIn key={cat} x={14} duration={260}>
            <ProductGrid products={results} />
          </FadeIn>
        ) : (
          <EmptyState
            icon="search"
            title={`No items match “${q}”`}
            body="Try a shorter search, or browse a category instead."
            action={
              <Button
                label="Clear search"
                height={42}
                size={14}
                onPress={() => setQuery('')}
                style={{ marginTop: 18, paddingHorizontal: 20, borderRadius: 11 }}
              />
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

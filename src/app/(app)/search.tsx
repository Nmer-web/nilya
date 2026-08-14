import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { FadeIn } from '@/components/skeleton';
import { PressableScale, T, Tap } from '@/components/ui';
import { CATS, PRODUCTS } from '@/data/catalog';
import { useApp } from '@/store/app-store';
import { color as C, radius, space } from '@/theme/tokens';

/**
 * Terms worth surfacing before anyone types.
 *
 * Drawn from the catalog rather than hard-coded so a suggestion always leads
 * somewhere: every brand here has listings behind it.
 */
const POPULAR = Array.from(new Set(PRODUCTS.map((p) => p.b)))
  .filter((b) => b !== 'Handmade')
  .slice(0, 6);

/** Cities with stock, most listings first. */
const LOCATIONS = Object.entries(
  PRODUCTS.reduce<Record<string, number>>((acc, p) => {
    const key = `${p.city}, ${p.country}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {})
)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([place]) => place);

/**
 * The focused search state.
 *
 * A screen rather than an overlay: it gets the platform's own transition, the
 * back gesture, and a real place in the stack, none of which a hand-rolled
 * overlay would have. The field auto-focuses on arrival, so tapping the home
 * bar and typing is continuous — the expansion is the screen transition.
 */
export default function Search() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recent, submitSearch, setCat } = useApp();
  const [draft, setDraft] = useState('');

  /** Applies a term and lands on the results, replacing this screen. */
  const go = (term: string) => {
    submitSearch(term);
    router.dismissTo('/explore');
  };

  const byCategory = (name: string) => {
    setCat(name);
    router.dismissTo('/explore');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View
        style={{
          paddingTop: insets.top + space.sm,
          paddingHorizontal: space.gutter,
          paddingBottom: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
        }}
      >
        <View
          style={{
            flex: 1,
            height: 52,
            borderRadius: radius.lg,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.text,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 15,
          }}
        >
          <Icon name="search" size={18} color={C.text} strokeWidth={2} />
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => go(draft)}
            placeholder="Items, brands, categories, places"
            placeholderTextColor={C.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, minWidth: 0, fontSize: 16, color: C.text, padding: 0 }}
          />
          {!!draft && (
            <Tap
              onPress={() => setDraft('')}
              accessibilityRole="button"
              accessibilityLabel="Clear"
              hitSlop={10}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: C.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={12} color={C.textSecondary} strokeWidth={2.6} />
            </Tap>
          )}
        </View>

        <Tap onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
          <T w={600} size={15}>
            Cancel
          </T>
        </Tap>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space['3xl'] }}
      >
        <FadeIn y={8} duration={240}>
          {recent.length > 0 && (
            <Group title="Recent searches">
              {recent.map((r) => (
                <Row key={r} icon="search" label={r} onPress={() => go(r)} />
              ))}
            </Group>
          )}

          <Group title="Popular near you">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: space.gutter }}>
              {POPULAR.map((b) => (
                <PressableScale
                  key={b}
                  scale={0.96}
                  onPress={() => go(b)}
                  accessibilityRole="button"
                  style={{
                    height: 38,
                    paddingHorizontal: 15,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: C.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <T w={500} size={14}>
                    {b}
                  </T>
                </PressableScale>
              ))}
            </View>
          </Group>

          <Group title="Categories">
            {CATS.filter((c) => c !== 'All').map((c) => (
              <Row key={c} icon="search" label={c} onPress={() => byCategory(c)} />
            ))}
          </Group>

          <Group title="Locations">
            {LOCATIONS.map((l) => (
              <Row key={l} icon="pin" label={l} onPress={() => go(l)} />
            ))}
          </Group>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingTop: space.xl }}>
      <T w={700} size={16} tracking={-0.2} style={{ paddingHorizontal: space.gutter, paddingBottom: space.md }}>
        {title}
      </T>
      {children}
    </View>
  );
}

/** `place` marks the row with a pin; everything else reads as a search term. */
function Row({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: space.gutter,
      }}
    >
      <Icon name={icon} size={17} color={C.textSecondary} strokeWidth={1.8} />
      <T size={15} style={{ flex: 1 }}>
        {label}
      </T>
      <Icon name="chevronRight" size={16} color={C.borderStrong} />
    </Tap>
  );
}

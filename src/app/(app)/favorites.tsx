import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ProductGrid } from '@/components/product-card';
import { ScreenHeader } from '@/components/screen-header';
import { Button, EmptyState, Note, T, Tap } from '@/components/ui';
import { useApp, useFavourites } from '@/store/app-store';
import { color as C } from '@/theme/tokens';

export default function Favorites() {
  const router = useRouter();
  const navClearance = useNavClearance();
  const { favs } = useApp();
  const items = useFavourites();

  /** The price-drop nudge only applies while the discounted Nike is saved. */
  const showDrop = !!favs[1];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader
        title="Favorites"
        right={
          <T size={13} color={C.textSecondary} style={{ paddingRight: 10 }}>
            {items.length} saved
          </T>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: navClearance }}
      >
        {showDrop && (
          <Tap onPress={() => router.push({ pathname: '/product/[id]', params: { id: 1 } })} accessibilityRole="button">
            {/* Promotional: a price drop on something already saved. */}
            <Note
              tone="accent"
              style={{
                marginHorizontal: 16,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
                paddingHorizontal: 14,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: C.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="arrowDown" size={17} color={C.primaryText} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T w={600} size={13} color={C.accentDark}>
                  Price dropped
                </T>
                <T size={13.5} numberOfLines={1} style={{ marginTop: 2 }}>
                  Nike Air Max 270 ·{' '}
                  <T size={13.5} color={C.textMuted} style={{ textDecorationLine: 'line-through' }}>
                    €52
                  </T>{' '}
                  <T w={700} size={13.5}>
                    €45
                  </T>
                </T>
              </View>
              <Icon name="chevronRight" size={16} color={C.accent} />
            </Note>
          </Tap>
        )}

        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <EmptyState
            icon="heart"
            title="No favorites yet"
            body="Tap the heart on any item to save it and get told when the price drops."
            style={{ paddingVertical: 70 }}
            action={
              <Button
                label="Browse items"
                height={42}
                size={14}
                onPress={() => router.back()}
                style={{ marginTop: 18, paddingHorizontal: 20, borderRadius: 11 }}
              />
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

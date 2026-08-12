import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ImageSlot } from '@/components/image-slot';
import { ProductGrid } from '@/components/product-card';
import { Chip, T, Tap } from '@/components/ui';
import { CATS, PRODUCTS } from '@/data/catalog';
import { useApp, useHomeFeed } from '@/store/app-store';
import { color as C, radius } from '@/theme/tokens';

/** The three hand-picked listings in the spotlight rail. */
const SPOTLIGHT = [PRODUCTS[2], PRODUCTS[5], PRODUCTS[10]];

export default function Home() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { cat, setCat } = useApp();
  const feed = useHomeFeed();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 40 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor: C.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.bg }} />
          </View>
          <T serif size={23} tracking={-0.2} style={{ flex: 1 }}>
            SudanSouq
          </T>

          <Tap
            onPress={() => router.push('/favorites')}
            accessibilityRole="button"
            accessibilityLabel="Favorites"
            hitSlop={6}
            style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="heart" size={21} color={C.text} strokeWidth={1.7} />
          </Tap>

          <Tap
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={6}
            style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="bell" size={21} color={C.text} strokeWidth={1.7} />
            <View
              style={{
                position: 'absolute',
                top: 7,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: C.accent,
                borderWidth: 1.5,
                borderColor: C.bg,
              }}
            />
          </Tap>
        </View>

        <Tap
          onPress={() => router.push('/explore')}
          accessibilityRole="search"
          accessibilityLabel="Search items, brands, categories"
          style={{
            marginTop: 10,
            height: 46,
            borderRadius: 13,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            paddingHorizontal: 14,
          }}
        >
          <Icon name="search" size={17} color={C.textSecondary} />
          <T size={14} color={C.textSecondary}>
            Search items, brands, categories…
          </T>
        </Tap>
      </View>

      <View style={{ flexShrink: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingVertical: 12 }}
        >
          {CATS.map((n) => (
            <Chip key={n} label={n} active={cat === n} onPress={() => setCat(n)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: navClearance }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 16 }}
        >
          {SPOTLIGHT.map((p) => (
            <Tap
              key={p.id}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
              accessibilityRole="button"
              style={{ width: 150 }}
            >
              <View
                style={{
                  width: 150,
                  height: 110,
                  borderRadius: radius.xl,
                  overflow: 'hidden',
                  backgroundColor: C.well,
                }}
              >
                <ImageSlot label={p.t} glyph={22} />
              </View>
              <T w={600} size={12} color={C.accent} tracking={0.24} style={{ paddingTop: 7 }}>
                {p.tag ?? 'From Sudan'}
              </T>
              <T w={500} size={13.5} numberOfLines={1} style={{ marginTop: 1 }}>
                {p.t}
              </T>
            </Tap>
          ))}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <T w={600} size={19} tracking={-0.2}>
            Recommended for you
          </T>
          <T size={12.5} color={C.textSecondary}>
            {feed.length} items
          </T>
        </View>

        <ProductGrid products={feed} meta="pin" />

        <T size={12.5} color={C.textTertiary} style={{ textAlign: 'center', paddingTop: 26 }}>
          Over 40,000 items from the diaspora
        </T>
      </ScrollView>
    </View>
  );
}

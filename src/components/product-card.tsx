import { useRouter } from 'expo-router';
import React from 'react';
import { Animated, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ImageSlot } from '@/components/image-slot';
import { PressableScale, T } from '@/components/ui';
import type { Product } from '@/data/catalog';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { tapLight } from '@/lib/haptics';
import { euro, useApp } from '@/store/app-store';
import { color as C, motion, radius, shadow, space } from '@/theme/tokens';

const COLUMN_GAP = 10;
const ROW_GAP = 20;

/** Card width for an n-column feed grid inset by the standard gutter. */
function useCardWidth(columns = 2) {
  const { width } = useWindowDimensions();
  return (width - space.gutter * 2 - COLUMN_GAP * (columns - 1)) / columns;
}

/**
 * The heart that floats over a listing image.
 *
 * The press target is a full 44pt square for reach, while the visible disc is
 * 32pt so it does not crowd the photo — the gap between the two is the whole
 * reason the touch area is declared separately from the circle.
 */
export function FavouriteButton({ id, size = 32 }: { id: number; size?: number }) {
  const { favs, toggleFav } = useApp();
  const on = !!favs[id];
  const s = useAnimatedValue(1);

  const press = () => {
    tapLight();
    toggleFav(id);
    // 1 → 1.2 → 1. The overshoot is what makes the state change feel earned.
    Animated.sequence([
      Animated.spring(s, {
        toValue: 1.2,
        useNativeDriver: NATIVE_DRIVER,
        tension: 420,
        friction: 6,
      }),
      Animated.spring(s, { toValue: 1, useNativeDriver: NATIVE_DRIVER, ...motion.spring }),
    ]).start();
  };

  return (
    <View style={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }} pointerEvents="box-none">
      <PressableScale
        scale={1}
        onPress={press}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={on ? 'Remove from favourites' : 'Save to favourites'}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: C.bg,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: s }],
            ...shadow.raised,
          }}
        >
          <Icon
            name="heart"
            size={17}
            color={on ? C.favOn : C.favOff}
            fill={on ? C.favOn : 'none'}
            strokeWidth={on ? 2 : 1.8}
          />
        </Animated.View>
      </PressableScale>
    </View>
  );
}

/**
 * The feed / search / favourites card.
 *
 * Memoised, and deliberately not a consumer of the app store: `FavouriteButton`
 * subscribes on its own, so toggling a heart re-renders that one button instead
 * of every card in the grid.
 *
 * `meta` picks between the two label treatments in the design: Home pairs the
 * condition with a pin-marked city, while Explore and Favorites collapse both
 * onto a single tertiary line.
 */
export const ProductCard = React.memo(function ProductCard({
  product: p,
  width,
  meta = 'inline',
}: {
  product: Product;
  width: number;
  meta?: 'pin' | 'inline';
}) {
  const router = useRouter();
  return (
    /**
     * The heart is a sibling of the card's tap target, not a child of it.
     * Nesting one pressable inside another renders a `<button>` inside a
     * `<button>` on web, which is invalid and swallows the inner press.
     */
    <View style={{ width }}>
      <PressableScale
        scale={0.98}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${p.t}, ${euro(p.pr)}, ${p.cd}, ${p.city}`}
      >
        <View
          style={{
            width,
            aspectRatio: 3 / 4,
            borderRadius: radius.xl,
            overflow: 'hidden',
            backgroundColor: C.well,
          }}
        >
          <ImageSlot label={p.t} />
        </View>

        <View style={{ paddingTop: 9 }}>
          <T variant="productTitle" numberOfLines={1}>
            {p.t}
          </T>
          <T variant="price" style={{ marginTop: 3 }}>
            {euro(p.pr)}
          </T>
          {meta === 'pin' ? (
            <>
              <T variant="meta" color={C.textSecondary} style={{ marginTop: 3 }}>
                {p.cd}
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                <Icon name="pin" size={11} color={C.textTertiary} />
                <T size={12} color={C.textTertiary}>
                  {p.city}, {p.cc}
                </T>
              </View>
            </>
          ) : (
            <T size={12} color={C.textTertiary} style={{ marginTop: 3 }}>
              {p.cd} · {p.city}, {p.cc}
            </T>
          )}
        </View>
      </PressableScale>

      <FavouriteButton id={p.id} />
    </View>
  );
});

/** Two-column wrapper on the design's grid gaps. */
export const ProductGrid = React.memo(function ProductGrid({
  products,
  meta,
  columns = 2,
}: {
  products: Product[];
  meta?: 'pin' | 'inline';
  columns?: number;
}) {
  const width = useCardWidth(columns);
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: ROW_GAP,
        columnGap: COLUMN_GAP,
        paddingHorizontal: space.gutter,
      }}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} width={width} meta={meta} />
      ))}
    </View>
  );
});

/** Compact price-only tile used on the Profile and Seller listing grids. */
export const PriceTile = React.memo(function PriceTile({
  product: p,
  width,
}: {
  product: Product;
  width: number;
}) {
  const router = useRouter();
  return (
    <PressableScale
      scale={0.98}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${p.t}, ${euro(p.pr)}`}
      style={{ width }}
    >
      <View
        style={{
          width,
          aspectRatio: 3 / 4,
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: C.well,
        }}
      >
        <ImageSlot label={p.t} glyph={20} />
      </View>
      <T w={700} size={14} tracking={-0.2} style={{ marginTop: 6 }}>
        {euro(p.pr)}
      </T>
    </PressableScale>
  );
});

export function PriceTileGrid({ products }: { products: Product[] }) {
  const { width: screen } = useWindowDimensions();
  const width = (screen - space.gutter * 2 - 8 * 2) / 3;
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: space.gutter,
      }}
    >
      {products.map((p) => (
        <PriceTile key={p.id} product={p} width={width} />
      ))}
    </View>
  );
}

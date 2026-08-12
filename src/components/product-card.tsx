import { useRouter } from 'expo-router';
import React from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ImageSlot } from '@/components/image-slot';
import { T, Tap } from '@/components/ui';
import type { Product } from '@/data/catalog';
import { euro, useApp } from '@/store/app-store';
import { color as C, radius } from '@/theme/tokens';

const GUTTER = 16;
const COLUMN_GAP = 10;

/** Card width for an n-column feed grid inset by the standard gutter. */
function useCardWidth(columns = 2) {
  const { width } = useWindowDimensions();
  return (width - GUTTER * 2 - COLUMN_GAP * (columns - 1)) / columns;
}

export function FavouriteButton({ id, size = 31 }: { id: number; size?: number }) {
  const { favs, toggleFav } = useApp();
  const on = !!favs[id];
  return (
    <Tap
      onPress={() => toggleFav(id)}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={on ? 'Remove from favourites' : 'Save to favourites'}
      style={{
        position: 'absolute',
        top: 7,
        right: 7,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(250,249,245,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
      }}
    >
      <Icon name="heart" size={16} color={on ? C.accent : C.text} fill={on ? C.accent : 'none'} />
    </Tap>
  );
}

/**
 * The feed / search / favourites card.
 *
 * `meta` picks between the two label treatments in the design: Home pairs the
 * condition with a pin-marked city, while Explore and Favorites collapse both
 * onto a single tertiary line.
 */
export function ProductCard({
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
      <Tap
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${p.t}, ${euro(p.pr)}`}
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
        <View style={{ paddingTop: 8 }}>
          <T w={500} size={14} tracking={-0.1} numberOfLines={1}>
            {p.t}
          </T>
          <T w={700} size={16.5} tracking={-0.3} style={{ marginTop: 2 }}>
            {euro(p.pr)}
          </T>
          {meta === 'pin' ? (
            <>
              <T size={12.5} color={C.textSecondary} style={{ marginTop: 2 }}>
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
      </Tap>

      <FavouriteButton id={p.id} />
    </View>
  );
}

/** Two-column wrapper matching the design's `18px 10px` grid gaps. */
export function ProductGrid({
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
        rowGap: 18,
        columnGap: COLUMN_GAP,
        paddingHorizontal: GUTTER,
      }}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} width={width} meta={meta} />
      ))}
    </View>
  );
}

/** Compact price-only tile used on the Profile and Seller listing grids. */
export function PriceTile({ product: p, width }: { product: Product; width: number }) {
  const router = useRouter();
  return (
    <Tap onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })} accessibilityRole="button" style={{ width }}>
      <View
        style={{
          width,
          aspectRatio: 3 / 4,
          borderRadius: 9,
          overflow: 'hidden',
          backgroundColor: C.well,
        }}
      >
        <ImageSlot label={p.t} glyph={20} />
      </View>
      <T w={700} size={13.5} style={{ marginTop: 5 }}>
        {euro(p.pr)}
      </T>
    </Tap>
  );
}

export function PriceTileGrid({ products }: { products: Product[] }) {
  const { width: screen } = useWindowDimensions();
  const width = (screen - GUTTER * 2 - 8 * 2) / 3;
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: GUTTER,
      }}
    >
      {products.map((p) => (
        <PriceTile key={p.id} product={p} width={width} />
      ))}
    </View>
  );
}

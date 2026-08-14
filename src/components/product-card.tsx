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

/** Listing imagery is portrait everywhere — the card, the tile, the rail. */
const IMAGE_RATIO = 3 / 4;

/** Minimum comfortable touch target. The visible disc is smaller; see below. */
const TOUCH = 44;

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
 *
 * The icon is black in both states; only `fill` changes. State is therefore
 * legible without relying on colour.
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
        toValue: 1.15,
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
        style={{ width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: C.background,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: s }],
            ...shadow.raised,
          }}
        >
          <Icon
            name="heart"
            size={17}
            color={C.favourite}
            fill={on ? C.favourite : 'none'}
            strokeWidth={1.9}
          />
        </Animated.View>
      </PressableScale>
    </View>
  );
}

/**
 * A listing's image well. Shared so that every surface showing a listing gets
 * the same ratio, radius and placeholder rather than re-deriving them.
 *
 * `label` is the placeholder's caption and is only worth passing where nothing
 * else names the item — on a card that prints the title directly underneath it,
 * the caption is the same string twice.
 */
function ListingImage({ width, label, glyph }: { width: number; label?: string; glyph?: number }) {
  return (
    <View
      style={{
        width,
        aspectRatio: IMAGE_RATIO,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: C.surfaceSecondary,
      }}
    >
      <ImageSlot label={label} glyph={glyph} />
    </View>
  );
}

/** Widths for the row thumbnail. Two sizes, so rows stop inventing their own. */
export const THUMB = { sm: 40, md: 54 } as const;

/**
 * The small listing thumbnail that sits inside a row — inbox conversations,
 * order lines, the chat header, the checkout summary.
 *
 * Not a card: it carries no price, no favourite and no tap target, because the
 * row around it owns all three. It exists because those six rows each invented
 * their own well — 36x44, 40x48, 52x64, 54x66 and 56x70, at radii of 7, 9 and
 * 12 — so none shared the card's 3:4 crop and most sat off the radius ladder.
 * Bare numbers are why the step that constrained the radii never caught them.
 */
export function ListingThumb({ width = THUMB.md }: { width?: number }) {
  return (
    <View
      style={{
        width,
        aspectRatio: IMAGE_RATIO,
        borderRadius: radius.sm,
        overflow: 'hidden',
        backgroundColor: C.surfaceSecondary,
      }}
    >
      <ImageSlot tiny />
    </View>
  );
}

/**
 * The listing card — feed, search, favourites.
 *
 * Image-first and undecorated: no border, no shadow, no surrounding container.
 * On a white canvas the photography is what separates one card from the next,
 * so anything drawn around it competes with the thing being sold.
 *
 * Memoised, and deliberately not a consumer of the app store: `FavouriteButton`
 * subscribes on its own, so toggling a heart re-renders that one button instead
 * of every card in the grid.
 */
export const ProductCard = React.memo(function ProductCard({
  product: p,
  width,
}: {
  product: Product;
  width: number;
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
        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: p.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${p.t}, ${euro(p.pr)}, ${p.cd}, ${p.city}`}
      >
        <ListingImage width={width} />

        {/*
          The text stack tightens as it descends: title to price is the closest
          pairing on the card, and the metadata falls away from both. Uniform
          gaps here would read as four unrelated lines.
        */}
        <View style={{ paddingTop: space.sm }}>
          <T variant="productTitle" numberOfLines={1}>
            {p.t}
          </T>
          <T variant="price" style={{ marginTop: 2 }}>
            {euro(p.pr)}
          </T>
          <T variant="meta" color={C.textSecondary} style={{ marginTop: 5 }}>
            {p.cd}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <Icon name="pin" size={11} color={C.textMuted} />
            <T size={12} color={C.textMuted} numberOfLines={1}>
              {p.city}, {p.cc}
            </T>
          </View>
        </View>
      </PressableScale>

      <FavouriteButton id={p.id} />
    </View>
  );
});

/** Two-column wrapper on the design's grid gaps. */
export const ProductGrid = React.memo(function ProductGrid({
  products,
  columns = 2,
}: {
  products: Product[];
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
        <ProductCard key={p.id} product={p} width={width} />
      ))}
    </View>
  );
});

/**
 * Compact tile for the dense surfaces: the profile and seller listing grids,
 * and the "more from this seller" rail.
 *
 * Same imagery treatment as the full card, minus the favourite and the
 * metadata — at this size they would be unreadable rather than subtle. `title`
 * is optional because the three-up grids read as a wall of prices, while the
 * rail needs to name what it is offering.
 */
export const PriceTile = React.memo(function PriceTile({
  product: p,
  width,
  title,
}: {
  product: Product;
  width: number;
  title?: boolean;
}) {
  const router = useRouter();
  return (
    <PressableScale
      scale={0.98}
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: p.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${p.t}, ${euro(p.pr)}`}
      style={{ width }}
    >
      {/* Caption only carries the name when the tile itself does not. */}
      <ListingImage width={width} label={title ? undefined : p.t} glyph={20} />
      {title && (
        <T size={12.5} numberOfLines={1} style={{ marginTop: space.sm }}>
          {p.t}
        </T>
      )}
      <T w={700} size={14} tracking={-0.2} style={{ marginTop: title ? 1 : 6 }}>
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

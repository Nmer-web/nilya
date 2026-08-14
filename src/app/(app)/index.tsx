import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Animated, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ImageSlot } from '@/components/image-slot';
import { ProductGrid } from '@/components/product-card';
import { FadeIn, ProductGridSkeleton } from '@/components/skeleton';
import { Chip, PressableScale, T, Tap } from '@/components/ui';
import { CATS, PRODUCTS, type Product } from '@/data/catalog';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { useApp, useHomeFeed } from '@/store/app-store';
import { color as C, radius, space } from '@/theme/tokens';

/**
 * Editorial rail above the feed. Deliberately small and photographic — §6 asks
 * for discovery, not an advertising banner, so each card is a listing wearing a
 * label rather than a promo slot.
 */
const DISCOVERY: { label: string; product: Product }[] = [
  { label: 'New today', product: PRODUCTS[2] },
  { label: 'From Sudan', product: PRODUCTS[5] },
  { label: 'Popular near you', product: PRODUCTS[10] },
  { label: 'Great deals', product: PRODUCTS[7] },
];

/** Height of the wordmark row — the amount the header gives back on scroll. */
const BRAND_ROW = 44;

/**
 * Discovery card width.
 *
 * Sized so the fourth card is clipped rather than aligned to the gutter: a rail
 * whose last visible card ends flush reads as a finished row, and nobody
 * scrolls it.
 */
const DISCOVERY_CARD = 152;

/** Search field and its filter button share a height so they read as one row. */
const SEARCH_HEIGHT = 46;

/**
 * Shared heading for the two feed sections, so "Discover" and "Recommended for
 * you" sit on the same baseline and the page reads as two parallel blocks
 * rather than a rail that happens to precede a grid.
 */
function SectionHeading({ title, right }: { title: string; right?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: space.md,
        paddingHorizontal: space.gutter,
        paddingBottom: space.md,
      }}
    >
      <T variant="sectionTitle">{title}</T>
      {!!right && (
        <T variant="meta" color={C.textSecondary}>
          {right}
        </T>
      )}
    </View>
  );
}

/**
 * True only for the first Home mount of an app session.
 *
 * The catalog is a static import, so there is no fetch to wait on; this exists
 * so the skeleton is exercised on cold start, where fonts and the stored
 * session genuinely are still settling. It is module-level rather than state so
 * that navigating back to Home later never shows a skeleton for data already in
 * memory. When the feed moves to Supabase this becomes the query's own loading
 * flag and the timer goes away.
 */
let coldStart = true;

function useColdStartSkeleton() {
  const [loading, setLoading] = useState(coldStart);

  React.useEffect(() => {
    if (!coldStart) return;
    const id = setTimeout(() => {
      coldStart = false;
      setLoading(false);
    }, 420);
    return () => clearTimeout(id);
  }, []);

  return loading;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { cat, setCat, openSheet } = useApp();
  const feed = useHomeFeed();
  const loading = useColdStartSkeleton();

  const [headerH, setHeaderH] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useAnimatedValue(0);

  /**
   * Header compression.
   *
   * The block slides up by exactly the wordmark row's height while the wordmark
   * fades, which leaves the search field and category rail pinned under the
   * status bar. Translating is what keeps this on the native driver — animating
   * the header's height instead would put a layout pass on the JS thread for
   * every frame of every scroll.
   */
  const headerShift = scrollY.interpolate({
    inputRange: [0, BRAND_ROW],
    outputRange: [0, -BRAND_ROW],
    extrapolate: 'clamp',
  });
  const brandOpacity = scrollY.interpolate({
    inputRange: [0, BRAND_ROW * 0.75],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const hairline = scrollY.interpolate({
    inputRange: [BRAND_ROW, BRAND_ROW + 16],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/*
        Animated.ScrollView, not ScrollView. With `useNativeDriver: true`,
        `Animated.event` returns an AnimatedEvent object rather than a
        function — only an Animated component knows how to attach it to the
        native scroll. A plain ScrollView calls the prop directly and throws
        "Object is not a function" on the first scroll frame. Web never sees
        it because NATIVE_DRIVER is false there and the call returns a real
        function, so this only reproduces on device.
      */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: NATIVE_DRIVER,
        })}
        contentContainerStyle={{ paddingTop: headerH + space.lg, paddingBottom: navClearance }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={headerH}
            tintColor={C.textMuted}
          />
        }
      >
        <DiscoveryRail />

        <SectionHeading title="Recommended for you" right={`${feed.length} items`} />

        {loading ? (
          <ProductGridSkeleton />
        ) : (
          /*
           * Keyed on the category so a change re-mounts the grid and replays the
           * entrance. §5 asks for a fade plus a little horizontal travel rather
           * than a visual reload — the header and rail above are untouched.
           */
          <FadeIn key={cat} x={14} duration={260}>
            <ProductGrid products={feed} />
          </FadeIn>
        )}

        <T
          variant="meta"
          color={C.textMuted}
          style={{ textAlign: 'center', paddingTop: space['3xl'], paddingHorizontal: space.gutter }}
        >
          Over 40,000 items from the diaspora
        </T>
      </Animated.ScrollView>

      <Animated.View
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          paddingTop: insets.top,
          backgroundColor: C.background,
          transform: [{ translateY: headerShift }],
        }}
      >
        <Animated.View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            height: BRAND_ROW,
            paddingHorizontal: space.gutter,
            opacity: brandOpacity,
          }}
        >
          <T serif size={27} tracking={0.4} style={{ flex: 1 }}>
            SAWA
          </T>

          <Tap
            onPress={() => router.push('/favorites')}
            accessibilityRole="button"
            accessibilityLabel="Favorites"
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="heart" size={21} color={C.text} strokeWidth={1.8} />
          </Tap>

          <Tap
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications, unread"
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="bell" size={21} color={C.text} strokeWidth={1.8} />
            <View
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: C.accent,
                borderWidth: 1.5,
                borderColor: C.background,
              }}
            />
          </Tap>
        </Animated.View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            paddingHorizontal: space.gutter,
            paddingBottom: space.xs,
          }}
        >
          <Tap
            onPress={() => router.push('/explore')}
            accessibilityRole="search"
            accessibilityLabel="Search items, brands, categories"
            style={{
              flex: 1,
              height: SEARCH_HEIGHT,
              borderRadius: radius.lg,
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
            <T size={14} color={C.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
              Search items, brands, categories…
            </T>
          </Tap>

          {/* Square, so the filter reads as a peer of the field rather than a
              control docked inside it. */}
          <PressableScale
            onPress={() => openSheet({ kind: 'filters' })}
            accessibilityRole="button"
            accessibilityLabel="Filters"
            style={{
              width: SEARCH_HEIGHT,
              height: SEARCH_HEIGHT,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="sliders" size={18} color={C.text} strokeWidth={1.9} />
          </PressableScale>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingHorizontal: space.gutter, paddingVertical: space.md }}
        >
          {CATS.map((n) => (
            <Chip key={n} label={n} active={cat === n} onPress={() => setCat(n)} />
          ))}
        </ScrollView>

        <Animated.View
          style={{
            height: 1,
            backgroundColor: C.border,
            opacity: hairline,
          }}
        />
      </Animated.View>
    </View>
  );
}

function DiscoveryRail() {
  const router = useRouter();
  return (
    <>
      <SectionHeading title="Discover" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.md, paddingHorizontal: space.gutter, paddingBottom: space['2xl'] }}
      >
        {DISCOVERY.map(({ label, product }) => (
          <PressableScale
            key={label}
            scale={0.98}
            onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${product.t}`}
            style={{ width: DISCOVERY_CARD }}
          >
            <View
              style={{
                width: DISCOVERY_CARD,
                height: 112,
                borderRadius: radius.lg,
                overflow: 'hidden',
                backgroundColor: C.surfaceSecondary,
              }}
            >
              <ImageSlot label={product.t} glyph={22} />
            </View>
            {/*
              An eyebrow in muted caps rather than the accent it used to wear.
              Four orange labels was the single heaviest use of colour on the
              screen, and it spent the whole 2% budget on decoration — the
              accent is now the unread dot alone.
            */}
            <T w={600} size={11} color={C.textMuted} tracking={0.7} style={{ paddingTop: space.sm }}>
              {label.toUpperCase()}
            </T>
            <T w={500} size={13.5} numberOfLines={1} style={{ marginTop: 3 }}>
              {product.t}
            </T>
          </PressableScale>
        ))}
      </ScrollView>
    </>
  );
}

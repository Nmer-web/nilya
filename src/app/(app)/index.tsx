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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: NATIVE_DRIVER,
        })}
        contentContainerStyle={{ paddingTop: headerH, paddingBottom: navClearance }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={headerH}
            tintColor={C.textTertiary}
          />
        }
      >
        <DiscoveryRail />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            paddingHorizontal: space.gutter,
            paddingBottom: 14,
          }}
        >
          <T variant="sectionTitle">Recommended for you</T>
          <T variant="meta" color={C.textSecondary}>
            {feed.length} items
          </T>
        </View>

        {loading ? (
          <ProductGridSkeleton />
        ) : (
          /*
           * Keyed on the category so a change re-mounts the grid and replays the
           * entrance. §5 asks for a fade plus a little horizontal travel rather
           * than a visual reload — the header and rail above are untouched.
           */
          <FadeIn key={cat} x={14} duration={260}>
            <ProductGrid products={feed} meta="pin" />
          </FadeIn>
        )}

        <T variant="meta" color={C.textTertiary} style={{ textAlign: 'center', paddingTop: 28 }}>
          Over 40,000 items from the diaspora
        </T>
      </ScrollView>

      <Animated.View
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          paddingTop: insets.top,
          backgroundColor: C.bg,
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
                borderColor: C.bg,
              }}
            />
          </Tap>
        </Animated.View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: space.gutter,
            paddingBottom: 4,
          }}
        >
          <Tap
            onPress={() => router.push('/explore')}
            accessibilityRole="search"
            accessibilityLabel="Search items, brands, categories"
            style={{
              flex: 1,
              height: 46,
              borderRadius: radius['2xl'],
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

          <PressableScale
            onPress={() => openSheet({ kind: 'filters' })}
            accessibilityRole="button"
            accessibilityLabel="Filters"
            style={{
              width: 46,
              height: 46,
              borderRadius: radius['2xl'],
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
          contentContainerStyle={{ gap: 7, paddingHorizontal: space.gutter, paddingVertical: 11 }}
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingHorizontal: space.gutter, paddingTop: 14, paddingBottom: 22 }}
    >
      {DISCOVERY.map(({ label, product }) => (
        <PressableScale
          key={label}
          scale={0.98}
          onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${product.t}`}
          style={{ width: 152 }}
        >
          <View
            style={{
              width: 152,
              height: 112,
              borderRadius: radius.xl,
              overflow: 'hidden',
              backgroundColor: C.well,
            }}
          >
            <ImageSlot label={product.t} glyph={22} />
          </View>
          <T w={600} size={12} color={C.accent} tracking={0.3} style={{ paddingTop: 8 }}>
            {label}
          </T>
          <T w={500} size={13.5} numberOfLines={1} style={{ marginTop: 2 }}>
            {product.t}
          </T>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

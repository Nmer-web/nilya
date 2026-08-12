import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Animated, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrostedBar } from '@/components/frosted-bar';
import { Icon } from '@/components/icon';
import { ImageSlot } from '@/components/image-slot';
import { StarRow } from '@/components/reviews';
import { FloatingIconButton } from '@/components/screen-header';
import { FadeIn } from '@/components/skeleton';
import { Avatar, Button, T, Tap } from '@/components/ui';
import { getProduct, initialsOf, listingsBy } from '@/data/catalog';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { tapLight } from '@/lib/haptics';
import { deliveryFor, euro, useApp } from '@/store/app-store';
import { color as C, motion, radius } from '@/theme/tokens';

/** Gallery height relative to width, taken from the design's 393×430 slot. */
const GALLERY_RATIO = 430 / 393;

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { favs, toggleFav, openSheet } = useApp();

  const p = getProduct(Number(id));
  const delivery = deliveryFor(p);
  const isLocal = delivery.kind === 'local';
  const related = listingsBy(p.s).filter((r) => r.id !== p.id).slice(0, 4);
  const faved = !!favs[p.id];

  const [page, setPage] = useState(0);
  const galleryHeight = width * GALLERY_RATIO;

  const heart = useAnimatedValue(1);
  const favourite = () => {
    tapLight();
    toggleFav(p.id);
    Animated.sequence([
      Animated.spring(heart, { toValue: 1.2, useNativeDriver: NATIVE_DRIVER, tension: 420, friction: 6 }),
      Animated.spring(heart, { toValue: 1, useNativeDriver: NATIVE_DRIVER, ...motion.spring }),
    ]).start();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
        {/* ── gallery ── */}
        <View style={{ backgroundColor: C.well }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            style={{ height: galleryHeight }}
          >
            {[p.t, 'Detail shot', 'Worn / in use'].map((label, i) => (
              <View key={i} style={{ width, height: galleryHeight }}>
                <ImageSlot label={label} glyph={34} />
              </View>
            ))}
          </ScrollView>

          <View
            style={{
              position: 'absolute',
              top: insets.top,
              left: 14,
              right: 14,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <FloatingIconButton name="chevronLeft" label="Back" onPress={() => router.back()} />
            <Animated.View style={{ transform: [{ scale: heart }] }}>
              <FloatingIconButton
                name="heart"
                label={faved ? 'Remove from favourites' : 'Save to favourites'}
                color={faved ? C.favOn : C.text}
                fill={faved ? C.favOn : 'none'}
                onPress={favourite}
              />
            </Animated.View>
          </View>

          <View
            style={{
              position: 'absolute',
              bottom: 14,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: i === page ? 18 : 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: i === page ? 'rgba(23,23,23,0.75)' : 'rgba(23,23,23,0.28)',
                }}
              />
            ))}
          </View>
        </View>

        {/*
          ── headline ──
          Enters just behind the gallery. §10 wants the image to land first and
          the information to follow it, so the delay here is what establishes
          that order; the CTA bar below is deliberately left out of the
          sequence and stays put.
        */}
        <FadeIn y={10} delay={90} duration={280} style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16 }}>
          <T w={600} size={21} tracking={-0.35} lh={26.25}>
            {p.t}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9, marginTop: 9 }}>
            <T w={700} size={26} tracking={-0.6}>
              {euro(p.pr)}
            </T>
            {!!p.old && (
              <T size={14} color={C.textTertiary} style={{ textDecorationLine: 'line-through' }}>
                {euro(p.old)}
              </T>
            )}
          </View>
          <T size={12.5} color={C.textSecondary} style={{ marginTop: 3 }}>
            {isLocal ? 'Cash on collect · protection at handover' : 'Includes buyer protection'}
          </T>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
            {[p.cd, p.b, p.sz, p.clr].map((a) => (
              <View
                key={a}
                style={{
                  height: 29,
                  paddingHorizontal: 11,
                  borderRadius: radius.md,
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: C.border,
                  justifyContent: 'center',
                }}
              >
                <T w={500} size={12.5}>
                  {a}
                </T>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 }}>
            <Icon name="pin" size={13} color={C.textSecondary} strokeWidth={1.9} />
            <T size={13} color={C.textSecondary}>
              {p.city}, {p.country}
            </T>
          </View>

          <T size={14.5} lh={22.5} style={{ marginTop: 16 }}>
            {p.desc}
          </T>
        </FadeIn>

        {/* ── delivery ── */}
        <Section>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
            <View style={{ marginTop: 2 }}>
              <Icon name="truck" size={19} color={C.text} strokeWidth={1.7} />
            </View>
            <View style={{ flex: 1 }}>
              <T w={600} size={15}>
                {isLocal ? 'Local pickup available' : delivery.kind === 'intl' ? 'International delivery' : 'Delivery'}
              </T>
              <T size={13} color={C.textSecondary} style={{ marginTop: 3 }}>
                {isLocal ? 'Al Riyadh Pickup Point, Khartoum' : `From ${euro(delivery.opts[0].price)}`}
              </T>
              <T size={13} color={C.textSecondary}>
                {delivery.opts[0].eta}
              </T>
            </View>
          </View>
        </Section>

        {/* ── seller ── */}
        <Section>
          <Tap
            onPress={() => router.push({ pathname: '/seller/[name]', params: { name: p.s } })}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <Avatar initials={initialsOf(p.s)} bg={p.av} size={46} fontSize={16} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <T w={600} size={15}>
                  {p.s}
                </T>
                <Icon name="badgeCheck" size={14} color={C.green} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <StarRow />
                <T size={12.5} color={C.textSecondary}>
                  {p.sales} sales · replies in 1 h
                </T>
              </View>
            </View>
            <Icon name="chevronRight" size={18} color={C.textTertiary} strokeWidth={1.9} />
          </Tap>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Button
              label="View profile"
              variant="outline"
              height={42}
              size={13.5}
              onPress={() => router.push({ pathname: '/seller/[name]', params: { name: p.s } })}
              style={{ flex: 1, borderRadius: 11 }}
            />
            <Button
              label="Message"
              variant="outline"
              height={42}
              size={13.5}
              onPress={() => router.push('/chat')}
              style={{ flex: 1, borderRadius: 11 }}
            />
          </View>
        </Section>

        {/* ── more from this seller ── */}
        {related.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16 }}>
            <T w={600} size={16} style={{ marginBottom: 12 }}>
              More from {p.s}
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {related.map((r) => (
                <Tap
                  key={r.id}
                  onPress={() => router.push({ pathname: '/product/[id]', params: { id: r.id } })}
                  accessibilityRole="button"
                  style={{ width: 104 }}
                >
                  <View
                    style={{ width: 104, height: 130, borderRadius: 11, overflow: 'hidden', backgroundColor: C.well }}
                  >
                    <ImageSlot label={r.t} glyph={20} />
                  </View>
                  <T size={12.5} numberOfLines={1} style={{ marginTop: 6 }}>
                    {r.t}
                  </T>
                  <T w={700} size={14}>
                    {euro(r.pr)}
                  </T>
                </Tap>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ── buy bar ── */}
      <FrostedBar
        edge="top"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
          gap: 9,
          paddingHorizontal: 16,
          paddingTop: 11,
          paddingBottom: Math.max(insets.bottom, 14),
        }}
      >
        <Button
          label="Make an offer"
          variant="strong"
          height={48}
          size={14.5}
          onPress={() => openSheet({ kind: 'offer', mode: 'buyer', productId: p.id, amount: Math.round(p.pr * 0.85) })}
          style={{ flex: 1 }}
        />
        <Button
          label="Buy now"
          height={48}
          size={14.5}
          onPress={() => router.push({ pathname: '/delivery', params: { id: p.id } })}
          style={{ flex: 1 }}
        />
      </FrostedBar>
    </View>
  );
}

/** Hairline-separated block, the pattern used down the product page. */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ marginHorizontal: 16, borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 16 }}>
      {children}
    </View>
  );
}

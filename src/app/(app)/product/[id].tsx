import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Animated, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrostedBar } from '@/components/frosted-bar';
import { Icon } from '@/components/icon';
import { ImageSlot } from '@/components/image-slot';
import { StarRow } from '@/components/reviews';
import { FloatingIconButton } from '@/components/screen-header';
import { PriceTile } from '@/components/product-card';
import { FadeIn } from '@/components/skeleton';
import { Avatar, Button, T, Tap } from '@/components/ui';
import { getProduct, initialsOf, listingsBy } from '@/data/catalog';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { tapLight } from '@/lib/haptics';
import { deliveryFor, euro, PROTECTION_FEE, useApp } from '@/store/app-store';
import { alpha, color as C, motion, radius } from '@/theme/tokens';

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
      Animated.spring(heart, { toValue: 1.15, useNativeDriver: NATIVE_DRIVER, tension: 420, friction: 6 }),
      Animated.spring(heart, { toValue: 1, useNativeDriver: NATIVE_DRIVER, ...motion.spring }),
    ]).start();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
        {/*
          ── gallery ──
          Settles in first, from 0.98 and transparent. The controls and dots
          ride with it because they are children, so the whole plate arrives as
          one object rather than the photo appearing under fixed furniture.
        */}
        <FadeIn scale={0.98} duration={320} style={{ backgroundColor: C.surfaceSecondary }}>
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

            {/* Share sits beside the favourite, per the overlay spec. */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <FloatingIconButton
                name="send"
                label="Share this listing"
                onPress={() => openSheet({ kind: 'share', productId: p.id })}
              />
              <Animated.View style={{ transform: [{ scale: heart }] }}>
                <FloatingIconButton
                  name="heart"
                  label={faved ? 'Remove from favourites' : 'Save to favourites'}
                  color={C.favourite}
                  fill={faved ? C.favourite : 'none'}
                  onPress={favourite}
                />
              </Animated.View>
            </View>
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
                  backgroundColor: i === page ? alpha.inkMedium : alpha.inkFaint,
                }}
              />
            ))}
          </View>
        </FadeIn>

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
              <T size={14} color={C.textMuted} style={{ textDecorationLine: 'line-through' }}>
                {euro(p.old)}
              </T>
            )}
          </View>
          {/*
            Condition earns its own line directly under the price rather than
            sitting as the first of four attribute chips. It is the single fact
            a second-hand buyer checks after the number, and buried in a chip
            row it carried no more weight than the colour.
          */}
          <T w={500} size={14.5} style={{ marginTop: 8 }}>
            {p.cd}
          </T>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <Icon name="pin" size={13} color={C.textSecondary} strokeWidth={1.9} />
            <T size={13} color={C.textSecondary}>
              {p.city}, {p.country}
            </T>
          </View>

          <T size={14.5} lh={22.5} style={{ marginTop: 16 }}>
            {p.desc}
          </T>

          {/* Brand, size and colour — reference detail, below the description. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16 }}>
            {[p.b, p.sz, p.clr].map((a) => (
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
        </FadeIn>

        {/*
          ── seller ──
          Above delivery, because on a second-hand marketplace who you are
          buying from is the question that gates the rest. Logistics only
          matter once the buyer has decided they trust the person.
        */}
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
                <Icon name="badgeCheck" size={14} color={C.success} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <StarRow />
                <T size={12.5} color={C.textSecondary}>
                  {p.sales} sales · replies in 1 h
                </T>
              </View>
            </View>
            <Icon name="chevronRight" size={18} color={C.textMuted} strokeWidth={1.9} />
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

        {/*
          ── payment ──
          The reassurance that used to be a single grey line under the price.
          It reads as boilerplate there and as an answer here, next to the
          delivery terms a buyer is already weighing.
        */}
        <Section>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
            <View style={{ marginTop: 2 }}>
              <Icon name={isLocal ? 'cash' : 'card'} size={19} color={C.text} strokeWidth={1.7} />
            </View>
            <View style={{ flex: 1 }}>
              <T w={600} size={15}>
                {isLocal ? 'Cash on collection' : 'Secure payment'}
              </T>
              <T size={13} color={C.textSecondary} lh={19} style={{ marginTop: 3 }}>
                {isLocal
                  ? 'Pay the seller at the pickup point. Nothing is taken from your card.'
                  : 'Card payment handled by Stripe. Your details never reach the seller.'}
              </T>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 }}>
                <Icon name="shieldCheck" size={15} color={C.success} strokeWidth={1.9} />
                <T size={12.5} color={C.textSecondary} style={{ flex: 1 }}>
                  {isLocal
                    ? 'Protection applies at handover — check the item before you pay.'
                    : `Buyer protection included · ${euro(PROTECTION_FEE)}`}
                </T>
              </View>
            </View>
          </View>
        </Section>

        {/* ── more from this seller ── */}
        {related.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16 }}>
            <T w={600} size={16} style={{ marginBottom: 12 }}>
              More from {p.s}
            </T>
            {/*
              The shared tile rather than a bespoke card: this rail used to
              hand-roll its own 104×130 well at an 11pt radius, which is off the
              radius ladder and drifted from the grid every time the card
              changed.
            */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {related.map((r) => (
                <PriceTile key={r.id} product={r} width={104} title />
              ))}
            </ScrollView>
          </View>
        )}

        {/*
          Share and report live at the foot of the listing rather than behind an
          Report stays at the foot of the listing. Share moved up to the gallery
          overlay, where the brief places it; reporting is rare enough that a
          third floating control over the photography would cost more than it
          returns.
        */}
        <View style={{ marginHorizontal: 16, marginTop: 4, marginBottom: 8 }}>
          <Tap
            onPress={() => openSheet({ kind: 'report', productId: p.id })}
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 15,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <Icon name="shield" size={18} color={C.textSecondary} strokeWidth={1.8} />
            <T w={500} size={14.5} color={C.textSecondary} style={{ flex: 1 }}>
              Report this listing
            </T>
            <Icon name="chevronRight" size={16} color={C.borderStrong} />
          </Tap>
        </View>
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

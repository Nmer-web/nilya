import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Scrim, Sheet, SheetClose, SheetGrabber, Toast } from '@/components/sheet';
import { Slider } from '@/components/slider';
import { Button, Card, Chip, SectionLabel, T, Tap, Toggle } from '@/components/ui';
import { getProduct } from '@/data/catalog';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { euro, useApp, useSearchResults } from '@/store/app-store';
import { color as C, radius } from '@/theme/tokens';

/**
 * Every screen-level overlay lives here, above the nav — the design renders
 * sheets and the toast as siblings of the screens rather than inside them.
 */
export function Overlays() {
  const { sheet, toast, closeSheet } = useApp();

  return (
    <>
      {sheet && <Scrim onPress={closeSheet} />}
      {sheet?.kind === 'offer' && <OfferSheet />}
      {sheet?.kind === 'filters' && <FiltersSheet />}
      {sheet?.kind === 'done' && <DoneSheet />}
      {!!toast && <Toast message={toast} />}
    </>
  );
}

/* ─────────────────────────── make / counter an offer ─────────────────────────── */

function OfferSheet() {
  const { sheet, closeSheet, setOfferAmount, setOfferState, flash } = useApp();
  const insets = useSafeAreaInsets();
  if (sheet?.kind !== 'offer') return null;

  const { mode, productId, amount } = sheet;
  const p = getProduct(productId);
  const counter = mode === 'counter';
  const quick = counter ? [24, 27, 30] : [0.7, 0.8, 0.9].map((f) => Math.round(p.pr * f));

  const send = () => {
    if (counter) {
      closeSheet();
      setOfferState('countered');
      flash(`Counter of ${euro(amount)} sent to Leila`);
      return;
    }
    closeSheet();
    flash(`Offer of ${euro(amount)} sent — ${p.s.split(' ')[0]} has 24 h to reply`);
  };

  return (
    <Sheet style={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 18 }}>
      <SheetGrabber style={{ marginBottom: 16 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T w={600} size={19} tracking={-0.3}>
          {counter ? 'Send a counter' : 'Make an offer'}
        </T>
        <SheetClose onPress={closeSheet} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: 18,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <T size={14} color={C.textSecondary}>
          {counter ? "Leila's offer" : 'Seller price'}
        </T>
        <T w={600} size={16}>
          {counter ? '€22' : euro(p.pr)}
        </T>
      </View>

      <T size={13} color={C.textSecondary} style={{ paddingTop: 16, paddingBottom: 8 }}>
        Your offer
      </T>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StepperButton icon="minus" label="Lower offer" onPress={() => setOfferAmount(amount - 1)} />
        <View
          style={{
            flex: 1,
            height: 56,
            borderRadius: radius.lg,
            backgroundColor: C.surface,
            borderWidth: 1.5,
            borderColor: C.text,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T w={700} size={26} tracking={-0.5}>
            {euro(amount)}
          </T>
        </View>
        <StepperButton icon="plus" label="Raise offer" onPress={() => setOfferAmount(amount + 1)} />
      </View>

      <View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}>
        {quick.map((v) => (
          <Chip
            key={v}
            label={euro(v)}
            active={amount === v}
            height={38}
            round={10}
            onPress={() => setOfferAmount(v)}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      <T size={12.5} color={C.textSecondary} lh={18} style={{ marginTop: 14 }}>
        {counter
          ? 'Leila has 24 hours to accept your counter.'
          : `Offers under ${euro(Math.round(p.pr * 0.6))} are usually declined. Shipping is added at checkout.`}
      </T>

      <Button label={counter ? 'Send counter' : 'Send offer'} onPress={send} style={{ marginTop: 16 }} />
    </Sheet>
  );
}

function StepperButton({
  icon,
  onPress,
  label,
}: {
  icon: 'plus' | 'minus';
  onPress: () => void;
  label: string;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={17} color={C.text} strokeWidth={2.2} />
    </Tap>
  );
}

/* ─────────────────────────── filters ─────────────────────────── */

const CONDITIONS = ['Any', 'New', 'Very good', 'Good'];
const DELIVERIES = ['Any', 'Pickup point', 'Local pickup', 'International'];
const FILTER_ROWS = [
  { n: 'Size', v: 'Any' },
  { n: 'Brand', v: 'Any' },
  { n: 'Colour', v: 'Any' },
  { n: 'Location', v: 'Worldwide' },
  { n: 'Seller rating', v: '4.0+' },
];

function FiltersSheet() {
  const {
    closeSheet,
    cat,
    fCond,
    fDel,
    maxPrice,
    verifiedOnly,
    setCond,
    setDel,
    setMaxPrice,
    toggleVerifiedOnly,
    resetFilters,
    flash,
  } = useApp();
  const insets = useSafeAreaInsets();
  const results = useSearchResults();
  const rows = [{ n: 'Category', v: cat }, ...FILTER_ROWS];

  return (
    <Sheet top={78} style={{ overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <SheetGrabber style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tap onPress={resetFilters} accessibilityRole="button" hitSlop={8}>
            <T w={500} size={13.5} color={C.textSecondary}>
              Reset
            </T>
          </Tap>
          <T w={600} size={16.5}>
            Filters
          </T>
          <SheetClose onPress={closeSheet} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel style={{ paddingTop: 16, paddingBottom: 10 }}>Condition</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {CONDITIONS.map((n) => (
            <Chip key={n} label={n} active={fCond === n} height={36} round={10} onPress={() => setCond(n)} />
          ))}
        </View>

        <SectionLabel style={{ paddingTop: 22, paddingBottom: 10 }}>Price range</SectionLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <PriceField label="Min" value="€0" />
          <View style={{ width: 12, height: 1, backgroundColor: C.borderStrong }} />
          <PriceField label="Max" value={maxPrice >= 300 ? '€300+' : `€${maxPrice}`} />
        </View>
        <Slider
          value={maxPrice}
          min={20}
          max={300}
          onChange={setMaxPrice}
          label="Maximum price"
        />

        <SectionLabel style={{ paddingTop: 18, paddingBottom: 10 }}>Delivery</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {DELIVERIES.map((n) => (
            <Chip key={n} label={n} active={fDel === n} height={36} round={10} onPress={() => setDel(n)} />
          ))}
        </View>

        <Card style={{ marginTop: 22, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <Tap
              key={r.n}
              onPress={() => flash(`${r.n} filter`)}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 15,
                borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                borderBottomColor: C.border,
              }}
            >
              <T w={500} size={14.5} style={{ flex: 1 }}>
                {r.n}
              </T>
              <T size={13.5} color={C.textSecondary} style={{ paddingRight: 8 }}>
                {r.v}
              </T>
              <Icon name="chevronRight" size={16} color={C.borderStrong} />
            </Tap>
          ))}
        </Card>

        <Card
          style={{
            marginTop: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 15,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <T w={600} size={14}>
              Verified sellers only
            </T>
            <T size={12.5} color={C.textSecondary} style={{ marginTop: 2 }}>
              ID and payouts checked
            </T>
          </View>
          <Toggle on={verifiedOnly} onPress={toggleVerifiedOnly} />
        </Card>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 11,
          paddingBottom: insets.bottom + 16,
          borderTopWidth: 1,
          borderTopColor: C.border,
          backgroundColor: C.bg,
        }}
      >
        <Button label={`Show ${results.length} results`} onPress={closeSheet} haptic />
      </View>
    </Sheet>
  );
}

function PriceField({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        height: 52,
        borderRadius: radius.lg,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        justifyContent: 'center',
        paddingHorizontal: 14,
      }}
    >
      <T size={11} color={C.textTertiary}>
        {label}
      </T>
      <T w={600} size={14.5} style={{ marginTop: 1 }}>
        {value}
      </T>
    </View>
  );
}

/* ─────────────────────────── confirmation ─────────────────────────── */

const DONE_COPY = {
  published: {
    title: 'Your listing is live',
    body: 'Nike Air Max 270 is now visible to 40,000 buyers. We will nudge you when someone favourites it.',
    cta: 'View listing',
    alt: 'Sell another item',
  },
  placed: {
    title: 'Order placed',
    body: 'Bring 35,000 SDG to Al Riyadh Pickup Point. Amal has been notified and will drop the item today.',
    cta: 'Track order',
    alt: 'Keep browsing',
  },
  paid: {
    title: 'Payment confirmed',
    body: 'Yousif has been paid into escrow and has 3 days to ship. Order #SS28491.',
    cta: 'Track order',
    alt: 'Keep browsing',
  },
} as const;

function DoneSheet() {
  const { sheet, closeSheet } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pop = useAnimatedValue(0);

  useEffect(() => {
    Animated.timing(pop, {
      toValue: 1,
      duration: 420,
      easing: Easing.bezier(0.3, 1.4, 0.4, 1),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [pop]);

  if (sheet?.kind !== 'done') return null;
  const copy = DONE_COPY[sheet.doneKind];

  /**
   * Unwind the checkout/sell flow before landing, so back doesn't walk the user
   * through the steps they just completed. Same `dismissTo` reasoning as the
   * bottom nav.
   */
  const primary = () => {
    closeSheet();
    if (sheet.doneKind === 'published') {
      router.dismissTo('/profile');
    } else {
      router.dismissTo('/');
      router.push({ pathname: '/order/[id]', params: { id: 'SS28491' } });
    }
  };

  return (
    <Sheet
      style={{
        paddingTop: 26,
        paddingHorizontal: 22,
        paddingBottom: insets.bottom + 18,
        alignItems: 'center',
      }}
    >
      <Animated.View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: C.green,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
        }}
      >
        <Icon name="check" size={27} color={C.onDark} strokeWidth={2.6} />
      </Animated.View>

      <T w={600} size={20} tracking={-0.3} style={{ marginTop: 18, textAlign: 'center' }}>
        {copy.title}
      </T>
      <T size={14} color={C.textSecondary} lh={21} style={{ marginTop: 8, textAlign: 'center' }}>
        {copy.body}
      </T>

      <Button label={copy.cta} onPress={primary} style={{ marginTop: 22, alignSelf: 'stretch' }} />
      <Tap
        onPress={closeSheet}
        accessibilityRole="button"
        style={{ height: 46, marginTop: 8, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}
      >
        <T w={600} size={14} color={C.textSecondary}>
          {copy.alt}
        </T>
      </Tap>
    </Sheet>
  );
}

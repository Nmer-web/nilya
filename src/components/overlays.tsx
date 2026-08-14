import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Scrim, Sheet, SheetClose, SheetGrabber, Toast } from '@/components/sheet';
import { Slider } from '@/components/slider';
import { Button, Card, Chip, SectionLabel, T, Tap, Toggle } from '@/components/ui';
import { getProduct } from '@/data/catalog';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { tapSuccess } from '@/lib/haptics';
import { euro, SORTS, useApp, useSearchResults } from '@/store/app-store';
import { color as C, radius } from '@/theme/tokens';

/**
 * Dismissal, separated from the store action.
 *
 * `closeSheet` clears the store immediately, which unmounts the overlay with
 * no chance to animate. Everything inside a sheet therefore calls `useDismiss`
 * instead: it starts the exit, and the store is only cleared once the sheet
 * reports that it has finished travelling.
 */
const DismissContext = React.createContext<() => void>(() => {});

export const useDismiss = () => React.useContext(DismissContext);

/**
 * Every screen-level overlay lives here, above the nav — the design renders
 * sheets and the toast as siblings of the screens rather than inside them.
 */
export function Overlays() {
  const { sheet, toast, closeSheet } = useApp();

  /**
   * Which sheet is on its way out, rather than a bare boolean.
   *
   * Recording the identity means a sheet opened straight after a dismissal
   * cannot inherit the flag and animate itself away on arrival: the store hands
   * back a new object, so the comparison below is simply false for it. A
   * boolean would need an effect to reset it, and resetting state from an
   * effect is the cascading-render pattern the compiler rejects.
   */
  const [closingFor, setClosingFor] = useState<typeof sheet>(null);

  const closing = sheet !== null && closingFor === sheet;

  const dismiss = useCallback(() => setClosingFor(sheet), [sheet]);

  const exited = useCallback(() => {
    setClosingFor(null);
    closeSheet();
  }, [closeSheet]);

  const phase = { closing, onExited: exited };

  return (
    <DismissContext.Provider value={dismiss}>
      {sheet && <Scrim onPress={dismiss} closing={closing} />}
      {sheet?.kind === 'offer' && <OfferSheet {...phase} />}
      {sheet?.kind === 'filters' && <FiltersSheet {...phase} />}
      {sheet?.kind === 'sort' && <SortSheet {...phase} />}
      {sheet?.kind === 'share' && <ShareSheet {...phase} />}
      {sheet?.kind === 'report' && <ReportSheet {...phase} />}
      {sheet?.kind === 'done' && <DoneSheet {...phase} />}
      {!!toast && <Toast message={toast} />}
    </DismissContext.Provider>
  );
}

/** Exit plumbing passed from `Overlays` down to each sheet's `<Sheet>`. */
type Phase = { closing: boolean; onExited: () => void };

/* ─────────────────────────── shared sheet parts ─────────────────────────── */

/**
 * Title row with a close affordance — the same header on every sheet, so they
 * are recognisable as one family rather than six separate designs.
 */
function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <T w={600} size={19} tracking={-0.3} style={{ flex: 1 }}>
        {title}
      </T>
      <SheetClose onPress={onClose} />
    </View>
  );
}

/**
 * A selectable or tappable row inside a sheet.
 *
 * `selected` draws a checkmark rather than a radio dot: at this size a filled
 * circle and an empty one are hard to tell apart at a glance, and the tick
 * reads instantly. Selection is also carried by weight, not by the mark alone.
 */
function SheetRow({
  label,
  sub,
  icon,
  selected,
  destructive,
  last,
  onPress,
}: {
  label: string;
  sub?: string;
  icon?: IconName;
  selected?: boolean;
  destructive?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole={selected === undefined ? 'button' : 'radio'}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingVertical: 15,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      {!!icon && <Icon name={icon} size={19} color={destructive ? C.error : C.text} strokeWidth={1.8} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T w={selected ? 600 : 500} size={15} color={destructive ? C.error : C.text}>
          {label}
        </T>
        {!!sub && (
          <T size={12.5} color={C.textSecondary} style={{ marginTop: 2 }}>
            {sub}
          </T>
        )}
      </View>
      {selected && <Icon name="check" size={18} color={C.text} strokeWidth={2.6} />}
    </Tap>
  );
}

/* ─────────────────────────── make / counter an offer ─────────────────────────── */

function OfferSheet(phase: Phase) {
  const { sheet, setOfferAmount, setOfferState, flash } = useApp();
  const dismiss = useDismiss();
  const insets = useSafeAreaInsets();
  if (sheet?.kind !== 'offer') return null;

  const { mode, productId, amount } = sheet;
  const p = getProduct(productId);
  const counter = mode === 'counter';
  const quick = counter ? [24, 27, 30] : [0.7, 0.8, 0.9].map((f) => Math.round(p.pr * f));

  const send = () => {
    tapSuccess();
    if (counter) {
      dismiss();
      setOfferState('countered');
      flash(`Counter of ${euro(amount)} sent to Leila`);
      return;
    }
    dismiss();
    flash(`Offer of ${euro(amount)} sent — ${p.s.split(' ')[0]} has 24 h to reply`);
  };

  return (
    <Sheet {...phase} style={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 18 }}>
      <SheetGrabber style={{ marginBottom: 16 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T w={600} size={19} tracking={-0.3}>
          {counter ? 'Send a counter' : 'Make an offer'}
        </T>
        <SheetClose onPress={dismiss} />
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

/* ─────────────────────────── sort ─────────────────────────── */

/**
 * Sort options.
 *
 * Explore used to cycle through these on each tap of the label, which meant
 * the full set was never visible and reaching the third option took three
 * presses with the list re-sorting under you each time.
 */
function SortSheet(phase: Phase) {
  const { sort, setSort } = useApp();
  const dismiss = useDismiss();
  const insets = useSafeAreaInsets();

  return (
    <Sheet {...phase} style={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 12 }}>
      <SheetGrabber style={{ marginBottom: 16 }} />
      <SheetHeader title="Sort by" onClose={dismiss} />

      <View style={{ marginTop: 6 }}>
        {SORTS.map((s, i) => (
          <SheetRow
            key={s}
            label={s}
            selected={sort === s}
            last={i === SORTS.length - 1}
            onPress={() => {
              setSort(s);
              dismiss();
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}

/* ─────────────────────────── share ─────────────────────────── */

function ShareSheet(phase: Phase) {
  const { sheet, flash } = useApp();
  const dismiss = useDismiss();
  const insets = useSafeAreaInsets();
  if (sheet?.kind !== 'share') return null;

  const p = getProduct(sheet.productId);
  const url = `https://sawa.app/item/${p.id}`;

  /**
   * Hands off to the platform's own share sheet, which is the one piece of
   * this flow that should not be re-implemented: it carries the user's real
   * targets and their ordering. The in-app rows exist for the two actions the
   * OS sheet buries.
   */
  const shareVia = async () => {
    dismiss();
    try {
      await Share.share({ message: `${p.t} — ${euro(p.pr)}\n${url}`, url });
    } catch {
      flash('Sharing is unavailable here');
    }
  };

  return (
    <Sheet {...phase} style={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 12 }}>
      <SheetGrabber style={{ marginBottom: 16 }} />
      <SheetHeader title="Share this listing" onClose={dismiss} />

      <T size={13} color={C.textSecondary} numberOfLines={1} style={{ marginTop: 10 }}>
        {url}
      </T>

      <View style={{ marginTop: 8 }}>
        <SheetRow
          icon="send"
          label="Share via…"
          sub="Messages, mail, anything installed"
          onPress={shareVia}
        />
        <SheetRow
          icon="badgeCheck"
          label="Copy link"
          last
          onPress={() => {
            dismiss();
            flash('Link copied');
          }}
        />
      </View>
    </Sheet>
  );
}

/* ─────────────────────────── report ─────────────────────────── */

const REPORT_REASONS = [
  'Counterfeit or replica',
  'Prohibited item',
  'Misleading description',
  'Offensive content',
  'Suspected scam',
];

function ReportSheet(phase: Phase) {
  const { sheet, flash } = useApp();
  const dismiss = useDismiss();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<string | null>(null);
  if (sheet?.kind !== 'report') return null;

  return (
    <Sheet {...phase} style={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 12 }}>
      <SheetGrabber style={{ marginBottom: 16 }} />
      <SheetHeader title="Report listing" onClose={dismiss} />

      <T size={13} color={C.textSecondary} lh={19} style={{ marginTop: 8 }}>
        Reports are confidential. The seller is not told who raised them.
      </T>

      <View style={{ marginTop: 8 }}>
        {REPORT_REASONS.map((r, i) => (
          <SheetRow
            key={r}
            label={r}
            selected={reason === r}
            last={i === REPORT_REASONS.length - 1}
            onPress={() => setReason(r)}
          />
        ))}
      </View>

      <Button
        label="Submit report"
        disabled={!reason}
        style={{ marginTop: 18 }}
        onPress={() => {
          dismiss();
          flash('Report sent — thank you');
        }}
      />
    </Sheet>
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

function FiltersSheet(phase: Phase) {
  const {
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
  const dismiss = useDismiss();
  const insets = useSafeAreaInsets();
  const results = useSearchResults();
  const rows = [{ n: 'Category', v: cat }, ...FILTER_ROWS];

  return (
    <Sheet {...phase} top={78} style={{ overflow: 'hidden' }}>
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
          <SheetClose onPress={dismiss} />
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
          backgroundColor: C.background,
        }}
      >
        <Button label={`Show ${results.length} results`} onPress={dismiss} />
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
      <T size={11} color={C.textMuted}>
        {label}
      </T>
      <T w={600} size={14.5} style={{ marginTop: 1 }}>
        {value}
      </T>
    </View>
  );
}

/* ─────────────────────────── confirmation ─────────────────────────── */

/*
 * Publishing no longer lands here. The real Sell flow navigates straight to the
 * listing it created, so a sheet naming a hard-coded product would be reporting
 * something that did not happen.
 */
const DONE_COPY = {
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

function DoneSheet(phase: Phase) {
  const { sheet } = useApp();
  const dismiss = useDismiss();
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
    dismiss();
    router.dismissTo('/');
    router.push({ pathname: '/order/[id]', params: { id: 'SS28491' } });
  };

  const secondary = () => dismiss();

  return (
    <Sheet
      {...phase}
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
          backgroundColor: C.success,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
        }}
      >
        <Icon name="check" size={27} color={C.primaryText} strokeWidth={2.6} />
      </Animated.View>

      <T w={600} size={20} tracking={-0.3} style={{ marginTop: 18, textAlign: 'center' }}>
        {copy.title}
      </T>
      <T size={14} color={C.textSecondary} lh={21} style={{ marginTop: 8, textAlign: 'center' }}>
        {copy.body}
      </T>

      <Button label={copy.cta} onPress={primary} style={{ marginTop: 22, alignSelf: 'stretch' }} />
      <Tap
        onPress={secondary}
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

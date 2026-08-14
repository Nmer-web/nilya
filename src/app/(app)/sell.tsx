import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavHeight } from '@/components/bottom-nav';
import { FrostedBar } from '@/components/frosted-bar';
import { Icon } from '@/components/icon';
import { ImageSlot } from '@/components/image-slot';
import { Button, Card, Chip, Note, T, Tap, Toggle } from '@/components/ui';
import { EXCATS } from '@/data/catalog';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { tapSuccess } from '@/lib/haptics';
import { draftComplete, useApp, type Draft } from '@/store/app-store';
import { alpha, color as C, radius, space } from '@/theme/tokens';

const CONDITIONS = ['New with tags', 'Like new', 'Very good', 'Good', 'Satisfactory'];

/**
 * The compose flow, one decision per screen.
 *
 * A single long form asks the seller to hold every remaining question in their
 * head at once; a step asks one thing and shows how much is left. `optional`
 * marks the steps a listing can publish without, so Continue is never blocked
 * on a fact the seller may not have.
 */
const STEPS: { key: string; title: string; sub: string; optional?: boolean }[] = [
  { key: 'photos', title: 'Add your photos', sub: 'Natural light and a plain background sell fastest.' },
  { key: 'title', title: 'What are you selling?', sub: 'Buyers search this text, so name the item plainly.' },
  { key: 'category', title: 'Pick a category', sub: 'This decides where your listing shows up.' },
  { key: 'condition', title: 'What condition is it in?', sub: 'Be honest — it is the first thing buyers check.' },
  { key: 'details', title: 'Brand and colour', sub: 'Optional, but listings with both sell faster.', optional: true },
  { key: 'price', title: 'Set your price', sub: 'You keep 97% of the sale.' },
  { key: 'delivery', title: 'How will it reach them?', sub: 'Buyers pay shipping unless they collect.' },
  { key: 'preview', title: 'Ready to publish', sub: 'Check it over — you can edit anything later.' },
];

export default function Sell() {
  const navHeight = useNavHeight();
  const router = useRouter();
  const app = useApp();
  const {
    photos,
    scanning,
    suggested,
    sudanPickup,
    step,
    draft,
    addPhotos,
    removePhoto,
    applySuggestion,
    toggleSudanPickup,
    setStep,
    setDraftField,
    publish,
  } = app;

  const [publishing, setPublishing] = useState(false);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  /**
   * Whether this step has what it needs. Optional steps always pass, and the
   * real gate is `draftComplete` on the final screen.
   */
  const stepReady = (() => {
    switch (current.key) {
      case 'photos':
        return photos.length > 0;
      case 'title':
        return draft.title.trim() !== '';
      case 'category':
        return draft.category !== '';
      case 'condition':
        return draft.condition !== '';
      case 'price':
        return draft.price.trim() !== '';
      default:
        return true;
    }
  })();

  const back = () => (step === 0 ? router.back() : setStep(step - 1));
  const next = () => setStep(Math.min(step + 1, STEPS.length - 1));

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <StepHeader step={step} total={STEPS.length} onBack={back} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: navHeight + 110 }}
      >
        {/*
          Keyed on the step so each panel mounts fresh and replays its entrance.
          Panels always enter from the right rather than tracking direction:
          reading it as forward motion is the point, and a direction-aware
          version would need the previous index threaded through state for a
          difference almost nobody would notice.
        */}
        <StepPanel key={current.key}>
          <T w={700} size={27} tracking={-0.6} lh={33} style={{ marginTop: space.sm }}>
            {current.title}
          </T>
          <T size={14.5} color={C.textSecondary} lh={21} style={{ marginTop: space.sm, marginBottom: space.xl }}>
            {current.sub}
          </T>

          {current.key === 'photos' && (
            <PhotosStep
              photos={photos}
              scanning={scanning}
              suggested={suggested}
              onAdd={addPhotos}
              onRemove={removePhoto}
              onApply={applySuggestion}
            />
          )}

          {current.key === 'title' && (
            <FieldInput
              value={draft.title}
              onChange={(v) => setDraftField('title', v)}
              placeholder="e.g. Nike Air Max 270"
              autoFocus
            />
          )}

          {current.key === 'category' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EXCATS.filter((c) => c !== 'All').map((c) => (
                <Chip
                  key={c}
                  label={c}
                  height={40}
                  round={radius.md}
                  active={draft.category === c}
                  onPress={() => setDraftField('category', c)}
                />
              ))}
            </View>
          )}

          {current.key === 'condition' && (
            <View>
              {CONDITIONS.map((c, i) => (
                <ChoiceRow
                  key={c}
                  label={c}
                  selected={draft.condition === c}
                  last={i === CONDITIONS.length - 1}
                  onPress={() => setDraftField('condition', c)}
                />
              ))}
            </View>
          )}

          {current.key === 'details' && (
            <View style={{ gap: space.lg }}>
              <FieldInput
                label="Brand"
                value={draft.brand}
                onChange={(v) => setDraftField('brand', v)}
                placeholder="e.g. Nike"
              />
              <FieldInput
                label="Colour"
                value={draft.colour}
                onChange={(v) => setDraftField('colour', v)}
                placeholder="e.g. Black"
              />
            </View>
          )}

          {current.key === 'price' && (
            <PriceStep value={draft.price} onChange={(v) => setDraftField('price', v)} />
          )}

          {current.key === 'delivery' && (
            <Card style={{ overflow: 'hidden', padding: 0 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 16,
                  paddingHorizontal: 15,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T w={600} size={15}>
                    Offer Sudan pickup
                  </T>
                  <T size={13} color={C.textSecondary} lh={19} style={{ marginTop: 3 }}>
                    Buyers in Khartoum can collect and pay cash at handover.
                  </T>
                </View>
                <Toggle on={sudanPickup} onPress={toggleSudanPickup} />
              </View>
            </Card>
          )}

          {current.key === 'preview' && (
            <PreviewStep draft={draft} photoCount={photos.length} pickup={sudanPickup} />
          )}
        </StepPanel>
      </ScrollView>

      <FrostedBar
        edge="top"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: navHeight,
          paddingHorizontal: space.gutter,
          paddingVertical: 11,
          flexDirection: 'row',
          gap: 10,
          alignItems: 'center',
        }}
      >
        {step > 0 && (
          <Button label="Back" variant="outline" height={50} size={15} onPress={back} style={{ width: 104 }} />
        )}

        {last ? (
          <Button
            label="Publish listing"
            loading={publishing}
            loadingLabel="Publishing…"
            disabled={!draftComplete(app)}
            style={{ flex: 1 }}
            onPress={() => {
              setPublishing(true);
              setTimeout(() => {
                setPublishing(false);
                tapSuccess();
                publish();
              }, 900);
            }}
          />
        ) : (
          <Button
            label={current.optional && !stepReady ? 'Skip' : 'Continue'}
            disabled={!stepReady && !current.optional}
            style={{ flex: 1 }}
            onPress={next}
          />
        )}
      </FrostedBar>
    </View>
  );
}

/* ─────────────────────────── chrome ─────────────────────────── */

/**
 * Back control, "Step n of 8", and the progress bar.
 *
 * The bar animates `scaleX` on a full-width track rather than its own `width`.
 * Width is a layout property and cannot run on the native driver; a transform
 * can, so the progress glides without putting a layout pass on the JS thread.
 */
function StepHeader({ step, total, onBack }: { step: number; total: number; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const p = useAnimatedValue((step + 1) / total);

  useEffect(() => {
    Animated.timing(p, {
      toValue: (step + 1) / total,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [p, step, total]);

  return (
    <View style={{ paddingTop: insets.top + space.sm, backgroundColor: C.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingHorizontal: space.gutter,
          paddingBottom: space.md,
        }}
      >
        <Tap
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}
        >
          <Icon name="chevronLeft" size={22} color={C.text} strokeWidth={2} />
        </Tap>
        <T w={600} size={13.5} color={C.textSecondary} style={{ flex: 1 }}>
          Step {step + 1} of {total}
        </T>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: total, now: step + 1 }}
        style={{ height: 3, backgroundColor: C.surfaceSecondary }}
      >
        <Animated.View
          style={{
            height: 3,
            backgroundColor: C.text,
            width: '100%',
            /* Grows from the start of the track, not from its centre. */
            transformOrigin: 'left',
            transform: [{ scaleX: p }],
          }}
        />
      </View>
    </View>
  );
}

/** Each step slides in from the right and fades up. */
function StepPanel({ children }: { children: React.ReactNode }) {
  const p = useAnimatedValue(0);

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [p]);

  return (
    <Animated.View
      style={{
        opacity: p,
        transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/* ─────────────────────────── steps ─────────────────────────── */

function PhotosStep({
  photos,
  scanning,
  suggested,
  onAdd,
  onRemove,
  onApply,
}: {
  photos: number[];
  scanning: boolean;
  suggested: boolean;
  onAdd: () => void;
  onRemove: (id: number) => void;
  onApply: () => void;
}) {
  if (photos.length === 0) {
    return (
      <Tap
        onPress={onAdd}
        accessibilityRole="button"
        style={{
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: C.borderStrong,
          backgroundColor: C.surface,
          borderRadius: radius.xl,
          paddingVertical: 44,
          paddingHorizontal: 20,
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: C.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="camera" size={25} color={C.text} strokeWidth={1.7} />
        </View>
        <T w={600} size={16}>
          Add photos
        </T>
        <T size={13.5} color={C.textSecondary} lh={20} style={{ textAlign: 'center' }}>
          Up to 10. The first one becomes your cover.
        </T>
      </Tap>
    );
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>
        {/* Keyed by id, never by index — see AppState.photos. */}
        {photos.map((id, i) => (
          <PhotoCard key={id} id={id} index={i} cover={i === 0} onRemove={onRemove} />
        ))}

        <Tap
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Add more photos"
          style={{
            width: PHOTO_W,
            height: PHOTO_H,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: C.borderStrong,
            backgroundColor: C.surface,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Icon name="plus" size={20} color={C.textSecondary} />
          <T size={11.5} color={C.textSecondary}>
            {photos.length} / 10
          </T>
        </Tap>
      </ScrollView>

      {scanning && (
        <Card style={{ marginTop: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <Spinner />
          <T size={13.5} color={C.textSecondary}>
            Reading your photos…
          </T>
        </Card>
      )}

      {/* Promotional: the suggested-listing feature selling itself. */}
      {suggested && (
        <Note tone="accent" style={{ marginTop: 16, padding: 15 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Icon name="sparkle" size={15} color={C.accent} />
            <T w={600} size={13.5} color={C.accentDark}>
              We recognised this item
            </T>
          </View>
          <T size={13.5} color={C.textSecondary} lh={20} style={{ marginTop: 8 }}>
            Nike Air Max 270 · Shoes · Very good · around €45
          </T>
          <Button
            label="Fill in the details"
            height={42}
            size={14}
            onPress={onApply}
            style={{ marginTop: 13, borderRadius: radius.md }}
          />
        </Note>
      )}
    </View>
  );
}

function PriceStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const clean = value.replace(/[^0-9.]/g, '');
  const n = Number(clean);
  const earn = Number.isFinite(n) && n > 0 ? n * 0.97 : 0;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderBottomWidth: 1.5,
          borderBottomColor: C.text,
          paddingBottom: 10,
        }}
      >
        <T w={700} size={34} tracking={-1}>
          €
        </T>
        <TextInput
          autoFocus
          value={value}
          onChangeText={(v) => onChange(v.replace(/[^0-9.]/g, ''))}
          placeholder="0"
          placeholderTextColor={C.borderStrong}
          keyboardType="decimal-pad"
          style={{ flex: 1, minWidth: 0, fontSize: 34, fontWeight: '700', color: C.text, padding: 0 }}
        />
      </View>

      <T size={13.5} color={C.textSecondary} lh={20} style={{ marginTop: 14 }}>
        {earn > 0
          ? `You receive €${earn.toFixed(2)} after the 3% selling fee.`
          : 'Similar shoes in very good condition sell for €42–€48.'}
      </T>
    </View>
  );
}

function PreviewStep({
  draft,
  photoCount,
  pickup,
}: {
  draft: Draft;
  photoCount: number;
  pickup: boolean;
}) {
  const rows: [string, string][] = [
    ['Category', draft.category || '—'],
    ['Condition', draft.condition || '—'],
    ['Brand', draft.brand || 'Not given'],
    ['Colour', draft.colour || 'Not given'],
    ['Delivery', pickup ? 'Shipping + Sudan pickup' : 'Shipping only'],
  ];

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <View
          style={{
            width: 96,
            height: 128,
            borderRadius: radius.lg,
            overflow: 'hidden',
            backgroundColor: C.surfaceSecondary,
          }}
        >
          <ImageSlot tiny />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={500} size={16} numberOfLines={2}>
            {draft.title || 'Untitled listing'}
          </T>
          <T w={700} size={21} tracking={-0.4} style={{ marginTop: 6 }}>
            {draft.price ? `€${draft.price}` : '—'}
          </T>
          <T size={12.5} color={C.textSecondary} style={{ marginTop: 6 }}>
            {photoCount} photo{photoCount === 1 ? '' : 's'}
          </T>
        </View>
      </View>

      <Card style={{ marginTop: space.xl, overflow: 'hidden' }}>
        {rows.map(([label, v], i) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 15,
              borderBottomWidth: i === rows.length - 1 ? 0 : 1,
              borderBottomColor: C.border,
            }}
          >
            <T size={13.5} color={C.textSecondary} style={{ width: 84 }}>
              {label}
            </T>
            <T w={500} size={14.5} numberOfLines={1} style={{ flex: 1 }}>
              {v}
            </T>
          </View>
        ))}
      </Card>
    </View>
  );
}

/* ─────────────────────────── inputs ─────────────────────────── */

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      {!!label && (
        <T w={600} size={13} color={C.textSecondary} style={{ marginBottom: 8 }}>
          {label}
        </T>
      )}
      <TextInput
        autoFocus={autoFocus}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        style={{
          height: 56,
          borderRadius: radius.lg,
          backgroundColor: C.background,
          borderWidth: focused ? 1.5 : 1,
          borderColor: focused ? C.text : C.border,
          paddingHorizontal: 15,
          fontSize: 16,
          color: C.text,
        }}
      />
    </View>
  );
}

/** A single-choice row. Selection is a tick plus weight, never colour alone. */
function ChoiceRow({
  label,
  selected,
  last,
  onPress,
}: {
  label: string;
  selected: boolean;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 17,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      <T w={selected ? 600 : 400} size={15.5} style={{ flex: 1 }}>
        {label}
      </T>
      {selected && <Icon name="check" size={19} color={C.text} strokeWidth={2.6} />}
    </Tap>
  );
}

/* ─────────────────────────── photo card ─────────────────────────── */

const PHOTO_W = 94;
const PHOTO_H = 118;

/**
 * One attached photo.
 *
 * Arrival and removal are deliberately asymmetric: a photo fades up into place
 * over 240ms, but leaves in 160ms. Deletion is a decision already made, and
 * making the user watch it play out at the same pace as the arrival makes the
 * interface feel like it is arguing.
 *
 * The card animates itself out and only then tells the store, so the row never
 * reflows out from under the thing being dismissed.
 */
function PhotoCard({
  id,
  index,
  cover,
  onRemove,
}: {
  id: number;
  index: number;
  cover: boolean;
  onRemove: (id: number) => void;
}) {
  const p = useAnimatedValue(0);
  const [leaving, setLeaving] = useState(false);

  /**
   * The stagger is fixed at mount. Deriving the delay from the live `index`
   * would make every surviving card replay its entrance each time a deletion
   * shifted it along the rail.
   */
  const [enterDelay] = useState(() => index * 70);

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 240,
      delay: enterDelay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [p, enterDelay]);

  const remove = () => {
    if (leaving) return;
    setLeaving(true);
    Animated.timing(p, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.quad),
      useNativeDriver: NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished) onRemove(id);
    });
  };

  return (
    <Animated.View
      style={{
        width: PHOTO_W,
        height: PHOTO_H,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: C.surfaceSecondary,
        opacity: p,
        transform: [
          { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
        ],
      }}
    >
      <ImageSlot label={`Photo ${index + 1}`} glyph={20} />

      {cover && (
        <View
          style={{
            position: 'absolute',
            bottom: 5,
            left: 5,
            height: 19,
            paddingHorizontal: 7,
            borderRadius: radius.sm,
            backgroundColor: alpha.inkStrong,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T w={600} size={10.5} color={C.primaryText}>
            Cover
          </T>
        </View>
      )}

      <Tap
        onPress={remove}
        accessibilityRole="button"
        accessibilityLabel={`Remove photo ${index + 1}`}
        hitSlop={8}
        style={{
          position: 'absolute',
          top: 5,
          right: 5,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: alpha.inkStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="close" size={11} color={C.primaryText} strokeWidth={2.8} />
      </Tap>
    </Animated.View>
  );
}

/** Indeterminate ring shown while the listing is being read off the photos. */
function Spinner({ size = 19, color = C.text }: { size?: number; color?: string }) {
  const spin = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: C.border,
        borderTopColor: color,
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    />
  );
}

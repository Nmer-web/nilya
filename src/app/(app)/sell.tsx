import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavHeight } from '@/components/bottom-nav';
import { FrostedBar } from '@/components/frosted-bar';
import { Icon } from '@/components/icon';
import { formatPrice } from '@/components/listing-card';
import { Skeleton } from '@/components/skeleton';
import { Button, Card, Chip, EmptyState, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { CONDITION_LABEL, NEW_CONDITION } from '@/lib/database.types';
import { tapSuccess } from '@/lib/haptics';
import { createListing, fetchDeliveryOptions, ListingError, type PickedImage } from '@/lib/mutations';
import { fetchCategories } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/app-store';
import { useAuth } from '@/store/auth-store';
import { alpha, color as C, radius, space } from '@/theme/tokens';

/*
 * No condition step. SAWA sells new products only, so every listing is written
 * with `condition: 'new'` — asking the seller to grade wear would describe a
 * marketplace this is not.
 */

const STEPS = [
  { key: 'photos', title: 'Add your photos', sub: 'The first photo becomes your cover.' },
  { key: 'title', title: 'What are you selling?', sub: 'Buyers search this text, so name it plainly.' },
  { key: 'category', title: 'Pick a category', sub: 'This decides where your listing shows up.' },
  { key: 'details', title: 'Describe it', sub: 'Brand and detail. Optional, but they sell faster.' },
  { key: 'price', title: 'Set your price', sub: 'You keep 97% of the sale.' },
  { key: 'location', title: 'Where is it?', sub: 'Buyers see this, and it sets your delivery options.' },
  { key: 'preview', title: 'Ready to publish', sub: 'Check it over before it goes live.' },
] as const;

type Draft = {
  title: string;
  description: string;
  brand: string;
  categorySlug: string;
  price: string;
  /** null until the seller edits it — the profile supplies the default. */
  city: string | null;
  countryCode: string | null;
};

const EMPTY: Draft = {
  title: '',
  description: '',
  brand: '',
  categorySlug: '',
  price: '',
  city: null,
  countryCode: null,
};

/** Ten photographs per listing, enforced in the picker and the grid alike. */
const MAX_PHOTOS = 10;

export default function Sell() {
  const navHeight = useNavHeight();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status } = useAuth();
  const { flash } = useApp();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [phase, setPhase] = useState<'preparing' | 'uploading' | 'publishing'>('preparing');
  const [error, setError] = useState<string | null>(null);

  const categories = useAsync(() => fetchCategories('explore'), 'categories:explore');

  /**
   * The seller's own city and country, used to prefill the location step.
   * `profiles` is readable for the signed-in user, and this is the only place
   * the listing's country can honestly come from.
   */
  const profile = useAsync(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('city, country_code')
      .eq('id', auth.user.id)
      .maybeSingle();
    return (data as { city: string | null; country_code: string | null } | null) ?? null;
  }, `profile:${status}`);

  /* ── auth gate ── */
  if (status !== 'signedIn') {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top }}>
        <EmptyState
          icon="person"
          title="Sign in to sell"
          body="You need an account before you can list an item on SAWA."
          action={
            <Button
              label="Sign in"
              height={48}
              onPress={() => router.push('/sign-in')}
              style={{ marginTop: 20 }}
            />
          }
        />
      </View>
    );
  }

  /**
   * Location is derived, not copied into state when the profile loads. The
   * seller's own city and country are the default and the draft only holds a
   * value once they type one — mirroring the profile into state would mean
   * writing state from an effect, cascading a render for nothing.
   */
  const city = draft.city ?? profile.data?.city ?? '';
  const countryCode = (draft.countryCode ?? profile.data?.country_code ?? '').toUpperCase();

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const stepReady = (() => {
    switch (current.key) {
      case 'photos':
        return images.length > 0;
      case 'title':
        return draft.title.trim() !== '';
      case 'category':
        return draft.categorySlug !== '';
      case 'price':
        return draft.price.trim() !== '';
      case 'location':
        return countryCode.trim().length === 2;
      default:
        return true;
    }
  })();

  const complete =
    images.length > 0 &&
    draft.title.trim() !== '' &&
    draft.categorySlug !== '' &&
    draft.price.trim() !== '' &&
    countryCode.trim().length === 2;

  /**
   * Opens the photo library.
   *
   * No permission request. The SDK 57 documentation is explicit that "no
   * permissions request is necessary for launching the image library" — the
   * system picker returns only what the person chose, so there is nothing to
   * authorise. Asking anyway could only ever fail closed: on iOS a "Limited
   * Access" grant reports `granted: false`, which turned a working picker into
   * "SAWA needs access to your photos" and stopped the flow dead.
   */
  const pick = async () => {
    let res: ImagePicker.ImagePickerResult;
    try {
      res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        /* Guarded: at ten the button is hidden, but 0 means *unlimited* to the
           native picker rather than none. */
        selectionLimit: Math.max(1, MAX_PHOTOS - images.length),
        quality: 0.85,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your photo library.');
      return;
    }

    if (res.canceled) return;

    /*
     * `uri` is the only field the upload needs and the only one guaranteed to
     * be present — `fileName` is null under limited permissions and `mimeType`
     * can be undefined when the type is indeterminate. Anything without a URI
     * is dropped here rather than failing later mid-upload.
     */
    const usable = res.assets.filter((a) => typeof a.uri === 'string' && a.uri.length > 0);

    if (usable.length === 0) {
      setError('That photo could not be read. Try choosing a different one.');
      return;
    }

    setError(null);
    setImages((prev) =>
      [
        ...prev,
        ...usable.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' })),
      ].slice(0, MAX_PHOTOS)
    );
  };

  /**
   * Publish.
   *
   * `createListing` creates the draft row, uploads each photograph under the
   * listing's id, then flips it to active — rolling the whole thing back if any
   * upload fails, so a half-uploaded listing never reaches the feed. Only after
   * it resolves does this claim success.
   */
  /** The guard is the real duplicate-submission block; the disabled button is the visible half. */
  const publish = async () => {
    if (publishing || !complete) return;
    setPublishing(true);
    setError(null);
    setPhase('preparing');
    setProgress({ done: 0, total: images.length });

    try {
      const id = await createListing(
        {
          title: draft.title,
          description: draft.description,
          brand: draft.brand,
          categorySlug: draft.categorySlug,
          condition: NEW_CONDITION,
          price: draft.price,
          city,
          countryCode,
        },
        images,
        (done, total) => {
          setPhase(done === total ? 'publishing' : 'uploading');
          setProgress({ done, total });
        }
      );

      tapSuccess();
      flash('Your item is live');

      /* Reset before leaving, so returning to Sell starts a new listing. */
      setDraft(EMPTY);
      setImages([]);
      setStep(0);

      router.replace({ pathname: '/listing/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof ListingError ? e.message : 'Could not publish. Please try again.');
    } finally {
      setPublishing(false);
      setProgress(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <StepHeader
        step={step}
        total={STEPS.length}
        onBack={() => (step === 0 ? router.back() : setStep(step - 1))}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: navHeight + 120 }}
      >
        <StepPanel key={current.key}>
          <T w={700} size={27} tracking={-0.6} lh={33} style={{ marginTop: space.sm }}>
            {current.title}
          </T>
          <T size={14.5} color={C.textSecondary} lh={21} style={{ marginTop: space.sm, marginBottom: space.xl }}>
            {current.sub}
          </T>

          {current.key === 'photos' && (
            <PhotosStep images={images} onPick={pick} onRemove={(i) => setImages((p) => p.filter((_, j) => j !== i))} />
          )}

          {current.key === 'title' && (
            <Field value={draft.title} onChange={(v) => set('title', v)} placeholder="e.g. Nike Air Max 270" autoFocus />
          )}

          {current.key === 'category' && (
            <CategoryStep
              loading={categories.loading}
              error={categories.error}
              rows={categories.data ?? []}
              selected={draft.categorySlug}
              onSelect={(slug) => set('categorySlug', slug)}
            />
          )}

          {current.key === 'details' && (
            <View style={{ gap: space.lg }}>
              <Field label="Brand" value={draft.brand} onChange={(v) => set('brand', v)} placeholder="e.g. Nike" />
              <Field
                label="Description"
                value={draft.description}
                onChange={(v) => set('description', v)}
                placeholder="Size, fit, any marks or wear…"
                multiline
              />
            </View>
          )}

          {current.key === 'price' && <PriceStep value={draft.price} onChange={(v) => set('price', v)} />}

          {current.key === 'location' && (
            <View style={{ gap: space.lg }}>
              <Field label="City" value={city} onChange={(v) => set('city', v)} placeholder="e.g. Lyon" />
              <Field
                label="Country code"
                value={countryCode}
                onChange={(v) => set('countryCode', v.toUpperCase().slice(0, 2))}
                placeholder="FR"
              />
              {countryCode.length === 2 && <DeliveryPreview countryCode={countryCode} />}
            </View>
          )}

          {current.key === 'preview' && (
            <Preview draft={draft} city={city} countryCode={countryCode} images={images} categories={categories.data ?? []} />
          )}

          {!!error && (
            <Card style={{ marginTop: space.xl, padding: 14, borderColor: C.errorBorder, backgroundColor: C.errorBg }}>
              <T size={13.5} color={C.error} lh={19}>
                {error}
              </T>
            </Card>
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
        {step > 0 && !publishing && (
          <Button
            label="Back"
            variant="outline"
            height={50}
            size={15}
            onPress={() => setStep(step - 1)}
            style={{ width: 104 }}
          />
        )}

        {last ? (
          <Button
            label="Publish listing"
            loading={publishing}
            /*
             * Three distinct phases, because they fail differently: creating
             * the row, uploading each photo, then publishing. A single
             * "Publishing…" would leave the longest step — the uploads —
             * looking like a hang.
             */
            loadingLabel={
              phase === 'preparing'
                ? 'Preparing…'
                : phase === 'uploading' && progress
                  ? `Uploading ${progress.done}/${progress.total}…`
                  : 'Publishing…'
            }
            disabled={!complete}
            style={{ flex: 1 }}
            onPress={publish}
          />
        ) : (
          <Button label="Next" disabled={!stepReady} style={{ flex: 1 }} onPress={() => setStep(step + 1)} />
        )}
      </FrostedBar>
    </View>
  );
}

/* ─────────────────────────── chrome ─────────────────────────── */

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
          {step + 1} of {total}
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
            transformOrigin: 'left',
            transform: [{ scaleX: p }],
          }}
        />
      </View>
    </View>
  );
}

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
  images,
  onPick,
  onRemove,
}: {
  images: PickedImage[];
  onPick: () => void;
  onRemove: (index: number) => void;
}) {
  if (images.length === 0) {
    return (
      <Tap
        onPress={onPick}
        accessibilityRole="button"
        style={{
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: C.borderStrong,
          backgroundColor: C.surface,
          borderRadius: radius.xl,
          paddingVertical: 44,
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
          Choose photos
        </T>
        <T size={13.5} color={C.textSecondary}>
          Up to 10 from your library.
        </T>
      </Tap>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {images.map((img, i) => (
        <View
          key={img.uri}
          style={{
            width: 94,
            height: 118,
            borderRadius: radius.lg,
            overflow: 'hidden',
            backgroundColor: C.surfaceSecondary,
          }}
        >
          <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          {i === 0 && (
            <View
              style={{
                position: 'absolute',
                bottom: 5,
                left: 5,
                height: 19,
                paddingHorizontal: 7,
                borderRadius: radius.sm,
                backgroundColor: alpha.inkStrong,
                justifyContent: 'center',
              }}
            >
              <T w={600} size={10.5} color={C.primaryText}>
                Cover
              </T>
            </View>
          )}
          <Tap
            onPress={() => onRemove(i)}
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${i + 1}`}
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
        </View>
      ))}

      {images.length < MAX_PHOTOS && (
        <Tap
          onPress={onPick}
          accessibilityRole="button"
          accessibilityLabel="Add more photos"
          style={{
            width: 94,
            height: 118,
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
            {images.length} / 10
          </T>
        </Tap>
      )}
    </ScrollView>
  );
}

function CategoryStep({
  loading,
  error,
  rows,
  selected,
  onSelect,
}: {
  loading: boolean;
  error: Error | null;
  rows: { slug: string; label: string }[];
  selected: string;
  onSelect: (slug: string) => void;
}) {
  if (loading) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={104} height={40} round={radius.md} />
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <T size={14} color={C.error}>
        Could not load categories: {error.message}
      </T>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {rows.map((c) => (
        <Chip
          key={c.slug}
          label={c.label}
          height={40}
          round={radius.md}
          active={selected === c.slug}
          onPress={() => onSelect(c.slug)}
        />
      ))}
    </View>
  );
}

function PriceStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const n = Number(value.replace(',', '.'));
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
          onChangeText={(v) => onChange(v.replace(/[^0-9.,]/g, ''))}
          placeholder="0"
          placeholderTextColor={C.borderStrong}
          keyboardType="decimal-pad"
          style={{ flex: 1, minWidth: 0, fontSize: 34, fontWeight: '700', color: C.text, padding: 0 }}
        />
      </View>
      {earn > 0 && (
        <T size={13.5} color={C.textSecondary} style={{ marginTop: 14 }}>
          You receive €{earn.toFixed(2)} after the 3% selling fee.
        </T>
      )}
    </View>
  );
}

/** What the buyer will be offered, read from `delivery_options`. */
function DeliveryPreview({ countryCode }: { countryCode: string }) {
  const options = useAsync(() => fetchDeliveryOptions(countryCode), `delivery:${countryCode}`);
  const rows = options.data ?? [];
  if (options.loading || rows.length === 0) return null;

  return (
    <Card style={{ padding: 15 }}>
      <T w={600} size={14} style={{ marginBottom: 8 }}>
        Buyers here can choose
      </T>
      {rows.map((o) => (
        <View key={o.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 5 }}>
          <T size={13.5} style={{ flex: 1 }}>
            {o.name}
          </T>
          <T w={600} size={13.5}>
            {o.price_cents === 0 ? 'Free' : formatPrice(o.price_cents)}
          </T>
        </View>
      ))}
    </Card>
  );
}

function Preview({
  draft,
  city,
  countryCode,
  images,
  categories,
}: {
  draft: Draft;
  city: string;
  countryCode: string;
  images: PickedImage[];
  categories: { slug: string; label: string }[];
}) {
  const cat = categories.find((c) => c.slug === draft.categorySlug)?.label ?? '—';
  const rows: [string, string][] = [
    ['Category', cat],
    ['Condition', CONDITION_LABEL[NEW_CONDITION]],
    ['Brand', draft.brand || 'Not given'],
    ['Location', [city, countryCode].filter(Boolean).join(', ') || '—'],
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
          {images[0] && (
            <Image source={{ uri: images[0].uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={500} size={16} numberOfLines={2}>
            {draft.title || 'Untitled listing'}
          </T>
          <T w={700} size={21} tracking={-0.4} style={{ marginTop: 6 }}>
            {draft.price ? `€${draft.price}` : '—'}
          </T>
          <T size={12.5} color={C.textSecondary} style={{ marginTop: 6 }}>
            {images.length} photo{images.length === 1 ? '' : 's'}
          </T>
        </View>
      </View>

      <Card style={{ marginTop: space.xl, overflow: 'hidden' }}>
        {rows.map(([label, v], i) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  multiline,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  multiline?: boolean;
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
        multiline={multiline}
        style={{
          minHeight: multiline ? 110 : 56,
          borderRadius: radius.lg,
          backgroundColor: C.background,
          borderWidth: focused ? 1.5 : 1,
          borderColor: focused ? C.text : C.border,
          paddingHorizontal: 15,
          paddingTop: multiline ? 14 : 0,
          fontSize: 16,
          color: C.text,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

/*
 * The `Choice` radio row went with the condition step — it was the only
 * screen that offered a list of mutually exclusive values.
 */

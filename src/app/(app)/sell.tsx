import React, { useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavHeight } from '@/components/bottom-nav';
import { FrostedBar } from '@/components/frosted-bar';
import { Icon } from '@/components/icon';
import { ImageSlot } from '@/components/image-slot';
import { TabTitle } from '@/components/screen-header';
import { Button, Card, Note, T, Tap, Toggle } from '@/components/ui';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { tapSuccess } from '@/lib/haptics';
import { useApp } from '@/store/app-store';
import { alpha, color as C, radius } from '@/theme/tokens';

export default function Sell() {
  const insets = useSafeAreaInsets();
  const navHeight = useNavHeight();
  const { photos, scanning, suggested, filled, addPhotos, removePhoto, applySuggestion, publish } = useApp();
  const [publishing, setPublishing] = useState(false);

  const hasPhotos = photos.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 12 }}>
        <TabTitle sub="Free to list. You keep 97% of the sale.">Sell an item</TabTitle>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: navHeight + (hasPhotos ? 96 : 24),
        }}
      >
        {!hasPhotos ? (
          <>
            <Tap
              onPress={addPhotos}
              accessibilityRole="button"
              style={{
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: C.borderStrong,
                backgroundColor: C.surface,
                borderRadius: radius.xl,
                paddingVertical: 38,
                paddingHorizontal: 20,
                alignItems: 'center',
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: C.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="camera" size={23} color={C.text} strokeWidth={1.7} />
              </View>
              <T w={600} size={15.5}>
                Add photos
              </T>
              <T size={13} color={C.textSecondary} lh={19.5} style={{ textAlign: 'center' }}>
                Up to 10 photos. Natural light and a plain{'\n'}background sell fastest.
              </T>
            </Tap>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <StatCard title="Sells in 3 days" sub="Average for shoes" />
              <StatCard title="40k buyers" sub="Across 18 countries" />
            </View>
          </>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
            >
              {/*
                Photos stagger in as they attach, rather than all appearing at
                once. Keyed by id, never by index: see AppState.photos.
              */}
              {photos.map((id, i) => (
                <PhotoCard key={id} id={id} index={i} cover={i === 0} onRemove={removePhoto} />
              ))}

              <Tap
                onPress={addPhotos}
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
                  {photos.length} / 10
                </T>
              </Tap>
            </ScrollView>

            {scanning && (
              <Card
                style={{
                  marginTop: 14,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11,
                }}
              >
                <Spinner />
                <T size={13.5} color={C.textSecondary}>
                  Reading your photos…
                </T>
              </Card>
            )}

            {/* Promotional: the suggested-price feature selling itself. */}
            {suggested && !filled && (
              <Note tone="accent" style={{ marginTop: 14, padding: 15 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Icon name="sparkle" size={15} color={C.accent} />
                  <T w={600} size={13.5} color={C.accentDark}>
                    Suggested listing
                  </T>
                </View>
                <T w={600} size={16} style={{ marginTop: 9 }}>
                  Nike Air Max 270
                </T>
                <T size={13.5} color={C.textSecondary} style={{ marginTop: 2 }}>
                  Shoes · Nike · Very good condition
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 9 }}>
                  <T size={13} color={C.textSecondary}>
                    Suggested price
                  </T>
                  <T w={700} size={16}>
                    €42–€48
                  </T>
                </View>
                <T size={12} color={C.accentDark} lh={17.4} style={{ marginTop: 8 }}>
                  Based on 61 similar shoes sold in the last 30 days.
                </T>
                <Button
                  label="Use these details"
                  height={42}
                  size={14}
                  onPress={applySuggestion}
                  style={{ marginTop: 13, borderRadius: 11 }}
                />
              </Note>
            )}

            <SellForm filled={filled} />
          </>
        )}
      </ScrollView>

      {hasPhotos && (
        <FrostedBar
          edge="top"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: navHeight,
            paddingHorizontal: 16,
            paddingVertical: 11,
          }}
        >
          <Button
            label="Publish listing"
            loading={publishing}
            loadingLabel="Publishing…"
            onPress={() => {
              /*
               * `publish` refuses and flashes when the form is incomplete, so
               * the loading state is only entered once it will actually
               * succeed — otherwise the button would spin its way to a
               * validation error.
               */
              if (!filled) {
                publish();
                return;
              }
              setPublishing(true);
              setTimeout(() => {
                setPublishing(false);
                tapSuccess();
                publish();
              }, 900);
            }}
          />
        </FrostedBar>
      )}
    </View>
  );
}

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

function StatCard({ title, sub }: { title: string; sub: string }) {
  return (
    <Card style={{ flex: 1, padding: 12, borderRadius: radius.lg }}>
      <T w={600} size={12.5}>
        {title}
      </T>
      <T size={12} color={C.textSecondary} style={{ marginTop: 2 }}>
        {sub}
      </T>
    </Card>
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
        borderColor: C.surfaceSecondary,
        borderTopColor: color,
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    />
  );
}

/** Ordered as a seller fills them: what it is, then what it is like, then what it costs. */
const FIELDS = [
  { label: 'Title', empty: 'What are you selling?', full: 'Nike Air Max 270' },
  { label: 'Category', empty: 'Choose a category', full: 'Shoes · Trainers' },
  { label: 'Condition', empty: 'How worn is it?', full: 'Very good' },
  { label: 'Brand', empty: 'Add a brand', full: 'Nike' },
  { label: 'Colour', empty: 'Add a colour', full: 'Black' },
  { label: 'Price', empty: 'Set a price', full: '€45' },
];

function SellForm({ filled }: { filled: boolean }) {
  const { flash, sudanPickup, toggleSudanPickup } = useApp();

  const rows = [
    ...FIELDS.map((f) => ({ label: f.label, value: filled ? f.full : f.empty, resolved: filled })),
    { label: 'Location', value: 'Lyon, France', resolved: true },
  ];

  const line = (last: boolean): ViewStyle => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderBottomWidth: last ? 0 : 1,
    borderBottomColor: C.border,
  });

  return (
    <Card style={{ marginTop: 18, overflow: 'hidden' }}>
      {rows.map((r) => (
        <Tap
          key={r.label}
          accessibilityRole="button"
          onPress={() =>
            flash(filled ? `Editing ${r.label.toLowerCase()}` : 'Add photos and we will suggest this')
          }
          style={line(false)}
        >
          <T size={13.5} color={C.textSecondary} style={{ width: 76 }}>
            {r.label}
          </T>
          <T
            w={500}
            size={14.5}
            color={r.resolved ? C.text : C.textMuted}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {r.value}
          </T>
          <Icon name="chevronRight" size={16} color={C.borderStrong} />
        </Tap>
      ))}

      {/*
        Delivery closes the form rather than sitting in a detached card below
        it. It is the last thing a seller decides, and as a separate surface it
        read as an unrelated setting instead of the final field.
      */}
      <View style={line(true)}>
        <T size={13.5} color={C.textSecondary} style={{ width: 76 }}>
          Delivery
        </T>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={500} size={14.5}>
            {sudanPickup ? 'Shipping + Sudan pickup' : 'Shipping only'}
          </T>
          <T size={12} color={C.textSecondary} style={{ marginTop: 2 }}>
            Buyers pay shipping
          </T>
        </View>
        <Toggle on={sudanPickup} onPress={toggleSudanPickup} />
      </View>
    </Card>
  );
}

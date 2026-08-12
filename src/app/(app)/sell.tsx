import React, { useEffect } from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavHeight } from '@/components/bottom-nav';
import { FrostedBar } from '@/components/frosted-bar';
import { Icon } from '@/components/icon';
import { ImageSlot } from '@/components/image-slot';
import { TabTitle } from '@/components/screen-header';
import { Button, Card, Note, T, Tap, Toggle } from '@/components/ui';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { useApp } from '@/store/app-store';
import { color as C, radius } from '@/theme/tokens';

export default function Sell() {
  const insets = useSafeAreaInsets();
  const navHeight = useNavHeight();
  const { photos, scanning, suggested, filled, sudanPickup, addPhotos, applySuggestion, toggleSudanPickup, publish } =
    useApp();

  const hasPhotos = photos > 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
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
                borderRadius: radius['3xl'],
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
                  backgroundColor: C.bg,
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
              {[1, 2, 3].map((n) => (
                <View
                  key={n}
                  style={{
                    width: 94,
                    height: 118,
                    borderRadius: radius.xl,
                    overflow: 'hidden',
                    backgroundColor: C.well,
                  }}
                >
                  <ImageSlot label={`Photo ${n}`} glyph={20} />
                  {n === 1 && (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 5,
                        left: 5,
                        height: 19,
                        paddingHorizontal: 7,
                        borderRadius: radius.sm,
                        backgroundColor: 'rgba(23,23,23,0.8)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <T w={600} size={10.5} color={C.onDark}>
                        Cover
                      </T>
                    </View>
                  )}
                </View>
              ))}

              <Tap
                onPress={addPhotos}
                accessibilityRole="button"
                accessibilityLabel="Add more photos"
                style={{
                  width: 94,
                  height: 118,
                  borderRadius: radius.xl,
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
                  {photos} / 10
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

            {suggested && !filled && (
              <Note style={{ marginTop: 14, padding: 15 }}>
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

            <Card
              style={{
                marginTop: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                paddingHorizontal: 15,
              }}
            >
              <View style={{ flex: 1, paddingRight: 14 }}>
                <T w={600} size={14}>
                  Ships from Lyon
                </T>
                <T size={12.5} color={C.textSecondary} style={{ marginTop: 2 }}>
                  Buyers pay shipping. Sudan pickup available.
                </T>
              </View>
              <Toggle on={sudanPickup} onPress={toggleSudanPickup} />
            </Card>
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
          <Button label="Publish listing" onPress={publish} />
        </FrostedBar>
      )}
    </View>
  );
}

function StatCard({ title, sub }: { title: string; sub: string }) {
  return (
    <Card style={{ flex: 1, padding: 12, borderRadius: radius.xl }}>
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
function Spinner({ size = 19, color = C.accent }: { size?: number; color?: string }) {
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
        borderColor: C.well,
        borderTopColor: color,
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    />
  );
}

const FIELDS = [
  { label: 'Title', empty: 'What are you selling?', full: 'Nike Air Max 270' },
  { label: 'Category', empty: 'Choose a category', full: 'Shoes · Trainers' },
  { label: 'Brand', empty: 'Add a brand', full: 'Nike' },
  { label: 'Condition', empty: 'How worn is it?', full: 'Very good' },
  { label: 'Colour', empty: 'Add a colour', full: 'Black' },
  { label: 'Price', empty: 'Set a price', full: '€45' },
];

function SellForm({ filled }: { filled: boolean }) {
  const { flash } = useApp();
  const rows = [
    ...FIELDS.map((f) => ({ label: f.label, value: filled ? f.full : f.empty, resolved: filled })),
    { label: 'Location', value: 'Lyon, France', resolved: true },
  ];

  return (
    <Card style={{ marginTop: 18, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <Tap
          key={r.label}
          accessibilityRole="button"
          onPress={() =>
            flash(filled ? `Editing ${r.label.toLowerCase()}` : 'Add photos and we will suggest this')
          }
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
          <T size={13.5} color={C.textSecondary} style={{ width: 76 }}>
            {r.label}
          </T>
          <T
            w={500}
            size={14.5}
            color={r.resolved ? C.text : C.textTertiary}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {r.value}
          </T>
          <Icon name="chevronRight" size={16} color={C.borderStrong} />
        </Tap>
      ))}
    </Card>
  );
}

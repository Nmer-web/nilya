import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrostedBar } from '@/components/frosted-bar';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Button, Card, Note, SectionLabel, T, Tap } from '@/components/ui';
import { getProduct } from '@/data/catalog';
import { deliveryFor, euro, useApp } from '@/store/app-store';
import { alpha, color as C, radius, shadow } from '@/theme/tokens';

export default function DeliveryMethod() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { delKey, setDelKey } = useApp();

  const p = getProduct(Number(id));
  const ladder = deliveryFor(p);
  const isLocal = ladder.kind === 'local';
  const chosen = ladder.opts.find((o) => o.k === delKey) ?? ladder.opts[0];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader
        title="Delivery method"
        right={
          <T size={12} color={C.textMuted} style={{ paddingRight: 10 }}>
            Step 1 of 2
          </T>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom }}
      >
        {/* ── route ── */}
        <Card
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: radius.lg,
          }}
        >
          <CountryTag code={p.cc} />
          <Icon name="arrowRight" size={15} color={C.textMuted} />
          <CountryTag code={isLocal ? 'SD' : 'FR'} />
          <T size={12.5} color={C.textSecondary} style={{ flex: 1, paddingLeft: 4 }}>
            {isLocal ? 'Inside Sudan' : ladder.kind === 'intl' ? 'Cross-border' : 'Domestic, France'}
          </T>
        </Card>

        {ladder.kind === 'intl' && (
          <Note style={{ marginTop: 12, paddingHorizontal: 14 }}>
            <T w={600} size={13.5} color={C.text}>
              International delivery
            </T>
            <T size={12.5} color={C.text} lh={18.1} style={{ marginTop: 3 }}>
              Estimated 7–14 days. Customs handled by the carrier — no extra paperwork for you.
            </T>
          </Note>
        )}

        {isLocal && (
          <Note tone="green" style={{ marginTop: 12, paddingHorizontal: 14 }}>
            <T w={600} size={13.5} color={C.success}>
              Local pickup in Sudan
            </T>
            <T size={12.5} color={C.success} lh={18.1} style={{ marginTop: 3 }}>
              Collect from a trusted point and pay in cash on handover. No card needed.
            </T>
          </Note>
        )}

        {/* ── options ── */}
        <SectionLabel style={{ paddingTop: 20, paddingBottom: 10 }}>Choose how you get it</SectionLabel>

        <View style={{ gap: 9 }}>
          {ladder.opts.map((o) => {
            const selected = o.k === chosen.k;
            return (
              <Tap
                key={o.k}
                onPress={() => setDelKey(o.k)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={{
                  backgroundColor: C.surface,
                  borderWidth: 1.5,
                  borderColor: selected ? C.text : C.border,
                  borderRadius: radius.lg,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: selected ? C.text : C.borderStrong,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}
                >
                  {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.text }} />}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                    <T w={600} size={14.5} style={{ flex: 1 }}>
                      {o.n}
                    </T>
                    <T w={700} size={14.5}>
                      {o.price === 0 ? 'Free' : euro(o.price)}
                    </T>
                  </View>
                  <T size={12.5} color={C.textSecondary} style={{ marginTop: 3 }}>
                    {o.sub}
                  </T>
                  <T size={12.5} color={C.textSecondary}>
                    {o.eta}
                  </T>
                </View>
              </Tap>
            );
          })}
        </View>

        {isLocal && (
          <Card style={{ marginTop: 16, padding: 15 }}>
            <SectionLabel style={{ marginBottom: 11 }}>Pickup point</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 11 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: C.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="pin" size={18} color={C.text} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <T w={600} size={14}>
                  Al Riyadh Pickup Point
                </T>
                <T size={12.5} color={C.textSecondary} style={{ marginTop: 2 }}>
                  Block 12, Al Riyadh, Khartoum
                </T>
                <T size={12.5} color={C.textSecondary}>
                  Open daily 9:00–20:00
                </T>
              </View>
            </View>
            <MiniMap />
          </Card>
        )}
      </ScrollView>

      <FrostedBar
        edge="top"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingTop: 11,
          paddingBottom: Math.max(insets.bottom, 14),
        }}
      >
        <Button label="Continue to checkout" onPress={() => router.push({ pathname: '/checkout', params: { id: p.id } })} />
      </FrostedBar>
    </View>
  );
}

function CountryTag({ code }: { code: string }) {
  return (
    <View
      style={{
        height: 22,
        paddingHorizontal: 7,
        borderRadius: radius.sm,
        backgroundColor: C.text,
        justifyContent: 'center',
      }}
    >
      <T w={700} size={11} color={C.primaryText} tracking={0.66}>
        {code}
      </T>
    </View>
  );
}

/** Abstract street grid standing in for a map, as drawn in the design. */
function MiniMap() {
  return (
    <View
      style={{
        height: 88,
        borderRadius: 10,
        backgroundColor: C.surfaceSecondary,
        marginTop: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      {Array.from({ length: 14 }, (_, i) => (
        <View
          key={`v${i}`}
          style={{
            position: 'absolute',
            left: (i + 1) * 26,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: alpha.hairline,
          }}
        />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <View
          key={`h${i}`}
          style={{
            position: 'absolute',
            top: (i + 1) * 22,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: alpha.hairline,
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 26,
          height: 26,
          marginLeft: -13,
          marginTop: -13,
          borderRadius: 13,
          backgroundColor: C.text,
          borderWidth: 3,
          borderColor: C.surface,
          ...shadow.raised,
        }}
      />
    </View>
  );
}

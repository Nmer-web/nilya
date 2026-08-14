import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrostedBar } from '@/components/frosted-bar';
import { Icon } from '@/components/icon';
import { ImageSlot } from '@/components/image-slot';
import { ScreenHeader } from '@/components/screen-header';
import { Button, Card, SectionLabel, T, Tap } from '@/components/ui';
import { getProduct } from '@/data/catalog';
import { tapSuccess } from '@/lib/haptics';
import { deliveryFor, euro, PROTECTION_FEE, sdg, useApp } from '@/store/app-store';
import { color as C } from '@/theme/tokens';

export default function Checkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { delKey, openSheet, flash } = useApp();
  const [paying, setPaying] = useState(false);

  const p = getProduct(Number(id));
  const ladder = deliveryFor(p);
  const isLocal = ladder.kind === 'local';
  const chosen = ladder.opts.find((o) => o.k === delKey) ?? ladder.opts[0];

  const shipping = isLocal ? 0 : chosen.price;
  const protection = isLocal ? 0 : PROTECTION_FEE;
  const total = p.pr + shipping + protection;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader
        title="Checkout"
        right={
          <T size={12} color={C.textTertiary} style={{ paddingRight: 10 }}>
            Step 2 of 2
          </T>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 130 + insets.bottom }}
      >
        {/* ── item ── */}
        <Card style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
          <View style={{ width: 52, height: 64, borderRadius: 9, overflow: 'hidden', backgroundColor: C.well }}>
            <ImageSlot label={p.t} tiny />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w={500} size={14.5} numberOfLines={1}>
              {p.t}
            </T>
            <T w={700} size={16} style={{ marginTop: 2 }}>
              {euro(p.pr)}
            </T>
            <T size={12.5} color={C.textSecondary} style={{ marginTop: 3 }}>
              {p.cd} · from {p.s}
            </T>
          </View>
        </Card>

        {/* ── totals ── */}
        <Card style={{ paddingVertical: 15, paddingHorizontal: 16, marginTop: 12 }}>
          <Line label="Item" value={euro(p.pr)} />
          <Line label={isLocal ? 'Pickup' : chosen.n} value={isLocal ? 'Free' : euro(chosen.price)} />
          <Line label="Buyer protection" value={isLocal ? 'Free' : euro(PROTECTION_FEE)} pad={12} />

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: C.border,
              paddingTop: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <T w={600} size={15}>
              Total
            </T>
            <T w={700} size={21} tracking={-0.4}>
              {isLocal ? euro(p.pr) : euro(total)}
            </T>
          </View>

          {isLocal && (
            <T size={12.5} color={C.textSecondary} style={{ marginTop: 6, textAlign: 'right' }}>
              ≈ {sdg(p.pr)}
            </T>
          )}
        </Card>

        {/* ── payment ── */}
        <SectionLabel style={{ paddingTop: 20, paddingBottom: 10 }}>
          {isLocal ? 'Payment' : 'Payment method'}
        </SectionLabel>

        {isLocal ? (
          <>
            <Card
              style={{
                borderWidth: 1.5,
                borderColor: C.text,
                padding: 15,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: C.greenBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="cash" size={19} color={C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <T w={600} size={14.5}>
                  Pay when you collect
                </T>
                <T size={12.5} color={C.textSecondary} style={{ marginTop: 2 }}>
                  Cash at Al Riyadh Pickup Point
                </T>
              </View>
            </Card>

            <Card style={{ marginTop: 10, padding: 15 }}>
              <T size={13} color={C.textSecondary}>
                Amount due at pickup
              </T>
              <T w={700} size={26} tracking={-0.5} style={{ marginTop: 4 }}>
                {sdg(p.pr)}
              </T>
              <T size={12.5} color={C.textSecondary} lh={18} style={{ marginTop: 4 }}>
                Held by SAWA until you confirm the item. Rate locked for 48 h.
              </T>
            </Card>
          </>
        ) : (
          <Card style={{ padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 30,
                borderRadius: 6,
                backgroundColor: C.cardFace,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
            >
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: C.accentBorder }} />
              <View
                style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: C.accent, marginLeft: -5 }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <T w={600} size={14.5}>
                •••• 4242
              </T>
              <T size={12.5} color={C.textSecondary} style={{ marginTop: 1 }}>
                Expires 06/29
              </T>
            </View>
            <Tap
              onPress={() => flash('Card management opens in Stripe')}
              accessibilityRole="button"
              style={{
                height: 34,
                paddingHorizontal: 14,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <T w={600} size={13}>
                Change
              </T>
            </Tap>
          </Card>
        )}

        <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 16, paddingHorizontal: 2 }}>
          <View style={{ marginTop: 1 }}>
            <Icon name="shield" size={15} color={C.textSecondary} />
          </View>
          <T size={12.5} color={C.textSecondary} lh={18.75} style={{ flex: 1 }}>
            Buyer protection covers refunds if the item never arrives or is not as described. Secure payment powered
            by Stripe.
          </T>
        </View>
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
        {/*
          The CTA becomes its own progress indicator rather than throwing up a
          spinner overlay — §16 asks for a trustworthy checkout, and a button
          that visibly holds the transaction is more legible than a modal that
          hides it. The delay stands in for the Stripe round trip; the success
          sheet it opens is unchanged.
        */}
        <Button
          label={isLocal ? 'Place order' : `Pay ${euro(total)}`}
          loading={paying}
          loadingLabel="Processing…"
          haptic
          onPress={() => {
            setPaying(true);
            setTimeout(() => {
              setPaying(false);
              tapSuccess();
              openSheet({ kind: 'done', doneKind: isLocal ? 'placed' : 'paid' });
            }, 1100);
          }}
        />
      </FrostedBar>
    </View>
  );
}

function Line({ label, value, pad = 9 }: { label: string; value: string; pad?: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: pad, gap: 12 }}>
      <T size={14} color={C.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </T>
      <T w={500} size={14}>
        {value}
      </T>
    </View>
  );
}

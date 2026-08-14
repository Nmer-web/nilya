import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ListingThumb } from '@/components/product-card';
import { ScreenHeader } from '@/components/screen-header';
import { Button, Card, T, Tap } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { alpha, color as C } from '@/theme/tokens';

type Step = {
  title: string;
  lines: string[];
  state: 'done' | 'current' | 'pending';
};

const STEPS: Step[] = [
  { title: 'Payment confirmed', lines: ['Mon 11 Aug, 18:24 · €52.49'], state: 'done' },
  { title: 'Seller preparing', lines: ['Tue 12 Aug, 09:10 · Yousif packed your item'], state: 'done' },
  {
    title: 'Shipped',
    lines: ['Wed 13 Aug, 07:45 · Mondial Relay · 6H8821437', 'In transit to Paris 11e'],
    state: 'current',
  },
  { title: 'Delivered', lines: ['Expected Thu 14 — Fri 15 Aug'], state: 'pending' },
];

export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flash } = useApp();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader title={`Order #${id ?? 'SS28491'}`} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
      >
        <Tap onPress={() => router.push({ pathname: '/listing/[id]', params: { id: 1 } })} accessibilityRole="button">
          <Card style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
            <ListingThumb />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T w={500} size={15}>
                Nike Air Max 270
              </T>
              <T w={700} size={18} style={{ marginTop: 3 }}>
                €45
              </T>
              <T size={12.5} color={C.textSecondary} style={{ marginTop: 3 }}>
                Very good · EU 42 · from Lyon
              </T>
            </View>
          </Card>
        </Tap>

        <Card style={{ paddingVertical: 18, paddingHorizontal: 16, marginTop: 12 }}>
          {STEPS.map((s, i) => (
            <TimelineRow key={s.title} step={s} last={i === STEPS.length - 1} />
          ))}
        </Card>

        <Card style={{ paddingVertical: 15, paddingHorizontal: 16, marginTop: 12 }}>
          <T w={600} size={14} style={{ marginBottom: 10 }}>
            Delivery to
          </T>
          <T size={13.5} lh={21} color={C.textSecondary}>
            Ahmed Ibrahim{'\n'}Point Relais — Épicerie du Canal{'\n'}34 rue de la Grange, 75011 Paris
          </T>
        </Card>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Button
            label="Message seller"
            variant="outline"
            height={46}
            size={14}
            onPress={() => router.push('/chat')}
            style={{ flex: 1 }}
          />
          <Button
            label="Report a problem"
            variant="outline"
            height={46}
            size={14}
            onPress={() => flash('A support agent will reply within 24 h')}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

/** One milestone: status marker, connector rail, and its copy. */
function TimelineRow({ step, last }: { step: Step; last: boolean }) {
  const done = step.state === 'done';
  const current = step.state === 'current';

  return (
    <View style={{ flexDirection: 'row', gap: 13 }}>
      <View style={{ width: 20, alignItems: 'center', paddingTop: done ? 3 : 0 }}>
        {done ? (
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: C.success,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={10} color={C.primaryText} strokeWidth={3.4} />
          </View>
        ) : current ? (
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: C.accent,
              borderWidth: 4,
              borderColor: alpha.accentRing,
            }}
          />
        ) : (
          <View
            style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.border }}
          />
        )}

        {!last && (
          <View
            style={{
              width: 2,
              flex: 1,
              minHeight: 38,
              backgroundColor: done ? C.success : C.surfaceSecondary,
            }}
          />
        )}
      </View>

      <View style={{ flex: 1, paddingBottom: last ? 0 : 22 }}>
        <T w={600} size={14.5} color={current ? C.accent : step.state === 'pending' ? C.textMuted : C.text}>
          {step.title}
        </T>
        {step.lines.map((line, i) => (
          <T
            key={line}
            size={12.5}
            color={step.state === 'pending' ? C.textMuted : C.textSecondary}
            style={{ marginTop: i === 0 ? 2 : 0 }}
          >
            {line}
          </T>
        ))}
      </View>
    </View>
  );
}

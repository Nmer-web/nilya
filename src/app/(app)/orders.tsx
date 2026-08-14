import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ListingThumb } from '@/components/product-card';
import { ScreenHeader } from '@/components/screen-header';
import { Card, EmptyState, Segmented, T, Tap } from '@/components/ui';
import { color as C } from '@/theme/tokens';

type Tab = 'Active' | 'Past';

const ACTIVE = [
  {
    id: 'SS28491',
    title: 'Nike Air Max 270',
    price: '€45',
    meta: '#SS28491 · from Yousif Adam',
    statusColor: C.accent,
    status: 'Shipped',
    statusNote: '· arriving Thu 14 Aug',
  },
  {
    id: 'SS28502',
    title: 'Jebena Coffee Set',
    price: '35,000 SDG',
    meta: '#SS28502 · local pickup, Khartoum',
    statusColor: C.success,
    status: 'Ready to collect',
    statusNote: '· Al Riyadh point',
  },
];

export default function Orders() {
  const router = useRouter();
  const navClearance = useNavClearance();
  const [tab, setTab] = useState<Tab>('Active');

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader title="Orders" />

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'Active', label: 'Active' },
            { key: 'Past', label: 'Past' },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: navClearance }}
      >
        {tab === 'Active' ? (
          ACTIVE.map((o, i) => (
            <Tap key={o.id} onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })} accessibilityRole="button">
              <Card style={{ padding: 14, marginBottom: i === ACTIVE.length - 1 ? 0 : 10 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <ListingThumb />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T w={500} size={14.5} numberOfLines={1}>
                      {o.title}
                    </T>
                    <T w={700} size={16} style={{ marginTop: 2 }}>
                      {o.price}
                    </T>
                    <T size={12} color={C.textMuted} style={{ marginTop: 3 }}>
                      {o.meta}
                    </T>
                  </View>
                  <View style={{ marginTop: 24 }}>
                    <Icon name="chevronRight" size={16} color={C.borderStrong} />
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: C.surfaceSecondary,
                  }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: o.statusColor }} />
                  <T w={600} size={13}>
                    {o.status}
                  </T>
                  <T size={12.5} color={C.textSecondary}>
                    {o.statusNote}
                  </T>
                </View>
              </Card>
            </Tap>
          ))
        ) : (
          <EmptyState
            icon="package"
            title="No past orders"
            body="Completed orders move here after delivery is confirmed."
            style={{ paddingVertical: 56, paddingHorizontal: 28 }}
          />
        )}
      </ScrollView>
    </View>
  );
}

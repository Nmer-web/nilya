import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PriceTileGrid } from '@/components/product-card';
import { ReviewList } from '@/components/reviews';
import { ScreenHeader } from '@/components/screen-header';
import { Avatar, Button, EmptyState, Note, T, UnderlineTabs } from '@/components/ui';
import { initialsOf, listingsBy, PRODUCTS } from '@/data/catalog';
import { useApp } from '@/store/app-store';
import { color as C } from '@/theme/tokens';

type Tab = 'Listings' | 'Sold' | 'Reviews';

export default function SellerProfile() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flash } = useApp();
  const [tab, setTab] = useState<Tab>('Listings');

  const seller = decodeURIComponent(name ?? '');
  const listings = listingsBy(seller);
  const sample = listings[0] ?? PRODUCTS[0];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={seller} titleSize={15.5} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingTop: 20 }}>
          <Avatar initials={initialsOf(seller)} bg={sample.av} size={66} fontSize={22} />
          <View style={{ flex: 1 }}>
            <T w={600} size={19} tracking={-0.3}>
              {seller}
            </T>
            <T size={13} color={C.textSecondary} style={{ marginTop: 3 }}>
              ★ 4.9 · {sample.sales} sales · replies in 1 h
            </T>
            <T size={13} color={C.textSecondary} style={{ marginTop: 1 }}>
              {sample.city}, {sample.country}
            </T>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 18 }}>
          <Button
            label="Message"
            height={44}
            size={14}
            onPress={() => router.push('/chat')}
            style={{ flex: 1 }}
          />
          <Button
            label="Follow"
            variant="outline"
            height={44}
            size={14}
            onPress={() => flash(`Following ${seller}`)}
            style={{ flex: 1 }}
          />
        </View>

        <Note
          tone="accent"
          style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14 }}
        >
          <Icon name="shieldSolid" size={17} color={C.green} />
          <T size={12.5} color={C.accentDark} lh={17.5} style={{ flex: 1 }}>
            Verified seller · ID and payouts checked
          </T>
        </Note>

        <UnderlineTabs<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'Listings', label: 'Listings' },
            { key: 'Sold', label: 'Sold' },
            { key: 'Reviews', label: 'Reviews' },
          ]}
          style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 }}
        />

        {tab === 'Listings' && <PriceTileGrid products={listings} />}
        {tab === 'Reviews' && <ReviewList />}
        {tab === 'Sold' && (
          <EmptyState
            icon="bag"
            title="Nothing sold yet"
            body="Sold items will show here once an order completes."
            style={{ paddingVertical: 44 }}
          />
        )}
      </ScrollView>
    </View>
  );
}

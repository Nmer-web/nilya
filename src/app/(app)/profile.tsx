import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { PriceTileGrid } from '@/components/product-card';
import { ReviewList } from '@/components/reviews';
import { Badge, Button, Card, EmptyState, Row, T, Tap, UnderlineTabs } from '@/components/ui';
import { useFavorites } from '@/hooks/use-favorites';
import { myListings } from '@/data/catalog';
import { useApp } from '@/store/app-store';
import { useAuth } from '@/store/auth-store';
import { avatarColor, color as C } from '@/theme/tokens';

type Tab = 'Listings' | 'Sold' | 'Reviews';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { flash } = useApp();
  const { user, signOut } = useAuth();
  /* The saved count is real; the rest of this screen is still the prototype's
     and is converted by a later task. */
  const favorites = useFavorites();
  const [tab, setTab] = useState<Tab>('Listings');
  const [signingOut, setSigningOut] = useState(false);
  const listings = myListings();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: navClearance }}
    >
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, alignItems: 'flex-end' }}>
        <Tap
          onPress={() => flash('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="gear" size={20} color={C.text} strokeWidth={1.7} />
        </Tap>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 16 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: avatarColor.ahmed,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T w={600} size={24} color={C.primaryText}>
            AI
          </T>
          <View
            style={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: C.success,
              borderWidth: 2.5,
              borderColor: C.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={11} color={C.primaryText} strokeWidth={3.2} />
          </View>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={600} size={22} tracking={-0.4}>
            Ahmed Ibrahim
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <T w={600} size={12.5} color={C.text}>
              ★ 4.9
            </T>
            <T size={12.5} color={C.textSecondary}>
              · Paris, France
            </T>
          </View>
          <T size={12.5} color={C.textSecondary} style={{ marginTop: 2 }}>
            24 sales · 18 listings · Joined 2023
          </T>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        <Button
          label="Edit profile"
          variant="outline"
          height={42}
          size={13.5}
          onPress={() => flash('Profile editing is out of scope for this prototype')}
          style={{ flex: 1, borderRadius: 11 }}
        />
        <Button
          label="My orders"
          variant="outline"
          height={42}
          size={13.5}
          onPress={() => router.push('/orders')}
          style={{ flex: 1, borderRadius: 11 }}
        />
      </View>

      <Card style={{ marginHorizontal: 16, marginTop: 14, overflow: 'hidden' }}>
        <Row
          icon="heart"
          label="Favorites"
          value={`${favorites.saved.size} saved`}
          onPress={() => router.push('/favorites')}
        />
        <Row
          icon="package"
          label="Orders & shipping"
          right={<Badge>1</Badge>}
          onPress={() => router.push('/orders')}
        />
        <Row icon="card" label="Payouts & verification" last onPress={() => router.push('/verify')} />
      </Card>

      <Card style={{ marginHorizontal: 16, marginTop: 12, overflow: 'hidden' }}>
        <Row
          icon="person"
          label="Signed in as"
          value={user?.email ?? '—'}
          last
          onPress={() => flash('Account settings are not built yet')}
        />
      </Card>

      {/* No confirmation step: signing out is instantly reversible and the
          session is the only thing discarded. */}
      <Button
        label={signingOut ? 'Signing out…' : 'Sign out'}
        variant="outline"
        height={46}
        size={14}
        disabled={signingOut}
        onPress={async () => {
          setSigningOut(true);
          await signOut();
          // No navigation here — clearing the session flips the root guard and
          // the router swaps to the auth group on its own.
        }}
        style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 11 }}
      />

      <UnderlineTabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { key: 'Listings', label: 'Listings' },
          { key: 'Sold', label: 'Sold' },
          { key: 'Reviews', label: 'Reviews' },
        ]}
        style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14 }}
      />

      {tab === 'Listings' && <PriceTileGrid products={listings} />}
      {tab === 'Reviews' && <ReviewList />}
      {tab === 'Sold' && (
        <EmptyState
          icon="bag"
          title="Nothing sold yet"
          body="List an item and it will appear here after it sells."
          style={{ paddingVertical: 44 }}
          action={
            <Button
              label="Sell an item"
              height={42}
              size={14}
              onPress={() => router.replace('/sell')}
              style={{ marginTop: 16, paddingHorizontal: 20, borderRadius: 11 }}
            />
          }
        />
      )}
    </ScrollView>
  );
}

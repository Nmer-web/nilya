import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { ListingGrid } from '@/components/listing-card';
import { ProfileBio, ProfileIdentity } from '@/components/profile-identity';
import { ProductGridSkeleton, Skeleton } from '@/components/skeleton';
import { Button, Card, EmptyState, Row, T, Tap, UnderlineTabs } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useFavorites } from '@/hooks/use-favorites';
import { fetchListings, fetchProfile } from '@/lib/queries';
import { useApp } from '@/store/app-store';
import { useAuth } from '@/store/auth-store';
import { color as C } from '@/theme/tokens';

type Tab = 'Listings' | 'Sold';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { flash } = useApp();
  const { user, signOut } = useAuth();
  const favorites = useFavorites();
  const [tab, setTab] = useState<Tab>('Listings');
  const [signingOut, setSigningOut] = useState(false);

  /*
   * The signed-in user's own profile row, read through the same function a
   * seller's public page uses — the account screen is not a second source of
   * truth about the same person. The id comes from the session, never a
   * constant.
   */
  const profile = useAsync(
    async () => (user ? fetchProfile(user.id) : null),
    `profile:${user?.id ?? 'none'}`
  );

  /** The user's own listings, read the same way a seller's are. */
  const mine = useAsync(
    async () => (user ? (await fetchListings({ sellerId: user.id })).rows : []),
    `my-listings:${user?.id ?? 'none'}`
  );

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

      {/*
        Identity, from the `profiles` row this account owns. Nothing is
        substituted when a field is empty: no stand-in name, no placeholder
        rating, no invented city. While it loads the block is a skeleton rather
        than a guess, and if the row cannot be read the screen says so.
      */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {profile.loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Skeleton width={72} height={72} round={36} />
            <View style={{ flex: 1 }}>
              <Skeleton width="52%" height={20} />
              <Skeleton width="68%" height={12} style={{ marginTop: 10 }} />
            </View>
          </View>
        ) : profile.data ? (
          <>
            <ProfileIdentity profile={profile.data} size={72} nameSize={22} />
            <ProfileBio bio={profile.data.bio} />
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: C.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="person" size={28} color={C.textMuted} strokeWidth={1.6} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {/* The address is the one thing the session itself can vouch for. */}
              <T w={600} size={22} tracking={-0.4} numberOfLines={1}>
                {user?.email?.split('@')[0] ?? 'Your account'}
              </T>
              <T size={12.5} color={C.textSecondary} style={{ marginTop: 3 }}>
                {profile.error ? 'Profile could not be loaded' : 'Profile not set up yet'}
              </T>
            </View>
          </View>
        )}
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
        {/* No count badge: orders are not implemented, so any number here
            would be one this app invented. */}
        <Row icon="package" label="Orders & shipping" onPress={() => router.push('/orders')} />
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

      {/*
        Reviews is not a tab here. The list it rendered was six fabricated
        reviews from the prototype catalog, and there is no review data to put
        in its place — an empty tab would be a promise the schema does not yet
        keep.
      */}
      <UnderlineTabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { key: 'Listings', label: 'Listings' },
          { key: 'Sold', label: 'Sold' },
        ]}
        style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14 }}
      />

      {tab === 'Listings' &&
        (mine.loading ? (
          <ProductGridSkeleton count={4} />
        ) : mine.error ? (
          <EmptyState
            icon="close"
            title="Could not load your listings"
            body={mine.error.message}
            style={{ paddingVertical: 44 }}
            action={
              <Button label="Try again" height={44} size={14} onPress={mine.refetch} style={{ marginTop: 18 }} />
            }
          />
        ) : (mine.data ?? []).length === 0 ? (
          <EmptyState
            icon="bag"
            title="No listings yet"
            body="Anything you list will appear here."
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
        ) : (
          <ListingGrid
            listings={mine.data ?? []}
            savedIds={favorites.saved}
            onToggleSave={favorites.toggle}
          />
        ))}
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

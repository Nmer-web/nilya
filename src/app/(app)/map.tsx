import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon } from '@/components/icon';
import { formatPrice, ListingGrid } from '@/components/listing-card';
import { SheetGrabber } from '@/components/sheet';
import { Avatar, Button, EmptyState, InlineError, T, Tap } from '@/components/ui';
import {
  DEFAULT_CENTER,
  DEFAULT_RADIUS,
  formatDistance,
  groupByPosition,
  RADIUS_CHOICES,
  type Coordinates,
  type RadiusKm,
} from '@/features/location/geo';
import { LocationMap, type MapMarkerSpec } from '@/features/location/map';
import { useLocation } from '@/features/location/useLocation';
import { useFavorites } from '@/hooks/use-favorites';
import { useAsync } from '@/hooks/use-async';
import type { ListingRow, NearbyListingRow } from '@/lib/database.types';
import { retryableReadMessage } from '@/lib/errors';
import { profileInitials } from '@/lib/profile-presentation';
import { coverUrl, fetchListingsByIds, fetchNearbyListings, imageUrl } from '@/lib/queries';
import { color as C, elevation, radius, space, touch } from '@/theme/tokens';

const PEEK_HEIGHT = 280;
const PEEK_IMAGE_WIDTH = 120;

/**
 * Listings near the buyer, on a map.
 *
 * Everything on this screen comes from `listings_nearby`, which runs as the
 * caller and therefore under `listings_read_active`, drops sellers who turned
 * their location off, and rounds coordinates to about a kilometre before they
 * leave PostgreSQL. The distances shown are the ones it measured.
 *
 * Without permission the map still opens: it centres on Khartoum as a starting
 * viewport and searches around that. That is a place to look at, never a claim
 * about where the buyer is — no distance is presented as being from them
 * unless their own position was actually read (Principle II).
 */
export default function MapRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const location = useLocation();
  const favorites = useFavorites();

  const [radiusKm, setRadiusKm] = useState<RadiusKm>(DEFAULT_RADIUS);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  /* Asked once, and only when it can still be asked. A screen about what is
     near you is the honest moment for the prompt; repeating it after a refusal
     is not. */
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || location.loading || !location.available) return;
    if (location.permissionGranted || location.permissionDenied) return;
    asked.current = true;
    void location.requestPermission();
  }, [location]);

  const center: Coordinates = location.coords ?? DEFAULT_CENTER;
  const centred = location.coords !== null;
  const centerKey = `${center.latitude.toFixed(3)},${center.longitude.toFixed(3)}`;

  const nearby = useAsync(
    () =>
      fetchNearbyListings({
        latitude: center.latitude,
        longitude: center.longitude,
        radiusKm,
      }),
    `nearby:${centerKey}:${radiusKm}`
  );

  const found = useMemo(() => nearby.data ?? [], [nearby.data]);
  const ids = useMemo(() => found.map((row) => row.id), [found]);

  /* The RPC returns a narrow shape by design. The cards on this screen are the
     same cards as everywhere else in NILYA, so the full rows are read for what
     it found rather than a thinner card being invented for this one screen. */
  const rows = useAsync(() => fetchListingsByIds(ids), `nearby-rows:${ids.join(',')}`);

  const distances = useMemo(
    () => new Map(found.map((row) => [row.id, row.distance_km])),
    [found]
  );

  const ordered = useMemo(() => {
    const position = new Map(ids.map((id, index) => [id, index]));
    return [...(rows.data ?? [])].sort(
      (a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0)
    );
  }, [rows.data, ids]);

  const groups = useMemo(() => groupByPosition(found), [found]);

  const markers = useMemo<MapMarkerSpec[]>(
    () =>
      groups.map((group) => ({
        id: group.key,
        coordinate: group.coordinate,
        imageUrl: group.items[0].cover_path ? imageUrl(group.items[0].cover_path) : null,
        count: group.items.length,
      })),
    [groups]
  );

  const selected = useMemo(() => {
    if (selectedGroup === null) return null;
    const group = groups.find((candidate) => candidate.key === selectedGroup);
    if (!group) return null;
    const first = group.items[0];
    return {
      nearby: first,
      row: ordered.find((row) => row.id === first.id) ?? null,
      alsoHere: group.items.length - 1,
    };
  }, [selectedGroup, groups, ordered]);

  const refresh = useCallback(() => {
    nearby.refresh();
    rows.refresh();
  }, [nearby, rows]);

  const loading = nearby.loading || (ids.length > 0 && rows.loading);
  const readError = nearby.error ?? rows.error;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {mode === 'map' ? (
        <LocationMap
          center={center}
          radiusKm={radiusKm}
          fill
          markers={markers}
          selectedMarkerId={selectedGroup}
          onMarkerPress={setSelectedGroup}
          showsUserLocation={location.permissionGranted}
          placeholderLabel={location.label}
          accessibilityLabel={
            centred
              ? `Map of listings within ${radiusKm} kilometres of you`
              : `Map of listings within ${radiusKm} kilometres of Khartoum`
          }
        />
      ) : (
        <ListView
          listings={ordered}
          distances={distances}
          savedIds={favorites.saved}
          onToggleSave={favorites.toggle}
          loading={loading}
          error={readError}
          onRefresh={refresh}
          refreshing={nearby.refreshing || rows.refreshing}
          paddingTop={insets.top + 132}
          paddingBottom={navClearance + 72}
          radiusKm={radiusKm}
        />
      )}

      {/* Top overlay: where to search, and how far. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + space.space8,
          left: 0,
          right: 0,
          gap: space.space12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.space8,
            paddingHorizontal: space.gutterCompact,
          }}
        >
          <Tap
            onPress={() => router.push('/search')}
            accessibilityRole="button"
            accessibilityLabel="Search listings"
            style={{
              flex: 1,
              minHeight: touch.standard,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.space8,
              paddingHorizontal: space.space16,
              borderRadius: radius.radiusPill,
              backgroundColor: C.surface,
              ...elevation.nav,
            }}
          >
            <Icon name="search" role="inline" color={C.textSecondary} decorative />
            <T variant="body" color={C.textSecondary}>
              Listings near you
            </T>
          </Tap>

          {/*
            A recentre control rather than the filter button the brief drew:
            the only filter this screen has is the radius, and it is already on
            screen below. A second surface for it would be a button whose sheet
            repeats the row underneath it — while getting back to your own
            position after panning is a real need with nothing else offering it.
          */}
          {location.available ? (
          <Tap
            onPress={() => void location.refreshLocation()}
            accessibilityRole="button"
            accessibilityLabel={centred ? 'Centre the map on my location' : 'Find my location'}
            style={{
              width: touch.standard,
              height: touch.standard,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.radiusPill,
              backgroundColor: C.surface,
              ...elevation.nav,
            }}
          >
            <Icon
              name="pin"
              role="navigation"
              color={centred ? C.primary : C.textSecondary}
              decorative
            />
          </Tap>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: space.gutterCompact,
            gap: space.space8,
          }}
        >
          {RADIUS_CHOICES.map((choice) => (
            <RadiusPill
              key={choice}
              km={choice}
              active={choice === radiusKm}
              onPress={() => {
                setSelectedGroup(null);
                setRadiusKm(choice);
              }}
            />
          ))}
        </ScrollView>

        {!centred && !location.loading ? (
          <View style={{ paddingHorizontal: space.gutterCompact }}>
            <View
              style={{
                paddingHorizontal: space.space16,
                paddingVertical: space.space12,
                borderRadius: radius.radiusMedium,
                borderCurve: 'continuous',
                backgroundColor: C.surface,
                ...elevation.card,
              }}
            >
              <T variant="metadata" color={C.textSecondary}>
                {location.available
                  ? 'Showing Khartoum. Turn on location to see what is near you.'
                  : 'Showing Khartoum. This build cannot read your location.'}
              </T>
            </View>
          </View>
        ) : null}
      </View>

      {readError && mode === 'map' ? (
        <View
          style={{
            position: 'absolute',
            left: space.gutterCompact,
            right: space.gutterCompact,
            bottom: navClearance + 72,
          }}
        >
          <InlineError
            message={retryableReadMessage(readError, 'Nearby listings could not be loaded.')}
            actionLabel="Retry"
            onAction={refresh}
          />
        </View>
      ) : null}

      {mode === 'map' && selected ? (
        <ListingPeek
          nearby={selected.nearby}
          row={selected.row}
          alsoHere={selected.alsoHere}
          bottom={navClearance}
          onDismiss={() => setSelectedGroup(null)}
          onSeeAll={() => {
            setSelectedGroup(null);
            setMode('list');
          }}
          onOpen={() => router.push(`/listing/${selected.nearby.id}`)}
        />
      ) : null}

      {/* Bottom overlay: the other way to read the same result. */}
      {selected === null || mode === 'list' ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: navClearance,
            alignItems: 'center',
          }}
        >
          <Tap
            onPress={() => setMode(mode === 'map' ? 'list' : 'map')}
            accessibilityRole="button"
            accessibilityLabel={mode === 'map' ? 'Show nearby listings as a list' : 'Show the map'}
            style={{
              minHeight: touch.standard,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.space8,
              paddingHorizontal: space.space20,
              borderRadius: radius.radiusPill,
              backgroundColor: C.surface,
              ...elevation.nav,
            }}
          >
            <Icon name={mode === 'map' ? 'grid' : 'pin'} role="inline" color={C.textPrimary} decorative />
            <T variant="bodyMedium">{mode === 'map' ? 'List view' : 'Map view'}</T>
          </Tap>
        </View>
      ) : null}
    </View>
  );
}

function RadiusPill({ km, active, onPress }: { km: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Search within ${km} kilometres`}
      style={{
        minHeight: 36,
        justifyContent: 'center',
        paddingHorizontal: space.space16,
        borderRadius: radius.radiusPill,
        backgroundColor: active ? C.primary : C.surface,
        ...elevation.card,
      }}
    >
      <T variant="metadataMedium" color={active ? C.textInverse : C.textPrimary}>
        {`${km} km`}
      </T>
    </Pressable>
  );
}

/** The card that rises when a pin is tapped. */
function ListingPeek({
  nearby,
  row,
  alsoHere,
  bottom,
  onDismiss,
  onSeeAll,
  onOpen,
}: {
  nearby: NearbyListingRow;
  row: ListingRow | null;
  alsoHere: number;
  bottom: number;
  onDismiss: () => void;
  onSeeAll: () => void;
  onOpen: () => void;
}) {
  const cover = row ? coverUrl(row.images) : nearby.cover_path ? imageUrl(nearby.cover_path) : null;
  const seller = row?.seller ?? null;
  const distance = formatDistance(nearby.distance_km);
  const price =
    nearby.price_cents === null ? null : formatPrice(nearby.price_cents, nearby.currency);

  return (
    <View
      accessibilityViewIsModal={false}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        height: PEEK_HEIGHT,
        borderTopLeftRadius: radius.radiusSheet,
        borderTopRightRadius: radius.radiusSheet,
        borderCurve: 'continuous',
        backgroundColor: C.surface,
        paddingHorizontal: space.gutterCompact,
        paddingTop: space.space8,
        ...elevation.sheet,
      }}
    >
      <SheetGrabber />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T variant="metadataMedium" color={C.textSecondary}>
          {distance ?? 'Nearby'}
        </T>
        <Tap
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={{ minHeight: 32, minWidth: 32, alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <Icon name="close" role="inline" color={C.textSecondary} decorative />
        </Tap>
      </View>

      <View style={{ flexDirection: 'row', gap: space.space16, marginTop: space.space12 }}>
        <View
          style={{
            width: PEEK_IMAGE_WIDTH,
            height: PEEK_IMAGE_WIDTH,
            borderRadius: radius.radiusMedium,
            borderCurve: 'continuous',
            overflow: 'hidden',
            backgroundColor: C.bgMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {cover ? (
            <ListingPeekImage uri={cover} />
          ) : (
            <Icon name="image" role="navigation" color={C.inkFaint} decorative />
          )}
        </View>

        <View style={{ flex: 1, gap: space.space4 }}>
          <T variant="cardTitle" numberOfLines={2}>
            {nearby.title}
          </T>
          {price ? <T variant="detailPrice">{price}</T> : null}

          {seller ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.space8,
                marginTop: space.space4,
              }}
            >
              <Avatar
                initials={profileInitials(seller.display_name)}
                bg={C.textPrimary}
                size={24}
                imageUrl={seller.avatar_url}
              />
              <T variant="metadata" color={C.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
                {seller.display_name}
              </T>
            </View>
          ) : null}

          {alsoHere > 0 ? (
            <Tap
              onPress={onSeeAll}
              accessibilityRole="button"
              accessibilityLabel={`See all ${alsoHere + 1} listings at this place`}
              style={{ minHeight: 32, justifyContent: 'center' }}
            >
              <T variant="metadataMedium" color={C.primary}>
                {`+${alsoHere} more here`}
              </T>
            </Tap>
          ) : null}
        </View>
      </View>

      <Button label="View listing" onPress={onOpen} style={{ marginTop: space.space16 }} />
    </View>
  );
}

/** Kept apart so the peek stays a plain layout component. */
function ListingPeekImage({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Icon name="image" role="navigation" color={C.inkFaint} decorative />;

  return (
    <Image
      source={{ uri }}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
      onError={() => setFailed(true)}
      accessible={false}
    />
  );
}

/** The same result, read as a grid. */
function ListView({
  listings,
  distances,
  savedIds,
  onToggleSave,
  loading,
  error,
  onRefresh,
  refreshing,
  paddingTop,
  paddingBottom,
  radiusKm,
}: {
  listings: ListingRow[];
  distances: Map<string, number>;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  loading: boolean;
  error: Error | null;
  onRefresh: () => void;
  refreshing: boolean;
  paddingTop: number;
  paddingBottom: number;
  radiusKm: number;
}) {
  if (error) {
    return (
      <View style={{ flex: 1, paddingTop, paddingHorizontal: space.gutterCompact }}>
        <InlineError
          message={retryableReadMessage(error, 'Nearby listings could not be loaded.')}
          actionLabel="Retry"
          onAction={onRefresh}
        />
      </View>
    );
  }

  return (
    <ListingGrid
      listings={listings}
      savedIds={savedIds}
      onToggleSave={onToggleSave}
      distances={distances}
      contentPaddingTop={paddingTop}
      contentPaddingBottom={paddingBottom}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={paddingTop} />
      }
      listEmpty={
        loading ? null : (
          <View style={{ paddingTop: space.space32 }}>
            <EmptyState
              icon="pin"
              title="Nothing pinned nearby yet"
              body={`No listings within ${radiusKm} km have a location set. Try a wider radius.`}
            />
          </View>
        )
      }
    />
  );
}

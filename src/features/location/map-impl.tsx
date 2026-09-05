import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Icon } from '@/components/icon';
import { T } from '@/components/ui';
import { color as C, elevation, radius, space } from '@/theme/tokens';

import { regionForRadius } from './geo';
import type { LocationMapProps, MapMarkerSpec } from './map-types';

/**
 * The real map, for iOS and Android.
 *
 * Loaded only through `map.tsx`, which reaches it with `React.lazy`, so
 * `react-native-maps` stays out of the first bundle a screen evaluates. The
 * web build resolves `map-impl.web.tsx` instead and never imports this file —
 * `react-native-maps` has no web support, and a static export prerenders every
 * route in Node where a native view cannot exist.
 */

const PIN_SIZE = 56;

export default function LocationMapImpl({
  center,
  radiusKm,
  height,
  fill = false,
  accessibilityLabel,
  markers = [],
  selectedMarkerId = null,
  onMarkerPress,
  interactive = true,
  showsUserLocation = false,
  borderRadius = radius.radiusLarge,
}: LocationMapProps) {
  /* Recomputed only when the viewport inputs change: passing a fresh object
     every render fights the user's own panning. */
  const region = useMemo(() => regionForRadius(center, radiusKm), [center, radiusKm]);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        fill ? StyleSheet.absoluteFill : { height: height ?? 0 },
        {
          overflow: 'hidden',
          borderRadius: fill ? 0 : borderRadius,
          borderCurve: 'continuous',
          backgroundColor: C.bgMuted,
        },
      ]}
    >
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        /* The map is decorative to a screen reader; the wrapper above carries
           the label, and every listing behind a pin is reachable from the list
           view, which is the accessible path through this screen. */
        importantForAccessibility="no-hide-descendants"
      >
        {markers.map((marker) => (
          <ListingMarker
            key={marker.id}
            marker={marker}
            selected={marker.id === selectedMarkerId}
            onPress={onMarkerPress}
          />
        ))}
      </MapView>
    </View>
  );
}

/**
 * One pin: the listing's photo in a white card over a small green tip, with a
 * count when several listings share the position.
 *
 * Android rasterises a marker's children into a bitmap and, with
 * `tracksViewChanges` off, never redraws it. A photo that arrives after that
 * snapshot would never appear, so tracking stays on until the image has
 * settled — loaded or failed — and is then switched off, which is what keeps a
 * screenful of pins from re-rasterising on every frame.
 */
function ListingMarker({
  marker,
  selected,
  onPress,
}: {
  marker: MapMarkerSpec;
  selected: boolean;
  onPress?: (id: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const [settled, setSettled] = useState(marker.imageUrl === null);
  const showImage = marker.imageUrl !== null && !failed;

  return (
    <Marker
      identifier={marker.id}
      coordinate={marker.coordinate}
      onPress={onPress ? () => onPress(marker.id) : undefined}
      tracksViewChanges={!settled || selected}
    >
      <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: PIN_SIZE,
          height: PIN_SIZE,
          borderRadius: radius.radiusMedium,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: C.surface,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? C.primary : C.border,
          alignItems: 'center',
          justifyContent: 'center',
          ...elevation.card,
        }}
      >
        {showImage ? (
          <Image
            source={{ uri: marker.imageUrl as string }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setFailed(true)}
            onLoadEnd={() => setSettled(true)}
          />
        ) : (
          <Icon name="pin" role="inline" color={C.primary} decorative />
        )}
      </View>

      {/* The tip, which is what actually points at the coordinate. */}
      <View
        style={{
          width: 10,
          height: 10,
          marginTop: -2,
          borderRadius: radius.radiusPill,
          backgroundColor: C.primary,
          borderWidth: 2,
          borderColor: C.surface,
        }}
      />

      {marker.count > 1 ? (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -8,
            minWidth: 22,
            height: 22,
            paddingHorizontal: space.space4,
            borderRadius: radius.radiusPill,
            backgroundColor: C.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T variant="metadataMedium" color={C.textPrimary}>{`+${marker.count - 1}`}</T>
        </View>
      ) : null}
      </View>
    </Marker>
  );
}

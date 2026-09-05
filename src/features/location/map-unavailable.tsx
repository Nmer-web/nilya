import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { T } from '@/components/ui';
import { color as C, radius, space } from '@/theme/tokens';

import type { LocationMapProps } from './map-types';

/**
 * What stands in for a map that cannot be drawn.
 *
 * Two situations reach it, and both are real rather than exceptional:
 *
 *   - The web build. `react-native-maps` is iOS and Android only, and NILYA's
 *     web target is a static export whose routes are prerendered in Node.
 *   - A client whose binary predates the map module — Expo Go, or a
 *     development build made before the package was added. The dynamic import
 *     fails there, and `map.tsx` lands here instead of throwing.
 *
 * It draws an honest panel, not a picture of a map: the place name the caller
 * already has, and a line saying why there is no map. Faking a map surface
 * would be a screenshot pretending to be a feature.
 */
export function MapPanel({
  height,
  fill = false,
  accessibilityLabel,
  borderRadius = radius.radiusLarge,
  placeholderLabel = null,
  note,
}: LocationMapProps & { note: string }) {
  return (
    <View
      accessible
      accessibilityLabel={
        placeholderLabel
          ? `${accessibilityLabel}. ${placeholderLabel}. ${note}`
          : `${accessibilityLabel}. ${note}`
      }
      style={[
        fill ? StyleSheet.absoluteFill : { height: height ?? 0 },
        {
          borderRadius: fill ? 0 : borderRadius,
          borderCurve: 'continuous',
          backgroundColor: C.bgMuted,
          borderWidth: 1,
          borderColor: C.border,
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.space8,
          paddingHorizontal: space.space20,
        },
      ]}
    >
      <Icon name="pin" role="navigation" color={C.primary} decorative />

      {placeholderLabel ? (
        <T variant="body" color={C.textPrimary} style={{ textAlign: 'center' }}>
          {placeholderLabel}
        </T>
      ) : null}

      <T variant="metadata" color={C.textSecondary} style={{ textAlign: 'center' }}>
        {note}
      </T>
    </View>
  );
}

/** The fallback `map.tsx` reaches when the native map module will not load. */
export default function MapUnavailable(props: LocationMapProps) {
  return <MapPanel {...props} note="Maps need a newer build of the app." />;
}

import React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { T } from '@/components/ui';
import { color as C, radius, space } from '@/theme/tokens';

import { distanceKm as measure, formatDistance, isCoordinates, type Coordinates } from './geo';
import { LocationMap } from './map';

/**
 * Where a seller is, wherever that needs saying.
 *
 * Shared by the listing detail screen and the seller's profile so the two
 * cannot drift into describing the same place differently.
 *
 * Three states, and which one appears is decided entirely by what is actually
 * known:
 *
 *   - Consent withdrawn, or no coordinates stored: the city label alone. No
 *     map, because there is no position to draw, and no distance.
 *   - Coordinates, but the buyer's own position is unknown: a map and the city.
 *     No distance — "how far from you" cannot be answered without a "you", and
 *     estimating it would be a fabricated number (Principle II).
 *   - Both: map, city, and the measured distance.
 *
 * Coordinates reaching this component have already been rounded to about a
 * kilometre by the database, so the pin marks an area, never an address.
 */
export function SellerLocationBlock({
  coordinates,
  city,
  countryCode,
  showLocation,
  viewerCoordinates = null,
  height = 180,
  label,
}: {
  coordinates: Coordinates | null;
  city: string | null;
  countryCode: string | null;
  /** The seller's consent. False means the map is not drawn at all. */
  showLocation: boolean;
  /** The buyer's own position, when they granted it. */
  viewerCoordinates?: Coordinates | null;
  height?: number;
  /** Pre-composed place name, e.g. "Khartoum, Sudan". */
  label: string | null;
}) {
  const mappable = showLocation && coordinates !== null && isCoordinates(coordinates);

  const distance =
    mappable && viewerCoordinates !== null && isCoordinates(viewerCoordinates)
      ? formatDistance(measure(viewerCoordinates, coordinates))
      : null;

  if (!label && !mappable) return null;

  return (
    <View style={{ gap: space.space12 }}>
      {mappable ? (
        <LocationMap
          center={coordinates}
          radiusKm={4}
          height={height}
          interactive={false}
          borderRadius={radius.radiusLarge}
          placeholderLabel={label}
          accessibilityLabel={label ? `Map showing ${label}` : 'Map showing the seller location'}
          markers={[
            { id: 'seller', coordinate: coordinates, imageUrl: null, count: 1 },
          ]}
        />
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space8 }}>
        <Icon name="pin" role="metadata" color={C.primary} decorative />
        <T variant="metadata" color={C.textSecondary} style={{ flex: 1 }}>
          {[label, distance].filter(Boolean).join(' · ') ||
            'Location not shared for this listing.'}
        </T>
      </View>

      {/* The city and country are stored; nothing finer than that is. */}
      {mappable ? (
        <T variant="caption" color={C.inkFaint}>
          Approximate area only. NILYA never shows a seller&rsquo;s exact address.
        </T>
      ) : null}
    </View>
  );
}

/** The compact form the seller's own profile uses. */
export function SellerLocationInline({
  coordinates,
  showLocation,
  label,
}: {
  coordinates: Coordinates | null;
  showLocation: boolean;
  label: string | null;
}) {
  const mappable = showLocation && coordinates !== null && isCoordinates(coordinates);
  if (!label && !mappable) return null;

  return (
    <View style={{ gap: space.space8 }}>
      {mappable ? (
        <LocationMap
          center={coordinates}
          radiusKm={6}
          height={120}
          interactive={false}
          borderRadius={radius.radiusMedium}
          placeholderLabel={label}
          accessibilityLabel={label ? `Map showing ${label}` : 'Map showing the seller location'}
          markers={[{ id: 'seller', coordinate: coordinates, imageUrl: null, count: 1 }]}
        />
      ) : null}

      {label ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space8 }}>
          <Icon name="pin" role="metadata" color={C.textSecondary} decorative />
          <T variant="metadata" color={C.textSecondary} style={{ flex: 1 }}>
            {`Based in ${label}`}
          </T>
        </View>
      ) : null}
    </View>
  );
}

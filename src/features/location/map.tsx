import React, { Suspense } from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/skeleton';
import { radius } from '@/theme/tokens';

import type { LocationMapProps } from './map-types';
import MapUnavailable from './map-unavailable';

/**
 * The only map every screen should import.
 *
 * `react-native-maps` is heavy and native, so it is reached through
 * `React.lazy`: a route that merely *can* show a map does not pay for one
 * until a map is rendered. Metro picks `map-impl.web.tsx` for web, where the
 * library does not exist, and `map-impl.tsx` for iOS and Android.
 *
 * It can fail in two different ways in a client whose binary predates the
 * package — Expo Go, or a development build made before it was installed —
 * and both are handled, because they are ordinary situations rather than
 * exceptional ones:
 *
 *   - The module throws while loading. The `catch` swaps in the panel.
 *   - The module loads but the native view is missing, and the failure only
 *     appears when React renders it. The boundary below catches that.
 *
 * Either way the failure stays inside the map's own footprint instead of
 * taking down every screen that can show one.
 */
const LocationMapImpl = React.lazy(() =>
  import('./map-impl').catch(() => import('./map-unavailable'))
);

export type { LocationMapProps, MapMarkerSpec } from './map-types';

export function LocationMap(props: LocationMapProps) {
  return (
    <MapBoundary props={props}>
      <Suspense
        fallback={
          <MapPlaceholder
            height={props.height}
            fill={props.fill}
            borderRadius={props.borderRadius}
          />
        }
      >
        <LocationMapImpl {...props} />
      </Suspense>
    </MapBoundary>
  );
}

/**
 * Catches a map that fails while rendering and shows the panel instead.
 *
 * A class because that is the only thing React lets catch a render error. It
 * deliberately does not reset: if the native view is missing it will be
 * missing on every retry, and a boundary that keeps re-throwing would flicker.
 */
class MapBoundary extends React.Component<
  { props: LocationMapProps; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <MapUnavailable {...this.props.props} />;
    return this.props.children;
  }
}

/** Holds the map's exact footprint while the module loads, so nothing jumps. */
function MapPlaceholder({
  height,
  fill,
  borderRadius,
}: {
  height?: number;
  fill?: boolean;
  borderRadius?: number;
}) {
  const round = fill ? 0 : (borderRadius ?? radius.radiusLarge);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        fill ? StyleSheet.absoluteFill : { height: height ?? 0 },
        { overflow: 'hidden', borderRadius: round, borderCurve: 'continuous' },
      ]}
    >
      <Skeleton height={height ?? 0} round={round} />
    </View>
  );
}

import type { Coordinates } from './geo';

/**
 * The map's vocabulary, kept apart from every implementation of it.
 *
 * `map.tsx` and both `map-impl` files import this and nothing heavier, so the
 * web bundle and the static prerender can describe a map without
 * `react-native-maps` being resolvable at all.
 */
export type MapMarkerSpec = {
  /** Listing id when the pin is one listing, position key when it is several. */
  id: string;
  coordinate: Coordinates;
  /** Cover photo drawn inside the pin. Null renders the fallback tile. */
  imageUrl: string | null;
  /** How many listings share this coordinate. 1 hides the badge. */
  count: number;
};

export type LocationMapProps = {
  center: Coordinates;
  /** Sets the viewport: the map opens showing this much ground around center. */
  radiusKm: number;
  /** Fixed height, for a preview card. Ignored when `fill` is set. */
  height?: number;
  /** Fills its parent instead: the map tab draws the map as the whole screen. */
  fill?: boolean;
  /** Spoken by screen readers, which get nothing from the map surface itself. */
  accessibilityLabel: string;
  markers?: readonly MapMarkerSpec[];
  selectedMarkerId?: string | null;
  onMarkerPress?: (id: string) => void;
  /** False for the preview cards: no panning, no zooming, no gestures. */
  interactive?: boolean;
  /** Draws the blue dot. Only ever true where the permission was granted. */
  showsUserLocation?: boolean;
  borderRadius?: number;
  /**
   * Shown instead of a map where one cannot be drawn — the web build, or a
   * failed load. A place name, never a stand-in for the map itself.
   */
  placeholderLabel?: string | null;
};

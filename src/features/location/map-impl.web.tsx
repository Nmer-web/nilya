import React from 'react';

import type { LocationMapProps } from './map-types';
import { MapPanel } from './map-unavailable';

/**
 * What the web build shows where the app draws a map.
 *
 * `react-native-maps` is iOS and Android only, and NILYA's web target is a
 * static export whose routes are prerendered in Node — a native view cannot
 * exist in either place. Metro resolves this file for web, so the native
 * module never enters the web bundle at all.
 *
 * The panel itself lives in `map-unavailable`, because a client whose binary
 * predates the map module needs the same panel with a different sentence.
 */
export default function LocationMapImpl(props: LocationMapProps) {
  return <MapPanel {...props} note="Open NILYA on your phone to see this on a map." />;
}

import { useCallback, useEffect, useRef, useState } from 'react';

import { formatProfileLocation } from '@/lib/profile-presentation';

import { isCoordinates, type Coordinates } from './geo';

type LocationModule = typeof import('expo-location');

/**
 * `expo-location` resolved at first use, never at import.
 *
 * It is a native module: the JavaScript throws the moment it is evaluated in a
 * client whose binary does not contain it — an Expo Go session, or a
 * development build made before the package was added. A static
 * `import * as Location` therefore takes down every module that imports this
 * one, and with it every screen that imports those. Listing detail is one of
 * them, and it has nothing to do with maps.
 *
 * Loading it inside a caught dynamic import keeps that failure local: the hook
 * reports `available: false`, screens hide the controls that would do nothing,
 * and the rest of the app is untouched. Rebuilding the development client is
 * what actually turns the feature on.
 */
let modulePromise: Promise<LocationModule | null> | null = null;

function loadLocation(): Promise<LocationModule | null> {
  if (!modulePromise) {
    modulePromise = import('expo-location').catch(() => null);
  }
  return modulePromise;
}

/**
 * The device's own position, and the permission that gates it.
 *
 * Deliberately quiet on mount: it reads the permission that has already been
 * granted and, only then, fetches a position. It never raises the system
 * prompt by itself — a screen asks for that explicitly through
 * `requestPermission`, at the moment the person pressed something that
 * justifies it. A permission dialog that appears unprompted teaches people to
 * decline.
 *
 * Every field can legitimately stay empty. Location is optional throughout
 * NILYA: selling works without it, the map falls back to a default viewport,
 * and no screen may block on it.
 */
export type LocationState = {
  coords: Coordinates | null;
  /** "Khartoum, Sudan", reverse-geocoded. Null when it could not be resolved. */
  label: string | null;
  /** The city alone, for `listings.city`. */
  city: string | null;
  /** ISO 3166-1 alpha-2, for `listings.country_code`. */
  countryCode: string | null;
  /**
   * False when this build has no location module at all. Screens use it to
   * omit controls that could not work rather than render dead ones.
   */
  available: boolean;
  permissionGranted: boolean;
  /** True once the permission has been asked for and refused. */
  permissionDenied: boolean;
  loading: boolean;
  /** Set when a fix was attempted and failed, so a screen can say why. */
  error: string | null;
  requestPermission: () => Promise<void>;
  refreshLocation: () => Promise<void>;
};

type Resolved = {
  coords: Coordinates;
  label: string | null;
  city: string | null;
  countryCode: string | null;
};

const UNAVAILABLE = 'Location needs a new build of the app. You can still enter a city.';

/**
 * Turn a fix into the words the app stores.
 *
 * Reverse geocoding is best-effort: it needs a network on some platforms and
 * returns nothing over open water. A failure leaves the coordinates intact and
 * the label null rather than inventing a place name.
 */
async function describe(module: LocationModule, coords: Coordinates): Promise<Resolved> {
  try {
    const [place] = await module.reverseGeocodeAsync(coords);
    const city = place?.city?.trim() || place?.subregion?.trim() || place?.region?.trim() || null;
    const countryCode = place?.isoCountryCode?.trim().toUpperCase() || null;

    return { coords, city, countryCode, label: formatProfileLocation(city, countryCode) };
  } catch {
    return { coords, city: null, countryCode: null, label: null };
  }
}

export function useLocation(): LocationState {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Guards every setState against a screen that has already unmounted, and
     against a second fix landing after a newer one. */
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const apply = useCallback((resolved: Resolved) => {
    if (!alive.current) return;
    setCoords(resolved.coords);
    setLabel(resolved.label);
    setCity(resolved.city);
    setCountryCode(resolved.countryCode);
    setError(null);
  }, []);

  const locate = useCallback(
    async (module: LocationModule) => {
      try {
        const position = await module.getCurrentPositionAsync({
          accuracy: module.Accuracy.Balanced,
        });
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (!isCoordinates(next)) {
          if (alive.current) setError('That position could not be read.');
          return;
        }
        apply(await describe(module, next));
      } catch {
        if (alive.current) setError('Your location could not be found. Try again, or enter a city.');
      }
    },
    [apply]
  );

  useEffect(() => {
    void (async () => {
      const module = await loadLocation();
      if (!alive.current) return;

      if (!module) {
        setAvailable(false);
        setLoading(false);
        return;
      }

      try {
        const permission = await module.getForegroundPermissionsAsync();
        if (!alive.current) return;
        setPermissionGranted(permission.granted);
        /* `canAskAgain` false means the person refused for good, which is a
           different state from simply not having been asked yet. */
        setPermissionDenied(!permission.granted && !permission.canAskAgain);
        if (permission.granted) await locate(module);
      } catch {
        /* The module loaded but the platform refused it — treated as "no
           permission", which every screen already handles. */
      } finally {
        if (alive.current) setLoading(false);
      }
    })();
  }, [locate]);

  const requestPermission = useCallback(async () => {
    const module = await loadLocation();
    if (!alive.current) return;
    if (!module) {
      setAvailable(false);
      setError(UNAVAILABLE);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const permission = await module.requestForegroundPermissionsAsync();
      if (!alive.current) return;
      setPermissionGranted(permission.granted);
      setPermissionDenied(!permission.granted);
      if (permission.granted) await locate(module);
    } catch {
      if (alive.current) setError('Location is not available on this device.');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [locate]);

  const refreshLocation = useCallback(async () => {
    if (!permissionGranted) {
      await requestPermission();
      return;
    }
    const module = await loadLocation();
    if (!alive.current) return;
    if (!module) {
      setAvailable(false);
      setError(UNAVAILABLE);
      return;
    }

    setLoading(true);
    await locate(module);
    if (alive.current) setLoading(false);
  }, [permissionGranted, requestPermission, locate]);

  return {
    coords,
    label,
    city,
    countryCode,
    available,
    permissionGranted,
    permissionDenied,
    loading,
    error,
    requestPermission,
    refreshLocation,
  };
}

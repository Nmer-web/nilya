import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

/**
 * The Supabase client for the mobile app.
 *
 * Only ever the PUBLISHABLE key here. It is safe in a shipped bundle because
 * every table is behind RLS — the key identifies the project, it does not
 * grant access. The service-role key, the Stripe secret and the webhook
 * secret are server-side only and must never appear in this codebase.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'Missing Supabase configuration. Copy .env.example to .env and set ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart the dev server ' +
      '(EXPO_PUBLIC_* values are inlined at build time, so a reload is not enough).'
  );
}

/**
 * AsyncStorage guarded for server rendering — expo-router prerenders web
 * routes in Node, where there is no window and no storage.
 */
const storage =
  Platform.OS === 'web' && typeof window === 'undefined'
    ? {
        getItem: async () => null,
        setItem: async () => {},
        removeItem: async () => {},
      }
    : AsyncStorage;

export const supabase = createClient(url, publishableKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    /**
     * Native has no address bar for Supabase to read a session out of. The
     * deep link that arrives at sawa://auth-callback is parsed by hand in
     * src/lib/auth-link.ts. On web the fragment really is in the URL, so let
     * the library do it.
     */
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/**
 * autoRefreshToken drives itself off timers, which stop firing when the OS
 * suspends the app. Without this the token can be long expired by the time
 * the user comes back and the first query of the session fails.
 */
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}

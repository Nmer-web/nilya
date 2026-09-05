import { useAsync } from '@/hooks/use-async';
import { ISO_3166_1_ALPHA_2 } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth-store';

const COUNTRY_CODES = new Set(ISO_3166_1_ALPHA_2);

export type SellerLocation = {
  city: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Whether this seller's listings may appear on the map at all. */
  showLocation: boolean;
};

/**
 * The seller's own city and country, read from their profile row.
 *
 * The listing's `city` comes from here, the country pre-fills the pricing
 * step, and the coordinates pre-fill the location step. All of them are the
 * seller's stored profile values, never guessed.
 */
export function useSellerProfile() {
  const { status, user } = useAuth();
  return useAsync<SellerLocation | null>(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('city, country_code, latitude, longitude, show_location')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (error) throw error;
    const row =
      (data as {
        city: string | null;
        country_code: string | null;
        latitude: number | null;
        longitude: number | null;
        show_location: boolean | null;
      } | null) ?? null;
    if (!row) return null;
    const country = (row.country_code ?? '').trim().toUpperCase();
    /* Only a complete pair is usable; the column check makes a half pair
       impossible to store, so this is belt and braces for older rows. */
    const paired = typeof row.latitude === 'number' && typeof row.longitude === 'number';
    return {
      city: row.city,
      countryCode: COUNTRY_CODES.has(country) ? country : null,
      latitude: paired ? row.latitude : null,
      longitude: paired ? row.longitude : null,
      /* The column defaults to true; null can only mean a row read before the
         column existed, which is the same thing. */
      showLocation: row.show_location !== false,
    };
  }, `sell-profile:${status}:${user?.id ?? 'none'}`);
}

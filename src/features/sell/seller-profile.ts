import { useAsync } from '@/hooks/use-async';
import { ISO_3166_1_ALPHA_2 } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth-store';

const COUNTRY_CODES = new Set(ISO_3166_1_ALPHA_2);

export type SellerLocation = { city: string | null; countryCode: string | null };

/**
 * The seller's own city and country, read from their profile row.
 *
 * The listing's `city` comes from here, and the country pre-fills the pricing
 * step. Both are the seller's stored profile values, never guessed.
 */
export function useSellerProfile() {
  const { status, user } = useAuth();
  return useAsync<SellerLocation | null>(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('city, country_code')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (error) throw error;
    const row = (data as { city: string | null; country_code: string | null } | null) ?? null;
    const country = (row?.country_code ?? '').trim().toUpperCase();
    return row ? { city: row.city, countryCode: COUNTRY_CODES.has(country) ? country : null } : null;
  }, `sell-profile:${status}:${user?.id ?? 'none'}`);
}

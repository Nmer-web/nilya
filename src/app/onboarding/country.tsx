import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import {
  OnboardingBottomAction,
  OnboardingEnter,
  OnboardingHeader,
  OnboardingTitle,
  SelectionRow,
} from '@/components/onboarding-ui';
import { T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import {
  canNameCountries,
  countryName,
  flagOf,
  isRealCountryCode,
  SUGGESTED_COUNTRIES,
} from '@/lib/countries';
import { useOnboarding } from '@/lib/onboarding';
import { fetchDeliveryOptions, updateProfile } from '@/lib/mutations';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space } from '@/theme/tokens';

/**
 * Where the member is based.
 *
 * The list is short on purpose, and the reason is architectural rather than
 * editorial: nothing in the runtime can enumerate ISO country codes, so a
 * 250-row list would mean bundling a country dataset. Instead the screen shows
 * the suggested set plus any country SAWA actually delivers to, and anything
 * else is reachable by typing its two-letter code — which `Intl` then names.
 * See `lib/countries.ts` for why that is the shape.
 *
 * The value stored is always the alpha-2 code, because `profiles.country_code`
 * is `char(2)` and the delivery ladder is looked up by it.
 */
export default function Country() {
  const router = useRouter();
  const onboarding = useOnboarding();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = picked ?? onboarding.country;

  /*
   * The countries SAWA ships to, from `delivery_options` — real rows, not a
   * guess at where the marketplace operates. '**' is the international
   * fallback ladder rather than a place, so it is filtered out.
   */
  const shipsTo = useAsync(async () => {
    const rows = await fetchDeliveryOptions('**');
    return rows.map((r) => r.country_code).filter((c) => /^[A-Z]{2}$/.test(c));
  }, 'countries:ships-to');

  const codes = useMemo(() => {
    const merged = [...SUGGESTED_COUNTRIES, ...(shipsTo.data ?? [])];
    if (selected) merged.push(selected);
    return [...new Set(merged.map((c) => c.toUpperCase()))];
  }, [shipsTo.data, selected]);

  /**
   * Matches on name or code. A two-letter query that names a real region is
   * offered even when it is not in the list — the only route to a country the
   * app has no way to enumerate.
   */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return codes;

    const matches = codes.filter(
      (code) => countryName(code).toLowerCase().includes(q) || code.toLowerCase().includes(q)
    );

    const typed = query.trim().toUpperCase();
    if (typed.length === 2 && !matches.includes(typed) && isRealCountryCode(typed)) {
      return [typed, ...matches];
    }
    return matches;
  }, [codes, query]);

  const cont = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      onboarding.setCountry(selected);
      /*
       * Written to the profile only when there is one. The country step runs
       * before the account exists on a first run, so the value waits in the
       * onboarding store and the profile step commits it.
       */
      if (user) await updateProfile({ countryCode: selected });
      router.push('/sign-up');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your country.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <OnboardingHeader step={2} onSkip={() => router.push('/sign-up')} />

      <OnboardingEnter>
        <OnboardingTitle
          title="Where are you based?"
          subtitle="This helps us show relevant products and delivery options."
        />

        <View style={{ paddingHorizontal: space.gutter, paddingBottom: space.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              height: 52,
              borderRadius: radius.lg,
              backgroundColor: C.surface,
              paddingHorizontal: 15,
            }}
          >
            <Icon name="search" size={18} color={C.textSecondary} strokeWidth={1.8} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search countries"
              placeholderTextColor={C.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search countries"
              style={{ flex: 1, minWidth: 0, fontSize: 15, color: C.text, padding: 0 }}
            />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space['3xl'], gap: 8 }}
        >
          {!canNameCountries() && (
            /* Honest rather than silent: without Intl the rows below show codes
               instead of names, and the reader should know why. */
            <T size={12.5} color={C.textSecondary} lh={18} style={{ paddingBottom: space.sm }}>
              Country names are unavailable on this device, so codes are shown instead.
            </T>
          )}

          {!query && (
            <T w={500} size={12.5} color={C.textSecondary} style={{ paddingBottom: 2 }}>
              Suggested
            </T>
          )}

          {results.length === 0 ? (
            <View style={{ paddingTop: space.xl, alignItems: 'center', gap: 6 }}>
              <T w={600} size={15}>
                No match
              </T>
              <T size={13.5} color={C.textSecondary} lh={20} style={{ textAlign: 'center' }}>
                Try a different name, or type the two-letter country code — JP for Japan, NG for
                Nigeria.
              </T>
            </View>
          ) : (
            <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
              {results.map((code) => (
                <SelectionRow
                  key={code}
                  label={`${flagOf(code)}  ${countryName(code)}`}
                  sub={code}
                  selected={selected === code}
                  onPress={() => setPicked(code)}
                />
              ))}
            </View>
          )}

          {!!error && (
            <T size={12.5} color={C.error} style={{ paddingTop: space.md }}>
              {error}
            </T>
          )}
        </ScrollView>
      </OnboardingEnter>

      <OnboardingBottomAction
        label={saving ? 'Saving…' : 'Continue'}
        disabled={!selected || saving}
        onPress={cont}
      />
    </KeyboardAvoidingView>
  );
}

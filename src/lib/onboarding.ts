import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Onboarding state that has nowhere else to live.
 *
 * Three things are kept here rather than in Postgres, and the reason is the
 * same for each: the schema has no column for them and inventing one is not
 * this task's to do.
 *
 *   language   — no `profiles.language`. Stored locally and treated as a device
 *                preference. Note that nothing is translated yet, so this
 *                records a choice rather than applying one.
 *   categories — `follows` is profile→profile; there is no user↔category table.
 *                Selections personalise the local first run only.
 *   completed  — no `profiles.onboarded_at`. A device flag, which is the right
 *                shape anyway: onboarding is a first-run experience per install.
 *
 * `country` is the one hybrid. It IS a real column (`profiles.country_code`),
 * but the country step runs before an account exists, so there is no row to
 * write it to yet. It is held here until a session exists and then written to
 * the profile — local as a staging area, not as the source of truth.
 *
 * Name and avatar are not here at all: both steps run after authentication and
 * go straight to `profiles`.
 */

const KEY = 'sawa.onboarding.v1';

export type LanguageCode = 'en' | 'fr' | 'ar';

export const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
];

export type OnboardingState = {
  language: LanguageCode | null;
  /** ISO 3166-1 alpha-2, staged until it can be written to `profiles`. */
  country: string | null;
  /** Category slugs from the real `categories` table, chosen at first run. */
  categories: string[];
  completed: boolean;
};

const EMPTY: OnboardingState = { language: null, country: null, categories: [], completed: false };

async function read(): Promise<OnboardingState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      language: parsed.language ?? null,
      country: parsed.country ?? null,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      completed: parsed.completed === true,
    };
  } catch {
    /* A corrupt or unreadable value is treated as a fresh install rather than
       crashing the first screen the app ever shows. */
    return EMPTY;
  }
}

async function write(next: OnboardingState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Storage full or unavailable: the flow still works for this session, the
       person just sees the welcome again next launch. Not worth an error. */
  }
}

/**
 * Reads the stored state once and exposes writers.
 *
 * `loading` matters: the root navigator must not decide between onboarding and
 * the app until this has resolved, or a returning user gets a flash of the
 * welcome screen before it corrects itself.
 */
export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await read();
      if (cancelled) return;
      setState(stored);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      void write(next);
      return next;
    });
  }, []);

  return {
    ...state,
    loading,
    setLanguage: useCallback((language: LanguageCode) => update({ language }), [update]),
    setCountry: useCallback((country: string) => update({ country: country.toUpperCase() }), [update]),
    setCategories: useCallback((categories: string[]) => update({ categories }), [update]),
    complete: useCallback(() => update({ completed: true }), [update]),
  };
}

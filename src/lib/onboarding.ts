import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The first-run record, and the reasons each field lives on the device.
 *
 *   language   — no `profiles.language`, and no settings table anywhere in the
 *                schema. A genuine device preference. Nothing is translated yet,
 *                so this records a choice rather than applying one, and the step
 *                says so.
 *   country    — the one hybrid. It IS a real column (`profiles.country_code`),
 *                but the country step runs before an account exists, so there is
 *                no row to write it to yet. Held here until a session exists and
 *                the profile step commits it: a staging area, not the source of
 *                truth. After that commit the account is authoritative and this
 *                value is not read again.
 *   completed  — no `profiles.onboarded_at`. A device flag, which is the right
 *                shape anyway: onboarding is a first-run experience per install,
 *                and it is what the root navigator reads to decide whether to
 *                open the flow at all.
 *
 * Name, city and avatar are not here at all: all three are written straight to
 * `profiles` by the step that collects them, which runs after authentication.
 *
 * REMOVED — `categories`. Earlier builds stored chosen interests here. There is
 * no member-to-category relation anywhere in the schema (`follows` is
 * profile→profile, `favorites` is user→listing, `categories` has no join
 * table), so a stored interest could not reach the account, could not survive a
 * reinstall, and personalised nothing. Keeping it would have been exactly the
 * "parallel local store standing in for a column" the constitution forbids, so
 * the step was removed rather than dressed up. `readOnboarding` still tolerates
 * the key in records written by those earlier builds and discards it.
 *
 * This module is storage and constants only. The live state is a provider —
 * see `store/onboarding-store.tsx` — because the root navigator and the steps
 * have to agree on `completed`, and a hook that each caller instantiates
 * separately would leave the navigator reading a stale copy of it.
 */

// Compatibility identifier: changing this would replay onboarding for existing installs.
const KEY = 'sawa.onboarding.v1';

export type LanguageCode = 'en' | 'fr' | 'ar';

/**
 * The languages offered, each named in its own script with the English name
 * beneath — a reader who cannot read the current interface language can still
 * find their own.
 */
export const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
];

export type OnboardingState = {
  language: LanguageCode | null;
  /** ISO 3166-1 alpha-2, staged until it can be written to `profiles`. */
  country: string | null;
  completed: boolean;
};

export const EMPTY_ONBOARDING: OnboardingState = {
  language: null,
  country: null,
  completed: false,
};

export async function readOnboarding(): Promise<OnboardingState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_ONBOARDING;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    /* Read field by field rather than spreading: a record written by an earlier
       build carries a `categories` array that no longer has an owner, and
       spreading would carry it back into state and straight out to storage. */
    return {
      language: parsed.language ?? null,
      country: parsed.country ?? null,
      completed: parsed.completed === true,
    };
  } catch {
    /* A corrupt or unreadable value is treated as a fresh install rather than
       crashing the first screen the app ever shows. */
    return EMPTY_ONBOARDING;
  }
}

export async function writeOnboarding(next: OnboardingState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Storage full or unavailable: the flow still works for this session, the
       person just sees the first run again next launch. Not worth an error. */
  }
}

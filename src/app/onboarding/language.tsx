import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  OnboardingBottomAction,
  OnboardingEnter,
  OnboardingHeader,
  OnboardingTitle,
  SelectionRow,
} from '@/components/onboarding-ui';
import { LANGUAGES, useOnboarding, type LanguageCode } from '@/lib/onboarding';
import { color as C, space } from '@/theme/tokens';

/**
 * Language choice.
 *
 * Stored on the device, not the profile: `profiles` has no language column and
 * inventing one is not this screen's to do. The store is the same AsyncStorage
 * record that holds the rest of the first-run state.
 *
 * What this does NOT do is translate the app — there is no i18n layer yet, so
 * the choice is recorded and applied later rather than taking effect now. The
 * subtitle promises Settings rather than an immediate change, which is the only
 * honest thing it can say today.
 */
export default function Language() {
  const router = useRouter();
  const onboarding = useOnboarding();

  /* Local until Continue, so a stray tap does not rewrite storage on every
     press — and so the row reflects the choice instantly regardless of I/O. */
  const [picked, setPicked] = useState<LanguageCode | null>(null);
  const selected = picked ?? onboarding.language;

  const cont = () => {
    if (selected) onboarding.setLanguage(selected);
    /*
     * Country is the next step and does not exist yet, so this goes to the
     * account screen — a real route rather than a dead one. `/onboarding/country`
     * slots in ahead of it the moment that screen is built.
     */
    router.push('/sign-up');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <OnboardingHeader step={1} onSkip={() => router.push('/sign-up')} />

      <OnboardingEnter>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: space['3xl'] }}
        >
          <OnboardingTitle
            title="Choose your language"
            subtitle="You can change this later in Settings."
          />

          <View
            accessibilityRole="radiogroup"
            style={{ paddingHorizontal: space.gutter, gap: 10 }}
          >
            {LANGUAGES.map((language) => (
              <SelectionRow
                key={language.code}
                /* The name in its own script, with the English name beneath —
                   a reader who cannot read the current interface language can
                   still find their own. */
                label={language.native}
                sub={language.native === language.label ? undefined : language.label}
                selected={selected === language.code}
                onPress={() => setPicked(language.code)}
              />
            ))}
          </View>
        </ScrollView>
      </OnboardingEnter>

      <OnboardingBottomAction label="Continue" disabled={!selected} onPress={cont} />
    </View>
  );
}

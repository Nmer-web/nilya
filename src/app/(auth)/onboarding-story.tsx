import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NilyaIcon } from '@/components/brand';
import { ImageSlot } from '@/components/image-slot';
import { StepProgress } from '@/components/onboarding-ui';
import { Button, T, Tap } from '@/components/ui';
import { color as C, elevation, radius, space, touch } from '@/theme/tokens';

const STEPS = ['discover', 'connect', 'sell'] as const;
type Step = (typeof STEPS)[number];

function isStep(value: string | undefined): value is Step {
  return !!value && (STEPS as readonly string[]).includes(value);
}

const CONFIG: Record<
  Step,
  {
    index: number;
    bg: string;
    fg: string;
    subColor: string;
    progressColor: string;
    progressTrack: string;
    cardTint: string;
    title: string;
    subtitle: string;
  }
> = {
  discover: {
    index: 0,
    bg: '#FFFFFF',
    fg: C.textPrimary,
    subColor: C.textSecondary,
    progressColor: C.primary,
    progressTrack: 'rgba(20,20,19,.12)',
    cardTint: 'rgba(20,20,19,.05)',
    title: 'Everything new,\nin one place.',
    subtitle: 'Fashion to electronics.',
  },
  connect: {
    index: 1,
    bg: '#141413',
    fg: '#FFFFFF',
    subColor: 'rgba(255,255,255,.72)',
    progressColor: '#FFFFFF',
    progressTrack: 'rgba(255,255,255,.28)',
    cardTint: 'rgba(255,255,255,.07)',
    title: 'Connected across\ncommunities.',
    subtitle: 'Sellers near and far.',
  },
  sell: {
    index: 2,
    bg: '#F1F7F5',
    fg: C.textPrimary,
    subColor: C.textSecondary,
    progressColor: C.primary,
    progressTrack: C.primary,
    cardTint: 'rgba(15,110,86,.1)',
    title: 'Sell simply.\nGrow naturally.',
    subtitle: 'Publish. Connect. Grow.',
  },
};

/**
 * One screen for all three story slides (Discover, Connect, Sell) — the
 * design's own logic treats them as one component keyed by step, and
 * duplicating the layout three times would just be three copies to keep in
 * sync. `step` selects copy, color and the next destination.
 *
 * Story imagery stays the app's standard empty ImageSlot wells rather than
 * substituting a photo of unverified rights — drop real editorial
 * photography in later by passing a `source` to the ImageSlots below.
 */
export default function OnboardingStory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { step: rawStep } = useLocalSearchParams<{ step?: string }>();
  const step: Step = isStep(rawStep) ? rawStep : 'discover';
  const cfg = CONFIG[step];

  const skip = () => router.push('/onboarding-welcome');

  const continueToNext = () => {
    if (step === 'discover') {
      router.push({ pathname: '/onboarding-story', params: { step: 'connect' } });
    } else if (step === 'connect') {
      router.push({ pathname: '/onboarding-story', params: { step: 'sell' } });
    } else {
      router.push('/onboarding-welcome');
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: cfg.bg,
        paddingTop: insets.top + space.space16,
        paddingBottom: insets.bottom + space.space24,
        paddingHorizontal: space.gutterRegular,
      }}
    >
      <View style={{ gap: space.space20 }}>
        <StepProgress count={3} filled={cfg.index + 1} color={cfg.progressColor} trackColor={cfg.progressTrack} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <NilyaIcon size={28} mono={step === 'connect'} />
          <Tap
            onPress={skip}
            accessibilityRole="button"
            hitSlop={6}
            style={{ minHeight: touch.minimum, paddingHorizontal: space.space4, justifyContent: 'center' }}
          >
            <T variant="button" color={cfg.fg}>
              Skip
            </T>
          </Tap>
        </View>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: '72%', aspectRatio: 0.72 }}>
          <ImageSlot
            key={`${step}-back-1`}
            role="detail"
            tiny
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: radius.radiusXLarge,
              backgroundColor: cfg.cardTint,
              transform: [{ rotate: '-9deg' }, { translateX: -22 }, { translateY: -10 }],
              ...elevation.floating,
            }}
          />
          <ImageSlot
            key={`${step}-back-2`}
            role="detail"
            tiny
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: radius.radiusXLarge,
              backgroundColor: cfg.cardTint,
              transform: [{ rotate: '8deg' }, { translateX: 22 }, { translateY: 6 }],
              ...elevation.floating,
            }}
          />
          <ImageSlot
            key={`${step}-front`}
            role="detail"
            style={{
              position: 'absolute',
              top: '6%',
              left: '6%',
              right: '6%',
              bottom: '6%',
              borderRadius: radius.radiusXLarge,
              ...elevation.floating,
            }}
          />
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: space.space12, paddingTop: space.space20 }}>
        <T variant="display" color={cfg.fg} align="center">
          {cfg.title}
        </T>
        <T variant="body" color={cfg.subColor} align="center" style={{ maxWidth: 330, marginBottom: space.space8 }}>
          {cfg.subtitle}
        </T>

        <Button
          label={step === 'sell' ? 'Get started' : 'Continue'}
          onPress={continueToNext}
          style={{ width: '100%' }}
        />

        {step === 'sell' ? (
          <Tap
            onPress={() => router.push('/sign-in')}
            accessibilityRole="button"
            hitSlop={6}
            style={{ minHeight: touch.minimum, justifyContent: 'center' }}
          >
            <T variant="button" color={C.primary}>
              I already have an account
            </T>
          </Tap>
        ) : null}
      </View>
    </View>
  );
}

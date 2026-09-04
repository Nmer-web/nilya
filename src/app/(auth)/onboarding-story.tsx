import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { T, Tap } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { color as C, duration, easing, font, radius, space, touch } from '@/theme/tokens';

/**
 * The three story slides, one screen.
 *
 * Full-bleed editorial photography with the copy sitting in the bottom third
 * over a dark wash. The photographs are hot-linked from Unsplash at the
 * owner's direction (Unsplash licence: free to use without attribution);
 * nothing on this screen is marketplace data, so Principle II is not in play.
 * Offline, the wash and the copy still render over the dark ground, which is
 * why the ground is dark rather than the app background.
 *
 * Kept as `onboarding-story` so the splash's hand-off and the (auth) layout's
 * screen list are unchanged. The `step` param the splash still sends is
 * honoured as the starting slide; after that the index is local state and
 * swipes move it without pushing routes.
 *
 * DEPARTURES from the requested design, each because the app cannot honour
 * it honestly (constitution, Scope):
 *
 *   "Browse as guest" → "Skip". The root navigator only mounts the (app)
 *   group for a signed-in member who has completed onboarding — there is no
 *   guest mode anywhere in the app, so a control promising one would be a
 *   dead control (Principle V). Skip goes where the story's Skip always went:
 *   the welcome screen with "Create an account" and "Log in".
 *
 *   "Start Shopping" leads to that same welcome screen, not into the app,
 *   for the same reason: shopping starts with an account.
 *
 *   No `onboarding_seen` flag is written here. `completed` already exists
 *   (`lib/onboarding.ts`) and is set by the post-auth `complete` step; writing
 *   it this early would redirect the splash straight to sign-in and skip the
 *   language and country steps for every new install.
 */

const SLIDES = [
  {
    key: 'quality',
    uri: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
    headline: 'Quality Pieces,\nEvery Week.',
    subtitle: 'Fresh drops and new arrivals. Always worth the wait.',
  },
  {
    key: 'craft',
    uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    headline: 'Your Vision,\nOur Craft.',
    subtitle: 'Custom pieces built to your exact taste. No compromises, no settling.',
  },
  {
    key: 'wardrobe',
    uri: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
    headline: 'One Wardrobe,\nHead to Toe.',
    subtitle: 'Clothing, bags, jewelry and accessories. All NILYA, all in one place.',
  },
] as const;

const LAST = SLIDES.length - 1;

/** The splash still navigates here with the old step names. */
const STEP_INDEX: Record<string, number> = { discover: 0, connect: 1, sell: 2 };

/** A drag has to travel this far, or flick this fast, to count as a swipe. */
const SWIPE_DISTANCE = 48;
const SWIPE_VELOCITY = 600;

/** The dark ground the photographs load over. Not a surface token: it exists only under these images. */
const GROUND = '#1A1A1A';
const WASH = ['transparent', 'rgba(0,0,0,0.55)'] as const;

const DOT_SIZE = 6;
const DOT_ACTIVE_WIDTH = 20;

const HEADLINE = {
  /* The brand loads Inter 400/500/600 only, so the requested 700 weight is
     rendered as 600 rather than falling back to the system face. */
  fontFamily: font.semibold,
  fontWeight: '600',
  fontSize: 32,
  lineHeight: 35,
  letterSpacing: -0.5,
} as const;

export default function OnboardingStory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useReducedMotion();
  const { step } = useLocalSearchParams<{ step?: string }>();

  const [index, setIndex] = useState(() => (step && STEP_INDEX[step]) || 0);

  /* Two progress values, not one, because the photograph and the dots move at
     different speeds. Each slide reads its own opacity or width off the
     distance between its position and the current value. */
  const fade = useSharedValue(index);
  const dot = useSharedValue(index);
  const timing = useMemo(
    () => ({ easing: Easing.bezier(...easing.standard) }),
    []
  );

  useEffect(() => {
    fade.set(withTiming(index, { ...timing, duration: reduceMotion ? duration.instant : duration.slow }));
    dot.set(withTiming(index, { ...timing, duration: reduceMotion ? duration.instant : duration.fast }));
  }, [index, fade, dot, timing, reduceMotion]);

  const move = useCallback((delta: number) => {
    setIndex((current) => Math.min(LAST, Math.max(0, current + delta)));
  }, []);

  const finish = useCallback(() => {
    router.push('/onboarding-welcome');
  }, [router]);

  const next = useCallback(() => {
    if (index >= LAST) finish();
    else move(1);
  }, [index, finish, move]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onEnd((event) => {
          'worklet';
          if (event.translationX < -SWIPE_DISTANCE || event.velocityX < -SWIPE_VELOCITY) {
            runOnJS(move)(1);
          } else if (event.translationX > SWIPE_DISTANCE || event.velocityX > SWIPE_VELOCITY) {
            runOnJS(move)(-1);
          }
        }),
    [move]
  );

  const slide = SLIDES[index];
  const last = index === LAST;

  return (
    <View style={{ flex: 1, backgroundColor: GROUND }}>
      <StatusBar style="light" />

      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          {SLIDES.map((item, i) => (
            <Photograph key={item.key} uri={item.uri} position={i} progress={fade} />
          ))}

          <LinearGradient
            colors={WASH}
            locations={[0, 1]}
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' }}
          />

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: space.space32,
              right: space.space32,
              bottom: insets.bottom + space.space24 + touch.standard + space.space24,
              gap: space.space12,
            }}
          >
            <T
              accessibilityRole="header"
              color={C.textInverse}
              numberOfLines={2}
              style={HEADLINE}
            >
              {slide.headline}
            </T>
            <T variant="body" color="rgba(255,255,255,0.8)" numberOfLines={3}>
              {slide.subtitle}
            </T>
          </View>

          <View
            style={{
              position: 'absolute',
              left: space.space32,
              right: space.space32,
              bottom: insets.bottom + space.space24,
              height: touch.standard,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Tap
              onPress={finish}
              accessibilityRole="button"
              accessibilityLabel="Skip the introduction"
              hitSlop={8}
              style={{ minHeight: touch.minimum, justifyContent: 'center', paddingRight: space.space8 }}
            >
              <T variant="body" color={C.textInverse} style={{ fontSize: 14, lineHeight: 20 }}>
                Skip
              </T>
            </Tap>

            <View
              pointerEvents="none"
              accessibilityRole="progressbar"
              accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}
              style={[
                StyleSheet.absoluteFill,
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.space8 },
              ]}
            >
              {SLIDES.map((item, i) => (
                <Dot key={item.key} position={i} progress={dot} />
              ))}
            </View>

            <Tap
              onPress={next}
              accessibilityRole="button"
              accessibilityLabel={last ? 'Start shopping' : 'Next slide'}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: C.surface,
                borderRadius: radius.radiusPill,
                paddingVertical: 14,
                paddingHorizontal: space.space24,
                minHeight: touch.standard,
              }}
            >
              <T variant="button" color={C.textPrimary}>
                {last ? 'Start Shopping' : 'Next'}
              </T>
              <View style={{ marginLeft: space.space4 }}>
                <Icon name="chevronRight" size={18} color={C.textPrimary} />
              </View>
            </Tap>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

/**
 * Every photograph stays mounted so the next one is already decoded when the
 * slide changes; only its opacity moves. `transition` handles the first load
 * in from the dark ground.
 */
function Photograph({
  uri,
  position,
  progress,
}: {
  uri: string;
  position: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.abs(progress.value - position)),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Image
        source={{ uri }}
        contentFit="cover"
        transition={duration.slow}
        cachePolicy="memory-disk"
        accessible={false}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function Dot({ position, progress }: { position: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const active = 1 - Math.min(1, Math.abs(progress.value - position));
    return {
      width: DOT_SIZE + (DOT_ACTIVE_WIDTH - DOT_SIZE) * active,
      opacity: 0.4 + 0.6 * active,
    };
  });
  return (
    <Animated.View
      style={[
        { height: DOT_SIZE, borderRadius: radius.radiusPill, backgroundColor: C.textInverse },
        style,
      ]}
    />
  );
}

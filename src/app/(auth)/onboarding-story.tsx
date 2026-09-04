import { Image, type ImageProps } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NilyaIcon, NilyaMark } from '@/components/brand';
import { Icon } from '@/components/icon';
import { PressableScale, T, Tap } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { color as C, duration, easing, font, radius, space, touch, type as typography } from '@/theme/tokens';

/**
 * The onboarding story — the "Nilya Onboarding" design (Claude Design,
 * September 2026) — on one screen.
 *
 * Five slides share one frame: a warm ground with a faint brand watermark,
 * a floating collage of photographs in the top half, and an ink panel with
 * a curved top edge in the bottom half carrying the brand tile, an amber
 * eyebrow, a serif headline, the body copy, the progress dots, and the
 * calls to action. Moving between slides crossfades the collage and the
 * copy; a few photographs drift slowly up and down. Swipes and the dots
 * both move the index, which is local state.
 *
 * Kept as `onboarding-story` so the splash's hand-off and the (auth)
 * layout's screen list are unchanged; the `step` param the splash still
 * sends picks the starting slide.
 *
 * DESTINATIONS. Every control leads to a real screen. "Continue"/"Next"
 * advance; "Explore Nilya" and "Start selling" lead to the welcome screen,
 * because both browsing and selling start with an account (the (app) group
 * only mounts for a signed-in member); "Sign in" and "I already have an
 * account" lead to sign-in. The design's toasts were prototype stand-ins
 * for exactly these navigations.
 *
 * DEPARTURES, each documented where it happens:
 *   - The brand tile is the canonical `NilyaIcon`, not a serif "N" glyph.
 *   - The ground is white rather than the design's #F7F6F3, because the
 *     product cutouts (tech-*) sit on white and the design hid that with
 *     `mix-blend-mode: multiply`, which React Native cannot do.
 *   - Elliptical corner radii (the organic "blob" shapes) are approximated
 *     with circular per-corner radii.
 *
 * IMAGERY. The photographs are the design project's own assets, decorative
 * only (Principle II is not in play). Two of them — `baskets.png` and
 * `vendor.png` — are multi-megabyte files the design tool refuses to serve
 * in full, so `vendor.webp` (the same vendor photograph from the September
 * export) stands in for both. To restore the design exactly, drop the two
 * files into `assets/images/onboarding/` and repoint the two `PHOTO`
 * entries below; nothing else changes.
 */

type Photo = ImageProps['source'];

const PHOTO = {
  /* STAND-IN: the design's baskets.png could not be fetched (see header). */
  baskets: require('../../../assets/images/onboarding/vendor.webp') as Photo,
  coffee: require('../../../assets/images/onboarding/coffee.jpg') as Photo,
  jalabiya: require('../../../assets/images/onboarding/jalabiya.jpg') as Photo,
  portrait: require('../../../assets/images/onboarding/portrait.jpg') as Photo,
  shoes: require('../../../assets/images/onboarding/shoes.jpg') as Photo,
  sweater: require('../../../assets/images/onboarding/sweater.jpg') as Photo,
  techA: require('../../../assets/images/onboarding/tech-a.webp') as Photo,
  techB: require('../../../assets/images/onboarding/tech-b.jpg') as Photo,
  techC: require('../../../assets/images/onboarding/tech-c.webp') as Photo,
  techD: require('../../../assets/images/onboarding/tech-d.webp') as Photo,
  toub: require('../../../assets/images/onboarding/toub.webp') as Photo,
  /* STAND-IN: the design's vendor.png could not be fetched (see header). */
  vendor: require('../../../assets/images/onboarding/vendor.webp') as Photo,
} as const;

/** The design frame the collage is authored in; it is scaled to fit the device. */
const FRAME = { width: 393, collage: 480 };

/**
 * The panel's curved top edge drops this far from the centre to the sides
 * at the design width. It is drawn as one huge circle, so the arc is
 * shallow: R = (w²/4 + d²) / 2d.
 */
const ARC_DROP = 68;

type Shape =
  | { kind: 'round'; radius: number }
  | { kind: 'circle' }
  | { kind: 'corners'; radii: [number, number, number, number] }
  /** CSS `border-radius: x1 x2 x3 x4 / y1 y2 y3 y4` in percent, per corner clockwise from top-left. */
  | { kind: 'blob'; x: [number, number, number, number]; y: [number, number, number, number] };

type Piece =
  | {
      kind: 'photo';
      photo: Photo;
      left: number;
      top: number;
      width: number;
      height: number;
      rotate: number;
      fit: 'cover' | 'contain';
      /** CSS object-position, as percentages across and down. */
      focus?: [number, number];
      shape?: Shape;
      shadow?: string;
      blur?: number;
      opacity?: number;
      float?: 'up' | 'down';
    }
  | { kind: 'ring'; left: number; top: number; width: number; height: number; opacity: number; arch?: boolean }
  /** A soft pool of shadow under a cutout. */
  | { kind: 'ground'; left: number; top: number; width: number; height: number; alpha: number };

type Slide = {
  key: string;
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  secondary?: { label: string; to: 'signIn' | 'welcome' };
  pieces: Piece[];
};

const SHADOW_SOFT = '0 16px 24px rgba(20,20,19,0.18)';
const SHADOW_MID = '0 18px 26px rgba(20,20,19,0.20)';
const SHADOW_HERO = '0 26px 34px rgba(20,20,19,0.22)';
const SHADOW_DEEP = '0 30px 40px rgba(20,20,19,0.26)';
const SHADOW_FAINT = '0 14px 20px rgba(20,20,19,0.14)';

const SLIDES: readonly Slide[] = [
  {
    key: 'welcome',
    eyebrow: 'Welcome to Nilya',
    headline: 'One marketplace.\nMany possibilities.',
    body: 'Discover products, food, perfumes, jobs, and services from independent sellers and professionals in your community.',
    cta: 'Continue',
    secondary: { label: 'Sign in', to: 'signIn' },
    pieces: [
      { kind: 'photo', photo: PHOTO.coffee, left: -24, top: 296, width: 158, height: 138, rotate: 6, fit: 'cover', focus: [44, 60], shape: { kind: 'round', radius: 24 }, shadow: SHADOW_SOFT },
      { kind: 'ground', left: 238, top: 172, width: 124, height: 26, alpha: 0.2 },
      { kind: 'photo', photo: PHOTO.techA, left: 230, top: 36, width: 140, height: 140, rotate: 8, fit: 'contain', float: 'down' },
      { kind: 'photo', photo: PHOTO.baskets, left: 58, top: 112, width: 268, height: 268, rotate: -4, fit: 'cover', focus: [50, 44], shape: { kind: 'circle' }, shadow: SHADOW_HERO, float: 'up' },
      { kind: 'ring', left: 44, top: 98, width: 296, height: 296, opacity: 0.5 },
      { kind: 'photo', photo: PHOTO.sweater, left: 250, top: 262, width: 150, height: 176, rotate: 9, fit: 'cover', focus: [52, 34], shape: { kind: 'blob', x: [56, 44, 46, 54], y: [48, 54, 46, 52] }, shadow: SHADOW_SOFT },
    ],
  },
  {
    key: 'buyers',
    eyebrow: 'For buyers',
    headline: 'Find what matters\nto you',
    body: 'Explore unique products, compare sellers, save your favourites, and connect directly before you buy.',
    cta: 'Next',
    pieces: [
      { kind: 'photo', photo: PHOTO.toub, left: -34, top: 26, width: 158, height: 186, rotate: -9, fit: 'cover', focus: [52, 40], shape: { kind: 'blob', x: [62, 38, 54, 46], y: [48, 62, 38, 52] }, shadow: '0 16px 22px rgba(20,20,19,0.16)' },
      { kind: 'photo', photo: PHOTO.portrait, left: 252, top: 268, width: 104, height: 126, rotate: 5, fit: 'cover', focus: [50, 32], shape: { kind: 'corners', radii: [52, 52, 16, 16] }, shadow: SHADOW_FAINT, blur: 1.4, opacity: 0.78 },
      { kind: 'photo', photo: PHOTO.baskets, left: 52, top: 108, width: 284, height: 284, rotate: -4, fit: 'cover', focus: [50, 44], shape: { kind: 'circle' }, shadow: SHADOW_HERO, float: 'up' },
      { kind: 'ring', left: 38, top: 94, width: 312, height: 312, opacity: 0.5 },
      { kind: 'photo', photo: PHOTO.shoes, left: 210, top: 30, width: 164, height: 142, rotate: 9, fit: 'cover', focus: [50, 60], shape: { kind: 'round', radius: 26 }, shadow: SHADOW_MID, float: 'down' },
      { kind: 'photo', photo: PHOTO.jalabiya, left: -26, top: 300, width: 172, height: 150, rotate: 6, fit: 'cover', focus: [40, 45], shape: { kind: 'round', radius: 24 }, shadow: '0 16px 24px rgba(20,20,19,0.15)' },
    ],
  },
  {
    key: 'sellers',
    eyebrow: 'For sellers',
    headline: 'Turn what you offer\ninto opportunity',
    body: 'List your products or services, reach more buyers, manage enquiries, and grow your presence—all from one place.',
    cta: 'Next',
    pieces: [
      { kind: 'photo', photo: PHOTO.coffee, left: 206, top: 30, width: 172, height: 150, rotate: 8, fit: 'cover', focus: [44, 62], shape: { kind: 'round', radius: 26 }, shadow: '0 18px 26px rgba(20,20,19,0.22)', float: 'down' },
      { kind: 'photo', photo: PHOTO.sweater, left: -32, top: 256, width: 170, height: 196, rotate: -7, fit: 'cover', focus: [52, 34], shape: { kind: 'blob', x: [56, 44, 46, 54], y: [48, 54, 46, 52] }, shadow: SHADOW_SOFT },
      { kind: 'photo', photo: PHOTO.vendor, left: 70, top: 54, width: 252, height: 344, rotate: -2, fit: 'cover', focus: [50, 24], shape: { kind: 'corners', radii: [126, 126, 28, 28] }, shadow: SHADOW_DEEP, float: 'up' },
      { kind: 'ring', left: 58, top: 42, width: 276, height: 112, opacity: 0.45, arch: true },
    ],
  },
  {
    key: 'marketplace',
    eyebrow: 'Complete marketplace',
    headline: 'More than shopping',
    body: 'Buy local products, discover job opportunities, find trusted services, or start selling something of your own.',
    cta: 'Next',
    /* The design blends these white-backed cutouts onto the ground with
       `mix-blend-mode: multiply`, so its ring and shadow pools show through
       the boxes. Without blending the boxes would hide them, so here the
       pools and the ring are drawn last — they never cross the products
       themselves, only the white around them. */
    pieces: [
      { kind: 'photo', photo: PHOTO.techD, left: 10, top: 36, width: 166, height: 142, rotate: -7, fit: 'contain' },
      { kind: 'photo', photo: PHOTO.techB, left: 206, top: 92, width: 162, height: 142, rotate: 8, fit: 'contain', float: 'down' },
      { kind: 'photo', photo: PHOTO.techA, left: 66, top: 118, width: 226, height: 226, rotate: -3, fit: 'contain', float: 'up' },
      { kind: 'photo', photo: PHOTO.techC, left: -2, top: 288, width: 144, height: 128, rotate: 5, fit: 'contain' },
      { kind: 'ground', left: 18, top: 174, width: 150, height: 26, alpha: 0.18 },
      { kind: 'ground', left: 212, top: 226, width: 150, height: 28, alpha: 0.2 },
      { kind: 'ground', left: 86, top: 336, width: 186, height: 34, alpha: 0.22 },
      { kind: 'ground', left: -4, top: 412, width: 140, height: 26, alpha: 0.18 },
      { kind: 'ring', left: 56, top: 132, width: 246, height: 246, opacity: 0.4 },
    ],
  },
  {
    key: 'ready',
    eyebrow: "You're all set",
    headline: 'Your marketplace\nstarts here',
    body: "One Nilya account lets you buy and sell. Explore the marketplace now or publish your first listing when you're ready.",
    cta: 'Explore Nilya',
    secondary: { label: 'Start selling', to: 'welcome' },
    pieces: [
      { kind: 'photo', photo: PHOTO.portrait, left: 8, top: 20, width: 112, height: 112, rotate: -6, fit: 'cover', focus: [50, 30], shape: { kind: 'circle' }, shadow: SHADOW_FAINT, blur: 1.2, opacity: 0.72 },
      { kind: 'photo', photo: PHOTO.toub, left: 56, top: 52, width: 288, height: 340, rotate: -3, fit: 'cover', focus: [48, 42], shape: { kind: 'blob', x: [52, 48, 44, 56], y: [38, 40, 60, 62] }, shadow: '0 30px 40px rgba(20,20,19,0.24)', float: 'up' },
      { kind: 'photo', photo: PHOTO.baskets, left: -44, top: 290, width: 164, height: 164, rotate: 6, fit: 'cover', focus: [50, 44], shape: { kind: 'circle' }, shadow: SHADOW_SOFT },
      { kind: 'ring', left: -54, top: 280, width: 184, height: 184, opacity: 0.45 },
      { kind: 'photo', photo: PHOTO.shoes, left: 216, top: 288, width: 152, height: 132, rotate: -10, fit: 'cover', focus: [50, 62], shape: { kind: 'round', radius: 24 }, shadow: SHADOW_MID, float: 'down' },
    ],
  },
];

const LAST = SLIDES.length - 1;

/** The splash still navigates here with the old step names. */
const STEP_INDEX: Record<string, number> = { discover: 0, connect: 1, sell: 2 };

/** A drag has to travel this far, or flick this fast, to count as a swipe. */
const SWIPE_DISTANCE = 44;
const SWIPE_VELOCITY = 600;

/**
 * The drift: some photographs rise 9px and others sink 7px, each over a
 * long, slow cycle. Deliberately slower than the motion tokens — it is
 * ambience, not a transition — and off entirely under reduced motion.
 */
const DRIFT_UP = { travel: -9, period: 7500 };
const DRIFT_DOWN = { travel: 7, period: 9500 };

/** The copy rises this far as its slide arrives. */
const RISE = 12;

const EYEBROW = {
  fontFamily: font.semibold,
  fontWeight: '600',
  fontSize: 11,
  lineHeight: 14,
  letterSpacing: 2.2,
  textTransform: 'uppercase',
} as const;

/**
 * The design sets its headline in a serif — the one place the app does.
 * Georgia ships with iOS; Android substitutes its system serif. Nothing is
 * bundled, and the rest of the screen stays on Inter.
 */
const HEADLINE = {
  fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  fontWeight: '700',
  fontSize: 26,
  lineHeight: 31,
  letterSpacing: -0.4,
} as const;

const BODY = { ...typography.metadata, lineHeight: 20 } as const;

/** Panel copy on ink: the palette's faint ink clears 6:1 here. */
const PANEL_MUTED = C.inkFaint;

export default function OnboardingStory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { reduceMotion, allowRepeat } = useReducedMotion();
  const { step } = useLocalSearchParams<{ step?: string }>();

  const [index, setIndex] = useState(() => {
    if (!step) return 0;
    const named = STEP_INDEX[step];
    const parsed = named ?? Number.parseInt(step, 10);
    return Number.isInteger(parsed) ? Math.max(0, Math.min(LAST, parsed)) : 0;
  });
  const [panelHeight, setPanelHeight] = useState(0);

  const progress = useSharedValue(index);
  const driftUp = useSharedValue(0);
  const driftDown = useSharedValue(0);
  const timing = useMemo(() => ({ easing: Easing.bezier(...easing.standard) }), []);

  useEffect(() => {
    progress.set(withTiming(index, { ...timing, duration: reduceMotion ? duration.instant : duration.slow }));
  }, [index, progress, timing, reduceMotion]);

  useEffect(() => {
    if (!allowRepeat) {
      driftUp.set(0);
      driftDown.set(0);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    driftUp.set(withRepeat(withTiming(1, { duration: DRIFT_UP.period / 2, easing: ease }), -1, true));
    driftDown.set(withRepeat(withTiming(1, { duration: DRIFT_DOWN.period / 2, easing: ease }), -1, true));
  }, [allowRepeat, driftUp, driftDown]);

  const toWelcome = useCallback(() => router.push('/onboarding-welcome'), [router]);
  const toSignIn = useCallback(() => router.push('/sign-in'), [router]);

  const go = useCallback((next: number) => setIndex(Math.max(0, Math.min(LAST, next))), []);
  const advance = useCallback(() => {
    if (index >= LAST) toWelcome();
    else go(index + 1);
  }, [index, go, toWelcome]);
  const retreat = useCallback(() => go(index - 1), [index, go]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onEnd((event) => {
          'worklet';
          if (event.translationX < -SWIPE_DISTANCE || event.velocityX < -SWIPE_VELOCITY) {
            runOnJS(advance)();
          } else if (event.translationX > SWIPE_DISTANCE || event.velocityX > SWIPE_VELOCITY) {
            runOnJS(retreat)();
          }
        }),
    [advance, retreat]
  );

  const current = SLIDES[index];
  const onSecondary = current.secondary?.to === 'signIn' ? toSignIn : toWelcome;

  /* The collage is laid out in the design frame and scaled uniformly into
     whatever the panel leaves free, so the composition survives every
     screen size. */
  const stageHeight = Math.max(0, height - panelHeight);
  const scale = Math.min(width / FRAME.width, stageHeight / FRAME.collage);

  /* The arc: a circle wide enough that its top edge drops ARC_DROP (scaled)
     from the centre to the screen edges. */
  const drop = ARC_DROP * (width / FRAME.width);
  const arcRadius = (width * width) / 4 / (2 * drop) + drop / 2;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <StatusBar style="dark" />

      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          {/* Watermark: the brand mark, faint, behind everything. */}
          <View pointerEvents="none" style={{ position: 'absolute', top: space.space12, left: 0, right: 0, alignItems: 'center', opacity: 0.04 }}>
            <NilyaMark size={330} decorative />
          </View>

          {panelHeight > 0 ? (
            <View
              pointerEvents="none"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={{
                position: 'absolute',
                left: (width - FRAME.width) / 2,
                top: (stageHeight - FRAME.collage) / 2,
                width: FRAME.width,
                height: FRAME.collage,
                transform: [{ scale }],
              }}
            >
              {SLIDES.map((slide, position) => (
                <CollageLayer
                  key={slide.key}
                  pieces={slide.pieces}
                  position={position}
                  progress={progress}
                  driftUp={driftUp}
                  driftDown={driftDown}
                />
              ))}
            </View>
          ) : null}

          {/* The ink panel. Its background is a separate, oversized rounded view so the top edge is a shallow arc. */}
          <View
            onLayout={(event: LayoutChangeEvent) => {
              const next = Math.round(event.nativeEvent.layout.height);
              if (next !== panelHeight) setPanelHeight(next);
            }}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: width / 2 - arcRadius,
                width: arcRadius * 2,
                height: Math.max(panelHeight, arcRadius) + arcRadius,
                backgroundColor: C.textPrimary,
                borderTopLeftRadius: arcRadius,
                borderTopRightRadius: arcRadius,
              }}
            />

            <View
              style={{
                paddingTop: 42,
                paddingHorizontal: 30,
                paddingBottom: Math.max(21, insets.bottom + space.space12),
              }}
            >
              {/* The design draws a serif "N" in a green tile; the canonical icon carries the same idea. */}
              <NilyaIcon size={32} decorative />

              <CopyStack progress={progress} reduceMotion={reduceMotion} />

              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, minHeight: touch.minimum - 20 }}
              >
                {SLIDES.map((slide, position) => (
                  <Dot
                    key={slide.key}
                    position={position}
                    progress={progress}
                    selected={position === index}
                    onPress={() => go(position)}
                  />
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space12, marginTop: space.space20 }}>
                <PrimaryPill label={current.cta} onPress={advance} />
                {current.secondary ? <SecondaryPill label={current.secondary.label} onPress={onSecondary} /> : null}
              </View>

              <GuestLink progress={progress} active={index === LAST} onPress={toSignIn} />
            </View>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

/**
 * The five copy blocks, stacked and crossfaded. The stack takes the height
 * of the tallest block so a longer body on a narrow phone never pushes the
 * dots around as the slides change.
 */
function CopyStack({ progress, reduceMotion }: { progress: SharedValue<number>; reduceMotion: boolean }) {
  const [heights, setHeights] = useState<number[]>([]);
  const tallest = Math.max(156, ...heights);

  return (
    <View style={{ marginTop: 14, height: tallest }}>
      {SLIDES.map((slide, position) => (
        <CopyBlock
          key={slide.key}
          slide={slide}
          position={position}
          progress={progress}
          reduceMotion={reduceMotion}
          onHeight={(h) =>
            setHeights((current) => {
              if (current[position] === h) return current;
              const next = current.slice();
              next[position] = h;
              return next;
            })
          }
        />
      ))}
    </View>
  );
}

function CopyBlock({
  slide,
  position,
  progress,
  reduceMotion,
  onHeight,
}: {
  slide: Slide;
  position: number;
  progress: SharedValue<number>;
  reduceMotion: boolean;
  onHeight: (height: number) => void;
}) {
  const style = useAnimatedStyle(() => {
    const arrived = 1 - Math.min(1, Math.abs(progress.value - position));
    return {
      opacity: arrived,
      transform: [{ translateY: reduceMotion ? 0 : RISE * (1 - arrived) }],
    };
  });

  return (
    <Animated.View
      onLayout={(event) => onHeight(Math.ceil(event.nativeEvent.layout.height))}
      style={[{ position: 'absolute', left: 0, right: 0, top: 0 }, style]}
    >
      <T color={C.accent} style={EYEBROW}>
        {slide.eyebrow}
      </T>
      <T accessibilityRole="header" color={C.textInverse} style={[HEADLINE, { marginTop: space.space12 }]}>
        {slide.headline}
      </T>
      <T color={PANEL_MUTED} style={[BODY, { marginTop: 11 }]}>
        {slide.body}
      </T>
    </Animated.View>
  );
}

function Dot({
  position,
  progress,
  selected,
  onPress,
}: {
  position: number;
  progress: SharedValue<number>;
  selected: boolean;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const active = 1 - Math.min(1, Math.abs(progress.value - position));
    return { width: 6 + 18 * active, opacity: 0.35 + 0.65 * active };
  });
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Go to slide ${position + 1} of ${SLIDES.length}`}
      accessibilityState={{ selected }}
      hitSlop={{ top: 14, bottom: 14, left: 3, right: 3 }}
      style={{ paddingVertical: 9 }}
    >
      <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: C.textInverse }, style]} />
    </Tap>
  );
}

function PrimaryPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        minHeight: touch.standard,
        paddingVertical: space.space12,
        paddingHorizontal: 22,
        borderRadius: radius.radiusPill,
        backgroundColor: C.primary,
      }}
    >
      <T variant="button" color={C.textInverse}>
        {label}
      </T>
      <Icon name="chevronRight" size={16} color={C.textInverse} decorative />
      {/* The amber dot the design pins to the button's corner: the one accent on the panel. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent }}
      />
    </PressableScale>
  );
}

function SecondaryPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: touch.standard,
        justifyContent: 'center',
        paddingVertical: space.space12,
        paddingHorizontal: space.space20,
        borderRadius: radius.radiusPill,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.24)',
      }}
    >
      <T variant="button" color={C.textInverse}>
        {label}
      </T>
    </PressableScale>
  );
}

/** Shown only on the last slide, but always laid out so the panel keeps one height. */
function GuestLink({ progress, active, onPress }: { progress: SharedValue<number>; active: boolean; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.abs(progress.value - LAST)),
  }));
  return (
    <Animated.View style={[{ marginTop: space.space4, height: 36, justifyContent: 'center', pointerEvents: active ? 'auto' : 'none' }, style]}>
      <Tap
        onPress={onPress}
        accessibilityRole="button"
        hitSlop={8}
        style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' }}
      >
        <T variant="metadataMedium" color={PANEL_MUTED}>
          I already have an account
        </T>
      </Tap>
    </Animated.View>
  );
}

/** One slide's collage: every piece absolutely placed in the design frame, the whole layer crossfaded. */
function CollageLayer({
  pieces,
  position,
  progress,
  driftUp,
  driftDown,
}: {
  pieces: Piece[];
  position: number;
  progress: SharedValue<number>;
  driftUp: SharedValue<number>;
  driftDown: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.abs(progress.value - position)),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      {pieces.map((piece, i) => {
        if (piece.kind === 'ring') return <Ring key={i} {...piece} />;
        if (piece.kind === 'ground') return <Ground key={i} {...piece} />;
        return <Picture key={i} piece={piece} driftUp={driftUp} driftDown={driftDown} />;
      })}
    </Animated.View>
  );
}

function cornerStyle(shape: Shape | undefined, width: number, height: number): ViewStyle {
  if (!shape) return {};
  switch (shape.kind) {
    case 'round':
      return { borderRadius: shape.radius };
    case 'circle':
      return { borderRadius: Math.min(width, height) / 2 };
    case 'corners':
      return {
        borderTopLeftRadius: shape.radii[0],
        borderTopRightRadius: shape.radii[1],
        borderBottomRightRadius: shape.radii[2],
        borderBottomLeftRadius: shape.radii[3],
      };
    case 'blob': {
      /* Circular radii cannot be elliptical, so each corner takes the
         smaller of its two axes — the closest a native view gets to the
         design's organic outline. */
      const r = (k: number) => Math.min((shape.x[k] / 100) * width, (shape.y[k] / 100) * height);
      return {
        borderTopLeftRadius: r(0),
        borderTopRightRadius: r(1),
        borderBottomRightRadius: r(2),
        borderBottomLeftRadius: r(3),
      };
    }
  }
}

/**
 * Shadow on the outer view, clipping on the inner one, the drift on the
 * outer transform: a single view that clips, casts and moves loses its
 * shadow on Android.
 */
function Picture({
  piece,
  driftUp,
  driftDown,
}: {
  piece: Extract<Piece, { kind: 'photo' }>;
  driftUp: SharedValue<number>;
  driftDown: SharedValue<number>;
}) {
  const corners = cornerStyle(piece.shape, piece.width, piece.height);

  const style = useAnimatedStyle(() => {
    const drift =
      piece.float === 'up'
        ? DRIFT_UP.travel * driftUp.value
        : piece.float === 'down'
          ? DRIFT_DOWN.travel * driftDown.value
          : 0;
    return { transform: [{ rotate: `${piece.rotate}deg` }, { translateY: drift }] };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: piece.left,
          top: piece.top,
          width: piece.width,
          height: piece.height,
          opacity: piece.opacity ?? 1,
          borderCurve: 'continuous',
          ...(piece.shadow ? { boxShadow: piece.shadow } : {}),
        },
        corners,
        style,
      ]}
    >
      <View style={[{ flex: 1, overflow: 'hidden', borderCurve: 'continuous' }, corners]}>
        <Image
          source={piece.photo}
          contentFit={piece.fit}
          contentPosition={piece.focus ? { left: `${piece.focus[0]}%`, top: `${piece.focus[1]}%` } : 'center'}
          blurRadius={piece.blur}
          accessible={false}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </Animated.View>
  );
}

/** A thin amber outline — a full circle, or the top half of one over the vendor. */
function Ring({ left, top, width, height, opacity, arch }: Extract<Piece, { kind: 'ring' }>) {
  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        opacity,
        borderColor: C.accent,
        borderWidth: 2,
        ...(arch
          ? { borderBottomWidth: 0, borderTopLeftRadius: width / 2, borderTopRightRadius: width / 2 }
          : { borderRadius: Math.min(width, height) / 2 }),
      }}
    />
  );
}

/** The soft pool of shadow the design blurs under a cutout: a faint ellipse with a wide, soft edge. */
function Ground({ left, top, width, height, alpha }: Extract<Piece, { kind: 'ground' }>) {
  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: `rgba(20,20,19,${alpha * 0.5})`,
        boxShadow: `0 0 10px 5px rgba(20,20,19,${alpha * 0.45})`,
      }}
    />
  );
}

import { useRouter } from 'expo-router';
import React from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button, T, Tap } from '@/components/ui';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { color as C, radius, space } from '@/theme/tokens';

/** The onboarding steps, in order. Progress is `index / TOTAL`. */
export const ONBOARDING_STEPS = ['language', 'country', 'profile', 'preferences'] as const;

/**
 * Header for an onboarding step: back, a hairline progress bar, and Skip.
 *
 * Progress is a thin rule rather than dots — at four steps dots read as
 * decoration, whereas a bar that fills says how much is left without being
 * counted.
 */
export function OnboardingHeader({
  step,
  onBack,
  onSkip,
  skipLabel = 'Skip',
}: {
  /** 1-based position among ONBOARDING_STEPS, or null for an unnumbered screen. */
  step: number | null;
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const progress = step === null ? 0 : step / ONBOARDING_STEPS.length;

  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: space.gutter }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
        <Tap
          onPress={onBack ?? (() => router.back())}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          style={{ width: 44, height: 44, justifyContent: 'center' }}
        >
          <Icon name="chevronLeft" size={22} color={C.text} strokeWidth={2} />
        </Tap>

        <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: C.surface }}>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ now: Math.round(progress * 100), min: 0, max: 100 }}
            style={{
              width: `${progress * 100}%`,
              height: 3,
              borderRadius: 2,
              backgroundColor: C.text,
            }}
          />
        </View>

        {onSkip ? (
          <Tap
            onPress={onSkip}
            accessibilityRole="button"
            hitSlop={10}
            style={{ minWidth: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' }}
          >
            <T w={500} size={14} color={C.textSecondary}>
              {skipLabel}
            </T>
          </Tap>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>
    </View>
  );
}

/** Title and supporting line, at the size the rest of the app uses for a screen. */
export function OnboardingTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ paddingHorizontal: space.gutter, paddingTop: space.xl, paddingBottom: space.xl }}>
      <T w={600} size={28} tracking={-0.6} lh={34}>
        {title}
      </T>
      {!!subtitle && (
        <T size={15} color={C.textSecondary} lh={22} style={{ paddingTop: space.sm }}>
          {subtitle}
        </T>
      )}
    </View>
  );
}

/**
 * A full-width selectable row.
 *
 * Selection is carried by fill, weight and a tick — never by colour alone, so
 * it survives a screen reader and a colour-blind reader equally.
 */
export function SelectionRow({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useAnimatedValue(1);

  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.98, duration: 90, useNativeDriver: NATIVE_DRIVER }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: NATIVE_DRIVER, tension: 380, friction: 12 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Tap
        onPress={press}
        accessibilityRole="radio"
        /*
         * `aria-checked` rather than `accessibilityState`.
         *
         * Verified in the browser: with `accessibilityState={{ selected }}` —
         * and with `{ checked }` too — the row rendered as role="radio" with no
         * checked attribute at all, so a screen reader announced every language
         * as unselected. The `aria-*` props are the current React Native API and
         * map to `accessibilityState` on iOS and Android, so this is one prop
         * that works on all three.
         */
        aria-checked={selected}
        accessibilityLabel={sub ? `${label}, ${sub}` : label}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 60,
          paddingHorizontal: 18,
          paddingVertical: 14,
          borderRadius: radius.lg,
          backgroundColor: selected ? C.text : C.surface,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={selected ? 600 : 500} size={16} color={selected ? C.primaryText : C.text}>
            {label}
          </T>
          {!!sub && (
            <T size={13} color={selected ? C.primaryText : C.textSecondary} style={{ marginTop: 2, opacity: selected ? 0.75 : 1 }}>
              {sub}
            </T>
          )}
        </View>
        {selected && <Icon name="check" size={19} color={C.primaryText} strokeWidth={2.6} />}
      </Tap>
    </Animated.View>
  );
}

/**
 * The bottom action bar.
 *
 * Pinned rather than scrolling with the content: on a long list the continue
 * button would otherwise sit below the fold and the step would look like it
 * had no way forward.
 */
export function OnboardingBottomAction({
  label,
  onPress,
  disabled,
  secondary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingHorizontal: space.gutter,
        paddingTop: space.md,
        paddingBottom: Math.max(insets.bottom, 12) + 8,
        backgroundColor: C.background,
        borderTopWidth: 1,
        borderTopColor: C.border,
        gap: 10,
      }}
    >
      <Button label={label} height={54} disabled={disabled} onPress={onPress} />
      {secondary}
    </View>
  );
}

/** Fade and rise on mount — the entrance every onboarding screen shares. */
export function OnboardingEnter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.ComponentProps<typeof Animated.View>['style'];
}) {
  const v = useAnimatedValue(0);

  React.useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 280,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [v]);

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

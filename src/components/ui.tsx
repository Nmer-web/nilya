import React, { useEffect } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { NATIVE_DRIVER, useAnimatedValue } from '@/hooks/use-animated-value';
import { tapLight } from '@/lib/haptics';
import { alpha, color as C, font, motion, radius, shadow, type as type_ } from '@/theme/tokens';

/* ─────────────────────────── type ─────────────────────────── */

const WEIGHT = {
  400: '400',
  500: '500',
  600: '600',
  700: '700',
} as const;

type Weight = keyof typeof WEIGHT;

export type TProps = TextProps & {
  /**
   * A real `fontWeight`. The sans stack is the platform's own — SF Pro on iOS,
   * Roboto on Android — which synthesises weights properly, so unlike a
   * multi-file webfont this needs no per-weight family.
   */
  w?: Weight;
  /** Instrument Serif, used only for the SAWA wordmark. */
  serif?: boolean;
  size?: number;
  color?: string;
  /** Shorthand for `letterSpacing`, which the design uses heavily. */
  tracking?: number;
  lh?: number;
  /** Pulls size/weight/tracking from the ramp in one prop. */
  variant?: keyof typeof type_;
};

/** The app's only text component — every string goes through it. */
export function T({ w, serif, size, color, tracking, lh, variant, style, ...rest }: TProps) {
  const ramp = variant ? type_[variant] : undefined;
  const weight = w ?? (ramp?.weight as Weight | undefined) ?? 400;
  const fontSize = size ?? ramp?.size;
  const letter = tracking ?? ramp?.tracking;

  return (
    <RNText
      {...rest}
      style={[
        {
          ...(serif ? { fontFamily: font.serif } : { fontWeight: WEIGHT[weight] }),
          color: color ?? C.text,
          ...(fontSize !== undefined && { fontSize }),
          ...(letter !== undefined && { letterSpacing: letter }),
          ...(lh !== undefined && { lineHeight: lh }),
        },
        style,
      ]}
    />
  );
}

/* ─────────────────────────── press feedback ─────────────────────────── */

/**
 * The prototype relies on hover/`:active` for affordance. On touch the
 * equivalent is a brief opacity dip, applied uniformly here.
 */
export function Tap({ style, children, ...rest }: PressableProps) {
  return (
    <Pressable
      {...rest}
      style={(s) => [
        typeof style === 'function' ? style(s) : style,
        s.pressed && !rest.disabled && { opacity: 0.6 },
      ]}
    >
      {children}
    </Pressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  /** How far to compress. 0.97 for buttons, 0.98 for the larger card targets. */
  scale?: number;
  /** Fires a light tick on press-in, before the action resolves. */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Press target that dips in scale and springs back.
 *
 * Scale rather than opacity: a product image fading under the thumb looks like
 * a loading state, whereas a slight compression reads as the surface being
 * pushed. The spring is shared from the motion tokens so every pressable in
 * the app returns at the same rate.
 */
export function PressableScale({
  scale = 0.97,
  haptic,
  style,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const v = useAnimatedValue(1);

  const spring = (toValue: number) =>
    Animated.spring(v, { toValue, useNativeDriver: NATIVE_DRIVER, ...motion.spring }).start();

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!rest.disabled) {
          spring(scale);
          if (haptic) tapLight();
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        spring(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale: v }] }, rest.disabled === true && { opacity: 0.45 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

/* ─────────────────────────── buttons ─────────────────────────── */

/**
 * Indeterminate ring. Lives here rather than alongside the form fields so that
 * `Button` can own its own loading state without importing from a module that
 * already imports this one.
 */
export function Spinner({ size = 16, color = C.primaryText }: { size?: number; color?: string }) {
  const spin = useAnimatedValue(0);

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 700,
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: alpha.spinnerTrack,
        borderTopColor: color,
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    />
  );
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  /** solid: black fill · outline: hairline border · strong: 1.5px black border */
  variant?: 'solid' | 'outline' | 'strong';
  height?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** Swaps the label for a spinner and blocks presses. */
  loading?: boolean;
  loadingLabel?: string;
  /** Light tick on press-in. Off by default — only committing actions buzz. */
  haptic?: boolean;
  children?: React.ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'solid',
  height = 50,
  size = 15,
  style,
  disabled,
  loading,
  loadingLabel,
  haptic,
  children,
}: ButtonProps) {
  const solid = variant === 'solid';
  const ink = solid ? C.primaryText : C.text;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      accessibilityLabel={loading ? (loadingLabel ?? 'Working') : label}
      style={[
        {
          height,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 9,
          backgroundColor: solid ? C.text : C.background,
          borderWidth: variant === 'strong' ? 1.5 : variant === 'outline' ? 1 : 0,
          borderColor: variant === 'strong' ? C.text : C.borderStrong,
        },
        style,
      ]}
    >
      {loading ? (
        <>
          <Spinner color={ink} />
          <T w={600} size={size} color={ink}>
            {loadingLabel ?? 'Processing…'}
          </T>
        </>
      ) : (
        <>
          {children}
          <T w={600} size={size} color={ink}>
            {label}
          </T>
        </>
      )}
    </PressableScale>
  );
}

/* ─────────────────────────── surfaces ─────────────────────────── */

/** The neutral card used for every grouped block in the design. */
export function Card({
  style,
  children,
  padded,
}: {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: radius.lg,
        },
        padded && { padding: 15 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A tinted callout.
 *
 * `neutral` is the default because most callouts are simply information, and
 * information does not warrant colour. Reach for a tint only when it carries
 * meaning: `accent` for genuinely promotional content, `green` for trust,
 * `error` for failure.
 */
export function Note({
  tone = 'neutral',
  children,
  style,
}: {
  tone?: 'neutral' | 'accent' | 'green' | 'error';
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const fill = {
    neutral: { bg: C.surface, border: C.border },
    accent: { bg: C.accentBg, border: C.accentBorder },
    green: { bg: C.successBg, border: C.successBorder },
    error: { bg: C.errorBg, border: C.errorBorder },
  }[tone];

  return (
    <View
      style={[
        {
          backgroundColor: fill.bg,
          borderWidth: 1,
          borderColor: fill.border,
          borderRadius: radius.lg,
          padding: 13,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ─────────────────────────── chips ─────────────────────────── */

export function Chip({
  label,
  active,
  onPress,
  height = 34,
  round = 17,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  height?: number;
  round?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useAnimatedValue(active ? 1 : 0);

  useEffect(() => {
    Animated.timing(p, {
      toValue: active ? 1 : 0,
      duration: motion.fast,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [active, p]);

  /**
   * Selection cross-fades rather than switching.
   *
   * The fill is a separate layer whose opacity animates, and the label is drawn
   * twice — dark and light — with complementary opacities. That is more markup
   * than animating `backgroundColor` and `color` directly, but colour
   * interpolation cannot run on the native driver, so the direct version would
   * put every chip in the rail on the JS thread during a horizontal scroll.
   * Fading a single ink-coloured label over a darkening fill is not an option
   * either: it spends the first frames as dark text on a dark ground.
   */
  const out = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const label_ = (color: string) => (
    <T w={active ? 600 : 500} size={13.5} color={color} numberOfLines={1}>
      {label}
    </T>
  );

  return (
    <PressableScale
      scale={0.96}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[
        {
          height,
          paddingHorizontal: 15,
          borderRadius: round,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.background,
          borderWidth: 1,
          borderColor: active ? C.text : C.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: C.text, opacity: p }]}
        pointerEvents="none"
      />
      <Animated.View style={{ opacity: out }}>{label_(C.text)}</Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'center', opacity: p },
        ]}
      >
        {label_(C.primaryText)}
      </Animated.View>
    </PressableScale>
  );
}

/* ─────────────────────────── segmented control ─────────────────────────── */

/** Two-up switch on a recessed track — Inbox tabs and Orders tabs. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: K; label: string; badge?: React.ReactNode }[];
  value: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', gap: 6, backgroundColor: C.surfaceSecondary, borderRadius: radius.md, padding: 3 },
        style,
      ]}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Tap
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              height: 34,
              borderRadius: 9,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: on ? C.background : 'transparent',
              ...(on && shadow.raised),
            }}
          >
            <T w={600} size={13.5} color={on ? C.text : C.textSecondary}>
              {o.label}
            </T>
            {o.badge}
          </Tap>
        );
      })}
    </View>
  );
}

/** Underlined tab strip used on the two profile screens. */
export function UnderlineTabs<K extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', gap: 22 }, style]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Tap
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              paddingBottom: 8,
              borderBottomWidth: 2,
              borderBottomColor: on ? C.text : 'transparent',
            }}
          >
            <T w={600} size={14.5} color={on ? C.text : C.textMuted}>
              {o.label}
            </T>
          </Tap>
        );
      })}
    </View>
  );
}

/* ─────────────────────────── avatar ─────────────────────────── */

export function Avatar({
  initials,
  bg,
  size = 44,
  fontSize,
}: {
  initials: string;
  bg: string;
  size?: number;
  fontSize?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <T w={600} size={fontSize ?? size * 0.34} color={C.primaryText}>
        {initials}
      </T>
    </View>
  );
}

/* ─────────────────────────── badge ─────────────────────────── */

/**
 * Accent count pill — unread offers, order counts, tab badges.
 *
 * One of the few places the accent is spent. White on `C.accent` clears 4.5:1,
 * which matters at 11px.
 */
export function Badge({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          minWidth: 19,
          height: 19,
          paddingHorizontal: 5,
          borderRadius: 10,
          backgroundColor: C.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <T w={700} size={11} color={C.primaryText}>
        {children}
      </T>
    </View>
  );
}

/* ─────────────────────────── toggle ─────────────────────────── */

export function Toggle({ on, onPress }: { on: boolean; onPress?: () => void }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      style={{
        width: 46,
        height: 28,
        borderRadius: 14,
        backgroundColor: on ? C.text : C.border,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 21 : 3,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: C.background,
          ...shadow.raised,
        }}
      />
    </Tap>
  );
}

/* ─────────────────────────── rows ─────────────────────────── */

/** Grouped-list row with an optional leading icon and trailing chevron. */
export function Row({
  icon,
  label,
  value,
  valueColor,
  onPress,
  last,
  right,
  labelWidth,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  valueColor?: string;
  onPress?: () => void;
  last?: boolean;
  right?: React.ReactNode;
  /** Fixes the label column, as on the Sell form. */
  labelWidth?: number;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 15,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      {icon && <Icon name={icon} size={18} color={C.text} />}
      {labelWidth ? (
        <>
          <T size={13.5} color={C.textSecondary} style={{ width: labelWidth }}>
            {label}
          </T>
          <T w={500} size={14.5} color={valueColor ?? C.text} numberOfLines={1} style={{ flex: 1 }}>
            {value}
          </T>
        </>
      ) : (
        <>
          <T w={500} size={14.5} style={{ flex: 1 }}>
            {label}
          </T>
          {value !== undefined && (
            <T size={13} color={valueColor ?? C.textMuted}>
              {value}
            </T>
          )}
        </>
      )}
      {right}
      <Icon name="chevronRight" size={16} color={C.borderStrong} />
    </Tap>
  );
}

/* ─────────────────────────── empty state ─────────────────────────── */

export function EmptyState({
  icon,
  title,
  body,
  action,
  style,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ paddingVertical: 72, paddingHorizontal: 48, alignItems: 'center' }, style]}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: C.surfaceSecondary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        <Icon name={icon} size={26} color={C.textMuted} strokeWidth={1.6} />
      </View>
      <T w={700} size={17} tracking={-0.3} style={{ textAlign: 'center' }}>
        {title}
      </T>
      <T size={14} color={C.textSecondary} lh={21} style={{ textAlign: 'center', marginTop: 7 }}>
        {body}
      </T>
      {/* Call sites set their own top margin, so this only provides the width. */}
      {!!action && <View style={{ alignSelf: 'stretch' }}>{action}</View>}
    </View>
  );
}

/* ─────────────────────────── misc ─────────────────────────── */

/** Section label above a group of controls. */
export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <T w={600} size={13} color={C.textSecondary} style={style}>
      {children}
    </T>
  );
}

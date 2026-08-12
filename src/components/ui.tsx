import React from 'react';
import {
  Pressable,
  Text as RNText,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { color as C, font, radius } from '@/theme/tokens';

/* ─────────────────────────── type ─────────────────────────── */

const FAMILY = {
  400: font.sans,
  500: font.medium,
  600: font.semibold,
  700: font.bold,
} as const;

type Weight = keyof typeof FAMILY;

export type TProps = TextProps & {
  /** Maps to the matching Instrument Sans static — RN can't synthesise weights. */
  w?: Weight;
  /** Instrument Serif, used only for the SudanSouq wordmark. */
  serif?: boolean;
  size?: number;
  color?: string;
  /** Shorthand for `letterSpacing`, which the design uses heavily. */
  tracking?: number;
  lh?: number;
};

/** The app's only text component — every string goes through it. */
export function T({ w = 400, serif, size, color, tracking, lh, style, ...rest }: TProps) {
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: serif ? font.serif : FAMILY[w],
          color: color ?? C.text,
          ...(size !== undefined && { fontSize: size }),
          ...(tracking !== undefined && { letterSpacing: tracking }),
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

/* ─────────────────────────── buttons ─────────────────────────── */

type ButtonProps = {
  label: string;
  onPress?: () => void;
  /** solid: near-black fill · outline: hairline border · strong: 1.5px black border */
  variant?: 'solid' | 'outline' | 'strong';
  height?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
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
  children,
}: ButtonProps) {
  const solid = variant === 'solid';
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        {
          height,
          borderRadius: radius.xl,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 9,
          backgroundColor: solid ? C.text : 'transparent',
          borderWidth: variant === 'strong' ? 1.5 : variant === 'outline' ? 1 : 0,
          borderColor: variant === 'strong' ? C.text : C.border,
        },
        style,
      ]}
    >
      {children}
      <T w={600} size={size} color={solid ? C.onDark : C.text}>
        {label}
      </T>
    </Tap>
  );
}

/* ─────────────────────────── surfaces ─────────────────────────── */

/** The cream card used for every grouped block in the design. */
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
          borderRadius: radius['2xl'],
        },
        padded && { padding: 15 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A tinted callout — terracotta for promos, green for trust. */
export function Note({
  tone = 'accent',
  children,
  style,
}: {
  tone?: 'accent' | 'green';
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const accent = tone === 'accent';
  return (
    <View
      style={[
        {
          backgroundColor: accent ? C.accentBg : C.greenBg,
          borderWidth: 1,
          borderColor: accent ? C.accentBorder : C.greenBorder,
          borderRadius: radius.xl,
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
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[
        {
          height,
          paddingHorizontal: 14,
          borderRadius: round,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? C.text : C.surface,
          borderWidth: 1,
          borderColor: active ? C.text : C.border,
        },
        style,
      ]}
    >
      <T w={500} size={13.5} color={active ? C.onDark : C.text}>
        {label}
      </T>
    </Tap>
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
        { flexDirection: 'row', gap: 6, backgroundColor: C.track, borderRadius: radius.lg, padding: 3 },
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
              backgroundColor: on ? C.surface : 'transparent',
              ...(on && {
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 2,
                shadowOffset: { width: 0, height: 1 },
                elevation: 1,
              }),
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
            <T w={600} size={14.5} color={on ? C.text : C.textTertiary}>
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
      <T w={600} size={fontSize ?? size * 0.34} color={C.onDark}>
        {initials}
      </T>
    </View>
  );
}

/* ─────────────────────────── badge ─────────────────────────── */

/** Terracotta count pill — unread offers, order counts, tab badges. */
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
      <T w={700} size={11} color={C.onDark}>
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
          backgroundColor: C.surface,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
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
            <T size={13} color={valueColor ?? C.textTertiary}>
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
    <View style={[{ paddingVertical: 64, paddingHorizontal: 44, alignItems: 'center' }, style]}>
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: C.track,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon name={icon} size={24} color={C.textTertiary} strokeWidth={1.7} />
      </View>
      <T w={600} size={15.5} style={{ textAlign: 'center' }}>
        {title}
      </T>
      <T size={13} color={C.textSecondary} lh={19.5} style={{ textAlign: 'center', marginTop: 6 }}>
        {body}
      </T>
      {action}
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

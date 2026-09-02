import React from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Icon, type IconName } from "@/components/icon";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { retryableReadMessage } from "@/lib/errors";
import {
  color as C,
  duration,
  elevation,
  icon as iconToken,
  opacity,
  radius,
  scale as scaleToken,
  space,
  spring,
  touch,
  type as typography,
  type ColorRole,
  type TypographyRole,
} from "@/theme/tokens";

export type TProps = TextProps & {
  variant?: TypographyRole;
  colorRole?: ColorRole;
  color?: string;
  align?: TextStyle["textAlign"];
};

/** The only shared text primitive. Canonical roles stay coherent as one unit. */
export function T({
  variant = "body",
  colorRole = "textPrimary",
  color,
  align,
  style,
  ...rest
}: TProps) {
  const role = typography[variant];
  return (
    <RNText
      {...rest}
      style={[
        role,
        { color: color ?? C[colorRole] },
        align ? { textAlign: align } : undefined,
        style,
      ]}
    />
  );
}

export function Tap({
  style,
  children,
  disabled,
  onFocus,
  onBlur,
  ...rest
}: PressableProps) {
  const [focused, setFocused] = React.useState(false);
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      accessibilityState={{
        ...rest.accessibilityState,
        disabled: Boolean(disabled),
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        focused
          ? { outlineColor: C.primary, outlineWidth: 2, outlineOffset: 2 }
          : undefined,
        state.pressed && !disabled ? { opacity: opacity.pressed } : undefined,
        disabled ? { opacity: opacity.disabled } : undefined,
      ]}
    >
      {children}
    </Pressable>
  );
}

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  /** Canonical pressed scale; use a token value when overriding the role default. */
  scale?: number;
  motionRole?: "buttonPress" | "selection" | "cardPress";
  style?: StyleProp<ViewStyle>;
};

const NativeWindPressable = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  PressableProps
>(function NativeWindPressable(props, ref) {
  return <Pressable ref={ref} {...props} />;
});
const AnimatedPressable = Animated.createAnimatedComponent(NativeWindPressable);

/** Shared, interruptible press surface. Actions remain owned by Pressable. */
export function PressableScale({
  scale = scaleToken.buttonPressed,
  motionRole = "buttonPress",
  style,
  children,
  disabled,
  onPressIn,
  onPressOut,
  onResponderTerminate,
  onFocus,
  onBlur,
  ...rest
}: PressableScaleProps) {
  const { allowScale } = useReducedMotion();
  const [focused, setFocused] = React.useState(false);
  const pressedScale = useSharedValue(1);
  const pressedOpacity = useSharedValue(1);

  const settle = (nextScale: number, nextOpacity: number) => {
    cancelAnimation(pressedScale);
    cancelAnimation(pressedOpacity);
    pressedOpacity.value = nextOpacity;
    pressedScale.value = allowScale
      ? withSpring(nextScale, spring[motionRole])
      : 1;
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pressedOpacity.value,
    transform: [{ scale: pressedScale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      accessibilityState={{
        ...rest.accessibilityState,
        disabled: Boolean(disabled),
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onPressIn={(event) => {
        if (!disabled) settle(scale, opacity.pressed);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        settle(1, 1);
        onPressOut?.(event);
      }}
      onResponderTerminate={(event) => {
        settle(1, 1);
        onResponderTerminate?.(event);
      }}
      style={[
        style,
        animatedStyle,
        focused
          ? { outlineColor: C.primary, outlineWidth: 2, outlineOffset: 2 }
          : undefined,
        disabled ? { opacity: opacity.disabled } : undefined,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Spinner({
  size = iconToken.metadata.size,
  color = C.textInverse,
}: {
  size?: number;
  color?: string;
}) {
  const { reduceMotion } = useReducedMotion();
  if (reduceMotion) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Working"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
        }}
      />
    );
  }
  return (
    <ActivityIndicator
      accessibilityRole="progressbar"
      accessibilityLabel="Working"
      size={size <= 20 ? "small" : "large"}
      color={color}
    />
  );
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "regular" | "compact";

type ButtonProps = {
  label: string;
  accessibilityLabel?: string;
  className?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  buttonSize?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  children?: React.ReactNode;
};

export function Button({
  label,
  accessibilityLabel,
  className,
  onPress,
  variant = "primary",
  buttonSize = "regular",
  style,
  disabled,
  loading,
  loadingLabel,
  children,
}: ButtonProps) {
  const unavailable = Boolean(disabled || loading || !onPress);
  const primary = variant === "primary";
  const secondary = variant === "secondary";
  const destructive = variant === "destructive";
  const foreground = primary || destructive ? C.textInverse : C.textPrimary;
  const visualHeight =
    buttonSize === "compact" ? touch.minimum : touch.standard;

  return (
    <PressableScale
      onPress={onPress}
      disabled={unavailable}
      accessibilityRole="button"
      accessibilityLabel={
        loading
          ? (loadingLabel ?? accessibilityLabel ?? label)
          : (accessibilityLabel ?? label)
      }
      accessibilityState={{ disabled: unavailable, busy: Boolean(loading) }}
      className={className}
      style={[
        {
          minHeight: visualHeight,
          paddingVertical: space.space12,
          paddingHorizontal: space.space24,
          borderRadius: radius.radiusMedium,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: space.space8,
          backgroundColor: primary ? C.primary : destructive ? C.error : C.surface,
          borderWidth: secondary ? 1 : 0,
          borderColor: secondary ? C.border : "transparent",
        },
        unavailable ? { opacity: opacity.disabled } : undefined,
        style,
      ]}
    >
      {loading ? <Spinner color={foreground} /> : children}
      <T
        variant="button"
        color={unavailable && !primary && !destructive ? C.textSecondary : foreground}
      >
        {loading ? (loadingLabel ?? "Working…") : label}
      </T>
    </PressableScale>
  );
}

export function Card({
  style,
  children,
  padded,
  variant = "compact",
}: {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  padded?: boolean;
  variant?: "listing" | "editorial" | "compact" | "selection";
}) {
  const framed =
    variant === "editorial" || variant === "selection" || variant === "compact";
  return (
    <View
      style={[
        framed
          ? {
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: radius.radiusLarge,
              borderCurve: "continuous",
            }
          : undefined,
        padded ? { padding: space.space16 } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Note({
  tone = "neutral",
  children,
  style,
}: {
  tone?: "neutral" | "success" | "error" | "warning";
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const fill = {
    neutral: { backgroundColor: C.surface, borderColor: C.border },
    success: { backgroundColor: C.successSurface, borderColor: C.success },
    error: { backgroundColor: C.errorSurface, borderColor: C.error },
    warning: { backgroundColor: C.warningSurface, borderColor: C.warning },
  }[tone];
  return (
    <View
      style={[
        fill,
        {
          borderWidth: 1,
          borderRadius: radius.radiusLarge,
          borderCurve: "continuous",
          padding: space.space12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  disabled,
  height = touch.minimum,
  round = radius.radiusMedium,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  height?: number;
  round?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || !onPress}
      motionRole="selection"
      accessibilityRole="button"
      accessibilityState={{
        selected: Boolean(active),
        disabled: Boolean(disabled || !onPress),
      }}
      style={[
        {
          minHeight: Math.max(height, touch.minimum),
          paddingVertical: space.space8,
          paddingHorizontal: space.space16,
          borderRadius: round,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: space.space8,
          backgroundColor: active ? C.primary : C.surface,
          borderWidth: 1,
          borderColor: active ? C.primary : C.border,
        },
        disabled ? { opacity: opacity.disabled } : undefined,
        style,
      ]}
    >
      {active ? (
        <Icon name="check" role="metadata" color={C.textInverse} />
      ) : null}
      <T variant="cardTitle" color={active ? C.textInverse : C.textPrimary}>
        {label}
      </T>
    </PressableScale>
  );
}

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
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: "row",
          gap: space.space4,
          backgroundColor: C.surfaceSecondary,
          borderRadius: radius.radiusMedium,
          borderCurve: "continuous",
          padding: space.space4,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <PressableScale
            key={option.key}
            onPress={() => onChange(option.key)}
            motionRole="selection"
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: touch.minimum,
              borderRadius: radius.radiusSmall,
              borderCurve: "continuous",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: space.space4,
              backgroundColor: selected ? C.primary : "transparent",
              borderWidth: selected ? 1 : 0,
              borderColor: selected ? C.primary : C.border,
              ...(selected ? elevation.raised : {}),
            }}
          >
            <T
              variant="cardTitle"
              color={selected ? C.textInverse : C.textSecondary}
            >
              {option.label}
            </T>
            {option.badge}
          </PressableScale>
        );
      })}
    </View>
  );
}

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
    <View
      accessibilityRole="tablist"
      style={[{ flexDirection: "row", gap: space.space24 }, style]}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <PressableScale
            key={option.key}
            onPress={() => onChange(option.key)}
            motionRole="selection"
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              minHeight: touch.minimum,
              justifyContent: "center",
              borderBottomWidth: 2,
              borderBottomColor: selected ? C.primary : "transparent",
            }}
          >
            <T
              variant="bodyMedium"
              color={selected ? C.textPrimary : C.textSecondary}
            >
              {option.label}
            </T>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function Avatar({
  initials,
  bg,
  size = touch.minimum,
  imageUrl,
  accessibilityLabel,
}: {
  initials: string;
  bg: string;
  size?: number;
  imageUrl?: string | null;
  accessibilityLabel?: string;
}) {
  const normalizedImageUrl = imageUrl?.trim() || null;

  return (
    <AvatarVisual
      key={normalizedImageUrl ?? "initials"}
      initials={initials}
      bg={bg}
      size={size}
      imageUrl={normalizedImageUrl}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

function AvatarVisual({
  initials,
  bg,
  size,
  imageUrl,
  accessibilityLabel,
}: {
  initials: string;
  bg: string;
  size: number;
  imageUrl: string | null;
  accessibilityLabel?: string;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const initialsVariant: TypographyRole =
    size >= 80
      ? "screenTitle"
      : size >= 56
        ? "sectionTitle"
        : size <= 36
          ? "caption"
          : "bodyMedium";

  if (imageUrl && !imageFailed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        contentFit="cover"
        transition={duration.standard}
        onError={() => setImageFailed(true)}
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        }}
      />
    );
  }

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <T variant={initialsVariant} color={C.textInverse}>
        {initials}
      </T>
    </View>
  );
}

export function Badge({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          minWidth: 20,
          minHeight: 20,
          paddingHorizontal: space.space4,
          borderRadius: radius.radiusPill,
          backgroundColor: C.accent,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <T variant="caption" color={C.textPrimary}>
        {children}
      </T>
    </View>
  );
}

export function Toggle({
  on,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  on: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      motionRole="selection"
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: on, disabled: !onPress }}
      style={{
        width: touch.minimum,
        height: touch.minimum,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 44,
          height: 28,
          borderRadius: radius.radiusPill,
          backgroundColor: on ? C.primary : C.borderStrong,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: 3,
            left: on ? 19 : 3,
            width: 22,
            height: 22,
            borderRadius: radius.radiusPill,
            backgroundColor: C.background,
            ...elevation.raised,
          }}
        />
      </View>
    </PressableScale>
  );
}

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
  labelWidth?: number;
}) {
  const content = (
    <>
      {icon ? <Icon name={icon} role="inline" color={C.textPrimary} /> : null}
      {labelWidth ? (
        <>
          <T
            variant="metadata"
            color={C.textSecondary}
            style={{ width: labelWidth }}
          >
            {label}
          </T>
          <T
            variant="bodyMedium"
            color={valueColor ?? C.textPrimary}
            style={{ flex: 1 }}
          >
            {value}
          </T>
        </>
      ) : (
        <>
          <T variant="bodyMedium" style={{ flex: 1 }}>
            {label}
          </T>
          {value !== undefined ? (
            <T variant="metadata" color={valueColor ?? C.textSecondary}>
              {value}
            </T>
          ) : null}
        </>
      )}
      {right}
      {onPress ? (
        <Icon name="chevronRight" role="metadata" color={C.textSecondary} />
      ) : null}
    </>
  );
  const rowStyle: ViewStyle = {
    minHeight: touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: space.space12,
    paddingHorizontal: space.space16,
    paddingVertical: space.space12,
    borderBottomWidth: last ? 0 : 1,
    borderBottomColor: C.border,
  };
  return onPress ? (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={rowStyle}
    >
      {content}
    </Tap>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
}

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
    <View
      style={[
        {
          paddingVertical: space.space48,
          paddingHorizontal: space.space24,
          alignItems: "center",
        },
        style,
      ]}
    >
      <View
        accessible={false}
        style={{
          width: touch.large,
          height: touch.large,
          borderRadius: radius.radiusPill,
          backgroundColor: C.surfaceSecondary,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: space.space16,
        }}
      >
        <Icon name={icon} role="hero" color={C.textSecondary} decorative />
      </View>
      <T
        variant="sectionTitle"
        accessibilityRole="header"
        style={{ textAlign: "center" }}
      >
        {title}
      </T>
      <T
        variant="body"
        color={C.textSecondary}
        style={{ textAlign: "center", marginTop: space.space8 }}
      >
        {body}
      </T>
      {action ? (
        <View style={{ alignSelf: "stretch", marginTop: space.space16 }}>
          {action}
        </View>
      ) : null}
    </View>
  );
}

/** Concise inline failure for fields, forms, and retained-content refreshes. */
export function InlineError({
  message,
  actionLabel,
  onAction,
  style,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityRole="alert"
      style={[
        {
          minHeight: touch.minimum,
          flexDirection: "row",
          alignItems: "center",
          gap: space.space8,
          paddingHorizontal: space.space12,
          paddingVertical: space.space8,
          borderRadius: radius.radiusMedium,
          borderWidth: 1,
          borderColor: C.error,
          backgroundColor: C.errorSurface,
        },
        style,
      ]}
    >
      <Icon name="info" role="metadata" color={C.error} decorative />
      <T variant="metadata" color={C.errorText} style={{ flex: 1 }}>
        {message}
      </T>
      {actionLabel && onAction ? (
        <Tap
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={{
            minWidth: touch.minimum,
            minHeight: touch.minimum,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <T variant="button" color={C.errorText}>
            {actionLabel}
          </T>
        </Tap>
      ) : null}
    </View>
  );
}

/** Full-screen/read-region error that never exposes raw service diagnostics. */
export function ScreenError({
  error,
  title = "Could not load this page",
  fallback = "Check your connection and try again.",
  onRetry,
}: {
  error?: unknown;
  title?: string;
  fallback?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="info"
      title={title}
      body={retryableReadMessage(error, fallback)}
      action={
        onRetry ? <Button label="Try again" onPress={onRetry} /> : undefined
      }
    />
  );
}

/** Non-destructive refresh failure shown while existing real content remains. */
export function RefreshNotice({ onRetry }: { onRetry?: () => void }) {
  return (
    <Note tone="error">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.space8,
        }}
      >
        <Icon name="info" role="metadata" color={C.error} decorative />
        <T variant="metadata" color={C.errorText} style={{ flex: 1 }}>
          Could not refresh. The content below may be out of date.
        </T>
        {onRetry ? (
          <Tap
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry refresh"
            style={{
              minWidth: touch.minimum,
              minHeight: touch.minimum,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <T variant="button" color={C.errorText}>
              Retry
            </T>
          </Tap>
        ) : null}
      </View>
    </Note>
  );
}

export function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <T variant="cardTitle" color={C.textSecondary} style={style}>
      {children}
    </T>
  );
}

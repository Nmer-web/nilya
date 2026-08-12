import React, { useEffect, useState } from 'react';
import { Animated, Easing, TextInput, View, type TextInputProps } from 'react-native';

import { T, Tap } from '@/components/ui';
import { useAnimatedValue } from '@/hooks/use-animated-value';
import { color as C, font, radius } from '@/theme/tokens';

/**
 * Form primitives for the auth screens. The rest of the app has no real forms
 * — Explore and Chat use bare TextInputs — so these live here rather than in
 * ui.tsx, styled to the same tokens.
 */

export type FieldProps = TextInputProps & {
  label: string;
  /** Message shown under the field; also turns the border terracotta. */
  error?: string | null;
};

export function Field({ label, error, style, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 14 }}>
      <T w={600} size={13} color={C.textSecondary} style={{ marginBottom: 7 }}>
        {label}
      </T>
      <View
        style={{
          height: 50,
          borderRadius: radius.xl,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: error ? C.accent : focused ? C.borderStrong : C.border,
          paddingHorizontal: 14,
          justifyContent: 'center',
        }}
      >
        <TextInput
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={C.textTertiary}
          style={[
            { fontFamily: font.sans, fontSize: 15, color: C.text, padding: 0 },
            style,
          ]}
        />
      </View>
      {!!error && (
        <T size={12.5} color={C.accent} lh={17} style={{ marginTop: 6 }}>
          {error}
        </T>
      )}
    </View>
  );
}

/** Password entry with a text reveal toggle — the icon set has no eye glyph. */
export function PasswordField({ label, error, ...rest }: FieldProps) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
        <T w={600} size={13} color={C.textSecondary} style={{ flex: 1 }}>
          {label}
        </T>
        <Tap onPress={() => setHidden((h) => !h)} accessibilityRole="button" hitSlop={8}>
          <T w={600} size={12.5} color={C.textSecondary}>
            {hidden ? 'Show' : 'Hide'}
          </T>
        </Tap>
      </View>
      <View
        style={{
          height: 50,
          borderRadius: radius.xl,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: error ? C.accent : focused ? C.borderStrong : C.border,
          paddingHorizontal: 14,
          justifyContent: 'center',
        }}
      >
        <TextInput
          {...rest}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={C.textTertiary}
          style={{ fontFamily: font.sans, fontSize: 15, color: C.text, padding: 0 }}
        />
      </View>
      {!!error && (
        <T size={12.5} color={C.accent} lh={17} style={{ marginTop: 6 }}>
          {error}
        </T>
      )}
    </View>
  );
}

/** Form-level failure — anything not attributable to one field. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View
      style={{
        backgroundColor: C.accentBg,
        borderWidth: 1,
        borderColor: C.accentBorder,
        borderRadius: radius.xl,
        padding: 12,
        marginBottom: 16,
      }}
    >
      <T size={13.5} color={C.accentDark} lh={19}>
        {message}
      </T>
    </View>
  );
}

/** Ring shown inside a CTA while a request is in flight. */
export function ButtonSpinner() {
  const spin = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  return (
    <Animated.View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(250,249,245,0.3)',
        borderTopColor: C.onDark,
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    />
  );
}

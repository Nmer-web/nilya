import React, { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { T, Tap } from '@/components/ui';
import { color as C, radius } from '@/theme/tokens';

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
          backgroundColor: C.bg,
          borderColor: error ? C.error : focused ? C.text : C.border,
          /* Focus is carried by weight as well as colour, per §23. */
          borderWidth: focused || error ? 1.5 : 1,
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
            { fontSize: 15.5, color: C.text, padding: 0 },
            style,
          ]}
        />
      </View>
      {!!error && (
        <T size={12.5} color={C.error} lh={17} style={{ marginTop: 6 }}>
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
          backgroundColor: C.bg,
          borderColor: error ? C.error : focused ? C.text : C.border,
          /* Focus is carried by weight as well as colour, per §23. */
          borderWidth: focused || error ? 1.5 : 1,
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
          style={{ fontSize: 15.5, color: C.text, padding: 0 }}
        />
      </View>
      {!!error && (
        <T size={12.5} color={C.error} lh={17} style={{ marginTop: 6 }}>
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

/**
 * Ring shown inside a CTA while a request is in flight.
 *
 * The implementation moved to `ui.tsx` so that `Button` could own its own
 * loading state without importing from this module, which already imports it.
 * Kept as a named re-export because the five auth screens reach for it here.
 */
export { Spinner as ButtonSpinner } from '@/components/ui';

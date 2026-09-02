import React, { useId, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { T, Tap } from '@/components/ui';
import { color as C, opacity, radius, space, touch, type as typography } from '@/theme/tokens';

export type FieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
};

export function Field({ label, error, hint, style, editable = true, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const fieldId = useId();
  const labelId = `${fieldId}-label`;

  return (
    <View style={{ marginBottom: space.space16 }}>
      <T nativeID={labelId} variant="cardTitle" color={C.textSecondary} style={{ marginBottom: space.space8 }}>
        {label}
      </T>
      <View
        style={{
          minHeight: touch.standard,
          borderRadius: radius.radiusMedium,
          borderCurve: 'continuous',
          backgroundColor: editable ? C.surface : C.surfaceSecondary,
          borderColor: error ? C.error : focused ? C.primary : C.border,
          borderWidth: focused || error ? 2 : 1,
          paddingHorizontal: space.space16,
          justifyContent: 'center',
          opacity: editable ? 1 : opacity.disabled,
        }}
      >
        <TextInput
          {...rest}
          nativeID={rest.nativeID ?? fieldId}
          editable={editable}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityLabelledBy={labelId}
          accessibilityHint={error ?? hint ?? rest.accessibilityHint}
          accessibilityState={{ ...rest.accessibilityState, disabled: !editable }}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          placeholderTextColor={C.textSecondary}
          selectionColor={C.primary}
          style={[typography.body, { minHeight: touch.minimum, color: C.textPrimary, padding: 0 }, style]}
        />
      </View>
      {error ? (
        <T
          variant="caption"
          color={C.errorText}
          accessibilityLiveRegion="polite"
          style={{ marginTop: space.space4 }}
        >
          {error}
        </T>
      ) : hint ? (
        <T variant="caption" color={C.textSecondary} style={{ marginTop: space.space4 }}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function PasswordField({ label, error, hint, style, editable = true, ...rest }: FieldProps) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const fieldId = useId();
  const labelId = `${fieldId}-label`;

  return (
    <View style={{ marginBottom: space.space16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.space4 }}>
        <T nativeID={labelId} variant="cardTitle" color={C.textSecondary} style={{ flex: 1 }}>
          {label}
        </T>
        <Tap
          onPress={() => setHidden((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={hidden ? `Show ${label}` : `Hide ${label}`}
          accessibilityState={{ expanded: !hidden }}
          style={{ minWidth: touch.minimum, minHeight: touch.minimum, alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <T variant="caption" color={C.textSecondary}>
            {hidden ? 'Show' : 'Hide'}
          </T>
        </Tap>
      </View>
      <View
        style={{
          minHeight: touch.standard,
          borderRadius: radius.radiusMedium,
          borderCurve: 'continuous',
          backgroundColor: editable ? C.surface : C.surfaceSecondary,
          borderColor: error ? C.error : focused ? C.primary : C.border,
          borderWidth: focused || error ? 2 : 1,
          paddingHorizontal: space.space16,
          justifyContent: 'center',
        }}
      >
        <TextInput
          {...rest}
          nativeID={rest.nativeID ?? fieldId}
          editable={editable}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityLabelledBy={labelId}
          accessibilityHint={error ?? hint ?? rest.accessibilityHint}
          accessibilityState={{ ...rest.accessibilityState, disabled: !editable }}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          placeholderTextColor={C.textSecondary}
          selectionColor={C.primary}
          style={[typography.body, { minHeight: touch.minimum, color: C.textPrimary, padding: 0 }, style]}
        />
      </View>
      {error ? (
        <T variant="caption" color={C.errorText} accessibilityLiveRegion="polite" style={{ marginTop: space.space4 }}>
          {error}
        </T>
      ) : hint ? (
        <T variant="caption" color={C.textSecondary} style={{ marginTop: space.space4 }}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: C.errorSurface,
        borderWidth: 1,
        borderColor: C.error,
        borderRadius: radius.radiusMedium,
        borderCurve: 'continuous',
        padding: space.space12,
        marginBottom: space.space16,
      }}
    >
      <T variant="metadata" color={C.errorText}>
        {message}
      </T>
    </View>
  );
}

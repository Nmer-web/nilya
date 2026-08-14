import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ButtonSpinner, FormError, PasswordField } from '@/components/field';
import { Icon } from '@/components/icon';
import { Button, T, Tap } from '@/components/ui';
import { MIN_PASSWORD, passwordError } from '@/lib/validate';
import { useAuth } from '@/store/auth-store';
import { color as C, radius } from '@/theme/tokens';

/**
 * Reached only via a recovery deep link. The link already established a
 * session, so this screen just calls updateUser — but the root layout keeps
 * `recovering` true so the app stays sealed off until the new password is
 * actually saved. Signing out here is the escape hatch if the user changes
 * their mind, and it correctly leaves the old password in force.
 */
export default function ResetPassword() {
  const insets = useSafeAreaInsets();
  const { updatePassword, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;

    const nextErrors = {
      password: passwordError(password),
      confirm: password !== confirm ? 'Both passwords must match.' : null,
    };
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.password || nextErrors.confirm) return;

    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);

    if (error) {
      // The usual cause is an expired or already-used recovery link, which
      // means there is no valid session behind this screen.
      setFormError(
        error.toLowerCase().includes('session')
          ? 'That reset link has expired. Request a new one from the sign-in screen.'
          : error
      );
      return;
    }
    // updatePassword clears `recovering`; the root guard hands over to the app.
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 22,
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.xl,
            backgroundColor: C.text,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="shieldCheck" size={27} color={C.primaryText} strokeWidth={1.7} />
        </View>

        <T w={600} size={27} tracking={-0.6} lh={32.4} style={{ marginTop: 20 }}>
          Choose a new password
        </T>
        <T size={14.5} color={C.textSecondary} lh={22.5} style={{ marginTop: 8, marginBottom: 26 }}>
          You&apos;ll stay signed in on this device once it&apos;s saved.
        </T>

        <FormError message={formError} />

        <PasswordField
          label="New password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (errors.password) setErrors((e) => ({ ...e, password: null }));
          }}
          error={errors.password}
          placeholder={`At least ${MIN_PASSWORD} characters`}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />

        <PasswordField
          label="Confirm password"
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            if (errors.confirm) setErrors((e) => ({ ...e, confirm: null }));
          }}
          error={errors.confirm}
          placeholder="Type it again"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <Button
          label={busy ? 'Saving…' : 'Save password'}
          onPress={submit}
          disabled={busy}
          style={{ marginTop: 12 }}
        >
          {busy && <ButtonSpinner />}
        </Button>

        <View style={{ flex: 1 }} />

        <Tap
          onPress={() => void signOut()}
          accessibilityRole="button"
          hitSlop={6}
          style={{ alignSelf: 'center', paddingVertical: 8, marginTop: 32 }}
        >
          <T w={600} size={14} color={C.text}>
            Cancel and sign out
          </T>
        </Tap>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

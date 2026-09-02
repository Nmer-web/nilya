import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, FormError } from '@/components/field';
import { ScreenHeader } from '@/components/screen-header';
import { Button, Note, T, Tap } from '@/components/ui';
import { emailError } from '@/lib/validate';
import { useAuth } from '@/store/auth-store';
import { color as C, space, touch } from '@/theme/tokens';

export default function ForgotPassword() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;

    const invalid = emailError(email);
    setFieldError(invalid);
    setFormError(null);
    if (invalid) return;

    setBusy(true);
    const { error } = await requestPasswordReset(email);
    setBusy(false);

    if (error) {
      setFormError(error);
      return;
    }
    /**
     * Supabase returns success whether or not the address exists, so the
     * confirmation below is deliberately worded not to reveal which. Do not
     * "improve" this into "we found your account".
     */
    setSent(true);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader border={false} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.gutterRegular,
          paddingTop: space.space8,
          paddingBottom: insets.bottom + space.space32,
        }}
      >
        <T variant="screenTitle">
          Reset your password
        </T>
        <T variant="body" color={C.textSecondary} style={{ marginTop: space.space8, marginBottom: space.space24 }}>
          Enter your email and we&apos;ll send you a link to choose a new one.
        </T>

        {sent ? (
          <Note tone="success">
            <T variant="bodyMedium" color={C.success}>
              Check your inbox
            </T>
            <T variant="metadata" color={C.success} style={{ marginTop: space.space4 }}>
              If an account exists for {email.trim()}, a reset link is on its way. Open it on this device to set a
              new password.
            </T>
          </Note>
        ) : (
          <>
            <FormError message={formError} />

            <Field
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (fieldError) setFieldError(null);
              }}
              error={fieldError}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="go"
              onSubmitEditing={submit}
            />

            <Button
              label="Send reset link"
              loading={busy}
              loadingLabel="Sending…"
              onPress={submit}
              disabled={busy}
              style={{ marginTop: space.space12 }}
            />
          </>
        )}

        <View style={{ flex: 1 }} />

        <Tap
          onPress={() => router.replace('/sign-in')}
          accessibilityRole="button"
          hitSlop={6}
          style={{ alignSelf: 'center', minHeight: touch.minimum, justifyContent: 'center', marginTop: space.space32 }}
        >
          <T variant="button" color={C.primary}>
            Back to sign in
          </T>
        </Tap>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

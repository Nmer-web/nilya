import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ButtonSpinner, Field, FormError, PasswordField } from '@/components/field';
import { Button, T, Tap } from '@/components/ui';
import { emailError } from '@/lib/validate';
import { useAuth } from '@/store/auth-store';
import { color as C } from '@/theme/tokens';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;

    const nextErrors = {
      email: emailError(email),
      password: password ? null : 'Enter your password.',
    };
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.email || nextErrors.password) return;

    setBusy(true);
    const { error, needsConfirmation } = await signIn(email, password);
    setBusy(false);

    if (error) {
      setFormError(error);
      // Read the flag off the result, not off context: the setState that
      // records pendingEmail has not re-rendered this component yet.
      if (needsConfirmation) router.push('/check-email');
    }
    // On success nothing happens here: the session lands, the root guard
    // flips and the router swaps to the app group by itself.
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
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
        <T serif size={38} tracking={-0.8}>
          SAWA
        </T>
        <T w={600} size={27} tracking={-0.6} lh={32.4} style={{ marginTop: 28 }}>
          Welcome back
        </T>
        <T size={14.5} color={C.textSecondary} lh={22.5} style={{ marginTop: 8, marginBottom: 26 }}>
          Sign in to keep buying and selling.
        </T>

        <FormError message={formError} />

        <Field
          label="Email"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (errors.email) setErrors((e) => ({ ...e, email: null }));
          }}
          error={errors.email}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <PasswordField
          label="Password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (errors.password) setErrors((e) => ({ ...e, password: null }));
          }}
          error={errors.password}
          placeholder="Your password"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <Tap
          onPress={() => router.push('/forgot-password')}
          accessibilityRole="button"
          hitSlop={6}
          style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
        >
          <T w={600} size={13.5} color={C.text}>
            Forgot your password?
          </T>
        </Tap>

        <Button
          label={busy ? 'Signing in…' : 'Sign in'}
          onPress={submit}
          disabled={busy}
          style={{ marginTop: 22 }}
        >
          {busy && <ButtonSpinner />}
        </Button>

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 32 }}>
          <T size={14} color={C.textSecondary}>
            New to SAWA?
          </T>
          <Tap onPress={() => router.push('/sign-up')} accessibilityRole="button" hitSlop={6}>
            <T w={600} size={14} color={C.text}>
              Create an account
            </T>
          </Tap>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

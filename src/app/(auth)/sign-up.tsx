import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ButtonSpinner, Field, FormError, PasswordField } from '@/components/field';
import { ScreenHeader } from '@/components/screen-header';
import { Button, T, Tap } from '@/components/ui';
import { emailError, nameError, passwordError, MIN_PASSWORD } from '@/lib/validate';
import { useAuth } from '@/store/auth-store';
import { color as C } from '@/theme/tokens';

export default function SignUp() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string | null; email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;

    const nextErrors = {
      name: nameError(name),
      email: emailError(email),
      password: passwordError(password),
    };
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.name || nextErrors.email || nextErrors.password) return;

    setBusy(true);
    const { error, needsConfirmation } = await signUp(email, password, name);
    setBusy(false);

    if (error) {
      setFormError(error);
      return;
    }

    /**
     * With confirmation on there is no session yet, so no guard has flipped and
     * this screen is still mounted — navigate explicitly.
     *
     * If confirmation is ever switched off in the dashboard, signUp returns a
     * session instead, the root guard swaps to the app group on its own, and
     * navigating here would push onto a stack that is already unmounting.
     */
    if (needsConfirmation) router.replace('/check-email');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader border={false} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 22,
          paddingTop: 8,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <T w={600} size={27} tracking={-0.6} lh={32.4}>
          Create your account
        </T>
        <T size={14.5} color={C.textSecondary} lh={22.5} style={{ marginTop: 8, marginBottom: 26 }}>
          Buy and sell secondhand across Sudan, France and beyond.
        </T>

        <FormError message={formError} />

        <Field
          label="Name"
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (errors.name) setErrors((e) => ({ ...e, name: null }));
          }}
          error={errors.name}
          placeholder="Ahmed Ibrahim"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
        />

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
          placeholder={`At least ${MIN_PASSWORD} characters`}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <Button
          label={busy ? 'Creating account…' : 'Create account'}
          onPress={submit}
          disabled={busy}
          style={{ marginTop: 12 }}
        >
          {busy && <ButtonSpinner />}
        </Button>

        <T size={12.5} color={C.textTertiary} lh={18.75} style={{ marginTop: 16, textAlign: 'center' }}>
          We&apos;ll email you a link to confirm your address before you can sign in.
        </T>

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 32 }}>
          <T size={14} color={C.textSecondary}>
            Already have an account?
          </T>
          <Tap onPress={() => router.replace('/sign-in')} accessibilityRole="button" hitSlop={6}>
            <T w={600} size={14} color={C.text}>
              Sign in
            </T>
          </Tap>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

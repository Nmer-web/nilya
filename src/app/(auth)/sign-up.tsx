import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, FormError, PasswordField } from '@/components/field';
import { ScreenHeader } from '@/components/screen-header';
import { Button, T, Tap } from '@/components/ui';
import { referralCodeError } from '@/lib/referrals';
import { emailError, nameError, passwordError, MIN_PASSWORD } from '@/lib/validate';
import { useAuth } from '@/store/auth-store';
import { color as C, space, touch } from '@/theme/tokens';

export default function SignUp() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    name?: string | null;
    email?: string | null;
    referralCode?: string | null;
    password?: string | null;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;

    const nextErrors = {
      name: nameError(name),
      email: emailError(email),
      referralCode: referralCodeError(referralCode),
      password: passwordError(password),
    };
    setErrors(nextErrors);
    setFormError(null);
    if (
      nextErrors.name
      || nextErrors.email
      || nextErrors.referralCode
      || nextErrors.password
    ) return;

    setBusy(true);
    const { error, needsConfirmation } = await signUp(
      email,
      password,
      name,
      referralCode
    );
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
          Create your account
        </T>
        <T variant="body" color={C.textSecondary} style={{ marginTop: space.space8, marginBottom: space.space24 }}>
          Discover and sell new products across Sudan, France and beyond.
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
          placeholder="Your name"
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

        <Field
          label="Referral code (optional)"
          value={referralCode}
          onChangeText={(t) => {
            setReferralCode(t.toUpperCase());
            if (errors.referralCode) {
              setErrors((e) => ({ ...e, referralCode: null }));
            }
          }}
          error={errors.referralCode}
          placeholder="12-character code"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
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
          label="Create account"
          loading={busy}
          loadingLabel="Creating account…"
          onPress={submit}
          disabled={busy}
          style={{ marginTop: space.space12 }}
        />

        <T variant="caption" color={C.textSecondary} style={{ marginTop: space.space16, textAlign: 'center' }}>
          We&apos;ll email you a link to confirm your address before you can sign in.
        </T>

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.space4, marginTop: space.space32 }}>
          <T variant="metadata" color={C.textSecondary}>
            Already have an account?
          </T>
          <Tap
            onPress={() => router.replace('/sign-in')}
            accessibilityRole="button"
            hitSlop={6}
            style={{ minHeight: touch.minimum, justifyContent: 'center' }}
          >
            <T variant="button" color={C.primary}>
              Sign in
            </T>
          </Tap>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

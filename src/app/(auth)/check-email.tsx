import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ButtonSpinner, FormError } from '@/components/field';
import { Icon } from '@/components/icon';
import { Button, Note, T, Tap } from '@/components/ui';
import { useAuth } from '@/store/auth-store';
import { color as C, radius } from '@/theme/tokens';

/** Matches auth.email.max_frequency in supabase/config.toml. */
const RESEND_COOLDOWN_SECONDS = 60;

export default function CheckEmail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { pendingEmail, resendVerification, clearPending } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAgain, setSentAgain] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  // Reached without a pending address — nothing to show, so send them back.
  // Declarative redirect rather than an effect: no chance of navigating before
  // the navigator has mounted.
  if (!pendingEmail) return <Redirect href="/sign-in" />;

  const resend = async () => {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError(null);
    setSentAgain(false);

    const result = await resendVerification(pendingEmail);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSentAgain(true);
    startCooldown();
  };

  const backToSignIn = () => {
    clearPending();
    router.replace('/sign-in');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
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
          <Icon name="send" size={25} color={C.primaryText} strokeWidth={1.7} />
        </View>

        <T w={600} size={27} tracking={-0.6} lh={32.4} style={{ marginTop: 20 }}>
          Confirm your email
        </T>
        <T size={14.5} color={C.textSecondary} lh={22.5} style={{ marginTop: 10 }}>
          We sent a link to
        </T>
        <T w={600} size={15} style={{ marginTop: 2 }}>
          {pendingEmail}
        </T>
        <T size={14.5} color={C.textSecondary} lh={22.5} style={{ marginTop: 10 }}>
          Open it on this device and you&apos;ll be signed in automatically. The link expires after an hour.
        </T>

        {sentAgain && (
          <Note tone="green" style={{ marginTop: 20 }}>
            <T size={13.5} color={C.success} lh={19}>
              Sent again. If it still hasn&apos;t arrived, check your spam folder.
            </T>
          </Note>
        )}

        <View style={{ marginTop: 20 }}>
          <FormError message={error} />
        </View>

        <Button
          label={
            busy
              ? 'Sending…'
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Resend confirmation email'
          }
          variant="strong"
          onPress={resend}
          disabled={busy || cooldown > 0}
          style={{ marginTop: 8, opacity: cooldown > 0 && !busy ? 0.5 : 1 }}
        >
          {busy && <ButtonSpinner />}
        </Button>

        <View style={{ flex: 1 }} />

        <Tap
          onPress={backToSignIn}
          accessibilityRole="button"
          hitSlop={6}
          style={{ alignSelf: 'center', paddingVertical: 8, marginTop: 32 }}
        >
          <T w={600} size={14} color={C.text}>
            Back to sign in
          </T>
        </Tap>
      </ScrollView>
    </View>
  );
}

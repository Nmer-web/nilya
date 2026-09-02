import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { consumeAuthUrl } from '@/lib/auth-link';
import {
  normalizeReferralCode,
  referralCodeError,
} from '@/lib/referrals';
import { supabase } from '@/lib/supabase';

/**
 * The redirect Supabase sends users back to from confirmation and recovery
 * emails. Must also be listed under Authentication → URL Configuration →
 * Redirect URLs on the project, or Supabase silently falls back to Site URL.
 *
 * Custom schemes do not resolve inside Expo Go — this needs a development
 * build to test end to end.
 */
export const AUTH_REDIRECT = 'nilya://auth-callback';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

/** Every action resolves to this rather than throwing, so screens can render errors inline. */
export type ActionResult = { error: string | null };

/**
 * Returned by the two actions that can end in "we emailed you a link".
 *
 * `needsConfirmation` is part of the return value rather than something the
 * caller reads back off `pendingEmail`: setState is not synchronous, so a
 * screen inspecting context straight after awaiting the action still sees the
 * previous render's value and would miss the redirect entirely.
 */
export type CredentialResult = ActionResult & { needsConfirmation: boolean };

type AuthValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  /** True between opening a recovery link and choosing a new password. */
  recovering: boolean;
  /** Address awaiting confirmation, set when sign-up returns no session. */
  pendingEmail: string | null;

  /**
   * `displayName` is optional. The sign-up screen collects one; onboarding does
   * not, because it asks for a name on the profile step after confirmation.
   * When it is omitted, `handle_new_user()` seeds `profiles.display_name` from
   * the email's local part, which the profile step then pre-fills and the
   * member can correct.
   */
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    referralCode?: string
  ) => Promise<CredentialResult>;
  signIn: (email: string, password: string) => Promise<CredentialResult>;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<ActionResult>;
  requestPasswordReset: (email: string) => Promise<ActionResult>;
  updatePassword: (password: string) => Promise<ActionResult>;
  /** Leaves the confirmation-pending screen without signing anyone in. */
  clearPending: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  /** Guards against setState landing after unmount on a slow network. */
  const alive = useRef(true);
  /** Once the auth listener has reported, it is the source of truth for `session`. */
  const sawAuthEvent = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /* ── session bootstrap and listener ── */

  useEffect(() => {
    /**
     * Nothing in this callback may await another supabase.auth call. The
     * client holds an internal lock while dispatching, so calling back into
     * it here deadlocks. Synchronous state updates only.
     */
    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      if (!alive.current) return;

      sawAuthEvent.current = true;
      setSession(next);
      setInitializing(false);

      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') {
        setRecovering(false);
        setPendingEmail(null);
      }
      if (event === 'SIGNED_IN') setPendingEmail(null);
    });

    /**
     * onAuthStateChange emits INITIAL_SESSION, but read storage explicitly too:
     * if that emission were ever missed, `initializing` would never clear and
     * the splash screen would stay up forever.
     *
     * The listener wins on session, though. A deep link can land between this
     * call and its resolution, and writing the value read back here would
     * clobber the newer session with a stale null.
     */
    supabase.auth.getSession().then(({ data }) => {
      if (!alive.current) return;
      if (!sawAuthEvent.current) setSession(data.session);
      setInitializing(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  /* ── deep links ── */

  useEffect(() => {
    let cancelled = false;
    /**
     * A cold-start link is reported by getInitialURL AND, on some platforms,
     * by the url listener as well. Recovery codes are single-use, so the
     * second pass would fail and could clear state the first pass just set.
     */
    const seen = new Set<string>();

    const handle = async (url: string | null) => {
      if (!url || seen.has(url)) return;
      seen.add(url);

      const result = await consumeAuthUrl(url);
      if (cancelled || !alive.current) return;

      if (result.kind === 'recovery') {
        setRecovering(true);
      } else if (result.kind === 'signedIn') {
        setPendingEmail(null);
      }
      // 'error' and 'ignored' need no state change here. Recovery failures
      // surface on the reset screen when the update call is rejected.
    };

    // Cold start: the link that launched the app.
    Linking.getInitialURL().then(handle);
    // Warm: app already running.
    const sub = Linking.addEventListener('url', ({ url }) => void handle(url));

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  /* ── actions ── */

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName?: string,
      referralCode?: string
    ): Promise<CredentialResult> => {
      const name = displayName?.trim();
      const code = normalizeReferralCode(referralCode ?? '');
      const codeError = referralCodeError(code);
      if (codeError) return { error: codeError, needsConfirmation: false };

      if (code) {
        const { data: exists, error: referralError } = await supabase.rpc(
          'referral_code_exists',
          { p_code: code }
        );
        if (referralError) {
          return {
            error: 'The referral code could not be checked. Try again.',
            needsConfirmation: false,
          };
        }
        if (exists !== true) {
          return { error: 'That referral code is not valid.', needsConfirmation: false };
        }
      }

      const metadata = {
        ...(name ? { display_name: name } : {}),
        ...(code ? { referral_code: code } : {}),
      };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: AUTH_REDIRECT,
          // Read by the handle_new_user() trigger to seed profiles.display_name.
          // Omitted entirely when there is no name to give, so the trigger falls
          // back to the email's local part rather than being handed an empty
          // string it would have to reject.
          ...(Object.keys(metadata).length > 0 ? { data: metadata } : {}),
        },
      });

      if (error) return { error: error.message, needsConfirmation: false };

      /**
       * With confirmations on, signing up with an address that already exists
       * returns success with an empty identities array rather than an error —
       * deliberate, so the endpoint can't be used to enumerate accounts. Treat
       * it as the confirmation-pending case: a real owner gets their email,
       * a stranger learns nothing.
       */
      const needsConfirmation = !data.session;
      if (needsConfirmation && alive.current) setPendingEmail(email.trim());

      return { error: null, needsConfirmation };
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string): Promise<CredentialResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      /**
       * Supabase returns the same "Invalid login credentials" for a wrong
       * password and for an unconfirmed account, so surface the confirmation
       * route when the server names it explicitly and otherwise pass it through.
       */
      if (error.message.toLowerCase().includes('not confirmed')) {
        if (alive.current) setPendingEmail(email.trim());
        return { error: 'Confirm your email address to sign in.', needsConfirmation: true };
      }
      return { error: error.message, needsConfirmation: false };
    }
    return { error: null, needsConfirmation: false };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // The SIGNED_OUT listener clears the rest; this is belt and braces for the
    // case where the call fails offline and no event fires.
    if (alive.current) {
      setSession(null);
      setRecovering(false);
      setPendingEmail(null);
    }
  }, []);

  const resendVerification = useCallback(async (email: string): Promise<ActionResult> => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: AUTH_REDIRECT },
    });
    return { error: error?.message ?? null };
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<ActionResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: AUTH_REDIRECT,
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<ActionResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    // Recovery is done; the guard in app/_layout.tsx hands control back to the app.
    if (alive.current) setRecovering(false);
    return { error: null };
  }, []);

  const clearPending = useCallback(() => setPendingEmail(null), []);

  const status: AuthStatus = initializing ? 'loading' : session ? 'signedIn' : 'signedOut';

  const value = useMemo<AuthValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      recovering,
      pendingEmail,
      signUp,
      signIn,
      signOut,
      resendVerification,
      requestPasswordReset,
      updatePassword,
      clearPending,
    }),
    [
      status,
      session,
      recovering,
      pendingEmail,
      signUp,
      signIn,
      signOut,
      resendVerification,
      requestPasswordReset,
      updatePassword,
      clearPending,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { isLikelyConnectionError, retryableReadMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import {
  resumePublicationRecovery,
  type PublicationOutcome,
  type PublicationPhase,
} from '@/lib/listing-publication';
import { orchestrateSellerRecovery, type PublicationRecoveryRecordV1 } from '@/lib/listing-recovery';
import { useApp } from '@/store/app-store';
import { useAuth } from '@/store/auth-store';
import { color as C, space } from '@/theme/tokens';

export type RecoveryUi =
  | { kind: 'checking'; sellerId: string | null; message: string }
  | { kind: 'ready'; sellerId: string }
  | {
      kind: 'blocked';
      sellerId: string;
      message: string;
      reason: 'recovery' | 'integrity';
      recoveryRecord: PublicationRecoveryRecordV1 | null;
    };

type RecoveryContextValue = {
  recovery: RecoveryUi;
  phase: PublicationPhase | null;
  setPhase: (phase: PublicationPhase | null) => void;
  /** A failed publication that left server state behind blocks the wizard until cleaned up. */
  block: (input: { message: string; reason: 'recovery' | 'integrity'; recoveryRecord: PublicationRecoveryRecordV1 | null }) => void;
};

const RecoveryContext = createContext<RecoveryContextValue | null>(null);

/** The message for a failed publication, with connection failures explained. */
export function publicationFailureMessage(outcome: Exclude<PublicationOutcome, { kind: 'success' }>): string {
  if (!isLikelyConnectionError(outcome.message)) return outcome.message;
  if (outcome.kind === 'recovery-required') {
    return 'NILYA could not confirm the previous publication. The recovery record was preserved and no duplicate will be started. Check your connection and retry cleanup.';
  }
  if (outcome.kind === 'failed-clean') {
    return 'NILYA could not connect while publishing. No listing was confirmed live. Check your connection and retry publication.';
  }
  return outcome.message;
}

/**
 * Gates the Sell wizard behind the seller's publication recovery.
 *
 * A publication that stopped part-way leaves a private draft and perhaps
 * uploaded objects behind. Before a seller can start another listing that
 * state is either finished, cleaned up, or surfaced as needing attention —
 * the same fail-closed rule the previous Sell screen enforced, now around the
 * whole wizard.
 */
export function SellGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, user } = useAuth();
  const { flash } = useApp();
  const { reduceMotion } = useReducedMotion();
  const [recovery, setRecovery] = useState<RecoveryUi>({
    kind: 'checking',
    sellerId: null,
    message: 'Checking previous listing…',
  });
  const [phase, setPhase] = useState<PublicationPhase | null>(null);
  const [nonce, setNonce] = useState(0);
  const retryRecord = useRef<PublicationRecoveryRecordV1 | null>(null);

  useEffect(() => {
    if (status !== 'signedIn' || !user?.id) return;
    const sellerId = user.id;
    let cancelled = false;
    void (async () => {
      const entry = retryRecord.current?.sellerId === sellerId
        ? {
            kind: 'resumed' as const,
            result: await resumePublicationRecovery(retryRecord.current, { onPhase: setPhase }),
          }
        : await orchestrateSellerRecovery(sellerId, (record) =>
            resumePublicationRecovery(record, { onPhase: setPhase })
          );
      if (cancelled) return;
      if (entry.kind === 'none') {
        retryRecord.current = null;
        setRecovery({ kind: 'ready', sellerId });
        return;
      }
      if (entry.kind === 'integrity-error') {
        retryRecord.current = null;
        setRecovery({ kind: 'blocked', sellerId, message: entry.message, reason: 'integrity', recoveryRecord: null });
        return;
      }
      const result = entry.result;
      if (result.kind === 'success') {
        retryRecord.current = null;
        setPhase(null);
        setRecovery({ kind: 'ready', sellerId });
        haptic('publication-confirmed');
        await new Promise<void>((resolve) => setTimeout(resolve, reduceMotion ? 120 : 700));
        if (cancelled) return;
        flash('Your product is live');
        router.replace({ pathname: '/listing/[id]', params: { id: result.listingId, published: '1' } });
        return;
      }
      if (result.kind === 'failed-clean') {
        retryRecord.current = null;
        setPhase(null);
        setRecovery({ kind: 'ready', sellerId });
        return;
      }
      if (result.kind === 'recovery-required') retryRecord.current = result.recoveryRecord;
      setRecovery({
        kind: 'blocked',
        sellerId,
        message: publicationFailureMessage(result),
        reason: result.kind === 'recovery-required' ? 'recovery' : 'integrity',
        recoveryRecord: result.kind === 'recovery-required' ? result.recoveryRecord : null,
      });
    })().catch((caught) => {
      if (cancelled) return;
      setRecovery({
        kind: 'blocked',
        sellerId,
        message: retryableReadMessage(caught, 'Previous listing recovery could not be checked.'),
        reason: 'recovery',
        recoveryRecord: retryRecord.current,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [flash, nonce, reduceMotion, router, status, user?.id]);

  const currentSellerId = user?.id ?? null;
  const block = useCallback<RecoveryContextValue['block']>((input) => {
    if (!currentSellerId) return;
    retryRecord.current = input.recoveryRecord;
    setRecovery({ kind: 'blocked', sellerId: currentSellerId, ...input });
  }, [currentSellerId]);

  const value = useMemo<RecoveryContextValue>(() => ({ recovery, phase, setPhase, block }), [recovery, phase, block]);

  if (status !== 'signedIn') {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top }}>
        <EmptyState
          icon="person"
          title="Sign in to sell"
          body="You need an account before you can publish a listing."
          action={<Button label="Sign in" onPress={() => router.push('/sign-in')} style={{ marginTop: space.space20 }} />}
        />
      </View>
    );
  }

  const ready = recovery.kind === 'ready' && recovery.sellerId === user?.id;
  if (!ready) {
    const blocked = recovery.kind === 'blocked' && recovery.sellerId === user?.id;
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top }}>
        <EmptyState
          icon="package"
          title={blocked ? 'Publication needs attention' : 'Finishing a previous listing'}
          body={blocked ? recovery.message : 'Checking previous listing…'}
          action={
            blocked ? (
              <View style={{ marginTop: space.space20, gap: space.space12 }}>
                <Button
                  label={recovery.reason === 'integrity' ? 'Retry recovery check' : 'Retry cleanup'}
                  onPress={() => {
                    retryRecord.current = recovery.reason === 'recovery' ? recovery.recoveryRecord : null;
                    setRecovery({ kind: 'checking', sellerId: user?.id ?? null, message: 'Checking previous listing…' });
                    setNonce((current) => current + 1);
                  }}
                />
                {recovery.reason === 'integrity' ? (
                  <Button label="Back to Home" variant="secondary" onPress={() => router.dismissTo('/')} />
                ) : null}
              </View>
            ) : undefined
          }
        />
      </View>
    );
  }

  return <RecoveryContext.Provider value={value}>{children}</RecoveryContext.Provider>;
}

export function useRecovery(): RecoveryContextValue {
  const context = useContext(RecoveryContext);
  if (!context) throw new Error('useRecovery must be used inside the Sell wizard');
  return context;
}

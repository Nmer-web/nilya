import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  RefreshControl,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Button, InlineError, ScreenError, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { fetchOwnReferralSummary } from '@/lib/queries';
import { referralInviteShareContent } from '@/lib/referrals';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/app-store';
import { useAuth } from '@/store/auth-store';
import { color as C, elevation, radius, space } from '@/theme/tokens';

type InviteAction = 'copy' | 'share';
type ReferralRealtimeState = 'connecting' | 'live' | 'paused';

export default function ReferralsRoute() {
  const { user } = useAuth();
  if (!user) return null;
  return <ReferralsScreen key={user.id} userId={user.id} />;
}

function ReferralsScreen({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const { flash } = useApp();
  const summary = useLiveReferralSummary(userId);
  const [activeAction, setActiveAction] = useState<InviteAction | null>(null);
  const [actionError, setActionError] = useState<{
    action: InviteAction;
    message: string;
  } | null>(null);

  const copyCode = async () => {
    if (!summary.data || activeAction) return;
    setActiveAction('copy');
    setActionError(null);
    try {
      const copied = await Clipboard.setStringAsync(summary.data.code);
      if (!copied) throw new Error('Clipboard rejected the value.');
      flash('Referral code copied');
      AccessibilityInfo.announceForAccessibility('Referral code copied');
    } catch {
      setActionError({
        action: 'copy',
        message: 'Your referral code could not be copied. Try again.',
      });
    } finally {
      setActiveAction(null);
    }
  };

  const shareInvite = async () => {
    if (!summary.data || activeAction) return;
    setActiveAction('share');
    setActionError(null);
    try {
      await Share.share(referralInviteShareContent(summary.data.code));
    } catch {
      setActionError({
        action: 'share',
        message: 'Your invite could not be shared. Try again.',
      });
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <View className="flex-1 bg-nilya-background">
      <ScreenHeader
        title="Invite friends"
        right={<RealtimeStatus state={summary.realtimeState} />}
      />

      {summary.loading ? (
        <ReferralSkeleton />
      ) : summary.error || !summary.data ? (
        <ScreenError
          error={summary.error}
          title="Could not load your referral code"
          onRetry={summary.refetch}
        />
      ) : (
        <ScrollView
          className="flex-1 bg-nilya-background"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={summary.refreshing}
              onRefresh={summary.refresh}
              tintColor={C.textSecondary}
            />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + space.space40 }}
        >
          <View
            style={{
              minHeight: 270,
              marginHorizontal: space.gutterCompact,
              marginTop: space.space20,
              overflow: 'hidden',
              borderRadius: radius.radiusXLarge,
              borderCurve: 'continuous',
              backgroundColor: C.primary,
              padding: space.space20,
              ...elevation.card,
            }}
          >
            <View
              accessible={false}
              style={{
                position: 'absolute',
                width: 220,
                height: 220,
                right: -86,
                top: -112,
                borderRadius: radius.radiusPill,
                backgroundColor: C.accent,
                opacity: 0.2,
              }}
            />
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.radiusPill,
                backgroundColor: C.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="send" role="navigation" color={C.textPrimary} decorative />
            </View>
            <T
              variant="caption"
              color={`${C.surface}C7`}
              style={{ marginTop: space.space16, letterSpacing: 1.5, textTransform: 'uppercase' }}
            >
              Nilya invites
            </T>
            <T variant="sectionTitle" color={C.textInverse} style={{ marginTop: space.space4 }}>
              Share Nilya with people you trust.
            </T>
            <T variant="body" color={`${C.surface}D9`} style={{ marginTop: space.space8 }} selectable>
              Your friend can enter this personal code while creating their account.
            </T>
            <View
              accessible
              accessibilityLabel={`Your referral code is ${summary.data.code}`}
              style={{
                marginTop: space.space20,
                borderWidth: 1,
                borderColor: `${C.surface}3D`,
                borderRadius: radius.radiusMedium,
                backgroundColor: `${C.surface}17`,
                paddingHorizontal: space.space16,
                paddingVertical: space.space12,
              }}
            >
              <T variant="caption" color={`${C.surface}B8`} style={{ letterSpacing: 1.2 }}>
                YOUR REFERRAL CODE
              </T>
              <View style={{ marginTop: space.space4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <T
                  variant="productTitle"
                  color={C.textInverse}
                  selectable
                  style={{ letterSpacing: 2.5, fontVariant: ['tabular-nums'] }}
                >
                  {summary.data.code}
                </T>
                <Icon name="check" role="metadata" color={C.accent} decorative />
              </View>
            </View>
          </View>

          <View className="flex-row gap-3 px-5 pt-5">
            <Button
              label="Copy code"
              variant="secondary"
              loading={activeAction === 'copy'}
              loadingLabel="Copying…"
              disabled={activeAction !== null}
              onPress={() => void copyCode()}
              style={{ flex: 1 }}
            />
            <Button
              label="Share invite"
              loading={activeAction === 'share'}
              loadingLabel="Sharing…"
              disabled={activeAction !== null}
              onPress={() => void shareInvite()}
              style={{ flex: 1 }}
            />
          </View>

          {actionError ? (
            <InlineError
              message={actionError.message}
              actionLabel="Retry"
              onAction={actionError.action === 'copy'
                ? () => void copyCode()
                : () => void shareInvite()}
              style={{ marginHorizontal: space.space20, marginTop: space.space12 }}
            />
          ) : null}

          <View className="px-5 pt-8">
            <T variant="sectionTitle" accessibilityRole="header">
              Confirmed friends
            </T>
            <View
              accessible
              accessibilityLabel={`${summary.data.invitedCount} confirmed ${summary.data.invitedCount === 1 ? 'friend' : 'friends'}`}
              style={{
                marginTop: space.space12,
                minHeight: 126,
                borderRadius: radius.radiusLarge,
                borderCurve: 'continuous',
                backgroundColor: C.primarySoft,
                padding: space.space16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.space16,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.radiusPill,
                  backgroundColor: C.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...elevation.raised,
                }}
              >
                <Icon name="person" role="navigation" color={C.primary} decorative />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="display" selectable style={{ fontVariant: ['tabular-nums'] }}>
                  {summary.data.invitedCount.toLocaleString()}
                </T>
                <T variant="body" color={C.textSecondary} selectable>
                  confirmed {summary.data.invitedCount === 1 ? 'account' : 'accounts'}
                </T>
                <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4 }}>
                  {summary.realtimeState === 'live'
                    ? 'This total updates live.'
                    : 'Live updates are reconnecting.'}
                </T>
              </View>
            </View>
            <T variant="body" color={C.textSecondary} className="mt-4" selectable>
              A referral is counted after the invited account confirms its email. Each
              account can use one referral code, and the attribution cannot be changed.
            </T>
          </View>

          <View className="px-5 pt-8">
            <T variant="sectionTitle" accessibilityRole="header">
              How it works
            </T>
            <View className="mt-4 gap-3">
              <ReferralStep number="1" text="Copy your code or open the share sheet." />
              <ReferralStep number="2" text="Your friend enters the code while creating their account." />
              <ReferralStep number="3" text="The confirmed account appears in your invited-friends count." />
            </View>
            <View
              style={{
                marginTop: space.space16,
                borderRadius: radius.radiusMedium,
                backgroundColor: C.bgMuted,
                padding: space.space12,
              }}
            >
              <T variant="metadata" color={C.textSecondary} selectable>
                Referral rewards are not offered at this time.
              </T>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Keeps the confirmed referral count aligned with Supabase. The INSERT event
 * is only an invalidation signal: the trusted, RLS-scoped query remains the
 * source of both the stable code and the confirmed count.
 */
function useLiveReferralSummary(userId: string) {
  const summary = useAsync(fetchOwnReferralSummary, `referrals:${userId}`);
  const [realtimeState, setRealtimeState] = useState<ReferralRealtimeState>('connecting');
  const refreshRef = useRef(summary.refresh);

  useEffect(() => {
    refreshRef.current = summary.refresh;
  }, [summary.refresh]);

  useEffect(() => {
    const channel = supabase
      .channel(`referrals:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${userId}`,
        },
        () => refreshRef.current()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeState('live');
          // Close the fetch-to-subscribe race without incrementing locally.
          refreshRef.current();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeState('paused');
        } else {
          setRealtimeState('connecting');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return { ...summary, realtimeState };
}

function RealtimeStatus({ state }: { state: ReferralRealtimeState }) {
  const label = state === 'live' ? 'Live' : state === 'paused' ? 'Reconnecting' : 'Connecting';

  return (
    <View
      accessible
      accessibilityLabel={`Referral updates: ${label}`}
      style={{
        minHeight: 32,
        marginRight: space.space8,
        paddingHorizontal: space.space12,
        borderRadius: radius.radiusPill,
        backgroundColor: state === 'live' ? C.successSurface : C.bgMuted,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space8,
      }}
    >
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: radius.radiusPill,
          backgroundColor: state === 'live' ? C.success : C.warning,
        }}
      />
      <T variant="metadataMedium" color={state === 'live' ? C.success : C.textSecondary}>
        {label}
      </T>
    </View>
  );
}

function ReferralStep({ number, text }: { number: string; text: string }) {
  return (
    <View
      style={{
        minHeight: 72,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: radius.radiusMedium,
        borderCurve: 'continuous',
        backgroundColor: C.surface,
        padding: space.space12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.radiusPill,
          backgroundColor: C.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <T variant="metadataMedium" color={C.primary}>{number}</T>
      </View>
      <T variant="body" style={{ flex: 1 }} selectable>
        {text}
      </T>
    </View>
  );
}

function ReferralSkeleton() {
  return (
    <View
      className="flex-1 gap-6 px-5 pt-6"
      accessibilityRole="progressbar"
      accessibilityLabel="Loading your referral details"
    >
      <View className="gap-3">
        <Skeleton width="62%" height={24} />
        <Skeleton width="92%" height={15} />
        <Skeleton width="78%" height={15} />
      </View>
      <View className="items-center gap-3 border-y border-nilya-border py-6">
        <Skeleton width={122} height={13} />
        <Skeleton width={214} height={30} />
      </View>
      <View className="flex-row gap-3">
        <Skeleton width="48%" height={52} round={radius.radiusMedium} />
        <Skeleton width="48%" height={52} round={radius.radiusMedium} />
      </View>
      <View className="gap-3 pt-3">
        <Skeleton width="44%" height={24} />
        <Skeleton width="34%" height={34} />
        <Skeleton width="88%" height={15} />
      </View>
    </View>
  );
}

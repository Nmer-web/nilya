import * as Clipboard from 'expo-clipboard';
import React from 'react';
import {
  AccessibilityInfo,
  RefreshControl,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Button, InlineError, ScreenError, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { fetchOwnReferralSummary } from '@/lib/queries';
import { referralInviteShareContent } from '@/lib/referrals';
import { useApp } from '@/store/app-store';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space } from '@/theme/tokens';

type InviteAction = 'copy' | 'share';

export default function ReferralsRoute() {
  const { user } = useAuth();
  if (!user) return null;
  return <ReferralsScreen key={user.id} userId={user.id} />;
}

function ReferralsScreen({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const { flash } = useApp();
  const summary = useAsync(
    fetchOwnReferralSummary,
    `referrals:${userId}`
  );
  const [activeAction, setActiveAction] = React.useState<InviteAction | null>(null);
  const [actionError, setActionError] = React.useState<{
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
      <ScreenHeader title="Invite friends" />

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
          <View className="px-5 pb-2 pt-6">
            <T variant="sectionTitle" accessibilityRole="header">
              Invite friends to NILYA
            </T>
            <T variant="body" color={C.textSecondary} className="mt-2" selectable>
              Share your code with someone you know. They can enter it when they create
              their account.
            </T>
          </View>

          <View
            className="mx-5 mt-5 items-center border-y border-nilya-border py-6"
            accessibilityLabel={`Your referral code is ${summary.data.code}`}
          >
            <T variant="cardTitle" color={C.textSecondary}>
              YOUR REFERRAL CODE
            </T>
            <T
              variant="productTitle"
              className="mt-3"
              selectable
              style={{ letterSpacing: 3, fontVariant: ['tabular-nums'] }}
            >
              {summary.data.code}
            </T>
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
              Invited friends
            </T>
            <View className="mt-4 flex-row items-end gap-3 border-b border-nilya-border pb-5">
              <T
                variant="display"
                selectable
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {summary.data.invitedCount.toLocaleString()}
              </T>
              <T variant="body" color={C.textSecondary} className="pb-1" selectable>
                confirmed {summary.data.invitedCount === 1 ? 'account' : 'accounts'}
              </T>
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
            <View className="mt-4 gap-4">
              <ReferralStep number="1" text="Copy your code or open the share sheet." />
              <ReferralStep number="2" text="Your friend enters the code while creating their account." />
              <ReferralStep number="3" text="The confirmed account appears in your invited-friends count." />
            </View>
            <T variant="metadata" color={C.textSecondary} className="mt-5" selectable>
              Referral rewards are not offered at this time.
            </T>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function ReferralStep({ number, text }: { number: string; text: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View
        className="h-8 w-8 items-center justify-center bg-nilya-surface-2"
        style={{ borderRadius: radius.radiusPill }}
      >
        <T variant="caption">{number}</T>
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

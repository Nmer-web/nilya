import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ScreenError, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import {
  earnedSellerBadgeCount,
  lockedBadgeProgress,
  sellerBadgeCopy,
  sellerBadgeIcon,
} from '@/lib/badges';
import type { SellerBadgeRow } from '@/lib/database.types';
import { fetchOwnSellerBadges } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space } from '@/theme/tokens';

export default function BadgesRoute() {
  const { user } = useAuth();
  if (!user) return null;
  return <BadgesScreen key={user.id} userId={user.id} />;
}

function BadgesScreen({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const badges = useAsync(fetchOwnSellerBadges, `seller-badges:${userId}`);

  return (
    <View className="flex-1 bg-nilya-background">
      <ScreenHeader title="Badges" />

      {badges.loading ? (
        <BadgesSkeleton />
      ) : badges.error || !badges.data ? (
        <ScreenError
          error={badges.error}
          title="Could not load your badges"
          onRetry={badges.refetch}
        />
      ) : (
        <BadgeList
          badges={badges.data}
          refreshing={badges.refreshing}
          onRefresh={badges.refresh}
          bottomInset={insets.bottom}
        />
      )}
    </View>
  );
}

function BadgeList({
  badges,
  refreshing,
  onRefresh,
  bottomInset,
}: {
  badges: SellerBadgeRow[];
  refreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}) {
  const earnedCount = earnedSellerBadgeCount(badges);

  return (
    <ScrollView
      className="flex-1 bg-nilya-background"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C.textSecondary}
        />
      }
      contentContainerStyle={{ paddingBottom: bottomInset + space.space40 }}
    >
      <View className="px-5 pb-5 pt-6">
        <T variant="sectionTitle" accessibilityRole="header">
          Your badges
        </T>
        <T
          variant="display"
          className="mt-2"
          selectable
          accessibilityLabel={`${earnedCount} ${earnedCount === 1 ? 'badge' : 'badges'} earned`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {earnedCount} earned
        </T>
        <T variant="body" color={C.textSecondary} className="mt-2" selectable>
          Achievements are awarded from your real profile, products, seller reviews,
          and confirmed referrals.
        </T>
      </View>

      {earnedCount === 0 ? (
        <View className="mx-5 border-y border-nilya-border py-5">
          <T variant="bodyMedium">No badges yet</T>
          <T variant="body" color={C.textSecondary} className="mt-1" selectable>
            Continue selling and completing your profile to unlock achievements.
          </T>
        </View>
      ) : null}

      <View className="px-5 pt-7">
        <T variant="sectionTitle" accessibilityRole="header">
          Achievements
        </T>
        <View className="mt-3">
          {badges.map((badge, index) => (
            <SellerBadge
              key={badge.badge_key}
              badge={badge}
              last={index === badges.length - 1}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function SellerBadge({ badge, last }: { badge: SellerBadgeRow; last: boolean }) {
  const earned = badge.earned_at !== null;
  const progress = lockedBadgeProgress(badge);
  const status = earned ? 'EARNED' : 'LOCKED';

  return (
    <View
      className={`flex-row gap-4 py-5 ${last ? '' : 'border-b border-nilya-border'}`}
    >
      <View
        className={`h-12 w-12 items-center justify-center ${earned ? 'bg-nilya-accent' : 'bg-nilya-surface-2'}`}
        style={{ borderRadius: radius.radiusPill }}
      >
        <Icon
          name={sellerBadgeIcon(badge.icon_key)}
          role="inline"
          color={earned ? C.textPrimary : C.textSecondary}
          decorative
        />
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-start gap-3">
          <T variant="bodyMedium" style={{ flex: 1 }}>
            {badge.title}
          </T>
          <T variant="caption" color={earned ? C.textPrimary : C.textSecondary}>
            {status}
          </T>
        </View>
        <T variant="body" color={C.textSecondary} className="mt-1" selectable>
          {sellerBadgeCopy(earned ? badge.description : badge.requirement)}
        </T>

        {progress ? (
          <View
            className="mt-3"
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: progress.target,
              now: progress.current,
              text: `${progress.current} of ${progress.target}`,
            }}
          >
            <View className="flex-row items-center justify-between">
              <T variant="metadata" color={C.textSecondary}>
                Progress
              </T>
              <T
                variant="metadataMedium"
                color={C.textSecondary}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {progress.current} / {progress.target}
              </T>
            </View>
            <View
              className="mt-2 h-1 overflow-hidden bg-nilya-surface-2"
              style={{ borderRadius: radius.radiusPill }}
            >
              <View
                className="h-full bg-nilya-primary"
                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
              />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function BadgesSkeleton() {
  return (
    <View
      className="flex-1 gap-6 px-5 pt-6"
      accessibilityRole="progressbar"
      accessibilityLabel="Loading your badges"
    >
      <View className="gap-3">
        <Skeleton width="42%" height={24} />
        <Skeleton width="34%" height={38} />
        <Skeleton width="88%" height={15} />
      </View>
      <View className="gap-5 pt-2">
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} className="flex-row gap-4">
            <Skeleton width={48} height={48} round={radius.radiusPill} />
            <View className="flex-1 gap-2">
              <Skeleton width="58%" height={16} />
              <Skeleton width="92%" height={14} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

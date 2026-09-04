import React, { useEffect, useRef, useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth-store';
import { color as C, elevation, radius, space } from '@/theme/tokens';

type BadgeRealtimeState = 'connecting' | 'live' | 'paused';

export default function BadgesRoute() {
  const { user } = useAuth();
  if (!user) return null;
  return <BadgesScreen key={user.id} userId={user.id} />;
}

function BadgesScreen({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const badges = useLiveSellerBadges(userId);

  return (
    <View className="flex-1 bg-nilya-background">
      <ScreenHeader
        title="Seller badges"
        right={<RealtimeStatus state={badges.realtimeState} />}
      />

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
          realtimeState={badges.realtimeState}
        />
      )}
    </View>
  );
}

/**
 * Reads the trusted current-user badge RPC and keeps it current from the
 * private `user_badges` INSERT stream. The database remains the only awarder:
 * a realtime event is only a signal to refetch the authoritative joined view.
 */
function useLiveSellerBadges(userId: string) {
  const badges = useAsync(fetchOwnSellerBadges, `seller-badges:${userId}`);
  const [realtimeState, setRealtimeState] = useState<BadgeRealtimeState>('connecting');
  const refreshRef = useRef(badges.refresh);

  useEffect(() => {
    refreshRef.current = badges.refresh;
  }, [badges.refresh]);

  useEffect(() => {
    const channel = supabase
      .channel(`seller-badges:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${userId}`,
        },
        () => refreshRef.current()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeState('live');
          // Close the fetch-to-subscribe race without mutating badge state locally.
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

  return { ...badges, realtimeState };
}

function RealtimeStatus({ state }: { state: BadgeRealtimeState }) {
  const label = state === 'live' ? 'Live' : state === 'paused' ? 'Reconnecting' : 'Connecting';

  return (
    <View
      accessible
      accessibilityLabel={`Badge updates: ${label}`}
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

function BadgeList({
  badges,
  refreshing,
  onRefresh,
  bottomInset,
  realtimeState,
}: {
  badges: SellerBadgeRow[];
  refreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
  realtimeState: BadgeRealtimeState;
}) {
  const earnedCount = earnedSellerBadgeCount(badges);
  const earnedRatio = badges.length === 0 ? 0 : earnedCount / badges.length;

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
      <View
        style={{
          minHeight: 210,
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
            width: 190,
            height: 190,
            right: -78,
            top: -92,
            borderRadius: radius.radiusPill,
            backgroundColor: C.accent,
            opacity: 0.18,
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
          <Icon name="badgeCheck" role="navigation" color={C.textPrimary} decorative />
        </View>
        <T
          variant="caption"
          color={`${C.surface}C7`}
          style={{ marginTop: space.space16, letterSpacing: 1.5, textTransform: 'uppercase' }}
        >
          Nilya seller achievements
        </T>
        <View
          style={{
            marginTop: space.space4,
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: space.space8,
          }}
        >
          <T
            variant="display"
            color={C.textInverse}
            selectable
            accessibilityLabel={`${earnedCount} of ${badges.length} badges earned`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {earnedCount}
          </T>
          <T variant="body" color={`${C.surface}D9`}>
            of {badges.length} earned
          </T>
        </View>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={
            badges.length > 0
              ? { min: 0, max: badges.length, now: earnedCount }
              : { text: 'No active badge definitions' }
          }
          style={{
            height: 6,
            marginTop: space.space16,
            overflow: 'hidden',
            borderRadius: radius.radiusPill,
            backgroundColor: `${C.surface}38`,
          }}
        >
          <View
            style={{
              width: `${Math.round(earnedRatio * 100)}%`,
              height: '100%',
              borderRadius: radius.radiusPill,
              backgroundColor: C.accent,
            }}
          />
        </View>
        <T variant="metadata" color={`${C.surface}D9`} style={{ marginTop: space.space12 }}>
          {realtimeState === 'live'
            ? 'New achievements appear here as soon as Nilya awards them.'
            : 'Your saved achievements remain available while live updates reconnect.'}
        </T>
      </View>

      {badges.length === 0 ? (
        <View
          style={{
            marginHorizontal: space.gutterCompact,
            marginTop: space.space20,
            borderRadius: radius.radiusLarge,
            backgroundColor: C.bgMuted,
            padding: space.space20,
          }}
        >
          <T variant="bodyMedium">No seller achievements available</T>
          <T variant="body" color={C.textSecondary} style={{ marginTop: space.space4 }} selectable>
            Nilya has not published any active badge definitions yet. Pull down to check again.
          </T>
        </View>
      ) : null}

      {badges.length > 0 ? (
        <View className="px-5 pt-7">
          <T variant="sectionTitle" accessibilityRole="header">
            Badge collection
          </T>
          <T variant="body" color={C.textSecondary} style={{ marginTop: space.space4 }}>
            Earned automatically from your real Nilya seller activity.
          </T>
          <View className="mt-4">
            {badges.map((badge, index) => (
              <SellerBadge
                key={badge.badge_key}
                badge={badge}
                last={index === badges.length - 1}
              />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function SellerBadge({ badge, last }: { badge: SellerBadgeRow; last: boolean }) {
  const earned = badge.earned_at !== null;
  const progress = lockedBadgeProgress(badge);
  const status = earned ? 'Earned' : 'Locked';

  return (
    <View
      style={{
        marginBottom: last ? 0 : space.space12,
        padding: space.space16,
        borderWidth: 1,
        borderColor: earned ? `${C.primary}24` : C.border,
        borderRadius: radius.radiusLarge,
        borderCurve: 'continuous',
        backgroundColor: C.surface,
        flexDirection: 'row',
        gap: space.space12,
        ...elevation.raised,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.radiusPill,
          backgroundColor: earned ? C.primarySoft : C.bgMuted,
        }}
      >
        <Icon
          name={sellerBadgeIcon(badge.icon_key)}
          role="inline"
          color={earned ? C.primary : C.textSecondary}
          decorative
        />
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-start gap-3">
          <T variant="bodyMedium" style={{ flex: 1 }}>
            {badge.title}
          </T>
          <View
            style={{
              minHeight: 24,
              justifyContent: 'center',
              borderRadius: radius.radiusPill,
              backgroundColor: earned ? C.successSurface : C.bgMuted,
              paddingHorizontal: space.space8,
            }}
          >
            <T variant="caption" color={earned ? C.success : C.textSecondary}>
              {status}
            </T>
          </View>
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

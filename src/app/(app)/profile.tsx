import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavClearance } from '@/components/bottom-nav';
import { Icon, type IconName } from '@/components/icon';
import { ListingGrid } from '@/components/listing-card';
import { ProductGridSkeleton, Skeleton } from '@/components/skeleton';
import { Avatar, Button, EmptyState, InlineError, PressableScale, RefreshNotice, ScreenError, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/store/cart-store';
import { earnedSellerBadgeCount } from '@/lib/badges';
import { hasActiveBundleDiscount } from '@/lib/bundle-discounts';
import { formatProfileLocation, formatProfileRating, profileInitials } from '@/lib/profile-presentation';
import {
  fetchListings,
  fetchOwnBundleDiscountSettings,
  fetchOwnReferralSummary,
  fetchOwnSellerBadges,
  fetchProfile,
} from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, elevation, radius, space, touch } from '@/theme/tokens';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { user } = useAuth();
  const favorites = useFavorites();
  const cart = useCart();

  const profile = useAsync(
    async () => (user ? fetchProfile(user.id) : null),
    `profile:${user?.id ?? 'none'}`
  );
  const mine = useAsync(
    async () => (user
      ? fetchListings({ sellerId: user.id, includeHolidaySellers: true })
      : { rows: [], hasMore: false, total: 0 }),
    `my-listings:${user?.id ?? 'none'}`
  );
  const bundleSettings = useAsync(
    async () => (user ? fetchOwnBundleDiscountSettings() : null),
    `profile-bundle-discounts:${user?.id ?? 'none'}`
  );
  const sellerBadges = useAsync(
    async () => (user ? fetchOwnSellerBadges() : []),
    `profile-seller-badges:${user?.id ?? 'none'}`
  );
  const referralSummary = useAsync(
    async () => (user ? fetchOwnReferralSummary() : null),
    `profile-referrals:${user?.id ?? 'none'}`
  );
  const hasFocusedProfile = React.useRef(false);
  const refreshProfile = profile.refresh;
  const refreshMine = mine.refresh;
  const refreshBundleSettings = bundleSettings.refresh;
  const refreshSellerBadges = sellerBadges.refresh;
  const refreshReferralSummary = referralSummary.refresh;
  const refreshFavorites = favorites.refresh;

  /* Seller settings routes persist outside this screen. Refresh their backend
     rows when the tab regains focus so On/Off labels never depend on local
     navigation state; skip the first focus because useAsync owns those reads. */
  useFocusEffect(
    React.useCallback(() => {
      if (hasFocusedProfile.current) {
        refreshProfile();
        refreshMine();
        refreshBundleSettings();
        refreshSellerBadges();
        refreshReferralSummary();
        refreshFavorites();
      }
      else hasFocusedProfile.current = true;
    }, [refreshBundleSettings, refreshFavorites, refreshMine, refreshProfile, refreshReferralSummary, refreshSellerBadges])
  );

  const rating = profile.data ? formatProfileRating(profile.data.rating_avg, profile.data.rating_count) : null;
  const location = profile.data ? formatProfileLocation(profile.data.city, profile.data.country_code) : null;
  const joined = profile.data ? new Date(profile.data.created_at).getFullYear() : null;
  const savedCount = favorites.saved.size;
  const badgeCount = earnedSellerBadgeCount(sellerBadges.data ?? []);
  const activeRows = mine.data?.rows ?? [];
  const activeCount = mine.data?.total ?? activeRows.length;
  const savedStatus = favorites.loading
    ? undefined
    : favorites.loadError
      ? 'Unavailable'
      : savedCount === 1 ? '1 saved' : `${savedCount} saved`;
  const holidayModeStatus = profile.loading
    ? undefined
    : profile.data
      ? profile.data.holiday_mode ? 'On' : 'Off'
      : 'Unavailable';
  const bundleDiscountStatus = bundleSettings.loading
    ? undefined
    : bundleSettings.error
      ? 'Unavailable'
      : hasActiveBundleDiscount(bundleSettings.data) ? 'On' : 'Off';
  const badgeStatus = sellerBadges.loading
    ? undefined
    : sellerBadges.error
      ? 'Unavailable'
      : `${badgeCount} earned`;
  const referralStatus = referralSummary.loading
    ? undefined
    : referralSummary.error || !referralSummary.data
      ? 'Unavailable'
      : referralSummary.data.invitedCount === 1
        ? '1 joined'
        : `${referralSummary.data.invitedCount} joined`;
  const verificationStatus = profile.loading
    ? undefined
    : profile.error || !profile.data
      ? 'Unavailable'
      : profile.data.is_verified ? 'Verified' : 'Not available';

  const identity = profile.loading ? (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.space16 }}>
      <Skeleton width={72} height={72} round={radius.radiusPill} />
      <View style={{ flex: 1, gap: space.space8, paddingTop: space.space4 }}>
        <Skeleton width="60%" height={28} />
        <Skeleton width="44%" height={14} />
      </View>
    </View>
  ) : profile.data ? (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.space16 }}>
      <View>
        <Avatar
          initials={profileInitials(profile.data.display_name)}
          bg={profile.data.avatar_color?.trim() || C.primary}
          size={72}
          imageUrl={profile.data.avatar_url}
          accessibilityLabel={`${profile.data.display_name}'s profile photo`}
        />
        {profile.data.is_verified ? (
          <View
            style={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: 22,
              height: 22,
              borderRadius: radius.radiusPill,
              backgroundColor: C.success,
              borderWidth: 2.5,
              borderColor: C.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" role="metadata" color={C.textInverse} decorative />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingTop: space.space4 }}>
        <T
          variant="screenTitle"
          style={{
            fontSize: 32,
            lineHeight: 36,
            letterSpacing: -0.6,
          }}
          numberOfLines={2}
        >
          {profile.data.display_name}
        </T>
        <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space8 }}>
          {rating ? `★ ${rating.label} · ` : ''}
          {profile.data.lifetime_sales === 1 ? '1 sale' : `${profile.data.lifetime_sales} sales`}
          {joined ? ` · Joined ${joined}` : ''}
        </T>
        {location ? (
          <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4 }} numberOfLines={1}>
            {location}
          </T>
        ) : null}
        {profile.data.bio ? (
          <T variant="body" color={C.textSecondary} style={{ marginTop: space.space12 }}>
            {profile.data.bio}
          </T>
        ) : null}
      </View>
    </View>
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space16 }}>
      <View style={{ width: 72, height: 72, borderRadius: radius.radiusPill, backgroundColor: C.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="person" role="hero" color={C.textSecondary} decorative />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="sectionTitle" numberOfLines={1}>{user?.email?.split('@')[0] ?? 'Your account'}</T>
        <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4 }}>
          {profile.error ? 'Profile could not be loaded' : 'Profile not set up yet'}
        </T>
      </View>
    </View>
  );

  const header = (
    <View style={{ overflow: 'hidden' }}>
      <View
        accessible={false}
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: 150,
          right: -132,
          top: -120,
          backgroundColor: C.surfaceSecondary,
          opacity: 0.72,
        }}
      />

      <View style={{ paddingTop: insets.top + space.space8, paddingHorizontal: space.gutterCompact, paddingBottom: space.space12 }}>
        <T
          variant="caption"
          color={C.textSecondary}
          style={{ textTransform: 'uppercase', letterSpacing: 2 }}
        >
          Account
        </T>
      </View>

      {profile.error ? (
        <View style={{ paddingHorizontal: space.gutterCompact, paddingBottom: space.space12 }}>
          <InlineError message="Your profile could not be refreshed." actionLabel="Retry" onAction={profile.refresh} />
        </View>
      ) : null}

      <View style={{ paddingHorizontal: space.gutterCompact, paddingBottom: space.space20 }}>{identity}</View>

      <View style={{ flexDirection: 'row', gap: space.space8, paddingHorizontal: space.gutterCompact, paddingBottom: space.space20 }}>
        <AccountStat
          icon="heart"
          label="Saved"
          value={favorites.loadError ? null : savedCount}
          loading={favorites.loading}
          onPress={() => router.push('/favorites')}
        />
        <AccountStat
          icon="badgeCheck"
          label="Badges"
          value={sellerBadges.error ? null : badgeCount}
          loading={sellerBadges.loading}
          onPress={() => router.push('/badges')}
        />
        <AccountStat
          icon="grid"
          label="Active"
          value={mine.error ? null : activeCount}
          loading={mine.loading}
          onPress={() => router.push('/my-listings')}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: space.space8, paddingHorizontal: space.gutterCompact, paddingBottom: space.space8 }}>
        <Button label="Edit profile" variant="secondary" onPress={() => router.push('/edit-profile')} style={{ flex: 1 }} />
        <Button label="My listings" variant="primary" onPress={() => router.push('/my-listings')} style={{ flex: 1 }} />
      </View>

      <View style={{ paddingHorizontal: space.gutterCompact, paddingTop: space.space32 }}>
        <T variant="sectionTitle" accessibilityRole="header">
          Selling tools
        </T>
        <T variant="body" color={C.textSecondary} style={{ marginTop: space.space4 }}>
          Manage your offers, visibility and seller presence.
        </T>
      </View>

      <PressableScale
        onPress={() => router.push('/promotional-tools')}
        accessibilityRole="button"
        accessibilityLabel="Promotional tools. Share your seller profile and active products."
        accessibilityHint="Opens promotional tools"
        motionRole="cardPress"
        style={{
          minHeight: 164,
          marginHorizontal: space.gutterCompact,
          marginTop: space.space16,
          overflow: 'hidden',
          borderRadius: radius.radiusXLarge,
          borderCurve: 'continuous',
          backgroundColor: C.primary,
          padding: space.space20,
          ...elevation.raised,
        }}
      >
        <View
          accessible={false}
          style={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: radius.radiusPill,
            right: -72,
            bottom: -106,
            backgroundColor: C.accent,
            opacity: 0.18,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View
            style={{
              width: touch.minimum,
              height: touch.minimum,
              borderRadius: radius.radiusPill,
              backgroundColor: C.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="send" role="navigation" color={C.textPrimary} decorative />
          </View>
          <View
            style={{
              width: touch.minimum,
              height: touch.minimum,
              borderRadius: radius.radiusPill,
              backgroundColor: `${C.surface}24`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevronRight" role="navigation" color={C.textInverse} decorative />
          </View>
        </View>
        <T
          variant="caption"
          color={`${C.surface}C7`}
          style={{ marginTop: space.space16, letterSpacing: 1.4, textTransform: 'uppercase' }}
        >
          Promotional tools
        </T>
        <T variant="sectionTitle" color={C.textInverse} style={{ marginTop: space.space4 }}>
          Put your shop in front
        </T>
        <T variant="metadata" color={`${C.surface}D9`} style={{ marginTop: space.space4 }}>
          Share your seller profile and active products.
        </T>
      </PressableScale>

      <View style={{ gap: space.space12, paddingHorizontal: space.gutterCompact, paddingTop: space.space12 }}>
        <View style={{ flexDirection: 'row', gap: space.space12 }}>
          <SellingToolCard
            icon="offerTicket"
            title="Bundle discounts"
            description="Set savings for multi-product orders."
            status={bundleDiscountStatus}
            loading={bundleSettings.loading}
            active={bundleDiscountStatus === 'On'}
            onPress={bundleSettings.error ? undefined : () => router.push('/bundle-discounts')}
          />
          <SellingToolCard
            icon="package"
            title="Holiday mode"
            description="Pause new purchases while you are away."
            status={holidayModeStatus}
            loading={profile.loading}
            active={holidayModeStatus === 'On'}
            onPress={() => router.push('/holiday-mode')}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: space.space12 }}>
          <SellingToolCard
            icon="badgeCheck"
            title="Seller badges"
            description="Review your verified achievements."
            status={badgeStatus}
            loading={sellerBadges.loading}
            accent
            onPress={sellerBadges.error ? undefined : () => router.push('/badges')}
          />
          <SellingToolCard
            icon="person"
            title="Invite friends"
            description="Copy or share your referral code."
            status={referralStatus}
            loading={referralSummary.loading}
            onPress={referralSummary.error ? undefined : () => router.push('/referrals')}
          />
        </View>
      </View>
      {bundleSettings.error || sellerBadges.error || referralSummary.error ? (
        <View style={{ paddingHorizontal: space.gutterCompact, paddingTop: space.space12 }}>
          <InlineError
            message="Some selling tools are unavailable."
            actionLabel="Retry"
            onAction={() => {
              bundleSettings.refresh();
              sellerBadges.refresh();
              referralSummary.refresh();
            }}
          />
        </View>
      ) : null}

      <AccountMenuSection
        title="Shopping"
        description="Your saved products, purchases and delivery updates."
      >
        <AccountMenuRow
          icon="bag"
          title="Cart"
          description="Products saved on this device"
          value={cart.count === 1 ? '1 item' : `${cart.count} items`}
          onPress={() => router.push('/cart')}
        />
        <AccountMenuRow
          icon="heart"
          title="Favorites"
          description="Products saved to your Nilya account"
          value={savedStatus}
          loading={favorites.loading}
          onPress={() => router.push('/favorites')}
        />
        <AccountMenuRow
          icon="package"
          title="Orders & shipping"
          description="Purchases, sales and delivery status"
          last
          onPress={() => router.push('/orders')}
        />
      </AccountMenuSection>

      <AccountMenuSection
        title="Account & support"
        description="Manage verification, help and personal preferences."
      >
        <AccountMenuRow
          icon="shieldCheck"
          title="Seller verification"
          description={profile.data?.is_verified
            ? 'Your seller profile is verified'
            : 'Verification onboarding is not available yet'}
          value={verificationStatus}
          loading={profile.loading}
          active={profile.data?.is_verified === true}
          onPress={() => router.push('/verify')}
        />
        <AccountMenuRow
          icon="info"
          title="Help Centre"
          description="Guides for buying, selling and account safety"
          onPress={() => router.push('/help')}
        />
        <AccountMenuRow
          icon="gear"
          title="Settings"
          description="Profile, language, security and sign out"
          last
          onPress={() => router.push('/settings')}
        />
      </AccountMenuSection>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: space.gutterCompact, paddingTop: space.space32, paddingBottom: space.space12 }}>
        <T variant="sectionTitle" accessibilityRole="header">
          Active products
        </T>
        {!mine.loading && !mine.error ? (
          <Tap
            onPress={() => router.push('/my-listings')}
            accessibilityRole="button"
            accessibilityLabel={`View all ${activeCount} active products`}
            style={{ minHeight: touch.minimum, justifyContent: 'center' }}
          >
            <T variant="button" color={C.primary}>View all · {activeCount}</T>
          </Tap>
        ) : mine.loading ? (
          <Skeleton width={70} height={16} />
        ) : null}
      </View>
      {mine.error && activeRows.length > 0 ? (
        <View style={{ paddingHorizontal: space.gutterCompact, paddingBottom: space.space12 }}>
          <RefreshNotice onRetry={mine.refresh} />
        </View>
      ) : null}
    </View>
  );

  const empty = mine.loading ? (
    <ProductGridSkeleton count={4} />
  ) : mine.error ? (
    <ScreenError error={mine.error} title="Could not load your listings" onRetry={mine.refetch} />
  ) : (
    <EmptyState
      icon="bag"
      title="No active products"
      body="Products you publish will appear here."
      style={{ paddingVertical: touch.minimum }}
      action={<Button label="Sell an item" onPress={() => router.replace('/sell')} style={{ marginTop: space.space16, paddingHorizontal: space.space20 }} />}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ListingGrid
        listings={mine.loading ? [] : activeRows.slice(0, 4)}
        savedIds={favorites.saved}
        onToggleSave={favorites.toggle}
        listHeader={header}
        listEmpty={empty}
        contentPaddingBottom={navClearance}
        refreshControl={
          <RefreshControl
            refreshing={
              profile.refreshing ||
              mine.refreshing ||
              bundleSettings.refreshing ||
              sellerBadges.refreshing ||
              referralSummary.refreshing ||
              favorites.refreshing
            }
            onRefresh={() => {
              profile.refresh();
              mine.refresh();
              bundleSettings.refresh();
              sellerBadges.refresh();
              referralSummary.refresh();
              favorites.refresh();
            }}
            tintColor={C.textSecondary}
          />
        }
      />
    </View>
  );
}

function AccountStat({
  icon,
  label,
  value,
  loading,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: number | null;
  loading: boolean;
  onPress: () => void;
}) {
  const spokenValue = loading ? 'loading' : value === null ? 'unavailable' : String(value);

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${spokenValue}`}
      accessibilityState={{ busy: loading }}
      accessibilityHint={`Opens ${label.toLowerCase()}`}
      motionRole="cardPress"
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 92,
        justifyContent: 'space-between',
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: radius.radiusLarge,
        borderCurve: 'continuous',
        padding: space.space12,
        ...elevation.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Icon name={icon} role="metadata" color={C.primary} decorative />
        <Icon name="chevronRight" role="metadata" color={C.textSecondary} decorative />
      </View>
      {loading ? (
        <Skeleton width={28} height={21} />
      ) : (
        <T variant="sectionTitle" style={{ fontSize: 21 }}>
          {value ?? '—'}
        </T>
      )}
      <T variant="metadata" color={C.textSecondary} numberOfLines={1}>
        {label}
      </T>
    </PressableScale>
  );
}

function AccountMenuSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ paddingHorizontal: space.gutterCompact, paddingTop: space.space32 }}>
      <T variant="sectionTitle" accessibilityRole="header">
        {title}
      </T>
      <T variant="body" color={C.textSecondary} style={{ marginTop: space.space4 }}>
        {description}
      </T>
      <View
        style={{
          marginTop: space.space16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: radius.radiusXLarge,
          borderCurve: 'continuous',
          backgroundColor: C.surface,
          ...elevation.raised,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function AccountMenuRow({
  icon,
  title,
  description,
  value,
  loading = false,
  active = false,
  last = false,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  value?: string;
  loading?: boolean;
  active?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  const accessibilityLabel = [title, value, description].filter(Boolean).join('. ');

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={`Opens ${title}`}
      accessibilityState={{ busy: loading }}
      motionRole="cardPress"
      style={{
        minHeight: 80,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space12,
        paddingHorizontal: space.space16,
        paddingVertical: space.space12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
        backgroundColor: C.surface,
      }}
    >
      <View
        style={{
          width: touch.minimum,
          height: touch.minimum,
          borderRadius: radius.radiusMedium,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? C.primary : C.surfaceSecondary,
        }}
      >
        <Icon name={icon} role="navigation" color={active ? C.textInverse : C.textPrimary} decorative />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="bodyMedium" numberOfLines={1}>
          {title}
        </T>
        <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4 }} numberOfLines={2}>
          {description}
        </T>
      </View>
      {loading ? (
        <Skeleton width={64} height={16} round={radius.radiusPill} />
      ) : value ? (
        <T
          variant="metadata"
          color={active ? C.primary : C.textSecondary}
          style={{ maxWidth: 92, textAlign: 'right' }}
          numberOfLines={2}
        >
          {value}
        </T>
      ) : null}
      <Icon name="chevronRight" role="metadata" color={C.textSecondary} decorative />
    </PressableScale>
  );
}

function SellingToolCard({
  icon,
  title,
  description,
  status,
  loading = false,
  active = false,
  accent = false,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  status?: string;
  loading?: boolean;
  active?: boolean;
  accent?: boolean;
  onPress?: () => void;
}) {
  const accessibilityLabel = [title, status, description].filter(Boolean).join('. ');
  const cardStyle = {
    flex: 1,
    minWidth: 0,
    minHeight: 174,
    borderWidth: 1,
    borderColor: active ? C.primary : C.border,
    borderRadius: radius.radiusXLarge,
    borderCurve: 'continuous' as const,
    backgroundColor: C.surface,
    padding: space.space16,
    ...elevation.raised,
  };
  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.space8 }}>
        <View
          style={{
            width: touch.minimum,
            height: touch.minimum,
            borderRadius: radius.radiusMedium,
            backgroundColor: accent ? C.accent : C.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} role="navigation" color={C.textPrimary} decorative />
        </View>
        {onPress ? <Icon name="chevronRight" role="navigation" color={C.textSecondary} decorative /> : null}
      </View>

      <T variant="cardTitle" style={{ marginTop: space.space16 }} numberOfLines={2}>
        {title}
      </T>
      <T
        variant="metadata"
        color={C.textSecondary}
        style={{ marginTop: space.space4, flexGrow: 1 }}
        numberOfLines={2}
      >
        {description}
      </T>

      {loading ? (
        <Skeleton width={52} height={18} round={radius.radiusPill} style={{ marginTop: space.space12 }} />
      ) : status ? (
        <View
          style={{
            alignSelf: 'flex-start',
            minHeight: 26,
            justifyContent: 'center',
            marginTop: space.space12,
            borderRadius: radius.radiusPill,
            backgroundColor: active ? C.primary : C.surfaceSecondary,
            paddingHorizontal: space.space8,
          }}
        >
          <T variant="caption" color={active ? C.textInverse : C.textSecondary}>
            {status}
          </T>
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel} style={cardStyle}>
        {content}
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={`Opens ${title}`}
      motionRole="cardPress"
      style={cardStyle}
    >
      {content}
    </PressableScale>
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Share, Text, type TextLayoutEvent, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ListingFeedGrid } from '@/components/listing-feed-grid';
import { FloatingIconButton, ScreenHeader } from '@/components/screen-header';
import { FadeIn, ProductGridSkeleton, Skeleton } from '@/components/skeleton';
import { Avatar, Button, EmptyState, InlineError, ScreenError, T, Tap } from '@/components/ui';
import { useAsync, type AsyncState } from '@/hooks/use-async';
import { useFavorites } from '@/hooks/use-favorites';
import { useGoBack } from '@/hooks/use-go-back';
import { useListingFeed } from '@/hooks/use-listing-feed';
import { hasActiveBundleDiscount } from '@/lib/bundle-discounts';
import type { BundleDiscountSettingsRow } from '@/lib/database.types';
import {
  formatProfileLocation,
  formatProfileRating,
  profileInitials,
  type ProfileRatingPresentation,
} from '@/lib/profile-presentation';
import { sellerShareContent } from '@/lib/sharing';
import {
  fetchProfile,
  fetchPublicBundleDiscountSettings,
  fetchProfileFollow,
  fetchProfileReviews,
  setProfileFollow,
  type Profile,
  type ReviewRow,
} from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { color as C, duration, elevation, radius, space } from '@/theme/tokens';

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const COLLAPSED_BIO_LINES = 5;

export default function SellerProfileRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const sellerId = sellerIdFromParam(id);

  if (!sellerId) return <SellerUnavailable />;

  return <SellerProfileScreen key={sellerId} sellerId={sellerId} />;
}

function SellerProfileScreen({ sellerId }: { sellerId: string }) {
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const profile = useAsync(() => fetchProfile(sellerId), `seller:${sellerId}`);
  const reviews = useAsync(() => fetchProfileReviews(sellerId), `seller-reviews:${sellerId}`);
  const bundleDiscounts = useAsync(
    () => fetchPublicBundleDiscountSettings(sellerId),
    `seller-bundle-discounts:${sellerId}`
  );
  const feed = useListingFeed(
    { sellerId, includeHolidaySellers: true },
    `seller-listings:${sellerId}`
  );
  const favorites = useFavorites();
  const seller =
    profile.data &&
    UUID_PATTERN.test(profile.data.id) &&
    profile.data.id.toLowerCase() === sellerId.toLowerCase()
      ? profile.data
      : null;
  const isOwner = user?.id === seller?.id;

  const shareSeller = React.useCallback(() => {
    if (!seller) return;
    void Share.share(sellerShareContent(seller)).catch(() => undefined);
  }, [seller]);

  const refreshAll = React.useCallback(() => {
    profile.refresh();
    reviews.refresh();
    bundleDiscounts.refresh();
    feed.refresh();
    favorites.refresh();
  }, [bundleDiscounts, favorites, feed, profile, reviews]);

  if (profile.loading && !seller) return <SellerLoading />;

  if (!seller) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScreenHeader border={false} />
        {profile.error ? (
          <ScreenError
            error={profile.error}
            title="Couldn't load this seller."
            fallback="Check your connection and try again."
            onRetry={profile.refetch}
          />
        ) : <SellerUnavailableContent onBack={goBack} />}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader
        border={false}
        right={<FloatingIconButton name="send" onPress={shareSeller} label="Share seller profile" />}
      />
      <ListingFeedGrid
        feed={feed}
        savedIds={favorites.saved}
        onToggleSave={favorites.toggle}
        onRefresh={refreshAll}
        contentPaddingTop={space.space16}
        contentPaddingBottom={insets.bottom + space.space32}
        endMessage={null}
        showAttributes={false}
        showPhotoCount={false}
        showSellerVerification={false}
        compactColumns
        cardHorizontalInset={space.gutterCompact}
        listHeader={
          <FadeIn y={8} duration={duration.fast}>
            <View style={{ paddingHorizontal: space.gutterCompact }}>
              {profile.error ? (
                <InlineError
                  message="Couldn't refresh this seller. The profile below may be out of date."
                  actionLabel="Retry"
                  onAction={profile.refresh}
                  style={{ marginBottom: space.space16 }}
                />
              ) : null}
              <SellerStorefront seller={seller} bundleDiscounts={bundleDiscounts} />
              <SellerActions
                key={`${user?.id ?? 'anonymous'}:${seller.id}`}
                seller={seller}
                viewerId={user?.id ?? null}
                isOwner={isOwner}
              />
              {/* Conversations are listing-scoped, so this page does not invent a generic seller thread. */}
              <View style={{ height: 1, backgroundColor: C.border, marginTop: space.space32 }} />
              <T
                variant="sectionTitle"
                accessibilityRole="header"
                style={{ marginTop: space.space24, marginBottom: space.space16 }}
              >
                Products
              </T>
            </View>
          </FadeIn>
        }
        listFooter={
          <ReviewsSection
            rows={reviews.data ?? []}
            loading={reviews.loading}
            error={reviews.error}
            onRetry={reviews.refetch}
          />
        }
        empty={{
          icon: 'bag',
          title: isOwner
            ? "You don't have any active products yet"
            : 'No products available right now',
          body: isOwner
            ? 'Publish a new product to make it available in your storefront.'
            : 'This seller has no active products available.',
        }}
        error={{ title: "Couldn't load products", body: "This seller's products couldn't be loaded. Try again." }}
      />
    </View>
  );
}

function sellerIdFromParam(value: string | string[] | undefined): string | null {
  const values = Array.isArray(value) ? value : [value];

  for (const candidate of values) {
    const normalized = candidate?.trim();
    if (normalized && UUID_PATTERN.test(normalized)) return normalized;
  }

  return null;
}

function SellerUnavailable() {
  const goBack = useGoBack();

  return (
    <View className="flex-1 bg-nilya-background">
      <ScreenHeader border={false} />
      <SellerUnavailableContent onBack={goBack} />
    </View>
  );
}

function SellerUnavailableContent({ onBack }: { onBack: () => void }) {
  return (
    <EmptyState
      icon="person"
      title="Seller unavailable"
      body="This profile may no longer be available."
      action={<Button label="Back" variant="secondary" onPress={onBack} />}
    />
  );
}

function SellerLoading() {
  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader border={false} right={<Skeleton width={44} height={44} round={radius.radiusPill} />} />
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading seller profile"
        style={{ paddingHorizontal: space.gutterCompact, paddingTop: space.space16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space16 }}>
          <Skeleton width={80} height={80} round={radius.radiusPill} />
          <View style={{ flex: 1, gap: space.space8 }}>
            <Skeleton width="72%" height={26} />
            <Skeleton width="46%" height={13} />
            <Skeleton width="34%" height={13} />
          </View>
        </View>
        <Skeleton width="92%" height={14} style={{ marginTop: space.space24 }} />
        <Skeleton width="68%" height={14} style={{ marginTop: space.space8 }} />
        <View style={{ height: 1, backgroundColor: C.border, marginTop: space.space32 }} />
        <Skeleton width={104} height={24} style={{ marginTop: space.space24, marginBottom: space.space16 }} />
      </View>
      <ProductGridSkeleton />
    </View>
  );
}

function SellerStorefront({
  seller,
  bundleDiscounts,
}: {
  seller: Profile;
  bundleDiscounts: AsyncState<BundleDiscountSettingsRow | null>;
}) {
  const displayName = seller.display_name.trim();
  const location = formatProfileLocation(seller.city, seller.country_code);
  const joined = new Date(seller.created_at).getFullYear();
  const rating = formatProfileRating(seller.rating_avg, seller.rating_count);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.space16 }}>
        <View>
          <Avatar
            initials={profileInitials(displayName)}
            bg={seller.avatar_color?.trim() || C.primary}
            size={80}
            imageUrl={seller.avatar_url}
            accessibilityLabel={`${displayName}'s profile photo`}
          />
          {seller.is_verified ? (
            <View
              style={{
                position: 'absolute',
                bottom: -1,
                right: -1,
                width: 24,
                height: 24,
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
          <Text
            style={{
              fontFamily: 'serif',
              fontSize: 28,
              lineHeight: 32,
              fontWeight: '500',
              letterSpacing: -0.5,
              color: C.textPrimary,
            }}
            numberOfLines={2}
            selectable
          >
            {displayName}
          </Text>
          {location ? (
            <View style={{ marginTop: space.space8, flexDirection: 'row', alignItems: 'center', gap: space.space4 }}>
              <Icon name="pin" role="metadata" color={C.textSecondary} decorative />
              <T variant="metadata" color={C.textSecondary} style={{ flex: 1, minWidth: 0 }} numberOfLines={1} selectable>
                {location}
              </T>
            </View>
          ) : null}
        </View>
      </View>

      <SellerStats
        rating={rating}
        ratingAvg={seller.rating_avg}
        ratingCount={seller.rating_count}
        lifetimeSales={seller.lifetime_sales}
        joined={joined}
      />

      {seller.holiday_mode ? (
        <SellerNote icon="info">Seller is currently away</SellerNote>
      ) : null}
      <SellerBundleDiscountStatus settings={bundleDiscounts} />

      <SellerBio key={seller.bio} bio={seller.bio} />
    </View>
  );
}

function SellerStats({
  rating,
  ratingAvg,
  ratingCount,
  lifetimeSales,
  joined,
}: {
  rating: ProfileRatingPresentation | null;
  ratingAvg: number | null;
  ratingCount: number;
  lifetimeSales: number;
  joined: number;
}) {
  type Tile = { value: string; sub: string; star: boolean; accessibilityLabel: string };

  const tiles: Tile[] = [
    rating
      ? {
          value: Number(ratingAvg).toFixed(1),
          sub: ratingCount === 1 ? '1 review' : `${ratingCount} reviews`,
          star: true,
          accessibilityLabel: rating.accessibleLabel,
        }
      : null,
    {
      value: String(lifetimeSales),
      sub: lifetimeSales === 1 ? 'Sale' : 'Sales',
      star: false,
      accessibilityLabel: lifetimeSales === 1 ? '1 sale' : `${lifetimeSales} sales`,
    },
    {
      value: String(joined),
      sub: 'Member since',
      star: false,
      accessibilityLabel: `Member since ${joined}`,
    },
  ].filter((tile): tile is Tile => tile !== null);

  return (
    <View style={{ flexDirection: 'row', gap: space.space8, marginTop: space.space20 }}>
      {tiles.map((tile, index) => (
        <View
          key={index}
          accessible
          accessibilityRole="text"
          accessibilityLabel={tile.accessibilityLabel}
          style={{
            flex: 1,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: radius.radiusLarge,
            borderCurve: 'continuous',
            paddingVertical: space.space12,
            paddingHorizontal: space.space8,
            alignItems: 'center',
            ...elevation.raised,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.space4 }} accessible={false}>
            {tile.star ? <Icon name="star" role="metadata" color={C.textPrimary} decorative /> : null}
            <T variant="sectionTitle" style={{ fontSize: 18 }} accessible={false}>{tile.value}</T>
          </View>
          <T variant="metadata" color={C.textSecondary} style={{ marginTop: space.space4, textAlign: 'center' }} numberOfLines={1} accessible={false}>
            {tile.sub}
          </T>
        </View>
      ))}
    </View>
  );
}

function SellerNote({
  icon,
  children,
}: {
  icon: 'info' | 'offerTicket';
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        marginTop: space.space16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.space8,
        backgroundColor: C.surfaceSecondary,
        borderRadius: radius.radiusMedium,
        borderCurve: 'continuous',
        paddingVertical: space.space8,
        paddingHorizontal: space.space12,
      }}
    >
      <Icon name={icon} role="metadata" color={C.primary} decorative />
      <T variant="metadataMedium" color={C.primary}>{children}</T>
    </View>
  );
}

function SellerBundleDiscountStatus({
  settings,
}: {
  settings: AsyncState<BundleDiscountSettingsRow | null>;
}) {
  if (settings.loading) {
    return <Skeleton width={164} height={12} style={{ marginTop: space.space16 }} />;
  }

  if (settings.error) {
    return (
      <View style={{ marginTop: space.space16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.space8 }}>
        <T variant="caption" color={C.errorText} accessibilityRole="alert">
          Bundle discount information unavailable.
        </T>
        <Tap
          onPress={settings.refetch}
          accessibilityRole="button"
          accessibilityLabel="Retry bundle discount information"
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <T variant="caption">Retry</T>
        </Tap>
      </View>
    );
  }

  if (!hasActiveBundleDiscount(settings.data)) return null;

  return <SellerNote icon="offerTicket">Bundle discounts available</SellerNote>;
}

function SellerBio({ bio }: { bio: string | null }) {
  const value = bio?.trim() ?? '';
  const [expanded, setExpanded] = React.useState(false);
  const [canCollapse, setCanCollapse] = React.useState(false);

  if (!value) return null;

  const measureBio = (event: TextLayoutEvent) => {
    const next = event.nativeEvent.lines.length > COLLAPSED_BIO_LINES;
    setCanCollapse((current) => (current === next ? current : next));
  };

  return (
    <View className="mt-8 border-t border-nilya-border pt-6">
      <T variant="sectionTitle" accessibilityRole="header">
        About
      </T>

      <View className="mt-3">
        <T
          variant="body"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="pointer-events-none absolute inset-x-0 opacity-0"
          onTextLayout={measureBio}
        >
          {value}
        </T>
        <T
          variant="body"
          color={C.textSecondary}
          numberOfLines={expanded ? undefined : COLLAPSED_BIO_LINES}
          ellipsizeMode="tail"
          selectable
        >
          {value}
        </T>

        {canCollapse ? (
          <Tap
            onPress={() => setExpanded((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Show less of the seller bio' : 'Read the full seller bio'}
            accessibilityState={{ expanded }}
            className="min-h-11 self-start justify-center"
          >
            <T variant="button">{expanded ? 'Show less' : 'Read more'}</T>
          </Tap>
        ) : null}
      </View>
    </View>
  );
}

function SellerActions({
  seller,
  viewerId,
  isOwner,
}: {
  seller: Profile;
  viewerId: string | null;
  isOwner: boolean;
}) {
  const router = useRouter();

  if (isOwner) {
    return (
      <View className="mt-5 flex-row gap-2">
        <Button
          label="Edit profile"
          accessibilityLabel="Edit your seller profile"
          variant="secondary"
          onPress={() => router.push('/edit-profile')}
          style={{ flex: 1 }}
        />
        <Button
          label="Sell a product"
          accessibilityLabel="Sell a new product"
          onPress={() => router.push('/sell')}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  if (!viewerId) return null;

  return <VisitorFollowAction seller={seller} />;
}

function VisitorFollowAction({ seller }: { seller: Profile }) {
  const follow = useAsync(
    () => fetchProfileFollow(seller.id),
    `seller-follow:${seller.id}`
  );
  const [override, setOverride] = React.useState<boolean | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [writeError, setWriteError] = React.useState<string | null>(null);
  const following = override ?? follow.data ?? false;

  const toggleFollow = React.useCallback(() => {
    if (saving || (follow.loading && follow.data === null) || follow.error) return;

    const previous = following;
    const next = !previous;
    setSaving(true);
    setOverride(next);
    setWriteError(null);

    void setProfileFollow(seller.id, next)
      .then(() => follow.refresh())
      .catch(() => {
        setOverride(previous);
        setWriteError('Could not update this follow. Try again.');
      })
      .finally(() => setSaving(false));
  }, [follow, following, saving, seller.id]);

  return (
    <View className="mt-5 gap-3">
      <Button
        label={following ? 'Following' : 'Follow'}
        accessibilityLabel={following ? `Unfollow ${seller.display_name}` : `Follow ${seller.display_name}`}
        variant={following ? 'secondary' : 'primary'}
        onPress={toggleFollow}
        loading={saving || (follow.loading && follow.data === null)}
        loadingLabel={saving ? 'Saving…' : 'Checking…'}
        disabled={Boolean(follow.error)}
      />
      {follow.error ? (
        <InlineError
          message="Couldn't load your follow status."
          actionLabel="Retry"
          onAction={follow.refetch}
        />
      ) : writeError ? (
        <InlineError message={writeError} actionLabel="Retry" onAction={toggleFollow} />
      ) : null}
    </View>
  );
}

function ReviewsSection({
  rows,
  loading,
  error,
  onRetry,
}: {
  rows: ReviewRow[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: space.gutterCompact, paddingTop: space.space40 }}>
      <View style={{ height: 1, backgroundColor: C.border, marginBottom: space.space24 }} />
      <T variant="sectionTitle" accessibilityRole="header">
        Reviews
      </T>

      {error ? (
        <InlineError
          message={rows.length > 0
            ? "Couldn't refresh reviews. The reviews below may be out of date."
            : "Couldn't load reviews."}
          actionLabel="Retry"
          onAction={onRetry}
          style={{ marginTop: space.space16 }}
        />
      ) : null}

      {loading && rows.length === 0 ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Loading seller reviews"
          style={{ gap: space.space12, paddingTop: space.space20 }}
        >
          <Skeleton width="44%" height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="72%" height={14} />
        </View>
      ) : rows.length === 0 && !error ? (
        <T variant="body" color={C.textSecondary} style={{ paddingTop: space.space12 }} selectable>
          No reviews yet
        </T>
      ) : (
        <View style={{ paddingTop: space.space8 }}>
          {rows.map((review) => <SellerReview key={review.id} review={review} />)}
        </View>
      )}
    </View>
  );
}

function SellerReview({ review }: { review: ReviewRow }) {
  const authorName = review.author?.display_name.trim() || 'Reviewer';
  const body = review.body?.trim() || null;
  const date = formatReviewDate(review.created_at);

  return (
    <View style={{ paddingVertical: space.space16, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <View className="flex-row items-center gap-3">
        {review.author ? (
          <Avatar
            initials={profileInitials(authorName)}
            bg={C.primary}
            size={44}
            imageUrl={review.author.avatar_url}
            accessibilityLabel={`${authorName}'s profile photo`}
          />
        ) : null}
        <View className="min-w-0 flex-1">
          <T variant="cardTitle" numberOfLines={2} selectable>
            {authorName}
          </T>
          {date ? (
            <T variant="metadata" color={C.textSecondary} className="mt-1" selectable>
              {date}
            </T>
          ) : null}
        </View>
      </View>

      <ReviewRating rating={review.rating} />

      {body ? (
        <T variant="body" color={C.textSecondary} style={{ paddingTop: space.space8 }} selectable>
          {body}
        </T>
      ) : null}
    </View>
  );
}

function ReviewRating({ rating }: { rating: number }) {
  const normalized = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
  if (!normalized) return null;

  const stars = `${'★'.repeat(normalized)}${'☆'.repeat(5 - normalized)}`;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Rated ${normalized} out of 5`}
      style={{ alignSelf: 'flex-start', paddingTop: space.space12 }}
    >
      <T variant="bodyMedium" accessible={false} style={{ letterSpacing: 2 }}>
        {stars}
      </T>
    </View>
  );
}

function formatReviewDate(value: string): string | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

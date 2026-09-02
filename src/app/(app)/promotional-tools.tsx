import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPrice, ListingImage } from '@/components/listing-card';
import { ScreenHeader } from '@/components/screen-header';
import { SettingsRow, SettingsSection } from '@/components/settings-row';
import { Skeleton } from '@/components/skeleton';
import { Button, EmptyState, InlineError, Spinner, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useMyListings } from '@/hooks/use-my-listings';
import { formatPriceDropLabel } from '@/lib/promotions';
import { coverUrl, fetchProfile, type MyListingRow } from '@/lib/queries';
import { listingShareContent, sellerShareContent } from '@/lib/sharing';
import { useAuth } from '@/store/auth-store';
import { color as C, radius, space } from '@/theme/tokens';

type ShareTarget = 'profile' | string;

export default function PromotionalToolsRoute() {
  const { user } = useAuth();
  if (!user) return null;
  return <PromotionalToolsScreen key={user.id} userId={user.id} />;
}

function PromotionalToolsScreen({ userId }: { userId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAsync(() => fetchProfile(userId), `promotional-profile:${userId}`);
  const listings = useMyListings('active');
  const [sharing, setSharing] = React.useState<ShareTarget | null>(null);
  const [shareError, setShareError] = React.useState<{
    target: ShareTarget;
    message: string;
  } | null>(null);

  const shareProfile = async () => {
    if (!profile.data || sharing) return;
    setSharing('profile');
    setShareError(null);
    try {
      await Share.share(sellerShareContent(profile.data));
    } catch {
      setShareError({
        target: 'profile',
        message: 'Your seller profile could not be shared. Try again.',
      });
    } finally {
      setSharing(null);
    }
  };

  const shareListing = async (listing: MyListingRow) => {
    if (sharing) return;
    setSharing(listing.id);
    setShareError(null);
    try {
      await Share.share(
        listingShareContent(
          listing.title,
          formatPrice(listing.price_cents, listing.currency)
        )
      );
    } catch {
      setShareError({
        target: listing.id,
        message: 'This product could not be shared. Try again.',
      });
    } finally {
      setSharing(null);
    }
  };

  const listHeader = (
    <>
      <View className="px-5 pb-1 pt-6">
        <T variant="sectionTitle" accessibilityRole="header">
          Promotional tools
        </T>
        <T variant="body" color={C.textSecondary} className="mt-2" selectable>
          Share your real products and storefront using the details already saved to your account.
        </T>
      </View>

      <SettingsSection
        title="Storefront"
        footer={
          profile.error ? (
            <InlineError
              message="Your seller profile could not be loaded."
              actionLabel="Retry"
              onAction={profile.refetch}
            />
          ) : shareError?.target === 'profile' ? (
            <InlineError
              message={shareError.message}
              actionLabel="Retry"
              onAction={() => void shareProfile()}
            />
          ) : undefined
        }
      >
        <SettingsRow
          icon="send"
          label="Share seller profile"
          value={profile.error ? 'Unavailable' : undefined}
          busy={profile.loading || sharing === 'profile'}
          onPress={profile.data && sharing === null ? () => void shareProfile() : undefined}
          disclosure={false}
          accessibilityHint="Opens the native share sheet with your real seller identity"
          last
        />
      </SettingsSection>

      <View className="px-5 pb-3 pt-8">
        <T variant="sectionTitle" accessibilityRole="header">
          Share your products
        </T>
        <T variant="body" color={C.textSecondary} className="mt-2" selectable>
          Only your active NEW products appear here. Shared text uses the stored title and price; no public URL is invented.
        </T>
        {listings.error && listings.listings.length > 0 ? (
          <InlineError
            message="Your products could not be refreshed."
            actionLabel="Retry"
            onAction={listings.refresh}
            style={{ marginTop: space.space16 }}
          />
        ) : null}
      </View>
    </>
  );

  const empty = listings.loading ? (
    <PromotionalListingsSkeleton />
  ) : listings.error ? (
    <View className="px-5 py-8">
      <InlineError
        message="Your active products could not be loaded."
        actionLabel="Retry"
        onAction={listings.retry}
      />
    </View>
  ) : (
    <EmptyState
      icon="bag"
      title="No active products to promote"
      body="Publish a real product before sharing it from Promotional tools."
      action={
        <Button
          label="Sell a product"
          onPress={() => router.push('/sell')}
          style={{ marginTop: space.space16 }}
        />
      }
      style={{ paddingVertical: space.space32 }}
    />
  );

  return (
    <View className="flex-1 bg-nilya-background">
      <ScreenHeader title="Promotional tools" />
      <FlatList
        data={listings.loading ? [] : listings.listings}
        keyExtractor={(listing) => listing.id}
        renderItem={({ item }) => (
          <PromotionalListingRow
            listing={item}
            sharing={sharing === item.id}
            disabled={sharing !== null}
            error={shareError?.target === item.id ? shareError.message : null}
            onShare={() => void shareListing(item)}
            onRetry={() => void shareListing(item)}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={empty}
        ListFooterComponent={listings.loadingMore ? (
          <View className="items-center py-6">
            <Spinner color={C.textSecondary} />
          </View>
        ) : null}
        ItemSeparatorComponent={() => <View className="mx-5 h-px bg-nilya-border" />}
        onEndReached={listings.loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={profile.refreshing || listings.refreshing}
            onRefresh={() => {
              profile.refresh();
              listings.refresh();
            }}
            tintColor={C.textSecondary}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + space.space40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function PromotionalListingRow({
  listing,
  sharing,
  disabled,
  error,
  onShare,
  onRetry,
}: {
  listing: MyListingRow;
  sharing: boolean;
  disabled: boolean;
  error: string | null;
  onShare: () => void;
  onRetry: () => void;
}) {
  const price = formatPrice(listing.price_cents, listing.currency);
  const originalPrice = listing.original_price_cents === null
    ? null
    : formatPrice(listing.original_price_cents, listing.currency);
  const priceDrop = formatPriceDropLabel(
    listing.original_price_cents,
    listing.price_cents
  );

  return (
    <View className="px-5 py-4">
      <View className="flex-row items-center gap-4">
        <ListingImage
          url={coverUrl(listing.images)}
          width={72}
          label={`${listing.title} cover image`}
        />
        <View className="min-w-0 flex-1">
          <T variant="bodyMedium" numberOfLines={2} selectable>
            {listing.title}
          </T>
          <View className="mt-1 flex-row flex-wrap items-center gap-2">
            <T variant="price" selectable style={{ fontVariant: ['tabular-nums'] }}>
              {price}
            </T>
            {originalPrice ? (
              <T
                variant="metadata"
                color={C.textSecondary}
                className="line-through"
                selectable
              >
                {originalPrice}
              </T>
            ) : null}
          </View>
          {priceDrop ? (
            <T variant="metadataMedium" color={C.textSecondary} className="mt-1" selectable>
              {priceDrop}
            </T>
          ) : null}
        </View>
        <Button
          label="Share"
          accessibilityLabel={`Share ${listing.title}`}
          buttonSize="compact"
          variant="secondary"
          loading={sharing}
          loadingLabel="Sharing…"
          disabled={disabled}
          onPress={onShare}
        />
      </View>
      {error ? (
        <InlineError
          message={error}
          actionLabel="Retry"
          onAction={onRetry}
          style={{ marginTop: space.space12 }}
        />
      ) : null}
    </View>
  );
}

function PromotionalListingsSkeleton() {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading products available to share"
      className="gap-5 px-5 py-4"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <View key={index} className="flex-row items-center gap-4">
          <Skeleton width={72} height={90} round={radius.radiusMedium} />
          <View className="flex-1 gap-2">
            <Skeleton width="72%" height={16} />
            <Skeleton width="38%" height={18} />
            <Skeleton width="48%" height={12} />
          </View>
          <Skeleton width={76} height={44} round={radius.radiusMedium} />
        </View>
      ))}
    </View>
  );
}

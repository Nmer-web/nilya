import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { formatPrice, ListingImage } from '@/components/listing-card';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Button, Chip, EmptyState, InlineError, Spinner, T, Tap } from '@/components/ui';
import { useStoredDraft } from '@/features/sell/use-stored-draft';
import { useMyListings } from '@/hooks/use-my-listings';
import type { ListingStatus } from '@/lib/database.types';
import {
  deactivateOwnerListing,
  deleteManagedOwnerDraft,
  OwnerListingManagementError,
} from '@/lib/mutations';
import { coverUrl, type MyListingRow } from '@/lib/queries';
import { useApp } from '@/store/app-store';
import { color as C, radius, space, touch } from '@/theme/tokens';

const STATUS_TABS: { status: ListingStatus; label: string; empty: string }[] = [
  { status: 'active', label: 'Active', empty: 'No active products' },
  { status: 'draft', label: 'Drafts', empty: 'No drafts' },
  { status: 'reserved', label: 'Reserved', empty: 'No reserved products' },
  { status: 'sold', label: 'Sold', empty: 'No sold products' },
  { status: 'removed', label: 'Removed', empty: 'No removed products' },
];

type OwnerAction = 'deactivate' | 'delete';

export default function MyListingsScreen() {
  const [status, setStatus] = React.useState<ListingStatus>('active');

  return (
    <View className="flex-1 bg-nilya-background">
      <ScreenHeader title="My listings" />
      <StatusTabs value={status} onChange={setStatus} />
      <StatusListingList key={status} status={status} />
    </View>
  );
}

function StatusTabs({ value, onChange }: { value: ListingStatus; onChange: (status: ListingStatus) => void }) {
  return (
    <View className="border-b border-nilya-border py-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.gutterCompact, gap: space.space8 }}
      >
        {STATUS_TABS.map((tab) => (
          <Chip
            key={tab.status}
            label={tab.label}
            active={value === tab.status}
            onPress={() => onChange(tab.status)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function StatusListingList({ status }: { status: ListingStatus }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flash } = useApp();
  const feed = useMyListings(status);
  const hasDraft = useStoredDraft();
  const [confirmation, setConfirmation] = React.useState<{ id: string; action: OwnerAction } | null>(null);
  const [busy, setBusy] = React.useState<{ id: string; action: OwnerAction } | null>(null);
  const [actionError, setActionError] = React.useState<{
    id: string;
    action: OwnerAction;
    message: string;
  } | null>(null);

  const viewListing = React.useCallback((listingId: string) => {
    router.push({ pathname: '/listing/[id]', params: { id: listingId } });
  }, [router]);

  const editListing = React.useCallback((listingId: string) => {
    router.push({ pathname: '/edit-listing/[id]', params: { id: listingId } });
  }, [router]);

  const runAction = React.useCallback(async (listing: MyListingRow, action: OwnerAction) => {
    if (busy) return;
    if (action === 'deactivate' && listing.status !== 'active') return;
    if (action === 'delete' && listing.status !== 'draft') return;

    setBusy({ id: listing.id, action });
    setActionError(null);
    try {
      if (action === 'deactivate') {
        await deactivateOwnerListing(listing.id);
        flash('Listing moved to Removed');
      } else {
        await deleteManagedOwnerDraft(listing.id);
        flash('Draft deleted');
      }
      feed.remove(listing.id);
      setConfirmation(null);
    } catch (caught) {
      setActionError({
        id: listing.id,
        action,
        message: caught instanceof OwnerListingManagementError
          ? caught.message
          : action === 'deactivate'
            ? 'The listing could not be deactivated. Refresh and try again.'
            : 'The draft could not be safely deleted. Refresh and try again.',
      });
    } finally {
      setBusy(null);
    }
  }, [busy, feed, flash]);

  const header = (
    <View style={{ paddingHorizontal: space.gutterCompact, paddingTop: space.space20, paddingBottom: space.space8 }}>
      <Button label={hasDraft ? 'Continue draft' : 'Sell a product'} onPress={() => router.push('/sell')} />
      {feed.error && feed.listings.length > 0 ? (
        <InlineError
          message="Couldn't refresh these listings. The products below may be out of date."
          actionLabel="Retry"
          onAction={feed.refresh}
          style={{ marginTop: space.space16 }}
        />
      ) : null}
    </View>
  );

  const empty = feed.loading ? (
    <MyListingsSkeleton />
  ) : feed.error ? (
    <View style={{ paddingHorizontal: space.gutterCompact, paddingTop: space.space32 }}>
      <InlineError
        message="Couldn't load your listings."
        actionLabel="Retry"
        onAction={feed.retry}
      />
    </View>
  ) : (
    <EmptyState
      icon="bag"
      title={STATUS_TABS.find((tab) => tab.status === status)?.empty ?? 'No products'}
      body={emptyBody(status)}
      style={{ paddingVertical: space.space48 }}
    />
  );

  return (
    <FlatList
      data={feed.loading ? [] : feed.listings}
      keyExtractor={(listing) => listing.id}
      renderItem={({ item }) => (
        <MyListingItem
          listing={item}
          confirmation={confirmation?.id === item.id ? confirmation.action : null}
          busy={busy?.id === item.id ? busy.action : null}
          error={actionError?.id === item.id ? actionError : null}
          onView={() => viewListing(item.id)}
          onEdit={() => editListing(item.id)}
          onRequestAction={(action) => {
            setActionError(null);
            setConfirmation({ id: item.id, action });
          }}
          onCancel={() => {
            setConfirmation(null);
            setActionError(null);
          }}
          onConfirm={(action) => void runAction(item, action)}
          onRetry={(action) => void runAction(item, action)}
        />
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={feed.loadingMore ? (
        <View className="items-center py-6">
          <Spinner color={C.textSecondary} />
        </View>
      ) : null}
      ItemSeparatorComponent={() => <View className="mx-5 h-px bg-nilya-border" />}
      onEndReached={feed.loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={(
        <RefreshControl
          refreshing={feed.refreshing}
          onRefresh={feed.refresh}
          tintColor={C.textSecondary}
        />
      )}
      contentContainerStyle={{ paddingBottom: insets.bottom + space.space32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

function MyListingItem({
  listing,
  confirmation,
  busy,
  error,
  onView,
  onEdit,
  onRequestAction,
  onCancel,
  onConfirm,
  onRetry,
}: {
  listing: MyListingRow;
  confirmation: OwnerAction | null;
  busy: OwnerAction | null;
  error: { action: OwnerAction; message: string } | null;
  onView: () => void;
  onEdit: () => void;
  onRequestAction: (action: OwnerAction) => void;
  onCancel: () => void;
  onConfirm: (action: OwnerAction) => void;
  onRetry: (action: OwnerAction) => void;
}) {
  const price = listing.price_cents == null
    ? listing.listing_type === 'job' ? 'Job opportunity' : 'Quote required'
    : formatPrice(listing.price_cents, listing.currency);
  const date = listingDate(listing);

  return (
    <View style={{ paddingHorizontal: space.gutterCompact, paddingVertical: space.space16 }}>
      <View className="flex-row gap-4">
        <ListingImage
          url={coverUrl(listing.images)}
          width={88}
          label={`${listing.title} cover image`}
        />
        <View className="min-w-0 flex-1">
          <StatusBadge status={listing.status} />
          <T variant="bodyMedium" numberOfLines={2} selectable style={{ marginTop: space.space8 }}>
            {listing.title}
          </T>
          <T variant="price" selectable style={{ marginTop: space.space4, fontVariant: ['tabular-nums'] }}>
            {price}
          </T>
          {date ? (
            <T variant="metadata" color={C.textSecondary} selectable style={{ marginTop: space.space4 }}>
              {date}
            </T>
          ) : null}
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Button label="View listing" variant="secondary" buttonSize="compact" onPress={onView} />
        <Button label="Edit" variant="secondary" buttonSize="compact" onPress={onEdit} />
        {listing.status === 'active' ? (
          <Button
            label="Deactivate"
            variant="ghost"
            buttonSize="compact"
            onPress={() => onRequestAction('deactivate')}
          />
        ) : null}
        {listing.status === 'draft' ? (
          <Tap
            accessibilityRole="button"
            accessibilityLabel={`Delete draft ${listing.title}`}
            onPress={() => onRequestAction('delete')}
            style={{ minHeight: touch.minimum, justifyContent: 'center', paddingHorizontal: space.space12 }}
          >
            <T variant="button" color={C.errorText}>Delete draft</T>
          </Tap>
        ) : null}
      </View>

      {confirmation ? (
        <ActionConfirmation
          action={confirmation}
          loading={busy === confirmation}
          onCancel={onCancel}
          onConfirm={() => onConfirm(confirmation)}
        />
      ) : null}
      {error ? (
        <InlineError
          message={error.message}
          actionLabel="Retry"
          onAction={() => onRetry(error.action)}
          style={{ marginTop: space.space12 }}
        />
      ) : null}
    </View>
  );
}

function StatusBadge({ status }: { status: ListingStatus }) {
  const active = status === 'active';
  return (
    <View
      accessible
      accessibilityLabel={`Status: ${status}`}
      style={{
        alignSelf: 'flex-start',
        minHeight: 28,
        justifyContent: 'center',
        paddingHorizontal: space.space8,
        borderRadius: radius.radiusPill,
        backgroundColor: active ? C.accent : C.surfaceSecondary,
      }}
    >
      <T variant="caption" color={C.textPrimary}>
        {statusLabel(status)}
      </T>
    </View>
  );
}

function ActionConfirmation({
  action,
  loading,
  onCancel,
  onConfirm,
}: {
  action: OwnerAction;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const deleting = action === 'delete';
  return (
    <View
      accessibilityRole="alert"
      style={{
        marginTop: space.space12,
        padding: space.space12,
        gap: space.space12,
        borderRadius: radius.radiusMedium,
        borderWidth: 1,
        borderColor: deleting ? C.error : C.borderStrong,
        backgroundColor: deleting ? C.errorSurface : C.surface,
      }}
    >
      <View className="flex-row items-start gap-2">
        <Icon name="info" role="metadata" color={deleting ? C.error : C.textSecondary} decorative />
        <T variant="metadata" color={deleting ? C.errorText : C.textSecondary} style={{ flex: 1 }}>
          {deleting
            ? 'Permanently delete this private draft and its photos? This cannot be undone.'
            : 'Move this product to Removed? It will stop appearing in the marketplace.'}
        </T>
      </View>
      <View className="flex-row gap-2">
        <Button
          label="Cancel"
          variant="secondary"
          buttonSize="compact"
          disabled={loading}
          onPress={onCancel}
          style={{ flex: 1 }}
        />
        <Button
          label={deleting ? 'Delete draft' : 'Deactivate'}
          variant={deleting ? 'destructive' : 'primary'}
          buttonSize="compact"
          loading={loading}
          loadingLabel={deleting ? 'Deleting…' : 'Deactivating…'}
          onPress={onConfirm}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function MyListingsSkeleton() {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading your listings"
      style={{ paddingHorizontal: space.gutterCompact, paddingTop: space.space20, gap: space.space20 }}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <View key={index} className="flex-row gap-4">
          <Skeleton width={88} height={110} round={radius.radiusMedium} />
          <View className="flex-1 gap-2 pt-1">
            <Skeleton width={68} height={24} round={radius.radiusPill} />
            <Skeleton width="76%" height={16} />
            <Skeleton width="38%" height={18} />
            <Skeleton width="52%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

function statusLabel(status: ListingStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function emptyBody(status: ListingStatus): string {
  if (status === 'active') return 'Products you publish will appear here.';
  if (status === 'draft') return 'Private drafts you save will appear here.';
  if (status === 'reserved') return 'Products reserved by the marketplace will appear here.';
  if (status === 'sold') return 'Completed product sales will appear here.';
  return 'Products moved out of the marketplace will appear here.';
}

function listingDate(listing: MyListingRow): string | null {
  const value = listing.published_at ?? listing.created_at;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const prefix = listing.published_at ? 'Published' : 'Created';
  return `${prefix} ${date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

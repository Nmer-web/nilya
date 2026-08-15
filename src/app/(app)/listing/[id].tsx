import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Animated, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { formatPrice } from '@/components/listing-card';
import { FloatingIconButton } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Avatar, Button, EmptyState, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useAnimatedValue, NATIVE_DRIVER } from '@/hooks/use-animated-value';
import { useFavorites } from '@/hooks/use-favorites';
import { CONDITION_LABEL } from '@/lib/database.types';
import { tapLight } from '@/lib/haptics';
import { fetchDeliveryOptions, findOrCreateConversation } from '@/lib/mutations';
import { fetchListing, imageUrl } from '@/lib/queries';
import { useAuth } from '@/store/auth-store';
import { alpha, color as C, motion, radius, space } from '@/theme/tokens';

/** Gallery height relative to width. */
const GALLERY_RATIO = 430 / 393;

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const listing = useAsync(() => fetchListing(id), `listing:${id}`);
  const favorites = useFavorites();
  const { user } = useAuth();

  const [page, setPage] = useState(0);
  const [opening, setOpening] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const galleryHeight = width * GALLERY_RATIO;

  const heart = useAnimatedValue(1);
  const row = listing.data;

  const favourite = () => {
    if (!row) return;
    tapLight();
    favorites.toggle(row.id);
    Animated.sequence([
      Animated.spring(heart, { toValue: 1.15, useNativeDriver: NATIVE_DRIVER, tension: 420, friction: 6 }),
      Animated.spring(heart, { toValue: 1, useNativeDriver: NATIVE_DRIVER, ...motion.spring }),
    ]).start();
  };

  /* ── loading ── */
  if (listing.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <Skeleton width={width} height={galleryHeight} round={0} />
        <View style={{ padding: space.gutter }}>
          <Skeleton width="72%" height={20} />
          <Skeleton width="34%" height={26} style={{ marginTop: 14 }} />
          <Skeleton width="50%" height={13} style={{ marginTop: 14 }} />
        </View>
      </View>
    );
  }

  /* ── error / not found ── */
  if (listing.error || !row) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top }}>
        <EmptyState
          icon="bag"
          title={listing.error ? 'Could not load this listing' : 'Listing unavailable'}
          body={
            listing.error
              ? listing.error.message
              : 'This listing has been removed, sold, or is no longer published.'
          }
          action={
            <Button
              label="Back to browsing"
              height={48}
              onPress={() => router.dismissTo('/')}
              style={{ marginTop: 20 }}
            />
          }
        />
      </View>
    );
  }

  const images = [...row.images].sort((a, b) => a.position - b.position);
  const saved = favorites.saved.has(row.id);
  const place = [row.city, row.country_code].filter(Boolean).join(', ');

  /*
   * Messaging is offered only where it can actually work: signed in, and not
   * on your own listing. `conversations_insert_as_buyer` refuses a self-thread
   * anyway, so hiding the button matches the policy rather than guessing at it.
   */
  const isMine = !!user && user.id === row.seller_id;
  const canMessage = !!user && !isMine;

  const contactSeller = async () => {
    if (opening) return;
    setOpening(true);
    setContactError(null);
    try {
      const conversationId = await findOrCreateConversation(row.id, row.seller_id);
      router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
    } catch (e) {
      setContactError(e instanceof Error ? e.message : 'Could not open a conversation');
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        {/* ── gallery ── */}
        <View style={{ backgroundColor: C.surfaceSecondary }}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
              style={{ height: galleryHeight }}
            >
              {images.map((img) => (
                <Image
                  key={img.storage_path}
                  source={{ uri: imageUrl(img.storage_path) }}
                  style={{ width, height: galleryHeight }}
                  contentFit="cover"
                  transition={220}
                  cachePolicy="memory-disk"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={{ width, height: galleryHeight, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="image" size={34} color={C.textMuted} strokeWidth={1.4} />
            </View>
          )}

          <View
            style={{
              position: 'absolute',
              top: insets.top,
              left: 14,
              right: 14,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <FloatingIconButton name="chevronLeft" label="Back" onPress={() => router.back()} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <FloatingIconButton
                name="send"
                label="Share this listing"
                onPress={() => {
                  void Share.share({
                    message: `${row.title} — ${formatPrice(row.price_cents, row.currency)}`,
                  }).catch(() => {});
                }}
              />
              <Animated.View style={{ transform: [{ scale: heart }] }}>
                <FloatingIconButton
                  name="heart"
                  label={saved ? 'Remove from favourites' : 'Save to favourites'}
                  color={C.favourite}
                  fill={saved ? C.favourite : 'none'}
                  onPress={favourite}
                />
              </Animated.View>
            </View>
          </View>

          {images.length > 1 && (
            <View
              style={{
                position: 'absolute',
                bottom: 14,
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              {images.map((img, i) => (
                <View
                  key={img.storage_path}
                  style={{
                    width: i === page ? 18 : 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: i === page ? alpha.inkMedium : alpha.inkFaint,
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── headline ── */}
        <View style={{ paddingHorizontal: space.gutter, paddingTop: 18 }}>
          <T w={600} size={21} tracking={-0.35} lh={26}>
            {row.title}
          </T>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9, marginTop: 9 }}>
            <T w={700} size={26} tracking={-0.6}>
              {formatPrice(row.price_cents, row.currency)}
            </T>
            {row.original_price_cents != null && (
              <T size={14} color={C.textMuted} style={{ textDecorationLine: 'line-through' }}>
                {formatPrice(row.original_price_cents, row.currency)}
              </T>
            )}
          </View>

          <T w={500} size={14.5} style={{ marginTop: 8 }}>
            {CONDITION_LABEL[row.condition]}
          </T>

          {!!place && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <Icon name="pin" size={13} color={C.textSecondary} strokeWidth={1.9} />
              <T size={13} color={C.textSecondary}>
                {place}
              </T>
            </View>
          )}

          {!!row.description && (
            <T size={14.5} lh={22.5} style={{ marginTop: 16 }}>
              {row.description}
            </T>
          )}

          {(row.brand || row.size || row.color) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16 }}>
              {[row.brand, row.size, row.color].filter(Boolean).map((a) => (
                <View
                  key={a as string}
                  style={{
                    height: 29,
                    paddingHorizontal: 11,
                    borderRadius: radius.md,
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.border,
                    justifyContent: 'center',
                  }}
                >
                  <T w={500} size={12.5}>
                    {a}
                  </T>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── seller ── */}
        {row.seller && <SellerBlock seller={row.seller} />}

        {/*
          Message the seller — the one action on this screen that is fully
          built. There is still no Buy or Offer button, because neither has an
          implementation behind it.
        */}
        {canMessage && (
          <View style={{ paddingHorizontal: space.gutter, paddingTop: space.lg }}>
            <Button
              label={opening ? 'Opening…' : 'Message seller'}
              height={50}
              disabled={opening}
              onPress={contactSeller}
            />
            {!!contactError && (
              <T size={12.5} color={C.error} style={{ textAlign: 'center', paddingTop: 8 }}>
                {contactError}
              </T>
            )}
          </View>
        )}

        {isMine && (
          <T size={12.5} color={C.textMuted} style={{ textAlign: 'center', paddingTop: space.lg }}>
            This is your listing.
          </T>
        )}

        {/* ── delivery ── */}
        <DeliveryBlock countryCode={row.country_code} />
      </ScrollView>
    </View>
  );
}

function SellerBlock({ seller }: { seller: NonNullable<Awaited<ReturnType<typeof fetchListing>>>['seller'] }) {
  const router = useRouter();
  if (!seller) return null;

  const initials = seller.display_name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Tap
      onPress={() => router.push({ pathname: '/seller/[id]', params: { id: seller.id } })}
      accessibilityRole="button"
      accessibilityLabel={`View ${seller.display_name}'s profile`}
      style={{
        marginHorizontal: space.gutter,
        marginTop: space.xl,
        paddingTop: space.lg,
        borderTopWidth: 1,
        borderTopColor: C.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {seller.avatar_url ? (
        <Image
          source={{ uri: seller.avatar_url }}
          style={{ width: 46, height: 46, borderRadius: 23 }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Avatar initials={initials} bg={C.text} size={46} fontSize={16} />
      )}

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <T w={600} size={15}>
            {seller.display_name}
          </T>
          {seller.is_verified && <Icon name="badgeCheck" size={14} color={C.success} />}
        </View>

        {/*
          Rating and sales come from the profile's own counters, and only show
          when there is something real behind them. A seller with no reviews
          shows no stars rather than an invented five.
        */}
        <T size={12.5} color={C.textSecondary} style={{ marginTop: 3 }}>
          {seller.rating_count > 0 && seller.rating_avg != null
            ? `★ ${seller.rating_avg.toFixed(1)} (${seller.rating_count}) · `
            : ''}
          {seller.lifetime_sales === 1 ? '1 sale' : `${seller.lifetime_sales} sales`}
        </T>
      </View>

      <Icon name="chevronRight" size={17} color={C.borderStrong} />
    </Tap>
  );
}

/**
 * The delivery ladder for the seller's country.
 *
 * Read from `delivery_options` rather than the constants the prototype used.
 * Nothing here is stored against the listing — the schema keys these by
 * country, so this shows what will apply rather than a choice the seller made.
 */
function DeliveryBlock({ countryCode }: { countryCode: string }) {
  const options = useAsync(() => fetchDeliveryOptions(countryCode), `delivery:${countryCode}`);
  const rows = options.data ?? [];

  if (options.loading) {
    return (
      <View style={{ marginHorizontal: space.gutter, marginTop: space.xl }}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="70%" height={12} style={{ marginTop: 10 }} />
      </View>
    );
  }

  if (rows.length === 0) return null;

  return (
    <View
      style={{
        marginHorizontal: space.gutter,
        marginTop: space.xl,
        paddingTop: space.lg,
        borderTopWidth: 1,
        borderTopColor: C.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space.md }}>
        <Icon name="truck" size={19} color={C.text} strokeWidth={1.7} />
        <T w={600} size={15}>
          Delivery
        </T>
      </View>

      {rows.map((o) => (
        <View key={o.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 7 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w={500} size={14}>
              {o.name}
            </T>
            <T size={12.5} color={C.textSecondary} style={{ marginTop: 1 }}>
              {o.eta_label}
            </T>
          </View>
          <T w={600} size={14}>
            {o.price_cents === 0 ? 'Free' : formatPrice(o.price_cents)}
          </T>
        </View>
      ))}
    </View>
  );
}

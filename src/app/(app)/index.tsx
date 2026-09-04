import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useNavClearance } from '@/components/bottom-nav';
import { NilyaLockup } from '@/components/brand';
import { CategoryArtwork, artworkFor } from '@/components/category-artwork';
import { SegmentedPills } from '@/components/filter-chip';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ListingFeedGrid } from '@/components/listing-feed-grid';
import { NewArrivalsRail } from '@/components/new-arrivals-rail';
import { SearchBar } from '@/components/search-bar';
import { SectionHeader } from '@/components/section-header';
import { Skeleton } from '@/components/skeleton';
import { Button, InlineError, PressableScale } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useFavorites } from '@/hooks/use-favorites';
import { useListingFeed } from '@/hooks/use-listing-feed';
import type { CategoryRow, ListingRow } from '@/lib/database.types';
import { categoryIconName } from '@/lib/categories';
import { haptic } from '@/lib/haptics';
import { isCommerceListing, listingNoun } from '@/lib/listing-types';
import { coverUrl, fetchCategories, fetchListings } from '@/lib/queries';
import { activeFilterCount as countActiveFilters, EMPTY_FILTERS, useApp } from '@/store/app-store';
import { useCart } from '@/store/cart-store';
import { color as C, duration, radius, scale, space, touch, type } from '@/theme/tokens';

const EDGE = space.space16;
const HERO_HEIGHT = 180;
const CATEGORY_DISC = 64;

/** The two audience pills. They are real category slugs, shown only if the rows exist. */
const AUDIENCE_SLUGS = ['women', 'men'] as const;
type AudienceSlug = (typeof AUDIENCE_SLUGS)[number];

/**
 * Home.
 *
 * The wordmark leads, wishlist and bag sit on the right, then the search bar,
 * the Women / Men pills, a hero built from the newest real listing, the
 * category discs, and a grid of the latest products. Every section reads from
 * the database; the hero disappears rather than showing a stock photograph
 * when there is nothing new to show.
 */
export default function Home() {
  const insets = useSafeAreaInsets();
  const navClearance = useNavClearance();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { setCat, setFilters, sort, filters, openSheet } = useApp();
  const favorites = useFavorites();
  const cart = useCart();
  const categories = useAsync(() => fetchCategories('home'), 'categories:home');
  /* The newest live listing anywhere, for the hero. One row, read once. */
  const newest = useAsync(async () => (await fetchListings({ sort: 'recent' }, 0)).rows[0] ?? null, 'home:newest');

  const category = filters.categorySlug;
  const chooseCategory = (slug: string | null) => {
    setCat(slug ?? 'All');
    setFilters({
      ...EMPTY_FILTERS,
      categorySlug: slug,
      listingType: slug ? 'product' : null,
    });
  };

  const feedFilters = {
    category,
    minPriceCents: filters.minCents,
    maxPriceCents: filters.maxCents,
    countryCode: filters.countryCode,
    city: filters.city,
    brand: filters.brand,
    size: filters.size,
    color: filters.color,
    deliveryKey: filters.deliveryKey,
    listingType: filters.listingType,
    halalStatus: filters.halalStatus,
    preparationType: filters.preparationType,
    fragranceType: filters.fragranceType,
    targetAudience: filters.targetAudience,
    sealed: filters.sealed,
    contractType: filters.contractType,
    workMode: filters.workMode,
    sector: filters.sector,
    pricingMode: filters.pricingMode,
    serviceDeliveryMode: filters.serviceDeliveryMode,
  };
  const filterKey = JSON.stringify([category, filters]);

  /* The swipeable row is always newest first, whatever sort the grid uses:
     "New arrivals" ordered by price would not be new arrivals. */
  const newArrivals = useListingFeed({ ...feedFilters, sort: 'recent' }, `home:new:${filterKey}`);
  const feed = useListingFeed({ ...feedFilters, sort }, `home:${filterKey}:${sort}`);

  const activeFilterCount = countActiveFilters(filters);

  const audiences = AUDIENCE_SLUGS.map((slug) => (categories.data ?? []).find((row) => row.slug === slug)).filter(
    (row): row is CategoryRow => Boolean(row)
  );
  const audience = audiences.some((row) => row.slug === category) ? (category as AudienceSlug) : null;

  const header = (
    <View style={{ paddingTop: insets.top + space.space8, paddingBottom: space.space8 }}>
      <View
        style={{
          height: touch.large,
          marginHorizontal: EDGE,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <NilyaLockup iconSize={32} />
        <View style={{ flexDirection: 'row', gap: space.space8 }}>
          <IconButton icon="heart" label="Wishlist" onPress={() => router.push('/favorites')} />
          <IconButton icon="bag" label="Bag" badge={cart.count} onPress={() => router.push('/cart')} />
        </View>
      </View>

      <SearchBar
        onPress={() => router.push('/search')}
        onFilterPress={() => openSheet({ kind: 'filters' })}
        filterActiveCount={activeFilterCount}
        style={{ marginTop: space.space16, marginHorizontal: EDGE }}
      />

      {audiences.length === 2 ? (
        <SegmentedPills
          options={audiences.map((row) => ({ key: row.slug as AudienceSlug, label: row.label }))}
          value={audience}
          onChange={(next) => {
            haptic('selection-committed');
            chooseCategory(next);
          }}
          style={{ marginTop: space.space16, marginHorizontal: EDGE }}
        />
      ) : null}

      <View style={{ marginTop: space.space16, marginHorizontal: EDGE }}>
        {newest.loading ? (
          <Skeleton width="100%" height={HERO_HEIGHT} round={radius.radiusXLarge} />
        ) : newest.data ? (
          <HeroBanner
            listing={newest.data}
            width={width - EDGE * 2}
            onPress={() => router.push({ pathname: '/listing/[id]', params: { id: newest.data!.id } })}
          />
        ) : null}
      </View>

      <SectionHeader
        title="Category"
        onAction={() => router.push('/explore')}
        style={{ marginTop: space.space24, marginHorizontal: EDGE }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.space16, paddingHorizontal: EDGE, paddingTop: space.space12 }}
      >
        {categories.loading
          ? [0, 1, 2, 3, 4].map((index) => (
              <View key={index} style={{ alignItems: 'center', gap: space.space8 }}>
                <Skeleton width={CATEGORY_DISC} height={CATEGORY_DISC} round={radius.radiusPill} />
                <Skeleton width={44} height={10} />
              </View>
            ))
          : (categories.data ?? []).map((row) => (
              <CategoryDisc
                key={row.slug}
                category={row}
                onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: row.slug } })}
              />
            ))}
      </ScrollView>
      {categories.error ? (
        <InlineError
          message="Categories could not be loaded."
          actionLabel="Retry"
          onAction={categories.refetch}
          style={{ marginTop: space.space12, marginHorizontal: EDGE }}
        />
      ) : null}

      {/* "New arrivals", not "Trending": the row is ordered by publication
          and nothing in the schema measures popularity. It swipes sideways
          and pages, so the day's arrivals are all reachable from here. */}
      <NewArrivalsRail
        feed={newArrivals}
        savedIds={favorites.saved}
        onToggleSave={favorites.toggle}
        onSeeAll={() => router.push('/search')}
        edge={EDGE}
        style={{ marginTop: space.space24 }}
      />

      <SectionHeader
        title="All products"
        actionLabel={activeFilterCount === 0 ? 'Filters' : `Filters (${activeFilterCount})`}
        onAction={() => openSheet({ kind: 'filters' })}
        style={{ marginTop: space.space24, marginHorizontal: EDGE, marginBottom: space.space4 }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ListingFeedGrid
        listHeader={header}
        feed={feed}
        savedIds={favorites.saved}
        onToggleSave={favorites.toggle}
        cardVariant="editorial"
        cardHorizontalInset={EDGE}
        contentPaddingTop={0}
        contentPaddingBottom={navClearance + space.space8}
        refreshOffset={insets.top}
        onRefresh={() => {
          feed.refresh();
          newArrivals.refresh();
          favorites.refresh();
          categories.refresh();
          newest.refresh();
        }}
        empty={{
          icon: 'bag',
          title: activeFilterCount === 0 ? 'No listings yet' : 'Nothing here yet',
          body:
            activeFilterCount === 0
              ? 'New products, food, jobs and services will appear here on Nilya.'
              : 'Try another category or adjust your filters.',
          action: (
            <View style={{ marginTop: space.space20 }}>
              <Button label="Create a listing" onPress={() => router.push('/sell')} />
            </View>
          ),
        }}
      />

      {favorites.error ? (
        <View style={{ position: 'absolute', left: EDGE, right: EDGE, bottom: navClearance }}>
          <InlineError message="Your wishlist change could not be saved. Try again." />
        </View>
      ) : null}
    </View>
  );
}

/**
 * The hero card, built from the newest listing: its photograph bleeds to the
 * right edge, and "Shop now" opens it. The copy is editorial, not a claim.
 */
function HeroBanner({ listing, width, onPress }: { listing: ListingRow; width: number; onPress: () => void }) {
  const photo = coverUrl(listing.images);
  const imageWidth = Math.round(width * 0.46);
  const noun = listingNoun(listing.listing_type);
  const actionLabel = isCommerceListing(listing.listing_type)
    ? 'Shop now'
    : `View ${noun}`;

  return (
    <PressableScale
      onPress={onPress}
      scale={scale.cardPressed}
      motionRole="cardPress"
      accessibilityRole="button"
      accessibilityLabel={`Latest on Nilya. ${listing.title}. ${actionLabel}`}
      style={{
        height: HERO_HEIGHT,
        borderRadius: radius.radiusXLarge,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: C.heroFrom,
      }}
    >
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="nilya-hero" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={C.heroFrom} />
            <Stop offset="1" stopColor={C.heroTo} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#nilya-hero)" />
      </Svg>

      {photo ? (
        <Image
          source={{ uri: photo }}
          contentFit="cover"
          transition={duration.standard}
          cachePolicy="memory-disk"
          accessible={false}
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: imageWidth }}
        />
      ) : null}

      <View style={{ flex: 1, justifyContent: 'space-between', padding: space.space16, paddingRight: imageWidth + space.space8 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            minHeight: 24,
            justifyContent: 'center',
            paddingHorizontal: space.space12,
            borderRadius: radius.radiusPill,
            backgroundColor: C.surface,
          }}
        >
          <Text style={{ ...type.metadataMedium, fontSize: 11, lineHeight: 14, color: C.textPrimary }}>New in</Text>
        </View>
        <View style={{ gap: space.space4 }}>
          <Text style={{ ...type.productTitle, color: C.textPrimary }} numberOfLines={1}>
            Latest on Nilya
          </Text>
          <Text style={{ ...type.metadata, color: C.textSecondary }} numberOfLines={2}>
            A newly published {noun}: {listing.title.trim()}.
          </Text>
        </View>
        <View
          style={{
            alignSelf: 'flex-start',
            minHeight: 36,
            justifyContent: 'center',
            paddingHorizontal: space.space16,
            borderRadius: radius.radiusPill,
            backgroundColor: C.textPrimary,
          }}
        >
          <Text style={{ ...type.metadataMedium, color: C.textInverse }}>{actionLabel}</Text>
        </View>
      </View>
    </PressableScale>
  );
}

/** A 64px warm-grey disc with the category's own artwork and its label beneath. */
function CategoryDisc({ category, onPress }: { category: CategoryRow; onPress: () => void }) {
  const artwork = artworkFor(category.slug);
  return (
    <PressableScale
      onPress={onPress}
      scale={scale.buttonPressed}
      motionRole="selection"
      accessibilityRole="button"
      accessibilityLabel={`Browse ${category.label}`}
      style={{ alignItems: 'center', gap: space.space8, width: CATEGORY_DISC + space.space8 }}
    >
      <View
        style={{
          width: CATEGORY_DISC,
          height: CATEGORY_DISC,
          borderRadius: radius.radiusPill,
          backgroundColor: C.bgMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {artwork ? (
          <CategoryArtwork kind={artwork} size={40} />
        ) : (
          <Icon name={categoryIconName(category.icon_key)} role="inline" color={C.primary} decorative />
        )}
      </View>
      <Text style={{ ...type.caption, color: C.textPrimary }} numberOfLines={1}>
        {category.label}
      </Text>
    </PressableScale>
  );
}

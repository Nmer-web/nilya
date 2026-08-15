import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { ListingFeedGrid } from '@/components/listing-feed-grid';
import { FadeIn } from '@/components/skeleton';
import { PressableScale, SectionLabel, T, Tap } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useDebounced } from '@/hooks/use-debounced';
import { useFavorites } from '@/hooks/use-favorites';
import { useListingFeed } from '@/hooks/use-listing-feed';
import { fetchCategories } from '@/lib/queries';
import { filtersActive, SORTS, useApp } from '@/store/app-store';
import { color as C, radius, space } from '@/theme/tokens';

/**
 * Search.
 *
 * A screen rather than an overlay: it gets the platform's own transition, the
 * back gesture, and a real place in the stack. Results appear beneath the field
 * as the query settles, so a search is one continuous action rather than a
 * field, a submit and a jump to somewhere else.
 *
 * The query runs as Postgres full-text against the generated `search_tsv`
 * column, which covers title, brand, description and city — so what is matched
 * is the catalog itself, not a list of terms written here.
 */
export default function Search() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recent, submitSearch, setCat, sort, filters, openSheet } = useApp();
  const favorites = useFavorites();

  const [draft, setDraft] = useState('');
  const query = useDebounced(draft.trim(), 320);
  const searching = query.length > 0;

  const categories = useAsync(() => fetchCategories('explore'), 'categories:explore');

  /*
   * The feed is keyed on the settled query, so a keystroke does not reset the
   * list — only a pause does. Filters travel with it: a search inside a price
   * range is still that search.
   */
  const feed = useListingFeed(
    {
      query,
      category: filters.categorySlug,
      minPriceCents: filters.minCents,
      maxPriceCents: filters.maxCents,
      countryCode: filters.countryCode,
      sort,
    },
    `search:${query}:${filters.categorySlug}:${filters.minCents}:${filters.maxCents}:${filters.countryCode}:${sort}`
  );

  const hasFilters = filtersActive(filters);
  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? 'Newest first';

  /** Records the term and browses its results in place. */
  const go = (term: string) => {
    submitSearch(term);
    setDraft(term);
  };

  /** A category lands on Explore, which is the screen built for browsing. */
  const browse = (slug: string) => {
    setCat(slug);
    router.dismissTo('/explore');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View
        style={{
          paddingTop: insets.top + space.sm,
          paddingHorizontal: space.gutter,
          paddingBottom: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
        }}
      >
        <View
          style={{
            flex: 1,
            height: 52,
            borderRadius: radius.lg,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.text,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 15,
          }}
        >
          <Icon name="search" size={18} color={C.text} strokeWidth={2} />
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => draft.trim() && submitSearch(draft)}
            placeholder="Items, brands, categories, places"
            placeholderTextColor={C.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            style={{ flex: 1, minWidth: 0, fontSize: 16, color: C.text, padding: 0 }}
          />
          {!!draft && (
            <Tap
              onPress={() => setDraft('')}
              accessibilityRole="button"
              accessibilityLabel="Clear"
              hitSlop={10}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: C.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={12} color={C.textSecondary} strokeWidth={2.6} />
            </Tap>
          )}
        </View>

        <Tap onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
          <T w={600} size={15}>
            Cancel
          </T>
        </Tap>
      </View>

      {searching ? (
        <>
          {/*
            Sort and filters narrow the same query the field does — each writes
            a field `fetchListings` turns into a clause, so the row never
            changes appearance without changing results.
          */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              paddingHorizontal: space.gutter,
              paddingBottom: space.md,
            }}
          >
            {/* Counted only once the query has settled and returned, so the
                number never describes a different search than the one shown. */}
            <T size={13} color={C.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
              {feed.loading
                ? 'Searching…'
                : feed.error
                  ? ''
                  : `${feed.listings.length}${feed.hasMore ? '+' : ''} result${
                      feed.listings.length === 1 && !feed.hasMore ? '' : 's'
                    }`}
            </T>

            <Tap
              onPress={() => openSheet({ kind: 'sort' })}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${sortLabel}. Tap to change.`}
              hitSlop={10}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 44 }}
            >
              <T w={500} size={13}>
                {sortLabel}
              </T>
              <Icon name="chevronDown" size={13} color={C.text} />
            </Tap>

            <PressableScale
              onPress={() => openSheet({ kind: 'filters' })}
              accessibilityRole="button"
              accessibilityLabel="Filters"
              style={{
                height: 36,
                paddingHorizontal: 13,
                borderRadius: radius.pill,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: hasFilters ? C.text : C.background,
                borderWidth: 1,
                borderColor: hasFilters ? C.text : C.border,
              }}
            >
              <Icon name="sliders" size={15} color={hasFilters ? C.primaryText : C.text} />
              <T w={500} size={13} color={hasFilters ? C.primaryText : C.text}>
                Filters
              </T>
            </PressableScale>
          </View>

          <ListingFeedGrid
            feed={feed}
            savedIds={favorites.saved}
            onToggleSave={favorites.toggle}
            contentPaddingBottom={insets.bottom + space['3xl']}
            onRefresh={() => {
              feed.refresh();
              favorites.refresh();
            }}
            empty={{
              icon: 'search',
              title: 'No results found',
              body: 'Try another search or adjust your filters.',
            }}
          />
        </>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + space['3xl'] }}
        >
          <FadeIn y={8} duration={240}>
            {recent.length > 0 && (
              <Group title="Recent searches">
                {recent.map((r) => (
                  <Row key={r} icon="search" label={r} onPress={() => go(r)} />
                ))}
              </Group>
            )}

            {/*
              Categories come from the database, and nothing else is offered
              before a query. Suggesting brands or places would mean either
              inventing them or scanning the whole catalog to find them, and
              neither belongs on an empty search screen.
            */}
            {(categories.data ?? []).length > 0 && (
              <Group title="Browse categories">
                {(categories.data ?? []).map((c) => (
                  <Row key={c.slug} icon="bag" label={c.label} onPress={() => browse(c.slug)} />
                ))}
              </Group>
            )}

            {recent.length === 0 && (
              <SectionLabel style={{ paddingHorizontal: space.gutter, paddingTop: space.xl }}>
                Search titles, brands, descriptions and places
              </SectionLabel>
            )}
          </FadeIn>
        </ScrollView>
      )}
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingTop: space.xl }}>
      <T w={700} size={16} tracking={-0.2} style={{ paddingHorizontal: space.gutter, paddingBottom: space.md }}>
        {title}
      </T>
      {children}
    </View>
  );
}

function Row({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: space.gutter,
      }}
    >
      <Icon name={icon} size={17} color={C.textSecondary} strokeWidth={1.8} />
      <T size={15} style={{ flex: 1 }}>
        {label}
      </T>
      <Icon name="chevronRight" size={16} color={C.borderStrong} />
    </Tap>
  );
}

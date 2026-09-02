import { NEW_CONDITION, type ListingRow } from '@/lib/database.types';

import type {
  CategorySuggestion,
  ProductSuggestion,
  SearchFacet,
  SearchFacetCounts,
  SearchFilters,
  Suggestion,
  TermSuggestion,
} from './types';

const MAX_SUGGESTIONS = 10;
const MIN_TYPO_TOKEN_LENGTH = 5;
const DIACRITICS = /\p{Diacritic}/gu;
const TOKEN_SEPARATOR = /[^\p{L}\p{N}]+/u;

/**
 * Field priority is intentionally much larger than match-quality bonuses, so
 * a title match always outranks the equivalent brand, category or color match.
 */
const FIELD_WEIGHT = {
  title: 400,
  brand: 300,
  category: 200,
  color: 100,
} as const;

const MATCH_QUALITY = {
  exactToken: 80,
  prefix: 55,
  substring: 30,
  oneCharacterTypo: 15,
  exactPhrase: 120,
  phrasePrefix: 80,
  phraseSubstring: 45,
} as const;

type SearchField = {
  value: string | null;
  weight: number;
};

type RankedListing = {
  listing: ListingRow;
  score: number;
  originalIndex: number;
};

type RankedSuggestion<T extends Suggestion = Suggestion> = {
  suggestion: T;
  score: number;
  originalIndex: number;
};

export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(DIACRITICS, '').trim().toLowerCase();
}

function tokenize(value: string): string[] {
  return normalizeSearchText(value).split(TOKEN_SEPARATOR).filter(Boolean);
}

/** Dependency-free Levenshtein distance with two bounded working rows. */
export function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
    }

    for (let index = 0; index <= right.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function tokenMatchQuality(candidateTokens: readonly string[], queryToken: string): number {
  if (candidateTokens.some((candidate) => candidate === queryToken)) {
    return MATCH_QUALITY.exactToken;
  }
  if (candidateTokens.some((candidate) => candidate.startsWith(queryToken))) {
    return MATCH_QUALITY.prefix;
  }
  if (candidateTokens.some((candidate) => candidate.includes(queryToken))) {
    return MATCH_QUALITY.substring;
  }
  if (
    queryToken.length >= MIN_TYPO_TOKEN_LENGTH &&
    candidateTokens.some(
      (candidate) =>
        candidate.length >= MIN_TYPO_TOKEN_LENGTH &&
        Math.abs(candidate.length - queryToken.length) <= 1 &&
        levenshteinDistance(candidate, queryToken) === 1
    )
  ) {
    return MATCH_QUALITY.oneCharacterTypo;
  }
  return 0;
}

function phraseMatchQuality(candidate: string, query: string): number {
  if (!candidate || !query) return 0;
  if (candidate === query) return MATCH_QUALITY.exactPhrase;
  if (candidate.startsWith(query)) return MATCH_QUALITY.phrasePrefix;
  if (candidate.includes(query)) return MATCH_QUALITY.phraseSubstring;
  return 0;
}

function listingFields(listing: ListingRow): SearchField[] {
  const category = listing.category?.label?.trim() || listing.category_slug;
  return [
    { value: listing.title, weight: FIELD_WEIGHT.title },
    { value: listing.brand, weight: FIELD_WEIGHT.brand },
    { value: category, weight: FIELD_WEIGHT.category },
    { value: listing.color, weight: FIELD_WEIGHT.color },
  ];
}

/**
 * Scores one listing for a query, or returns null when every query token cannot
 * be matched. Tokens may match different fields, so "black dress" can match a
 * stored color and category on the same listing.
 */
export function scoreListing(listing: ListingRow, query: string): number | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const queryTokens = tokenize(normalizedQuery);
  const fields = listingFields(listing).map((field) => ({
    ...field,
    normalized: field.value ? normalizeSearchText(field.value) : '',
    tokens: field.value ? tokenize(field.value) : [],
  }));

  let score = 0;
  for (const queryToken of queryTokens) {
    let bestTokenScore = 0;
    for (const field of fields) {
      const quality = tokenMatchQuality(field.tokens, queryToken);
      if (quality > 0) bestTokenScore = Math.max(bestTokenScore, field.weight + quality);
    }
    if (bestTokenScore === 0) return null;
    score += bestTokenScore;
  }

  const bestPhraseScore = fields.reduce((best, field) => {
    const quality = phraseMatchQuality(field.normalized, normalizedQuery);
    return quality > 0 ? Math.max(best, field.weight + quality) : best;
  }, 0);

  return score + bestPhraseScore;
}

function matchesSelectedValue(value: string | null | undefined, selected: readonly string[]): boolean {
  if (selected.length === 0) return true;
  if (!value) return false;
  const normalizedValue = normalizeSearchText(value);
  return selected.some((candidate) => normalizeSearchText(candidate) === normalizedValue);
}

function matchesFilters(listing: ListingRow, filters: SearchFilters): boolean {
  if (listing.condition !== NEW_CONDITION) return false;
  if (filters.query.trim() && scoreListing(listing, filters.query) === null) return false;
  if (!matchesSelectedValue(listing.category_slug, filters.categorySlugs)) return false;
  if (!matchesSelectedValue(listing.size, filters.sizes)) return false;
  if (!matchesSelectedValue(listing.color, filters.colors)) return false;
  if (!matchesSelectedValue(listing.brand, filters.brands)) return false;
  if (filters.priceMinCents !== null && listing.price_cents < filters.priceMinCents) return false;
  if (filters.priceMaxCents !== null && listing.price_cents > filters.priceMaxCents) return false;
  return true;
}

function publishedAt(listing: ListingRow): number {
  if (!listing.published_at) return 0;
  const value = Date.parse(listing.published_at);
  return Number.isFinite(value) ? value : 0;
}

function rating(listing: ListingRow): number | null {
  if (!listing.seller || listing.seller.rating_count <= 0 || listing.seller.rating_avg === null) return null;
  return listing.seller.rating_avg;
}

function compareNullableDescending(left: number | null, right: number | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
}

/** Returns a new array; the caller's schema-backed listing rows are never mutated. */
export function search(products: readonly ListingRow[], filters: SearchFilters): ListingRow[] {
  const ranked: RankedListing[] = [];

  products.forEach((listing, originalIndex) => {
    if (!matchesFilters(listing, filters)) return;
    ranked.push({
      listing,
      score: scoreListing(listing, filters.query) ?? 0,
      originalIndex,
    });
  });

  ranked.sort((left, right) => {
    let difference = 0;
    switch (filters.sort) {
      case 'priceAsc':
        difference = left.listing.price_cents - right.listing.price_cents;
        break;
      case 'priceDesc':
        difference = right.listing.price_cents - left.listing.price_cents;
        break;
      case 'rating':
        difference = compareNullableDescending(rating(left.listing), rating(right.listing));
        if (difference === 0) {
          difference = (right.listing.seller?.rating_count ?? 0) - (left.listing.seller?.rating_count ?? 0);
        }
        break;
      case 'newest':
        difference = publishedAt(right.listing) - publishedAt(left.listing);
        break;
      case 'relevance':
        difference = right.score - left.score;
        if (difference === 0) difference = publishedAt(right.listing) - publishedAt(left.listing);
        break;
    }
    return difference || left.originalIndex - right.originalIndex;
  });

  return ranked.map(({ listing }) => listing);
}

function scoreSuggestionText(value: string, query: string): number | null {
  const normalizedValue = normalizeSearchText(value);
  const normalizedQuery = normalizeSearchText(query);
  const valueTokens = tokenize(value);
  const queryTokens = tokenize(query);
  let score = 0;

  for (const queryToken of queryTokens) {
    const quality = tokenMatchQuality(valueTokens, queryToken);
    if (quality === 0) return null;
    score += quality;
  }

  return score + phraseMatchQuality(normalizedValue, normalizedQuery);
}

function rankSuggestions<T extends Suggestion>(
  suggestions: readonly RankedSuggestion<T>[],
  limit: number
): RankedSuggestion<T>[] {
  return [...suggestions]
    .sort((left, right) => right.score - left.score || left.originalIndex - right.originalIndex)
    .slice(0, limit);
}

/** Suggestions are derived only from real NEW listing values supplied by the caller. */
export function suggest(products: readonly ListingRow[], query: string): Suggestion[] {
  if (!normalizeSearchText(query)) return [];

  const termByKey = new Map<string, RankedSuggestion<TermSuggestion>>();
  const categoryByKey = new Map<string, RankedSuggestion<CategorySuggestion>>();
  const productSuggestions: RankedSuggestion<ProductSuggestion>[] = [];

  products.forEach((listing, originalIndex) => {
    if (listing.condition !== NEW_CONDITION) return;

    const productScore = scoreListing(listing, query);
    if (productScore !== null) {
      productSuggestions.push({
        suggestion: { kind: 'product', listing },
        score: productScore,
        originalIndex,
      });
    }

    const categoryLabel = listing.category?.label?.trim();
    if (categoryLabel) {
      const categoryScore = scoreSuggestionText(categoryLabel, query);
      const key = normalizeSearchText(listing.category_slug);
      if (categoryScore !== null && !categoryByKey.has(key)) {
        categoryByKey.set(key, {
          suggestion: { kind: 'category', categorySlug: listing.category_slug, label: categoryLabel },
          score: categoryScore,
          originalIndex,
        });
      }
    }

    ([['brand', listing.brand], ['color', listing.color]] as const).forEach(([source, rawValue]) => {
      const value = rawValue?.trim();
      if (!value) return;
      const termScore = scoreSuggestionText(value, query);
      const key = normalizeSearchText(value);
      if (termScore !== null && !termByKey.has(key)) {
        termByKey.set(key, {
          suggestion: { kind: 'term', term: value, source },
          score: termScore,
          originalIndex,
        });
      }
    });
  });

  const groups: RankedSuggestion[][] = [
    rankSuggestions([...termByKey.values()], 3),
    rankSuggestions([...categoryByKey.values()], 3),
    rankSuggestions(productSuggestions, 4),
  ];
  const mixed: Suggestion[] = [];

  while (mixed.length < MAX_SUGGESTIONS && groups.some((group) => group.length > 0)) {
    for (const group of groups) {
      const next = group.shift();
      if (next) mixed.push(next.suggestion);
      if (mixed.length === MAX_SUGGESTIONS) break;
    }
  }

  return mixed;
}

const FACET_FILTER_KEY: Record<SearchFacet, keyof SearchFilters> = {
  categories: 'categorySlugs',
  sizes: 'sizes',
  colors: 'colors',
  brands: 'brands',
};

function facetValue(listing: ListingRow, facet: SearchFacet): string | null {
  switch (facet) {
    case 'categories':
      return listing.category_slug.trim() || null;
    case 'sizes':
      return listing.size?.trim() || null;
    case 'colors':
      return listing.color?.trim() || null;
    case 'brands':
      return listing.brand?.trim() || null;
  }
}

function availableFacetValues(products: readonly ListingRow[], facet: SearchFacet): string[] {
  const byNormalizedValue = new Map<string, string>();
  for (const listing of products) {
    if (listing.condition !== NEW_CONDITION) continue;
    const value = facetValue(listing, facet);
    if (value) byNormalizedValue.set(normalizeSearchText(value), value);
  }
  return [...byNormalizedValue.values()];
}

/**
 * Counts each option against the current filters with its own facet removed.
 * This preserves AND across facet types while showing what selecting any one
 * value in the displayed facet would yield.
 */
export function facetCounts(products: readonly ListingRow[], filters: SearchFilters): SearchFacetCounts {
  const result: SearchFacetCounts = {
    categories: {},
    sizes: {},
    colors: {},
    brands: {},
  };

  (Object.keys(FACET_FILTER_KEY) as SearchFacet[]).forEach((facet) => {
    const filterKey = FACET_FILTER_KEY[facet];
    const withoutCurrentFacet = { ...filters, [filterKey]: [] };
    const candidates = products.filter((listing) => matchesFilters(listing, withoutCurrentFacet));

    availableFacetValues(products, facet).forEach((value) => {
      const normalizedValue = normalizeSearchText(value);
      result[facet][value] = candidates.reduce((count, listing) => {
        const candidateValue = facetValue(listing, facet);
        return candidateValue && normalizeSearchText(candidateValue) === normalizedValue ? count + 1 : count;
      }, 0);
    });
  });

  return result;
}

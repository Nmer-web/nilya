import type { ListingRow } from '@/lib/database.types';

export type SearchSort = 'relevance' | 'newest' | 'priceAsc' | 'priceDesc' | 'rating';

/**
 * Search state in the same units and vocabulary as the live listings schema.
 *
 * There is deliberately no condition facet: every Nilya result must be NEW.
 * Category filters carry canonical slugs; the shared database resolver expands
 * parent slugs, so UI state never contains a second copy of the hierarchy.
 */
export type SearchFilters = {
  query: string;
  categorySlugs: string[];
  sizes: string[];
  colors: string[];
  brands: string[];
  priceMinCents: number | null;
  priceMaxCents: number | null;
  sort: SearchSort;
};

export const EMPTY_SEARCH_FILTERS: SearchFilters = {
  query: '',
  categorySlugs: [],
  sizes: [],
  colors: [],
  brands: [],
  priceMinCents: null,
  priceMaxCents: null,
  sort: 'relevance',
};

export type SearchFacet = 'categories' | 'sizes' | 'colors' | 'brands';

export type SearchFacetCounts = Record<SearchFacet, Record<string, number>>;

export type TermSuggestion = {
  kind: 'term';
  term: string;
  source: 'brand' | 'color';
};

export type CategorySuggestion = {
  kind: 'category';
  categorySlug: string;
  label: string;
};

export type ProductSuggestion = {
  kind: 'product';
  listing: ListingRow;
};

export type Suggestion = TermSuggestion | CategorySuggestion | ProductSuggestion;

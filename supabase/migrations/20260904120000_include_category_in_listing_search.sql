-- Keep NILYA's one full-text engine while making canonical category paths
-- searchable. Nested slugs encode their real path (`women-shoes`), so replacing
-- hyphens supplies the same lexemes a user types as "women shoes" without a
-- second client-side product search or a duplicated category document.

drop index if exists public.listings_search;

alter table public.listings
  drop column search_tsv;

alter table public.listings
  add column search_tsv tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(brand, '') || ' ' ||
      replace(category_slug, '-', ' ') || ' ' ||
      coalesce(city, '') || ' ' ||
      coalesce(description, '')
    )
  ) stored;

create index listings_search on public.listings using gin (search_tsv);

comment on column public.listings.search_tsv is
  'Canonical public listing search document: title, brand, category path slug, city, and description.';

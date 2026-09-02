-- NILYA category hierarchy.
--
-- The live table is currently keyed by `slug`, and every listing references
-- that value through `listings.category_slug`. Keep that contract intact while
-- adding stable UUID identities and a self-referencing tree. Existing rows are
-- updated in place; no listing is deleted or reclassified.

alter table public.categories
  add column id uuid not null default gen_random_uuid(),
  add column parent_id uuid,
  add column icon_key text,
  add column is_active boolean not null default true,
  add column created_at timestamptz not null default now();

alter table public.categories
  add constraint categories_id_key unique (id),
  add constraint categories_parent_id_fkey
    foreign key (parent_id) references public.categories (id) on delete restrict,
  add constraint categories_parent_not_self
    check (parent_id is null or parent_id <> id),
  add constraint categories_slug_canonical
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint categories_icon_key_canonical
    check (icon_key is null or icon_key ~ '^[a-z][a-z0-9-]{0,31}$');

-- Preserve every current row as a root. Books/Media and Hobbies/Collectables
-- are new roots; From Sudan keeps the existing `sudanese` canonical slug.
insert into public.categories
  (slug, label, parent_id, icon_key, sort_order, is_active, in_home, in_explore)
values
  ('women',                'Women',                    null, 'fashion',      10, true,  true,  true),
  ('men',                  'Men',                      null, 'fashion',      20, true,  true,  true),
  ('kids',                 'Kids',                     null, 'kids',         30, true,  true,  true),
  ('home',                 'Home',                     null, 'home',         40, true,  true,  true),
  ('electronics',          'Electronics',              null, 'electronics',  50, true,  true,  true),
  ('beauty',               'Beauty',                   null, 'beauty',       60, true,  true,  true),
  ('shoes',                'Shoes',                    null, 'shoes',        70, true,  true,  true),
  ('bags',                 'Bags',                     null, 'bags',         80, true,  false, true),
  ('sports',               'Sports',                   null, 'sports',       90, true,  true,  true),
  ('books-media',          'Books & Media',            null, 'books',       100, true,  false, true),
  ('hobbies-collectables', 'Hobbies & Collectables',   null, 'hobbies',     110, true,  false, true),
  ('sudanese',             'From Sudan',               null, 'sudan',       120, true,  false, true)
on conflict (slug) do update
set label = excluded.label,
    parent_id = excluded.parent_id,
    icon_key = excluded.icon_key,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    in_home = excluded.in_home,
    in_explore = excluded.in_explore;

with child_seed (slug, label, parent_slug, icon_key, sort_order) as (
  values
    ('women-clothing',                   'Clothing',             'women',                'clothing',     10),
    ('women-shoes',                      'Shoes',                'women',                'shoes',        20),
    ('women-bags',                       'Bags',                 'women',                'bags',         30),
    ('women-accessories',                'Accessories',          'women',                'accessories',  40),
    ('women-beauty',                     'Beauty',               'women',                'beauty',       50),

    ('men-clothing',                     'Clothing',             'men',                  'clothing',     10),
    ('men-shoes',                        'Shoes',                'men',                  'shoes',        20),
    ('men-bags',                         'Bags',                 'men',                  'bags',         30),
    ('men-accessories',                  'Accessories',          'men',                  'accessories',  40),
    ('men-grooming',                     'Grooming',             'men',                  'grooming',     50),

    ('kids-clothing',                    'Clothing',             'kids',                 'clothing',     10),
    ('kids-shoes',                       'Shoes',                'kids',                 'shoes',        20),
    ('kids-baby',                        'Baby',                 'kids',                 'baby',         30),
    ('kids-toys',                        'Toys',                 'kids',                 'toys',         40),
    ('kids-accessories',                 'Accessories',          'kids',                 'accessories',  50),

    ('home-small-kitchen-appliances',    'Small kitchen appliances', 'home',              'appliance',       10),
    ('home-cookware-bakeware',           'Cookware & bakeware',      'home',              'cookware',       20),
    ('home-kitchen-tools',               'Kitchen tools',            'home',              'kitchen-tools',   30),
    ('home-tableware',                   'Tableware',                'home',              'tableware',       40),
    ('home-household-care',              'Household care',           'home',              'household-care',  50),
    ('home-textiles',                    'Textiles',                 'home',              'textiles',        60),
    ('home-accessories',                 'Home accessories',         'home',              'decor',           70),
    ('home-office-supplies',             'Office supplies',          'home',              'office',          80),
    ('home-celebrations-holidays',       'Celebrations & holidays',  'home',              'celebration',     90),
    ('home-tools-diy',                   'Tools & DIY',               'home',              'tools',          100),
    ('home-outdoor-garden',              'Outdoor & garden',          'home',              'outdoor',        110),

    ('electronics-phones',               'Phones',               'electronics',          'phones',       10),
    ('electronics-computers',            'Computers',            'electronics',          'computers',    20),
    ('electronics-audio',                'Audio',                'electronics',          'audio',        30),
    ('electronics-gaming',               'Gaming',               'electronics',          'gaming',       40),
    ('electronics-cameras',              'Cameras',              'electronics',          'cameras',      50),
    ('electronics-smart-devices',        'Smart devices',        'electronics',          'smart-devices',60),
    ('electronics-accessories',          'Accessories',          'electronics',          'accessories',  70),

    ('beauty-skincare',                  'Skincare',             'beauty',               'skincare',     10),
    ('beauty-makeup',                    'Makeup',               'beauty',               'makeup',       20),
    ('beauty-haircare',                  'Haircare',             'beauty',               'haircare',     30),
    ('beauty-fragrance',                 'Fragrance',            'beauty',               'fragrance',    40),
    ('beauty-personal-care',             'Personal care',        'beauty',               'personal-care',50),

    ('shoes-trainers',                   'Trainers',             'shoes',                'shoes',        10),
    ('shoes-boots',                      'Boots',                'shoes',                'shoes',        20),
    ('shoes-sandals',                    'Sandals',              'shoes',                'shoes',        30),
    ('shoes-formal',                     'Formal shoes',         'shoes',                'shoes',        40),
    ('shoes-slippers',                   'Slippers',             'shoes',                'shoes',        50),

    ('bags-handbags',                    'Handbags',             'bags',                 'bags',         10),
    ('bags-backpacks',                   'Backpacks',            'bags',                 'bags',         20),
    ('bags-travel',                      'Travel bags',           'bags',                 'bags',         30),
    ('bags-business',                    'Business bags',         'bags',                 'bags',         40),
    ('bags-accessories',                 'Bag accessories',      'bags',                 'accessories',  50),

    ('sports-fitness',                   'Fitness',              'sports',               'fitness',      10),
    ('sports-football',                  'Football',             'sports',               'football',     20),
    ('sports-running',                   'Running',              'sports',               'running',      30),
    ('sports-outdoor',                   'Outdoor',              'sports',               'outdoor',      40),
    ('sports-equipment',                 'Equipment',            'sports',               'equipment',    50),
    ('sports-sportswear',                'Sportswear',           'sports',               'clothing',     60),

    ('books-media-books',                'Books',                'books-media',          'books',        10),
    ('books-media-music',                'Music',                'books-media',          'music',        20),
    ('books-media-movies',               'Movies',               'books-media',          'movies',       30),
    ('books-media-games',                'Games',                'books-media',          'games',        40),
    ('books-media-educational',          'Educational',          'books-media',          'education',    50),

    ('hobbies-collectables-art',         'Art',                  'hobbies-collectables', 'art',          10),
    ('hobbies-collectables-crafts',      'Crafts',               'hobbies-collectables', 'crafts',       20),
    ('hobbies-collectables-collectables','Collectables',         'hobbies-collectables', 'collectables', 30),
    ('hobbies-collectables-instruments', 'Musical instruments',  'hobbies-collectables', 'instruments',  40),
    ('hobbies-collectables-equipment',   'Hobby equipment',      'hobbies-collectables', 'equipment',    50),

    -- Food is deliberately absent: no current NILYA rule establishes that it
    -- is permitted, so seeding it would claim a marketplace policy that does
    -- not exist.
    ('sudanese-fashion',                 'Fashion',              'sudanese',             'fashion',      10),
    ('sudanese-beauty',                  'Beauty',               'sudanese',             'beauty',       20),
    ('sudanese-home',                    'Home',                 'sudanese',             'home',         30),
    ('sudanese-crafts',                  'Crafts',               'sudanese',             'crafts',       40),
    ('sudanese-cultural-products',       'Cultural products',    'sudanese',             'sudan',        50)
)
insert into public.categories
  (slug, label, parent_id, icon_key, sort_order, is_active, in_home, in_explore)
select seed.slug,
       seed.label,
       parent.id,
       seed.icon_key,
       seed.sort_order,
       true,
       false,
       true
from child_seed as seed
join public.categories as parent on parent.slug = seed.parent_slug
on conflict (slug) do update
set label = excluded.label,
    parent_id = excluded.parent_id,
    icon_key = excluded.icon_key,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    in_home = excluded.in_home,
    in_explore = excluded.in_explore;

-- One index serves active root and child menus in their display order. The
-- existing categories primary key already indexes slug, and
-- `listings_category` already indexes active listings by category_slug.
create index categories_parent_active_order
  on public.categories (parent_id, is_active, sort_order, label);

-- Resolve one category and every active descendant in one bounded database
-- operation. UNION (rather than UNION ALL) also prevents bad legacy cycles
-- from looping forever if one ever bypasses the direct self-parent check.
create or replace function public.category_descendant_slugs(root_category_slug text)
returns table (slug text)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive category_tree (id, slug) as (
    select category.id, category.slug
    from public.categories as category
    where category.slug = root_category_slug
      and category.is_active

    union

    select child.id, child.slug
    from public.categories as child
    join category_tree as parent on child.parent_id = parent.id
    where child.is_active
  )
  select category_tree.slug from category_tree;
$$;

revoke all on function public.category_descendant_slugs(text) from public;
grant execute on function public.category_descendant_slugs(text) to anon, authenticated;

-- New listings and category changes must choose an active leaf. Existing rows
-- assigned to the old roots remain editable when their category is unchanged.
create or replace function public.enforce_listing_leaf_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.category_slug is not distinct from old.category_slug then
    return new;
  end if;

  if not exists (
    select 1
    from public.categories as category
    where category.slug = new.category_slug
      and category.is_active
      and not exists (
        select 1
        from public.categories as child
        where child.parent_id = category.id
          and child.is_active
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'listings must reference an active leaf category';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_listing_leaf_category() from public;

create trigger listings_require_leaf_category
  before insert or update of category_slug on public.listings
  for each row execute function public.enforce_listing_leaf_category();

-- Categories are public reference data, but only while active. Client roles
-- can never create, rename, reorder, deactivate, or delete them.
drop policy if exists categories_read_all on public.categories;
create policy categories_read_active on public.categories
  for select to anon, authenticated
  using (is_active);

revoke insert, update, delete on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;

-- SAWA marketplace — reference data
--
-- Lifted from the client constants so the two stop drifting:
--   categories       ← CATS / EXCATS in src/data/catalog.ts
--   delivery_options ← deliveryFor() in src/store/app-store.tsx
--
-- 'All' is not seeded — it is a UI pseudo-category, not a real one.

insert into categories (slug, label, sort_order, in_home, in_explore) values
  ('women',       'Women',       10, true,  true),
  ('men',         'Men',         20, true,  true),
  ('kids',        'Kids',        30, true,  true),
  ('home',        'Home',        40, true,  true),
  ('electronics', 'Electronics', 50, true,  true),
  ('beauty',      'Beauty',      60, true,  true),
  ('shoes',       'Shoes',       70, true,  true),
  ('bags',        'Bags',        80, false, true),
  ('sports',      'Sports',      90, true,  true),
  ('sudanese',    'Sudanese',   100, false, true)
on conflict (slug) do update
  set label      = excluded.label,
      sort_order = excluded.sort_order,
      in_home    = excluded.in_home,
      in_explore = excluded.in_explore;

-- Sudan: cash at handover, so the €2.50 protection fee is waived on pickup.
insert into delivery_options
  (country_code, key, kind, name, subtitle, price_cents, eta_label, waives_protection_fee, sort_order) values
  ('SD', 'point', 'local', 'Local pickup',      'Al Riyadh Pickup Point, Khartoum',   0,   'Ready to collect in 1–2 days',   true,  10),
  ('SD', 'moto',  'local', 'Khartoum delivery', 'Motorbike courier to your address',  300, 'Same day if ordered before 15:00', false, 20),
  ('FR', 'point', 'dom',   'Pickup point',      'Épicerie du Canal · 400 m away',     499, '2–4 days',                       false, 10),
  ('FR', 'home',  'dom',   'Home delivery',     'Colissimo to 75011 Paris',           799, '2–4 days',                       false, 20),
  -- '**' is the fallback ladder: everything that is neither FR nor SD
  ('**', 'point', 'intl',  'International pickup point',  'DHL ServicePoint · 700 m away', 999,  '7–14 days', false, 10),
  ('**', 'home',  'intl',  'International home delivery', 'DHL Express, tracked',          1499, '7–14 days', false, 20)
on conflict (country_code, key) do update
  set kind                  = excluded.kind,
      name                  = excluded.name,
      subtitle              = excluded.subtitle,
      price_cents           = excluded.price_cents,
      eta_label             = excluded.eta_label,
      waives_protection_fee = excluded.waives_protection_fee,
      sort_order            = excluded.sort_order;

-- NOTE: the subtitles above are prototype copy written from one hypothetical
-- buyer's position — "400 m away", "Colissimo to 75011 Paris". Real pickup
-- points and distances are a per-buyer lookup against their address, not static
-- config. Treat these rows as the ladder's shape and pricing; the display
-- string for a point-type option should come from the carrier at checkout.

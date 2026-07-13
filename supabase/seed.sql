-- TableFlow demo seed data
-- Fixed UUIDs for predictable dev/testing
-- Requires: migrations applied; owner user created via register API or below stub

-- Demo owner (replace with real auth.users id after registration)
-- Using a placeholder that seed skips if auth user doesn't exist

DO $$
DECLARE
  demo_owner_id uuid := '00000000-0000-4000-8000-000000000001';
  demo_venue_id uuid := '11111111-1111-4111-8111-111111111111';
  cat_starters uuid := '22222222-2222-4222-8222-222222222222';
  cat_mains uuid := '33333333-3333-4333-8333-333333333333';
  cat_drinks uuid := '44444444-4444-4444-8444-444444444444';
  item_fries uuid := '55555555-5555-4555-8555-555555555555';
  item_burger uuid := '66666666-6666-4666-8666-666666666666';
  item_wine uuid := '77777777-7777-4777-8777-777777777777';
  table_1 uuid := '88888888-8888-4888-8888-888888888881';
  table_2 uuid := '88888888-8888-4888-8888-888888888882';
BEGIN
  -- Skip if demo venue already exists
  IF EXISTS (SELECT 1 FROM venues WHERE id = demo_venue_id) THEN
    RAISE NOTICE 'Demo venue already seeded';
    RETURN;
  END IF;

  -- Only seed venue if owner exists in auth.users OR insert without FK for local dev
  IF NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
    RAISE NOTICE 'No auth users found — create via POST /api/auth/register first';
    RETURN;
  END IF;

  SELECT id INTO demo_owner_id FROM auth.users ORDER BY created_at LIMIT 1;

  INSERT INTO venues (id, name, slug, owner_id, brand_color, tab_mode, currency)
  VALUES (demo_venue_id, 'The Rusty Anchor', 'rusty-anchor-demo', demo_owner_id, '#E84B2C', 'preauth', 'usd');

  INSERT INTO menu_categories (id, venue_id, name, sort_order) VALUES
    (cat_starters, demo_venue_id, 'Starters', 0),
    (cat_mains, demo_venue_id, 'Mains', 1),
    (cat_drinks, demo_venue_id, 'Drinks', 2);

  INSERT INTO menu_items (id, venue_id, category_id, name, description, price, allergens, dietary_tags, prep_time_minutes, sort_order) VALUES
    (item_fries, demo_venue_id, cat_starters, 'Truffle Fries', 'Hand-cut fries, truffle oil, parmesan', 12.00, '{dairy}', '{vegetarian}', 8, 0),
    (item_burger, demo_venue_id, cat_mains, 'Wagyu Burger', '8oz wagyu, brioche, aged cheddar', 28.00, '{gluten,dairy}', '{}', 14, 0),
    (item_wine, demo_venue_id, cat_drinks, 'House Red Wine', 'Glass of house red', 12.00, '{}', '{vegan}', 1, 0);

  INSERT INTO venue_tables (id, venue_id, name, capacity, qr_code) VALUES
    (table_1, demo_venue_id, 'Table 1', 4, 'tf_t_88888888_a1b2c3d4'),
    (table_2, demo_venue_id, 'Table 2', 6, 'tf_t_88888888_e5f6g7h8');

  RAISE NOTICE 'Demo venue seeded: The Rusty Anchor (%)', demo_venue_id;
END $$;

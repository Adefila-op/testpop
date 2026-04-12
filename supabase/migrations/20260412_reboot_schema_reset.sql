-- Migration: 20260412_reboot_schema_reset.sql
-- Purpose: Reset the public schema and replace legacy tables/RLS with a focused reboot data model
-- for home/discover/profile, creator operations, gifting, and onchain/offchain commerce flows.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Hard reset current public schema objects (tables, views, functions, enum types)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  object_record RECORD;
BEGIN
  FOR object_record IN
    SELECT schemaname, matviewname
    FROM pg_matviews
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE', object_record.schemaname, object_record.matviewname);
  END LOOP;

  FOR object_record IN
    SELECT table_schema, table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', object_record.table_schema, object_record.table_name);
  END LOOP;

  FOR object_record IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', object_record.table_schema, object_record.table_name);
  END LOOP;

  FOR object_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS function_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      object_record.schema_name,
      object_record.function_name,
      object_record.function_args
    );
  END LOOP;

  FOR object_record IN
    SELECT t.typname AS enum_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype = 'e'
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', object_record.enum_name);
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- Core helper types
-- -----------------------------------------------------------------------------
CREATE TYPE creator_status_t AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE portfolio_asset_kind_t AS ENUM ('image', 'video', 'ebook', 'file', 'link');
CREATE TYPE product_type_t AS ENUM ('digital_art', 'ebook', 'file', 'physical');
CREATE TYPE delivery_mode_t AS ENUM ('render_online', 'download_mobile', 'collect_onchain', 'deliver_physical');
CREATE TYPE order_status_t AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'rejected', 'refunded');
CREATE TYPE payment_method_t AS ENUM ('onchain', 'offramp_partner');
CREATE TYPE purchase_channel_t AS ENUM ('buy_onchain', 'buy_offchain');
CREATE TYPE fulfillment_mode_t AS ENUM ('collect_onchain', 'render_online', 'download_mobile', 'deliver_physical');
CREATE TYPE gift_status_t AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE subscription_status_t AS ENUM ('active', 'paused', 'cancelled');
CREATE TYPE collection_source_t AS ENUM ('purchase', 'gift_accept');

-- -----------------------------------------------------------------------------
-- Shared helper functions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_wallet()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT lower(
    coalesce(
      nullif(auth.jwt() ->> 'wallet', ''),
      nullif(auth.jwt() ->> 'address', ''),
      nullif(auth.jwt() ->> 'sub', '')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_collector_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT lower(
    coalesce(
      nullif(auth.jwt() ->> 'collector_id', ''),
      nullif(auth.jwt() ->> 'wallet', ''),
      nullif(auth.jwt() ->> 'address', ''),
      nullif(auth.jwt() ->> 'sub', '')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- -----------------------------------------------------------------------------
-- Admin schema
-- -----------------------------------------------------------------------------
CREATE TABLE admin_accounts (
  wallet TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_wallet TEXT NOT NULL,
  action TEXT NOT NULL,
  target_kind TEXT,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_featured_portfolios (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  profile_path TEXT,
  primary_image_url TEXT NOT NULL,
  secondary_image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Creator schema
-- -----------------------------------------------------------------------------
CREATE TABLE creator_profiles (
  id TEXT PRIMARY KEY,
  wallet TEXT UNIQUE NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  profile_image_url TEXT,
  banner_image_url TEXT,
  featured_portfolio JSONB NOT NULL DEFAULT '[]'::jsonb,
  status creator_status_t NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  featured_rank INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE creator_portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  media_url TEXT NOT NULL,
  preview_image_url TEXT,
  asset_kind portfolio_asset_kind_t NOT NULL DEFAULT 'image',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE creator_products (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  preview_url TEXT,
  delivery_url TEXT,
  price_eth NUMERIC(18, 6) NOT NULL DEFAULT 0,
  product_type product_type_t NOT NULL DEFAULT 'file',
  delivery_mode delivery_mode_t NOT NULL DEFAULT 'download_mobile',
  onchain_collectible BOOLEAN NOT NULL DEFAULT false,
  offchain_purchasable BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'published',
  inventory INT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT creator_products_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE discover_posts (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES creator_products(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  caption TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE discover_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL REFERENCES discover_posts(id) ON DELETE CASCADE,
  collector_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, collector_id)
);

CREATE TABLE discover_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL REFERENCES discover_posts(id) ON DELETE CASCADE,
  collector_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Collector, gifting, and commerce schema
-- -----------------------------------------------------------------------------
CREATE TABLE collector_profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collector_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id TEXT NOT NULL REFERENCES collector_profiles(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  status subscription_status_t NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collector_id, creator_id)
);

CREATE TABLE commerce_carts (
  collector_id TEXT NOT NULL REFERENCES collector_profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES creator_products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collector_id, product_id),
  CONSTRAINT commerce_carts_quantity_check CHECK (quantity >= 1)
);

CREATE TABLE commerce_orders (
  id TEXT PRIMARY KEY,
  collector_id TEXT NOT NULL REFERENCES collector_profiles(id) ON DELETE CASCADE,
  status order_status_t NOT NULL DEFAULT 'paid',
  payment_method payment_method_t NOT NULL,
  purchase_channel purchase_channel_t NOT NULL,
  fulfillment_mode fulfillment_mode_t NOT NULL,
  total_eth NUMERIC(18, 6) NOT NULL DEFAULT 0,
  tx_hash TEXT,
  offchain_provider TEXT,
  gift_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE commerce_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES creator_products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL,
  unit_price_eth NUMERIC(18, 6) NOT NULL,
  line_total_eth NUMERIC(18, 6) NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  product_type product_type_t NOT NULL,
  render_mode TEXT NOT NULL,
  readable_url TEXT,
  download_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commerce_order_items_quantity_check CHECK (quantity >= 1)
);

CREATE TABLE gifting_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  order_id TEXT UNIQUE NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
  sender_collector_id TEXT NOT NULL REFERENCES collector_profiles(id) ON DELETE CASCADE,
  recipient_label TEXT NOT NULL,
  recipient_collector_id TEXT REFERENCES collector_profiles(id) ON DELETE SET NULL,
  status gift_status_t NOT NULL DEFAULT 'pending',
  claim_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE TABLE collector_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id TEXT NOT NULL REFERENCES collector_profiles(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES creator_products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1,
  source collection_source_t NOT NULL DEFAULT 'purchase',
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT collector_collections_quantity_check CHECK (quantity >= 1),
  UNIQUE (collector_id, order_id, product_id, source)
);

CREATE TABLE collector_poaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id TEXT NOT NULL REFERENCES collector_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collector_id, code)
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_admin_audit_events_created_at ON admin_audit_events(created_at DESC);
CREATE INDEX idx_admin_featured_portfolios_active_order ON admin_featured_portfolios(is_active, sort_order ASC);

CREATE INDEX idx_creator_profiles_status ON creator_profiles(status);
CREATE INDEX idx_creator_profiles_featured ON creator_profiles(is_featured, featured_rank);
CREATE INDEX idx_creator_portfolio_items_creator_order ON creator_portfolio_items(creator_id, display_order ASC);
CREATE INDEX idx_creator_products_creator_status ON creator_products(creator_id, status);
CREATE INDEX idx_creator_products_delivery_mode ON creator_products(delivery_mode);
CREATE INDEX idx_discover_posts_created_at ON discover_posts(created_at DESC);
CREATE INDEX idx_discover_posts_featured ON discover_posts(featured, created_at DESC);
CREATE INDEX idx_discover_post_likes_post_id ON discover_post_likes(post_id);
CREATE INDEX idx_discover_post_comments_post_id ON discover_post_comments(post_id, created_at ASC);

CREATE INDEX idx_collector_subscriptions_collector ON collector_subscriptions(collector_id, status);
CREATE INDEX idx_commerce_carts_updated_at ON commerce_carts(updated_at DESC);
CREATE INDEX idx_commerce_orders_collector_created_at ON commerce_orders(collector_id, created_at DESC);
CREATE INDEX idx_commerce_order_items_order_id ON commerce_order_items(order_id);
CREATE INDEX idx_gifting_orders_sender_status ON gifting_orders(sender_collector_id, status, created_at DESC);
CREATE INDEX idx_gifting_orders_token ON gifting_orders(token);
CREATE INDEX idx_collector_collections_collector_acquired_at ON collector_collections(collector_id, acquired_at DESC);
CREATE INDEX idx_collector_poaps_collector_created_at ON collector_poaps(collector_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Foreign keys that reference tables declared later
-- -----------------------------------------------------------------------------
ALTER TABLE admin_featured_portfolios
  ADD CONSTRAINT admin_featured_portfolios_creator_fk
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- Updated-at triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_admin_featured_portfolios_updated_at
BEFORE UPDATE ON admin_featured_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_creator_profiles_updated_at
BEFORE UPDATE ON creator_profiles
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_creator_portfolio_items_updated_at
BEFORE UPDATE ON creator_portfolio_items
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_creator_products_updated_at
BEFORE UPDATE ON creator_products
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_discover_posts_updated_at
BEFORE UPDATE ON discover_posts
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_discover_post_comments_updated_at
BEFORE UPDATE ON discover_post_comments
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_collector_profiles_updated_at
BEFORE UPDATE ON collector_profiles
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_commerce_carts_updated_at
BEFORE UPDATE ON commerce_carts
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_commerce_orders_updated_at
BEFORE UPDATE ON commerce_orders
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Admin helper now that admin table exists
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_accounts
    WHERE wallet = public.current_wallet()
  );
$$;
-- -----------------------------------------------------------------------------
-- Seed canonical reboot data
-- -----------------------------------------------------------------------------
INSERT INTO admin_accounts (wallet, role)
VALUES ('0x0000000000000000000000000000000000000000', 'admin')
ON CONFLICT (wallet) DO NOTHING;

INSERT INTO creator_profiles (
  id,
  wallet,
  handle,
  name,
  bio,
  profile_image_url,
  banner_image_url,
  featured_portfolio,
  status,
  is_featured,
  featured_rank
)
VALUES
  (
    'creator-aurora',
    '0x1111111111111111111111111111111111111111',
    'auroravale',
    'Aurora Vale',
    'Digital painter building layered art drops and collectible story worlds.',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1800&q=80',
    '[{"title":"Layered Poster Pack","media_url":"https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1600&q=80","asset_kind":"image"}]'::jsonb,
    'approved',
    true,
    1
  ),
  (
    'creator-nova',
    '0x2222222222222222222222222222222222222222',
    'novaikeda',
    'Nova Ikeda',
    'Interactive publishing creator focused on collectible ebook chapters.',
    'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1800&q=80',
    '[{"title":"Neon Futures Chapter","media_url":"https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1600&q=80","asset_kind":"image"}]'::jsonb,
    'approved',
    true,
    2
  ),
  (
    'creator-rio',
    '0x3333333333333333333333333333333333333333',
    'riomercer',
    'Rio Mercer',
    'Motion designer releasing creator toolkits and physical merch bundles.',
    'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1800&q=80',
    '[{"title":"Transition Toolkit","media_url":"https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=80","asset_kind":"image"}]'::jsonb,
    'approved',
    true,
    3
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO creator_portfolio_items (
  creator_id,
  title,
  media_url,
  preview_image_url,
  asset_kind,
  is_featured,
  display_order
)
VALUES
  (
    'creator-aurora',
    'Starlit Poster Collection',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=2000&q=90',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80',
    'image',
    true,
    1
  ),
  (
    'creator-nova',
    'Neon Futures Reader Preview',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80',
    'ebook',
    true,
    1
  ),
  (
    'creator-rio',
    'Motion Toolkit Reel',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=2000&q=90',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=900&q=80',
    'image',
    true,
    1
  );

INSERT INTO creator_products (
  id,
  creator_id,
  title,
  description,
  image_url,
  preview_url,
  delivery_url,
  price_eth,
  product_type,
  delivery_mode,
  onchain_collectible,
  offchain_purchasable,
  status,
  inventory
)
VALUES
  (
    'product-starlit-book',
    'creator-aurora',
    'Starlit Sketchbook',
    'Digital art bundle with layered PSD source files and print-ready exports.',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=2200&q=90',
    0.032,
    'digital_art',
    'collect_onchain',
    true,
    true,
    'published',
    NULL
  ),
  (
    'product-neon-ebook',
    'creator-nova',
    'Neon Futures eBook',
    'Interactive eBook featuring concept art, process notes, and bonus chapter drops.',
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1400&q=80',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    0.018,
    'ebook',
    'render_online',
    false,
    true,
    'published',
    NULL
  ),
  (
    'product-rio-pack',
    'creator-rio',
    'Rio Motion Kit',
    'Downloadable creator toolkit: overlays, transitions, LUTs, and presets.',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=80',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    0.025,
    'file',
    'download_mobile',
    false,
    true,
    'published',
    NULL
  ),
  (
    'product-rio-physical-zine',
    'creator-rio',
    'Rio Physical Collector Zine',
    'Signed physical zine with serialized insert and shipping fulfillment.',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1600&q=80',
    NULL,
    0.041,
    'physical',
    'deliver_physical',
    false,
    true,
    'published',
    250
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO discover_posts (
  id,
  product_id,
  creator_id,
  caption,
  featured,
  created_at
)
VALUES
  (
    'post-1',
    'product-starlit-book',
    'creator-aurora',
    'Fresh deck drop. Layered files included for collectors.',
    true,
    now() - interval '3 day'
  ),
  (
    'post-2',
    'product-neon-ebook',
    'creator-nova',
    'Episode zero of the Neon Futures release is now live.',
    true,
    now() - interval '2 day'
  ),
  (
    'post-3',
    'product-rio-pack',
    'creator-rio',
    'Motion kit update includes 24 new transitions.',
    false,
    now() - interval '1 day'
  ),
  (
    'post-4',
    'product-rio-physical-zine',
    'creator-rio',
    'Signed physical release now open. Ships globally once sold out.',
    false,
    now() - interval '12 hour'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_featured_portfolios (
  id,
  creator_id,
  title,
  subtitle,
  profile_path,
  primary_image_url,
  secondary_image_url,
  sort_order,
  is_active
)
VALUES
  (
    'featured-1',
    'creator-aurora',
    'Starlit Creator Deck',
    'Onchain collectible art bundles with layered source access.',
    '/discover',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80',
    1,
    true
  ),
  (
    'featured-2',
    'creator-nova',
    'Neon Reader Drop',
    'Social-commerce ebook episodes with direct in-app rendering.',
    '/discover',
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=900&q=80',
    2,
    true
  )
ON CONFLICT (id) DO NOTHING;
-- -----------------------------------------------------------------------------
-- RLS: strict policies for rebooted model
-- -----------------------------------------------------------------------------
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_featured_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE discover_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discover_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discover_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifting_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_poaps ENABLE ROW LEVEL SECURITY;

-- Admin tables
CREATE POLICY admin_accounts_admin_only
  ON admin_accounts FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY admin_audit_events_admin_only
  ON admin_audit_events FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY admin_featured_portfolios_public_read
  ON admin_featured_portfolios FOR SELECT
  USING (is_active = true OR public.is_platform_admin());

CREATE POLICY admin_featured_portfolios_admin_write
  ON admin_featured_portfolios FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Creator read/write
CREATE POLICY creator_profiles_public_read
  ON creator_profiles FOR SELECT
  USING (status = 'approved' OR public.is_platform_admin());

CREATE POLICY creator_profiles_self_insert
  ON creator_profiles FOR INSERT
  WITH CHECK (wallet = public.current_wallet() OR public.is_platform_admin());

CREATE POLICY creator_profiles_self_update
  ON creator_profiles FOR UPDATE
  USING (wallet = public.current_wallet() OR public.is_platform_admin())
  WITH CHECK (wallet = public.current_wallet() OR public.is_platform_admin());

CREATE POLICY creator_portfolio_items_public_read
  ON creator_portfolio_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM creator_profiles cp
      WHERE cp.id = creator_portfolio_items.creator_id
        AND (cp.status = 'approved' OR public.is_platform_admin())
    )
  );

CREATE POLICY creator_portfolio_items_owner_write
  ON creator_portfolio_items FOR ALL
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM creator_profiles cp
      WHERE cp.id = creator_portfolio_items.creator_id
        AND cp.wallet = public.current_wallet()
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM creator_profiles cp
      WHERE cp.id = creator_portfolio_items.creator_id
        AND cp.wallet = public.current_wallet()
    )
  );

CREATE POLICY creator_products_public_read
  ON creator_products FOR SELECT
  USING (status = 'published' OR public.is_platform_admin());

CREATE POLICY creator_products_owner_write
  ON creator_products FOR ALL
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM creator_profiles cp
      WHERE cp.id = creator_products.creator_id
        AND cp.wallet = public.current_wallet()
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM creator_profiles cp
      WHERE cp.id = creator_products.creator_id
        AND cp.wallet = public.current_wallet()
    )
  );

CREATE POLICY discover_posts_public_read
  ON discover_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM creator_products p
      JOIN creator_profiles cp ON cp.id = p.creator_id
      WHERE p.id = discover_posts.product_id
        AND p.status = 'published'
        AND cp.status = 'approved'
    )
    OR public.is_platform_admin()
  );

CREATE POLICY discover_posts_owner_write
  ON discover_posts FOR ALL
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM creator_profiles cp
      WHERE cp.id = discover_posts.creator_id
        AND cp.wallet = public.current_wallet()
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM creator_profiles cp
      WHERE cp.id = discover_posts.creator_id
        AND cp.wallet = public.current_wallet()
    )
  );

CREATE POLICY discover_post_likes_public_read
  ON discover_post_likes FOR SELECT
  USING (true);

CREATE POLICY discover_post_likes_owner_write
  ON discover_post_likes FOR ALL
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin())
  WITH CHECK (collector_id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY discover_post_comments_public_read
  ON discover_post_comments FOR SELECT
  USING (true);

CREATE POLICY discover_post_comments_owner_write
  ON discover_post_comments FOR ALL
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin())
  WITH CHECK (collector_id = public.current_collector_id() OR public.is_platform_admin());

-- Collector/private commerce tables
CREATE POLICY collector_profiles_owner_read
  ON collector_profiles FOR SELECT
  USING (id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY collector_profiles_owner_write
  ON collector_profiles FOR ALL
  USING (id = public.current_collector_id() OR public.is_platform_admin())
  WITH CHECK (id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY collector_subscriptions_owner_read
  ON collector_subscriptions FOR SELECT
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY collector_subscriptions_owner_write
  ON collector_subscriptions FOR ALL
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin())
  WITH CHECK (collector_id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY commerce_carts_owner_read
  ON commerce_carts FOR SELECT
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY commerce_carts_owner_write
  ON commerce_carts FOR ALL
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin())
  WITH CHECK (collector_id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY commerce_orders_owner_read
  ON commerce_orders FOR SELECT
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY commerce_orders_owner_insert
  ON commerce_orders FOR INSERT
  WITH CHECK (collector_id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY commerce_orders_owner_update
  ON commerce_orders FOR UPDATE
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin())
  WITH CHECK (collector_id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY commerce_order_items_owner_read
  ON commerce_order_items FOR SELECT
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM commerce_orders o
      WHERE o.id = commerce_order_items.order_id
        AND o.collector_id = public.current_collector_id()
    )
  );

CREATE POLICY commerce_order_items_owner_insert
  ON commerce_order_items FOR INSERT
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM commerce_orders o
      WHERE o.id = commerce_order_items.order_id
        AND o.collector_id = public.current_collector_id()
    )
  );

CREATE POLICY gifting_orders_sender_or_recipient_read
  ON gifting_orders FOR SELECT
  USING (
    public.is_platform_admin()
    OR sender_collector_id = public.current_collector_id()
    OR recipient_collector_id = public.current_collector_id()
  );

CREATE POLICY gifting_orders_sender_write
  ON gifting_orders FOR INSERT
  WITH CHECK (
    public.is_platform_admin()
    OR sender_collector_id = public.current_collector_id()
  );

CREATE POLICY gifting_orders_sender_or_recipient_update
  ON gifting_orders FOR UPDATE
  USING (
    public.is_platform_admin()
    OR sender_collector_id = public.current_collector_id()
    OR recipient_collector_id = public.current_collector_id()
  )
  WITH CHECK (
    public.is_platform_admin()
    OR sender_collector_id = public.current_collector_id()
    OR recipient_collector_id = public.current_collector_id()
  );

CREATE POLICY collector_collections_owner_read
  ON collector_collections FOR SELECT
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY collector_collections_owner_write
  ON collector_collections FOR ALL
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin())
  WITH CHECK (collector_id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY collector_poaps_owner_read
  ON collector_poaps FOR SELECT
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin());

CREATE POLICY collector_poaps_owner_write
  ON collector_poaps FOR ALL
  USING (collector_id = public.current_collector_id() OR public.is_platform_admin())
  WITH CHECK (collector_id = public.current_collector_id() OR public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON
  admin_featured_portfolios,
  creator_profiles,
  creator_portfolio_items,
  creator_products,
  discover_posts,
  discover_post_likes,
  discover_post_comments
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

COMMIT;

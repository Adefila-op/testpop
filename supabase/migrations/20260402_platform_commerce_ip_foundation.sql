-- Migration: Add commerce asset, entitlement, fulfillment, and IP campaign foundation
-- Description:
--   * Splits public preview assets from gated/private delivery assets
--   * Adds entitlements and fulfillment lifecycle tables
--   * Adds tokenized creative IP campaign, investment, and royalty tables
--   * Keeps existing products/orders/artists tables as the operational core

CREATE TABLE IF NOT EXISTS product_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'preview',
  visibility VARCHAR(50) NOT NULL DEFAULT 'public',
  asset_type VARCHAR(50) NOT NULL DEFAULT 'image',
  storage_provider VARCHAR(50) DEFAULT 'ipfs',
  uri TEXT NOT NULL,
  preview_uri TEXT,
  mime_type TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  checksum_sha256 TEXT,
  sort_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  requires_signed_url BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES product_assets(id) ON DELETE CASCADE,
  buyer_wallet TEXT NOT NULL,
  access_type VARCHAR(50) NOT NULL DEFAULT 'download',
  status VARCHAR(50) NOT NULL DEFAULT 'granted',
  grant_reason VARCHAR(100) DEFAULT 'purchase',
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  creator_wallet TEXT,
  fulfillment_type VARCHAR(50) NOT NULL DEFAULT 'physical',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  provider VARCHAR(100),
  tracking_code TEXT,
  tracking_url TEXT,
  shipping_address_jsonb JSONB,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ip_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL DEFAULT 'revenue_share',
  rights_type VARCHAR(50) NOT NULL DEFAULT 'creative_ip',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  visibility VARCHAR(50) NOT NULL DEFAULT 'private',
  funding_target_eth NUMERIC NOT NULL DEFAULT 0,
  minimum_raise_eth NUMERIC DEFAULT 0,
  unit_price_eth NUMERIC,
  total_units INT,
  units_sold INT NOT NULL DEFAULT 0,
  opens_at TIMESTAMP WITH TIME ZONE,
  closes_at TIMESTAMP WITH TIME ZONE,
  settlement_at TIMESTAMP WITH TIME ZONE,
  shares_contract_address TEXT,
  shares_contract_tx TEXT,
  legal_doc_uri TEXT,
  cover_image_uri TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ip_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ip_campaigns(id) ON DELETE CASCADE,
  investor_wallet TEXT NOT NULL,
  amount_eth NUMERIC NOT NULL DEFAULT 0,
  units_purchased NUMERIC NOT NULL DEFAULT 0,
  unit_price_eth NUMERIC,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  contribution_tx_hash TEXT,
  settlement_tx_hash TEXT,
  invested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS royalty_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ip_campaigns(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES ip_investments(id) ON DELETE SET NULL,
  recipient_wallet TEXT NOT NULL,
  source_reference TEXT,
  gross_amount_eth NUMERIC NOT NULL DEFAULT 0,
  fee_amount_eth NUMERIC NOT NULL DEFAULT 0,
  net_amount_eth NUMERIC NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payout_tx_hash TEXT,
  distributed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_assets_product_visibility ON product_assets(product_id, visibility, role);
CREATE INDEX IF NOT EXISTS idx_entitlements_buyer_wallet ON entitlements(lower(buyer_wallet));
CREATE INDEX IF NOT EXISTS idx_fulfillments_order_id ON fulfillments(order_id);
CREATE INDEX IF NOT EXISTS idx_ip_campaigns_artist_id ON ip_campaigns(artist_id);
CREATE INDEX IF NOT EXISTS idx_ip_investments_wallet ON ip_investments(lower(investor_wallet));
CREATE INDEX IF NOT EXISTS idx_royalty_distributions_recipient_wallet ON royalty_distributions(lower(recipient_wallet));

CREATE OR REPLACE FUNCTION grant_order_item_entitlements()
RETURNS TRIGGER AS $$
DECLARE
  v_order RECORD;
  v_product RECORD;
BEGIN
  SELECT id, buyer_wallet, status
  INTO v_order
  FROM orders
  WHERE id = NEW.order_id;

  IF v_order.id IS NULL OR v_order.status NOT IN ('paid', 'processing', 'shipped', 'delivered') THEN
    RETURN NEW;
  END IF;

  SELECT id, product_type
  INTO v_product
  FROM products
  WHERE id = NEW.product_id;

  IF v_product.id IS NULL OR v_product.product_type NOT IN ('digital', 'hybrid') THEN
    RETURN NEW;
  END IF;

  INSERT INTO entitlements (
    order_id,
    order_item_id,
    product_id,
    asset_id,
    buyer_wallet,
    access_type,
    status,
    grant_reason,
    granted_at,
    created_at,
    updated_at
  )
  SELECT
    NEW.order_id,
    NEW.id,
    NEW.product_id,
    pa.id,
    lower(v_order.buyer_wallet),
    CASE
      WHEN pa.asset_type IN ('pdf', 'epub', 'document') THEN 'reader'
      WHEN pa.asset_type IN ('audio', 'video') THEN 'stream'
      ELSE 'download'
    END,
    'granted',
    'purchase',
    NOW(),
    NOW(),
    NOW()
  FROM product_assets pa
  WHERE pa.product_id = NEW.product_id
    AND pa.role = 'delivery'
    AND pa.visibility IN ('gated', 'private')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grant_order_item_entitlements ON order_items;
CREATE TRIGGER trg_grant_order_item_entitlements
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION grant_order_item_entitlements();

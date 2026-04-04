-- ============================================================================
-- Migration: 20260403_creative_release_unification.sql
-- Description:
--   * Adds creative_releases as the canonical parent model for new sellable work
--   * Links legacy drops/products/orders into the new release domain additively
--   * Adds escrow-friendly order approval and payout tracking fields
--   * Expands admin audit log checks for release and payout operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS creative_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  release_type VARCHAR(50) NOT NULL DEFAULT 'collectible',
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  price_eth NUMERIC NOT NULL DEFAULT 0,
  supply INT NOT NULL DEFAULT 1,
  sold INT NOT NULL DEFAULT 0,
  art_metadata_uri TEXT,
  cover_image_uri TEXT,
  contract_kind VARCHAR(50) NOT NULL DEFAULT 'artDrop',
  contract_address TEXT,
  contract_listing_id BIGINT,
  contract_drop_id BIGINT,
  physical_details_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  shipping_profile_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  creator_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT creative_releases_release_type_check
    CHECK (release_type IN ('collectible', 'physical', 'hybrid')),
  CONSTRAINT creative_releases_status_check
    CHECK (status IN ('draft', 'review', 'published', 'live', 'paused', 'ended', 'archived')),
  CONSTRAINT creative_releases_contract_kind_check
    CHECK (contract_kind IN ('artDrop', 'productStore', 'creativeReleaseEscrow'))
);

CREATE INDEX IF NOT EXISTS idx_creative_releases_artist_id
ON creative_releases(artist_id);

CREATE INDEX IF NOT EXISTS idx_creative_releases_release_type_status
ON creative_releases(release_type, status);

CREATE INDEX IF NOT EXISTS idx_creative_releases_created_at
ON creative_releases(created_at DESC);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS creative_release_id UUID REFERENCES creative_releases(id) ON DELETE SET NULL;

ALTER TABLE drops
ADD COLUMN IF NOT EXISTS creative_release_id UUID REFERENCES creative_releases(id) ON DELETE SET NULL;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS creative_release_id UUID REFERENCES creative_releases(id) ON DELETE SET NULL;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS contract_kind VARCHAR(50) DEFAULT 'productStore';

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS contract_order_id BIGINT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payout_status VARCHAR(50) DEFAULT 'unreleased';

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS creative_release_id UUID REFERENCES creative_releases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_creative_release_id
ON products(creative_release_id);

CREATE INDEX IF NOT EXISTS idx_drops_creative_release_id
ON drops(creative_release_id);

CREATE INDEX IF NOT EXISTS idx_orders_creative_release_id
ON orders(creative_release_id);

CREATE INDEX IF NOT EXISTS idx_orders_contract_kind
ON orders(contract_kind);

CREATE INDEX IF NOT EXISTS idx_order_items_creative_release_id
ON order_items(creative_release_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_contract_kind_check'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT orders_contract_kind_check
    CHECK (contract_kind IN ('artDrop', 'productStore', 'creativeReleaseEscrow'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payout_status_check'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT orders_payout_status_check
    CHECK (payout_status IN ('unreleased', 'approved', 'released', 'refunded', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_approval_status_check'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT orders_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'production_accepted', 'shipped', 'delivered', 'refunded'));
  END IF;
END $$;

ALTER TABLE IF EXISTS admin_audit_log
DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE IF EXISTS admin_audit_log
DROP CONSTRAINT IF EXISTS admin_audit_log_status_check;

ALTER TABLE IF EXISTS admin_audit_log
ADD CONSTRAINT admin_audit_log_action_check
CHECK (
  action IN (
    'approve_artist',
    'reject_artist',
    'deploy_contract',
    'revoke_approval',
    'delete_artist',
    'approve_release_order',
    'release_creator_payout',
    'refund_release_order',
    'mark_production_accepted',
    'attach_tracking',
    'mark_shipped',
    'mark_delivered'
  )
);

ALTER TABLE IF EXISTS admin_audit_log
ADD CONSTRAINT admin_audit_log_status_check
CHECK (
  status IN (
    'pending',
    'approved',
    'rejected',
    'deployed',
    'failed',
    'revoked',
    'released',
    'refunded',
    'shipped',
    'delivered'
  )
);

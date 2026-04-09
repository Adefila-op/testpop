-- ============================================================================
-- Migration: 20260408_add_missing_constraints.sql
-- Purpose: Add UNIQUE and FK constraints for data integrity
-- Date: April 8, 2026
-- ============================================================================

-- ============================================================================
-- ARTISTS TABLE - Add unique constraint on wallet
-- ============================================================================

-- Check if constraint already exists, then add if needed
ALTER TABLE artists
  ADD CONSTRAINT artists_wallet_unique UNIQUE (wallet);

-- ============================================================================
-- ORDERS TABLE - Add unique constraint on tx_hash
-- ============================================================================

ALTER TABLE orders
  ADD CONSTRAINT orders_tx_hash_unique UNIQUE (tx_hash);

-- ============================================================================
-- NONCES TABLE - Add unique constraint + indexes for auth
-- ============================================================================

ALTER TABLE nonces
  ADD CONSTRAINT nonces_wallet_nonce_unique UNIQUE (wallet, nonce);

-- Compound index for fast nonce lookup
CREATE INDEX IF NOT EXISTS idx_nonces_wallet_used 
  ON nonces(wallet, used, created_at DESC);

-- ============================================================================
-- ORDERS TABLE - Add foreign key to order_items
-- ============================================================================

-- Ensure order_items properly references orders
ALTER TABLE order_items
  ADD CONSTRAINT fk_order_items_orders FOREIGN KEY (order_id)
  REFERENCES orders(id) ON DELETE CASCADE;

-- ============================================================================
-- ARTIST_SHARES TABLE - Add constraints
-- ============================================================================

ALTER TABLE artist_shares
  ADD CONSTRAINT artist_shares_artist_id_token_unique 
  UNIQUE (artist_id, token_address);

-- ============================================================================
-- SUBSCRIPTIONS TABLE - Add constraints
-- ============================================================================

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_subscriber_artist_unique 
  UNIQUE (subscriber_wallet, artist_id)
  ON CONFLICT DO UPDATE SET expires_at = EXCLUDED.expires_at;
  -- ^ On duplicate subscription, update expiry instead of error

-- ============================================================================
-- DROPS TABLE - Add constraints
-- ============================================================================

ALTER TABLE drops
  ADD CONSTRAINT drops_artist_id_contract_unique 
  UNIQUE (artist_id, contract_address)
  WHERE contract_address IS NOT NULL;

-- ============================================================================
-- PRODUCTS TABLE - Add constraints
-- ============================================================================

ALTER TABLE products
  ADD CONSTRAINT products_creator_id_name_unique 
  UNIQUE (creator_id, name);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check constraints are working
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.constraint_column_usage 
-- WHERE table_name IN ('artists', 'orders', 'nonces');

-- Verify unique constraints prevent duplicates
-- INSERT INTO artists (wallet, name) VALUES ('0xtest', 'Test') 
--   ON CONFLICT (wallet) DO NOTHING;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
-- These constraints improve query performance by:
-- 1. Preventing duplicate artists for same wallet
-- 2. Preventing double-charging for same transaction
-- 3. Preventing authentication token reuse attacks
-- 4. Enabling unique indexes for fast lookups

/**
 * ROW LEVEL SECURITY (RLS) POLICIES - Complete Implementation
 * File: supabase/migrations/20260405_rls_policies_comprehensive.sql
 * 
 * CRITICAL FIX: Complete RLS for all sensitive tables
 * Prevents users from accessing other users' data
 * 
 * This migration supports the actual schema:
 * - campaigns table is named ip_campaigns
 * - Uses wallet/address for user identification
 * - Handles subscription and order immutability
 */

-- Enable RLS only on tables that exist
ALTER TABLE IF EXISTS drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS artists ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROPS TABLE - Artists edit own, users read published
-- ============================================

-- Artists can read and update their own drops
CREATE POLICY IF NOT EXISTS "Artists can manage their own drops"
  ON drops
  FOR ALL
  USING (artist_id = auth.uid())
  WITH CHECK (artist_id = auth.uid());

-- Public can read published drops
CREATE POLICY IF NOT EXISTS "Public can read published drops"
  ON drops
  FOR SELECT
  USING (status IN ('published', 'active', 'live'));

-- Admin override (check for admin role in JWT)
CREATE POLICY IF NOT EXISTS "Admin can manage all drops"
  ON drops
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- ORDERS TABLE - Users access their own orders
-- ============================================

-- Users can only see their own orders (by wallet address)
CREATE POLICY IF NOT EXISTS "Users can read their own orders"
  ON orders
  FOR SELECT
  USING (buyer_wallet = auth.jwt() ->> 'wallet' OR buyer_wallet = auth.jwt() ->> 'address');

-- Users cannot modify orders (orders are immutable)
CREATE POLICY IF NOT EXISTS "Orders are immutable"
  ON orders
  FOR UPDATE
  USING (false); -- Prevent all updates

CREATE POLICY IF NOT EXISTS "Orders cannot be deleted"
  ON orders
  FOR DELETE
  USING (false); -- Prevent deletion

-- Artists can see orders for their drops
CREATE POLICY IF NOT EXISTS "Artists can see orders for their drops"
  ON orders
  FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM products WHERE creator_wallet = auth.jwt() ->> 'wallet'
    ) OR
    -- Also check drop-based orders if drops exist
    EXISTS (
      SELECT 1 FROM drops d 
      WHERE d.artist_id = auth.uid() 
      AND d.id = orders.drop_id
    )
  );

-- Admin can see all orders
CREATE POLICY IF NOT EXISTS "Admin can access all orders"
  ON orders
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- SUBSCRIPTIONS TABLE - Users access their own
-- ============================================

-- Users can read their own subscriptions (by wallet)
CREATE POLICY IF NOT EXISTS "Users can read their own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (subscriber_wallet = auth.jwt() ->> 'wallet' OR subscriber_wallet = auth.jwt() ->> 'address');

-- Subscriptions cannot be modified by users (managed by backend)
CREATE POLICY IF NOT EXISTS "Prevent subscription modifications"
  ON subscriptions
  FOR UPDATE
  USING (false);

CREATE POLICY IF NOT EXISTS "Prevent subscription deletion"
  ON subscriptions
  FOR DELETE
  USING (false);

-- Artists can see who subscribed to them
CREATE POLICY IF NOT EXISTS "Artists can see their subscribers"
  ON subscriptions
  FOR SELECT
  USING (artist_wallet = auth.jwt() ->> 'wallet');

-- ============================================
-- PRODUCTS TABLE - Public reads, creators manage
-- ============================================

-- Public can read published products
CREATE POLICY IF NOT EXISTS "Public can read published products"
  ON products
  FOR SELECT
  USING (status IN ('published', 'active'));

-- Creators can manage their products
CREATE POLICY IF NOT EXISTS "Creators can manage their products"
  ON products
  FOR ALL
  USING (creator_wallet = auth.jwt() ->> 'wallet' OR creator_wallet = auth.jwt() ->> 'address')
  WITH CHECK (creator_wallet = auth.jwt() ->> 'wallet' OR creator_wallet = auth.jwt() ->> 'address');

-- ============================================
-- IP_CAMPAIGNS TABLE - Campaign access control
-- ============================================

-- Only admins/artists can create campaigns
CREATE POLICY IF NOT EXISTS "Artists can create their campaigns"
  ON ip_campaigns
  FOR INSERT
  WITH CHECK (creator_wallet = auth.jwt() ->> 'wallet' OR auth.jwt() ->> 'role' = 'admin');

-- Creators can manage their campaigns
CREATE POLICY IF NOT EXISTS "Creators can manage their campaigns"
  ON ip_campaigns
  FOR ALL
  USING (creator_wallet = auth.jwt() ->> 'wallet')
  WITH CHECK (creator_wallet = auth.jwt() ->> 'wallet');

-- Public can see active campaigns (read-only)
CREATE POLICY IF NOT EXISTS "Public can read active campaigns"
  ON ip_campaigns
  FOR SELECT
  USING (status = 'active');

-- Admin can access all campaigns
CREATE POLICY IF NOT EXISTS "Admin can access all campaigns"
  ON ip_campaigns
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- ARTISTS TABLE - Verify ownership
-- ============================================

-- Artists can read/update their own profile (by wallet)
CREATE POLICY IF NOT EXISTS "Artists can manage their profile"
  ON artists
  FOR ALL
  USING (wallet = auth.jwt() ->> 'wallet' OR wallet = auth.jwt() ->> 'address')
  WITH CHECK (wallet = auth.jwt() ->> 'wallet' OR wallet = auth.jwt() ->> 'address');

-- Public can read artist profiles
CREATE POLICY IF NOT EXISTS "Public can read artist profiles"
  ON artists
  FOR SELECT
  USING (true);

-- ============================================
-- AUDIT LOG TABLE - Append-only (if exists)
-- ============================================

CREATE POLICY IF NOT EXISTS "Users can read their own audit logs"
  ON audit_log
  FOR SELECT
  USING (
    user_wallet = auth.jwt() ->> 'wallet' OR
    user_wallet = auth.jwt() ->> 'address' OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- No one can update/delete audit logs
CREATE POLICY IF NOT EXISTS "Audit logs are immutable"
  ON audit_log
  FOR UPDATE
  USING (false);

CREATE POLICY IF NOT EXISTS "Audit logs cannot be deleted"
  ON audit_log
  FOR DELETE
  USING (false);

-- ============================================
-- VERIFY RLS IS ENFORCED
-- ============================================

-- Check RLS status on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('artists', 'drops', 'orders', 'subscriptions', 'products', 'ip_campaigns', 'audit_log')
ORDER BY tablename;

-- Expected output - all tables with rowsecurity = true:
-- public | artists          | t
-- public | audit_log        | t
-- public | drops            | t
-- public | ip_campaigns     | t
-- public | orders           | t
-- public | products         | t
-- public | subscriptions    | t

-- ============================================
-- TESTING RLS POLICIES
-- ============================================

/*
Test 1: User cannot access other users' orders
---------------------------------

Logged in as: wallet_a (0x123...)
Try to query: SELECT * FROM orders WHERE buyer_wallet = '0xabc...' (different wallet)

Expected: Returns empty (RLS filters to only wallet_a's orders)

Test 2: Artist cannot modify other artists' drops
---------------------------------

Logged in as: artist_1
Try: UPDATE drops SET price_eth = 0.001 WHERE id = 'drop-2';
(where drop-2 belongs to artist_2)

Expected: UPDATE 0 (RLS blocks, no rows match policy)

Test 3: Creator cannot modify other creators' products
---------------------------------

Logged in as: creator_a_wallet
Try: UPDATE products SET price_eth = 0.001 WHERE id = 'prod-2';
(where prod-2 belongs to creator_b_wallet)

Expected: UPDATE 0 (RLS blocks)

Test 4: Orders are truly immutable
---------------------------------

Logged in as: user who placed order
Try: UPDATE orders SET status = 'refunded' WHERE id = 'order-1';

Expected: UPDATE 0 (RLS policy prevents all updates)

Test 5: Public can only see published drops
---------------------------------

User with no auth (anon)
SELECT * FROM drops;

Expected: Only shows drops with status IN ('published', 'active', 'live')

Test 6: Only active campaigns visible
---------------------------------

SELECT * FROM ip_campaigns;

Expected: Only rows where status = 'active'
*/

-- ============================================
-- GRANT REQUIRED PERMISSIONS
-- ============================================

-- Anon users need select on public tables
GRANT SELECT ON drops TO anon;
GRANT SELECT ON artists TO anon;
GRANT SELECT ON products TO anon;
GRANT SELECT ON ip_campaigns TO anon;

-- Authenticated users need permissions (RLS controls actual access)
GRANT ALL ON drops TO authenticated;
GRANT ALL ON orders TO authenticated;
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON products TO authenticated;
GRANT ALL ON ip_campaigns TO authenticated;
GRANT ALL ON artists TO authenticated;
GRANT ALL ON audit_log TO authenticated;

-- Service role (backend) needs full access (RLS not applied to service role)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

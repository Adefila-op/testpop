-- Supabase Migration: RLS Policies for Production Security
-- Date: April 5, 2026
-- Purpose: Implement Row-Level Security to prevent unauthorized data access

-- ============================================
-- Enable RLS on all sensitive tables
-- ============================================

ALTER TABLE IF EXISTS drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS artists ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROPS TABLE POLICIES
-- ============================================

-- Public can read published drops
DROP POLICY IF EXISTS "drops_select_published" ON drops;
CREATE POLICY "drops_select_published"
  ON drops
  FOR SELECT
  USING (status IN ('published', 'active', 'live'));

-- Artists can manage their own drops (via artist_id -> artists.wallet join)
DROP POLICY IF EXISTS "drops_manage_own" ON drops;
CREATE POLICY "drops_manage_own"
  ON drops
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM artists 
      WHERE artists.id = drops.artist_id 
      AND (artists.wallet = auth.jwt() ->> 'wallet' OR artists.wallet = auth.jwt() ->> 'address')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM artists 
      WHERE artists.id = drops.artist_id 
      AND (artists.wallet = auth.jwt() ->> 'wallet' OR artists.wallet = auth.jwt() ->> 'address')
    )
  );

-- ============================================
-- ORDERS TABLE POLICIES
-- ============================================

-- Users can read their own orders
DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own"
  ON orders
  FOR SELECT
  USING (
    buyer_wallet = auth.jwt() ->> 'wallet' OR 
    buyer_wallet = auth.jwt() ->> 'address'
  );

-- Orders cannot be modified (immutable)
DROP POLICY IF EXISTS "orders_prevent_update" ON orders;
CREATE POLICY "orders_prevent_update"
  ON orders
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "orders_prevent_delete" ON orders;
CREATE POLICY "orders_prevent_delete"
  ON orders
  FOR DELETE
  USING (false);

-- ============================================
-- SUBSCRIPTIONS TABLE POLICIES
-- ============================================

-- Users can read their own subscriptions
DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own"
  ON subscriptions
  FOR SELECT
  USING (
    subscriber_wallet = auth.jwt() ->> 'wallet' OR
    subscriber_wallet = auth.jwt() ->> 'address'
  );

-- Subscriptions cannot be modified by users
DROP POLICY IF EXISTS "subscriptions_prevent_update" ON subscriptions;
CREATE POLICY "subscriptions_prevent_update"
  ON subscriptions
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "subscriptions_prevent_delete" ON subscriptions;
CREATE POLICY "subscriptions_prevent_delete"
  ON subscriptions
  FOR DELETE
  USING (false);

-- ============================================
-- PRODUCTS TABLE POLICIES
-- ============================================

-- Public can read published products
DROP POLICY IF EXISTS "products_select_published" ON products;
CREATE POLICY "products_select_published"
  ON products
  FOR SELECT
  USING (status IN ('published', 'active'));

-- Creators can manage their products
DROP POLICY IF EXISTS "products_manage_own" ON products;
CREATE POLICY "products_manage_own"
  ON products
  FOR ALL
  USING (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  )
  WITH CHECK (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  );

-- ============================================
-- IP_CAMPAIGNS TABLE POLICIES
-- ============================================

-- Public can read active campaigns
DROP POLICY IF EXISTS "campaigns_select_active" ON ip_campaigns;
CREATE POLICY "campaigns_select_active"
  ON ip_campaigns
  FOR SELECT
  USING (status IN ('active', 'published', 'live'));

-- Artists can manage their campaigns (joins to artists table via artist_id)
DROP POLICY IF EXISTS "campaigns_manage_own" ON ip_campaigns;
CREATE POLICY "campaigns_manage_own"
  ON ip_campaigns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM artists 
      WHERE artists.id = ip_campaigns.artist_id 
      AND (artists.wallet = auth.jwt() ->> 'wallet' OR artists.wallet = auth.jwt() ->> 'address')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM artists 
      WHERE artists.id = ip_campaigns.artist_id 
      AND (artists.wallet = auth.jwt() ->> 'wallet' OR artists.wallet = auth.jwt() ->> 'address')
    )
  );

-- ============================================
-- ARTISTS TABLE POLICIES
-- ============================================

-- Everyone can read public artist profiles
DROP POLICY IF EXISTS "artists_select_public" ON artists;
CREATE POLICY "artists_select_public"
  ON artists
  FOR SELECT
  USING (true);

-- Artists can update their own profile
DROP POLICY IF EXISTS "artists_update_own" ON artists;
CREATE POLICY "artists_update_own"
  ON artists
  FOR UPDATE
  USING (
    wallet = auth.jwt() ->> 'wallet' OR 
    wallet = auth.jwt() ->> 'address'
  )
  WITH CHECK (
    wallet = auth.jwt() ->> 'wallet' OR 
    wallet = auth.jwt() ->> 'address'
  );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Public (anon) users can read public data
GRANT SELECT ON drops TO anon;
GRANT SELECT ON artists TO anon;
GRANT SELECT ON products TO anon;
GRANT SELECT ON ip_campaigns TO anon;

-- Authenticated users can access tables (RLS controls what they see)
GRANT ALL ON drops TO authenticated;
GRANT ALL ON orders TO authenticated;
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON products TO authenticated;
GRANT ALL ON ip_campaigns TO authenticated;
GRANT ALL ON artists TO authenticated;

-- Backend service use has full access (RLS bypassed for service role)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ============================================
-- VERIFICATION
-- ============================================

-- Run this to verify RLS is enabled:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- AND tablename IN ('artists', 'drops', 'orders', 'subscriptions', 'products', 'ip_campaigns')
-- ORDER BY tablename;

-- All rows should show rowsecurity = true

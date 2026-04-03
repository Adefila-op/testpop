-- Migration: Restore public artist discovery without exposing non-public profiles
-- Description:
--   * Allows anon storefront reads for approved/active artists
--   * Preserves whitelist-based compatibility for legacy databases
--   * Prevents draft, pending, rejected, and suspended artists from leaking publicly

DROP POLICY IF EXISTS "artists_read_public" ON artists;
DROP POLICY IF EXISTS "artists_read_approved_public" ON artists;

DO $$
DECLARE
  has_artist_status BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'artists'
      AND column_name = 'status'
  );
  has_whitelist_artist_id BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whitelist'
      AND column_name = 'artist_id'
  );
  has_whitelist_wallet BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whitelist'
      AND column_name = 'wallet'
  );
  whitelist_match_sql TEXT := NULL;
BEGIN
  IF has_whitelist_artist_id AND has_whitelist_wallet THEN
    whitelist_match_sql := $match$
      ((w.artist_id IS NOT NULL AND w.artist_id = artists.id) OR lower(w.wallet) = lower(artists.wallet))
    $match$;
  ELSIF has_whitelist_artist_id THEN
    whitelist_match_sql := 'w.artist_id = artists.id';
  ELSIF has_whitelist_wallet THEN
    whitelist_match_sql := 'lower(w.wallet) = lower(artists.wallet)';
  END IF;

  IF has_artist_status AND whitelist_match_sql IS NOT NULL THEN
    EXECUTE format($policy$
      CREATE POLICY "artists_read_approved_public" ON artists
      FOR SELECT
      USING (
        status IN ('approved', 'active')
        OR EXISTS (
          SELECT 1
          FROM whitelist w
          WHERE w.status = 'approved'
            AND %s
        )
      )
    $policy$, whitelist_match_sql);
  ELSIF has_artist_status THEN
    EXECUTE $policy$
      CREATE POLICY "artists_read_approved_public" ON artists
      FOR SELECT
      USING (status IN ('approved', 'active'))
    $policy$;
  ELSIF whitelist_match_sql IS NOT NULL THEN
    EXECUTE format($policy$
      CREATE POLICY "artists_read_approved_public" ON artists
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM whitelist w
          WHERE w.status = 'approved'
            AND %s
        )
      )
    $policy$, whitelist_match_sql);
  ELSE
    EXECUTE $policy$
      CREATE POLICY "artists_read_approved_public" ON artists
      FOR SELECT
      USING (false)
    $policy$;
  END IF;
END $$;

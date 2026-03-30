-- ═══════════════════════════════════════════════════════════════════════════════
-- Add Multi-Format Asset Support to Drops Table
-- ═══════════════════════════════════════════════════════════════════════════════
-- Enables drops to contain different file types: images, videos, audio, PDFs, eBooks
-- Supports preview URIs (e.g., video thumbnails) and delivery URIs (gated content)

ALTER TABLE IF EXISTS drops
ADD COLUMN IF NOT EXISTS asset_type VARCHAR(50) DEFAULT 'image',
ADD COLUMN IF NOT EXISTS preview_uri TEXT,
ADD COLUMN IF NOT EXISTS delivery_uri TEXT,
ADD COLUMN IF NOT EXISTS is_gated BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Add constraints to validate asset types
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE drops
ADD CONSTRAINT valid_asset_type CHECK (
  asset_type IN ('image', 'video', 'audio', 'pdf', 'epub', 'merchandise', 'digital')
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Create index for filtering by asset type (used in discovery/filtering)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_drops_asset_type
ON drops(asset_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- Create index for gated content filtering
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_drops_is_gated
ON drops(is_gated)
WHERE is_gated = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Comments for documentation
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN drops.asset_type IS 'Type of digital asset: image (default), video, audio, pdf, epub';
COMMENT ON COLUMN drops.preview_uri IS 'IPFS preview thumbnail (e.g., video poster or album art)';
COMMENT ON COLUMN drops.delivery_uri IS 'IPFS URI for gated/downloadable content (different from preview)';
COMMENT ON COLUMN drops.is_gated IS 'Whether content requires ownership verification to access';

-- ═══════════════════════════════════════════════════════════════════════════════
-- PRODUCTION MIGRATION NOTES
-- ═══════════════════════════════════════════════════════════════════════════════
-- All existing drops default to asset_type = 'image' for backward compatibility
-- Frontend will auto-detect asset type from file extension on future uploads
-- Display logic: Use asset_type to render appropriate viewer (Image/Video/Audio/PDF/Epub)
-- Gating: If is_gated=true, show DownloadPanel instead of direct viewer

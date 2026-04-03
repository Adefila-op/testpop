-- Migration: add editable metadata to drops
-- Description:
--   * Supports artist-managed campaign detail content without changing immutable onchain metadata

ALTER TABLE drops
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

UPDATE drops
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

-- Migration: Add subscription expiry tracking
-- Description: Creates subscriptions table and adds support for 30-day expiring tokens with renewal capability

-- First, create the subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  subscriber_wallet TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expiry_time BIGINT DEFAULT 0,
  min_subscription_fee NUMERIC DEFAULT 0.001,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(artist_id, subscriber_wallet)
);

-- Add columns if they don't already exist (idempotent)
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS expiry_time BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_subscription_fee NUMERIC DEFAULT 0.001;

-- Index for fast expiry lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON subscriptions(expiry_time);
CREATE INDEX IF NOT EXISTS idx_subscriptions_artist_expiry ON subscriptions(artist_id, expiry_time);

-- Helper function to check if subscription is active
CREATE OR REPLACE FUNCTION is_subscription_active(artist_id_param UUID, subscriber_wallet_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE subscriptions.artist_id = artist_id_param
    AND subscriptions.subscriber_wallet = subscriber_wallet_param
    AND subscriptions.expiry_time > EXTRACT(EPOCH FROM NOW())::BIGINT
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to get subscription time remaining (in seconds)
CREATE OR REPLACE FUNCTION get_subscription_time_remaining(artist_id_param UUID, subscriber_wallet_param TEXT)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT MAX(0) FROM (
      SELECT expiry_time - EXTRACT(EPOCH FROM NOW())::BIGINT as remaining
      FROM subscriptions
      WHERE subscriptions.artist_id = artist_id_param
      AND subscriptions.subscriber_wallet = subscriber_wallet_param
    ) sub
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to renew subscription (called when subscriber re-pays)
CREATE OR REPLACE FUNCTION renew_subscription(
  artist_id_param UUID,
  subscriber_wallet_param TEXT,
  new_amount NUMERIC,
  new_expiry BIGINT
)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET 
    amount = new_amount,
    expiry_time = new_expiry,
    updated_at = NOW()
  WHERE subscriptions.artist_id = artist_id_param
  AND subscriptions.subscriber_wallet = subscriber_wallet_param;
END;
$$ LANGUAGE plpgsql;

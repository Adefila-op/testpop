CREATE TABLE IF NOT EXISTS campaign_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  submitter_wallet TEXT NOT NULL,
  content_url TEXT,
  caption TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  onchain_tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaign_submissions_status_check'
  ) THEN
    ALTER TABLE campaign_submissions
    ADD CONSTRAINT campaign_submissions_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaign_submissions_drop_created_at
ON campaign_submissions(drop_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_submissions_wallet_created_at
ON campaign_submissions(submitter_wallet, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_submissions_status_created_at
ON campaign_submissions(status, created_at DESC);

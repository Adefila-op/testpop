-- Supabase Migration: Creator Interaction Notification System
-- Date: April 6, 2026
-- Purpose: Implement real-time notifications for creator interactions (subscriptions, purchases, investments)

-- ============================================
-- Notifications Table - Store all notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  creator_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL,
  
  -- Event Details
  event_type VARCHAR(50) NOT NULL, -- subscription, purchase, investment, milestone
  event_id VARCHAR(255) UNIQUE, -- tx hash or order ID for deduplication
  
  -- Notification Content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  message TEXT,
  
  -- Structured Data
  interactor_wallet TEXT,
  interactor_display_name VARCHAR(255),
  product_id UUID,
  product_name VARCHAR(255),
  campaign_id UUID,
  campaign_title VARCHAR(255),
  drop_id UUID,
  drop_title VARCHAR(255),
  
  -- Financial Data
  amount_eth DECIMAL(18, 8),
  amount_usd DECIMAL(18, 2),
  currency VARCHAR(10) DEFAULT 'ETH',
  
  -- Quantity
  quantity INT,
  
  -- Status & Engagement
  "read" BOOLEAN DEFAULT FALSE,
  actioned BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_creator_id ON notifications(creator_id);
CREATE INDEX IF NOT EXISTS idx_notifications_creator_wallet ON notifications(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications("read");
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);

-- ============================================
-- Notification Preferences - Creator settings
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL UNIQUE REFERENCES artists(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL UNIQUE,
  
  -- Event Toggles
  notify_subscriptions BOOLEAN DEFAULT TRUE,
  notify_purchases BOOLEAN DEFAULT TRUE,
  notify_investments BOOLEAN DEFAULT TRUE,
  notify_milestones BOOLEAN DEFAULT TRUE,
  notify_comments BOOLEAN DEFAULT TRUE, -- Future: for community features
  
  -- Delivery Channels
  enable_in_app BOOLEAN DEFAULT TRUE,
  enable_web_push BOOLEAN DEFAULT TRUE,
  enable_email BOOLEAN DEFAULT FALSE,
  email_address TEXT,
  
  -- Notification Frequency
  digest_frequency VARCHAR(50) DEFAULT 'real_time', -- real_time, hourly, daily, weekly, none
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME, -- e.g., 22:00
  quiet_hours_end TIME, -- e.g., 08:00
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Batching
  batch_similar_events BOOLEAN DEFAULT FALSE,
  batch_window_minutes INT DEFAULT 5,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prefs_creator_wallet ON notification_preferences(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_prefs_creator_id ON notification_preferences(creator_id);

-- ============================================
-- Push Subscriptions - Web push endpoints
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet TEXT NOT NULL,
  
  -- Push API subscription object (JSON)
  subscription JSONB NOT NULL, -- { endpoint, keys: { auth, p256dh } }
  browser_info VARCHAR(100), -- Chrome, Firefox, Safari, Edge
  device_id VARCHAR(255),
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_sub_creator ON push_subscriptions(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_push_sub_active ON push_subscriptions(active);

-- ============================================
-- Notification Delivery Log - Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Channel
  channel VARCHAR(50) NOT NULL, -- in_app, email, web_push
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
  error_message TEXT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Recipient Info
  recipient_email TEXT,
  push_endpoint TEXT,
  device_id VARCHAR(255),
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_notification ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON notification_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_delivery_channel ON notification_delivery_log(channel);
CREATE INDEX IF NOT EXISTS idx_delivery_created ON notification_delivery_log(created_at DESC);

-- ============================================
-- RLS Policies for Notifications
-- ============================================

-- Enable RLS
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Creators can read their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
  ON notifications
  FOR SELECT
  USING (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  );

-- Creators can update read status
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
  ON notifications
  FOR UPDATE
  USING (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  )
  WITH CHECK (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  );

-- Creators can manage their notification preferences
DROP POLICY IF EXISTS "prefs_select_own" ON notification_preferences;
CREATE POLICY "prefs_select_own"
  ON notification_preferences
  FOR SELECT
  USING (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  );

DROP POLICY IF EXISTS "prefs_update_own" ON notification_preferences;
CREATE POLICY "prefs_update_own"
  ON notification_preferences
  FOR UPDATE
  USING (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  )
  WITH CHECK (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  );

DROP POLICY IF EXISTS "prefs_insert_own" ON notification_preferences;
CREATE POLICY "prefs_insert_own"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  );

-- Creators can manage push subscriptions
DROP POLICY IF EXISTS "push_sub_select_own" ON push_subscriptions;
CREATE POLICY "push_sub_select_own"
  ON push_subscriptions
  FOR SELECT
  USING (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  );

DROP POLICY IF EXISTS "push_sub_insert_own" ON push_subscriptions;
CREATE POLICY "push_sub_insert_own"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  );

DROP POLICY IF EXISTS "push_sub_delete_own" ON push_subscriptions;
CREATE POLICY "push_sub_delete_own"
  ON push_subscriptions
  FOR DELETE
  USING (
    creator_wallet = auth.jwt() ->> 'wallet' OR 
    creator_wallet = auth.jwt() ->> 'address'
  );

-- Service role has full access for server-side operations
-- (No policy needed - service_role bypasses RLS)

-- ============================================
-- Grant Permissions
-- ============================================

-- Authenticated users
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT, DELETE ON push_subscriptions TO authenticated;
GRANT SELECT ON notification_delivery_log TO authenticated;

-- Service role (backend API)
GRANT ALL ON notifications TO service_role;
GRANT ALL ON notification_preferences TO service_role;
GRANT ALL ON push_subscriptions TO service_role;
GRANT ALL ON notification_delivery_log TO service_role;

-- ============================================
-- Helper Function: Get Unread Count
-- ============================================
CREATE OR REPLACE FUNCTION get_unread_notification_count(creator_wallet_input TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE creator_wallet = creator_wallet_input
    AND "read" = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Helper Function: Mark All as Read
-- ============================================
CREATE OR REPLACE FUNCTION mark_all_notifications_read(creator_wallet_input TEXT)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET "read" = TRUE, updated_at = NOW()
  WHERE creator_wallet = creator_wallet_input
  AND "read" = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Helper Function: Create Default Preferences
-- ============================================
CREATE OR REPLACE FUNCTION create_default_notification_preferences(
  input_creator_id UUID,
  input_creator_wallet TEXT
)
RETURNS notification_preferences AS $$
DECLARE
  new_prefs notification_preferences;
BEGIN
  INSERT INTO notification_preferences (
    creator_id,
    creator_wallet,
    notify_subscriptions,
    notify_purchases,
    notify_investments,
    notify_milestones,
    enable_in_app,
    enable_web_push,
    enable_email,
    digest_frequency
  )
  VALUES (
    input_creator_id,
    input_creator_wallet,
    TRUE, TRUE, TRUE, TRUE,
    TRUE, TRUE, FALSE,
    'real_time'
  )
  RETURNING * INTO new_prefs;
  
  RETURN new_prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Audit: View Recent Creator Activity
-- ============================================
CREATE OR REPLACE VIEW creator_recent_interactions AS
SELECT 
  creator_wallet,
  COUNT(*) as total_interactions,
  COUNT(CASE WHEN event_type = 'subscription' THEN 1 END) as subscriptions,
  COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as purchases,
  COUNT(CASE WHEN event_type = 'investment' THEN 1 END) as investments,
  SUM(amount_eth) FILTER (WHERE amount_eth IS NOT NULL) as total_eth,
  MAX(created_at) as last_interaction
FROM notifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY creator_wallet;

-- ============================================
-- Verification
-- ============================================
-- Run this to verify tables are created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('notifications', 'notification_preferences', 'push_subscriptions', 'notification_delivery_log')
-- ORDER BY table_name;

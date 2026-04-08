-- ============================================================================
-- Migration: 20260408_creator_fan_hub_foundation.sql
-- Description:
--   * Adds the creator <-> fan relationship graph
--   * Introduces gated creator channels + posts
--   * Introduces creator/fan direct threads
--   * Locks the new community layer down with wallet-based RLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.creator_fans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  fan_wallet TEXT NOT NULL,
  is_subscriber BOOLEAN NOT NULL DEFAULT FALSE,
  active_subscription BOOLEAN NOT NULL DEFAULT FALSE,
  is_collector BOOLEAN NOT NULL DEFAULT FALSE,
  is_backer BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  collected_releases_count INT NOT NULL DEFAULT 0,
  orders_count INT NOT NULL DEFAULT 0,
  total_spent_eth NUMERIC NOT NULL DEFAULT 0,
  backed_campaigns_count INT NOT NULL DEFAULT 0,
  total_invested_eth NUMERIC NOT NULL DEFAULT 0,
  relationship_score INT NOT NULL DEFAULT 0,
  last_interacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT creator_fans_artist_wallet_unique UNIQUE (artist_id, fan_wallet)
);

CREATE INDEX IF NOT EXISTS idx_creator_fans_artist_id
ON public.creator_fans(artist_id);

CREATE INDEX IF NOT EXISTS idx_creator_fans_fan_wallet
ON public.creator_fans(lower(fan_wallet));

CREATE INDEX IF NOT EXISTS idx_creator_fans_score
ON public.creator_fans(artist_id, relationship_score DESC);

CREATE TABLE IF NOT EXISTS public.creator_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  access_level VARCHAR(50) NOT NULL DEFAULT 'public',
  created_by_wallet TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT creator_channels_artist_slug_unique UNIQUE (artist_id, slug),
  CONSTRAINT creator_channels_access_level_check
    CHECK (access_level IN ('public', 'fan', 'subscriber', 'collector', 'backer'))
);

CREATE INDEX IF NOT EXISTS idx_creator_channels_artist_id
ON public.creator_channels(artist_id);

CREATE INDEX IF NOT EXISTS idx_creator_channels_access_level
ON public.creator_channels(access_level);

CREATE TABLE IF NOT EXISTS public.creator_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.creator_channels(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  author_wallet TEXT NOT NULL,
  post_kind VARCHAR(50) NOT NULL DEFAULT 'update',
  title TEXT,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT creator_posts_kind_check
    CHECK (post_kind IN ('update', 'drop', 'release', 'reward', 'event', 'poll'))
);

CREATE INDEX IF NOT EXISTS idx_creator_posts_channel_id
ON public.creator_posts(channel_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_creator_posts_artist_id
ON public.creator_posts(artist_id, published_at DESC);

CREATE TABLE IF NOT EXISTS public.creator_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL,
  fan_wallet TEXT NOT NULL,
  subject TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT creator_threads_artist_fan_unique UNIQUE (artist_id, fan_wallet),
  CONSTRAINT creator_threads_status_check
    CHECK (status IN ('open', 'archived', 'blocked'))
);

CREATE INDEX IF NOT EXISTS idx_creator_threads_creator_wallet
ON public.creator_threads(lower(creator_wallet), last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_creator_threads_fan_wallet
ON public.creator_threads(lower(fan_wallet), last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.creator_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.creator_threads(id) ON DELETE CASCADE,
  sender_wallet TEXT NOT NULL,
  sender_role VARCHAR(20) NOT NULL DEFAULT 'fan',
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT creator_thread_messages_sender_role_check
    CHECK (sender_role IN ('creator', 'fan', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_creator_thread_messages_thread_id
ON public.creator_thread_messages(thread_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.popup_jwt_wallet()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT lower(
    nullif(
      coalesce(
        auth.jwt() ->> 'sub',
        auth.jwt() ->> 'wallet_address',
        auth.jwt() ->> 'wallet',
        auth.jwt() ->> 'address',
        ''
      ),
      ''
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.popup_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    coalesce(lower(auth.jwt() ->> 'app_role'), '') = 'admin'
    OR coalesce(lower(auth.jwt() ->> 'role_name'), '') = 'admin'
    OR auth.role() = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.popup_wallet_owns_artist(target_artist_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.popup_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.artists a
      WHERE a.id = target_artist_id
        AND lower(a.wallet) = public.popup_jwt_wallet()
    );
$$;

CREATE OR REPLACE FUNCTION public.popup_wallet_can_access_artist_channel(target_channel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.creator_channels c
    LEFT JOIN public.creator_fans f
      ON f.artist_id = c.artist_id
     AND lower(f.fan_wallet) = public.popup_jwt_wallet()
    WHERE c.id = target_channel_id
      AND (
        public.popup_is_admin()
        OR public.popup_wallet_owns_artist(c.artist_id)
        OR c.access_level = 'public'
        OR (
          public.popup_jwt_wallet() IS NOT NULL
          AND public.popup_jwt_wallet() <> ''
          AND c.access_level = 'fan'
          AND f.id IS NOT NULL
        )
        OR (c.access_level = 'subscriber' AND coalesce(f.active_subscription, false))
        OR (c.access_level = 'collector' AND coalesce(f.is_collector, false))
        OR (c.access_level = 'backer' AND coalesce(f.is_backer, false))
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.popup_jwt_wallet() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.popup_is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.popup_wallet_owns_artist(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.popup_wallet_can_access_artist_channel(UUID) TO anon, authenticated, service_role;

ALTER TABLE public.creator_fans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_thread_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator_fans_select_owner_or_self" ON public.creator_fans;
CREATE POLICY "creator_fans_select_owner_or_self" ON public.creator_fans
  FOR SELECT
  USING (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
    OR lower(fan_wallet) = public.popup_jwt_wallet()
  );

DROP POLICY IF EXISTS "creator_fans_mutate_owner_or_admin" ON public.creator_fans;
CREATE POLICY "creator_fans_mutate_owner_or_admin" ON public.creator_fans
  FOR ALL
  USING (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
  )
  WITH CHECK (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
  );

DROP POLICY IF EXISTS "creator_channels_select_accessible" ON public.creator_channels;
CREATE POLICY "creator_channels_select_accessible" ON public.creator_channels
  FOR SELECT
  USING (public.popup_wallet_can_access_artist_channel(id));

DROP POLICY IF EXISTS "creator_channels_mutate_owner_or_admin" ON public.creator_channels;
CREATE POLICY "creator_channels_mutate_owner_or_admin" ON public.creator_channels
  FOR ALL
  USING (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
  )
  WITH CHECK (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
  );

DROP POLICY IF EXISTS "creator_posts_select_accessible" ON public.creator_posts;
CREATE POLICY "creator_posts_select_accessible" ON public.creator_posts
  FOR SELECT
  USING (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
    OR public.popup_wallet_can_access_artist_channel(channel_id)
  );

DROP POLICY IF EXISTS "creator_posts_mutate_owner_or_admin" ON public.creator_posts;
CREATE POLICY "creator_posts_mutate_owner_or_admin" ON public.creator_posts
  FOR ALL
  USING (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
  )
  WITH CHECK (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
  );

DROP POLICY IF EXISTS "creator_threads_select_participant" ON public.creator_threads;
CREATE POLICY "creator_threads_select_participant" ON public.creator_threads
  FOR SELECT
  USING (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
    OR lower(fan_wallet) = public.popup_jwt_wallet()
  );

DROP POLICY IF EXISTS "creator_threads_insert_participant" ON public.creator_threads;
CREATE POLICY "creator_threads_insert_participant" ON public.creator_threads
  FOR INSERT
  WITH CHECK (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
    OR lower(fan_wallet) = public.popup_jwt_wallet()
  );

DROP POLICY IF EXISTS "creator_threads_update_participant" ON public.creator_threads;
CREATE POLICY "creator_threads_update_participant" ON public.creator_threads
  FOR UPDATE
  USING (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
    OR lower(fan_wallet) = public.popup_jwt_wallet()
  )
  WITH CHECK (
    public.popup_is_admin()
    OR public.popup_wallet_owns_artist(artist_id)
    OR lower(fan_wallet) = public.popup_jwt_wallet()
  );

DROP POLICY IF EXISTS "creator_thread_messages_select_participant" ON public.creator_thread_messages;
CREATE POLICY "creator_thread_messages_select_participant" ON public.creator_thread_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.creator_threads t
      WHERE t.id = creator_thread_messages.thread_id
        AND (
          public.popup_is_admin()
          OR public.popup_wallet_owns_artist(t.artist_id)
          OR lower(t.fan_wallet) = public.popup_jwt_wallet()
        )
    )
  );

DROP POLICY IF EXISTS "creator_thread_messages_insert_participant" ON public.creator_thread_messages;
CREATE POLICY "creator_thread_messages_insert_participant" ON public.creator_thread_messages
  FOR INSERT
  WITH CHECK (
    (public.popup_is_admin() OR lower(sender_wallet) = public.popup_jwt_wallet())
    AND EXISTS (
      SELECT 1
      FROM public.creator_threads t
      WHERE t.id = creator_thread_messages.thread_id
        AND (
          public.popup_is_admin()
          OR public.popup_wallet_owns_artist(t.artist_id)
          OR lower(t.fan_wallet) = public.popup_jwt_wallet()
        )
    )
  );

GRANT SELECT ON public.creator_channels TO anon;
GRANT SELECT ON public.creator_posts TO anon;

GRANT ALL ON public.creator_fans TO authenticated;
GRANT ALL ON public.creator_channels TO authenticated;
GRANT ALL ON public.creator_posts TO authenticated;
GRANT ALL ON public.creator_threads TO authenticated;
GRANT ALL ON public.creator_thread_messages TO authenticated;

GRANT ALL ON public.creator_fans TO service_role;
GRANT ALL ON public.creator_channels TO service_role;
GRANT ALL ON public.creator_posts TO service_role;
GRANT ALL ON public.creator_threads TO service_role;
GRANT ALL ON public.creator_thread_messages TO service_role;

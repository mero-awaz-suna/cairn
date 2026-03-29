-- Cairn migration: persona_state (JSONB), clusters, and circle indexes.
-- Replaces the flat-column user_personas approach with a single JSONB blob.
-- Date: 2026-03-29
--
-- Run AFTER foundation_schema and rls_policies.
-- The old user_personas / persona_entries tables (from 20260328000003) are
-- no longer used by the backend. Drop them in a follow-up migration once
-- confirmed no data needs preserving.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Prerequisites
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) users table columns needed by stores
-- ---------------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS state text,
    ADD COLUMN IF NOT EXISTS cluster_id text,
    ADD COLUMN IF NOT EXISTS circle_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_circle_id_fkey'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_circle_id_fkey
            FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_cluster_id ON users(cluster_id);
CREATE INDEX IF NOT EXISTS idx_users_circle_id ON users(circle_id);

-- ---------------------------------------------------------------------------
-- 2) persona_state table (one row per user, JSONB payload)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS persona_state (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    persona_payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_persona_state_updated_at ON persona_state(updated_at DESC);

-- ---------------------------------------------------------------------------
-- 3) user_persona_history — add columns used by PersonaStore
--    NOTE: this table already has recorded_at, so we skip created_at
-- ---------------------------------------------------------------------------
ALTER TABLE user_persona_history
    ADD COLUMN IF NOT EXISTS stage text,
    ADD COLUMN IF NOT EXISTS stress_score double precision,
    ADD COLUMN IF NOT EXISTS recovery_score double precision,
    ADD COLUMN IF NOT EXISTS day_number integer,
    ADD COLUMN IF NOT EXISTS valence double precision,
    ADD COLUMN IF NOT EXISTS agency_score double precision;

CREATE INDEX IF NOT EXISTS idx_user_persona_history_user_recorded
    ON user_persona_history(user_id, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- 4) clusters table (cluster metadata)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clusters (
    id text PRIMARY KEY,
    name text,
    stage text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clusters_updated_at ON clusters(updated_at DESC);

-- ---------------------------------------------------------------------------
-- 5) cluster_members table (active + historical memberships)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cluster_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id text NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    similarity_score double precision,
    joined_at timestamptz NOT NULL DEFAULT now(),
    left_at timestamptz,
    UNIQUE(cluster_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cluster_members_cluster_active
    ON cluster_members(cluster_id)
    WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cluster_members_user_active
    ON cluster_members(user_id)
    WHERE left_at IS NULL;

-- ---------------------------------------------------------------------------
-- 6) circle_members helper indexes for CircleStore active lookups
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_circle_members_user_active
    ON circle_members(user_id)
    WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_circle_members_circle_active
    ON circle_members(circle_id)
    WHERE left_at IS NULL;

-- ---------------------------------------------------------------------------
-- 7) RLS for new tables
-- ---------------------------------------------------------------------------
ALTER TABLE persona_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_members ENABLE ROW LEVEL SECURITY;

-- persona_state: users read own, backend writes via service_role
CREATE POLICY "users_own_persona_state_select"
    ON persona_state FOR SELECT
    USING (user_id IN (
        SELECT id FROM users WHERE supabase_auth_id = auth.uid()
    ));

-- clusters: members can read their cluster
CREATE POLICY "cluster_members_can_read"
    ON clusters FOR SELECT
    USING (id IN (
        SELECT cm.cluster_id FROM cluster_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE u.supabase_auth_id = auth.uid()
        AND cm.left_at IS NULL
    ));

-- cluster_members: users can see their own memberships
CREATE POLICY "users_own_cluster_memberships"
    ON cluster_members FOR SELECT
    USING (user_id IN (
        SELECT id FROM users WHERE supabase_auth_id = auth.uid()
    ));

-- NOTE: Admin read policies deferred until app_role_enum and auth_has_role are
-- confirmed to exist on remote. Backend uses service_role key (bypasses RLS).

COMMIT;

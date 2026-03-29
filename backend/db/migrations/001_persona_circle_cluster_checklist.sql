-- Cairn migration checklist for persona_state, circles, and clusters.
-- Date: 2026-03-29
--
-- How to use:
-- 1) Run in a staging DB first.
-- 2) Validate app boot + persona routes + circle routes.
-- 3) Run in production during low traffic.

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

-- Optional FK to circles table for active circle pointer.
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
-- 2) persona_state table (one row per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS persona_state (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    persona_payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_persona_state_updated_at ON persona_state(updated_at DESC);

-- ---------------------------------------------------------------------------
-- 3) user_persona_history columns used by PersonaStore
-- ---------------------------------------------------------------------------
ALTER TABLE user_persona_history
    ADD COLUMN IF NOT EXISTS stage text,
    ADD COLUMN IF NOT EXISTS stress_score double precision,
    ADD COLUMN IF NOT EXISTS recovery_score double precision,
    ADD COLUMN IF NOT EXISTS day_number integer,
    ADD COLUMN IF NOT EXISTS valence double precision,
    ADD COLUMN IF NOT EXISTS agency_score double precision,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_user_persona_history_user_created
    ON user_persona_history(user_id, created_at DESC);

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

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-migration validation checklist
-- ---------------------------------------------------------------------------
-- [ ] SELECT count(*) FROM persona_state;
-- [ ] SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name IN ('state','cluster_id','circle_id');
-- [ ] Insert test row into clusters and cluster_members, verify users.cluster_id sync path.
-- [ ] Join/leave a circle via API, verify users.circle_id set/null and circle_members.left_at behavior.
-- [ ] Submit a persona memo, verify persona_state upsert and user_persona_history insert.

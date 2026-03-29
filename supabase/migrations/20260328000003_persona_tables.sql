-- ============================================================================
-- Migration: Persona Engine Tables
-- Required by: apps/api/db/persona_store.py
-- Adds: user_personas (evolving 100-dim persona vectors)
--        persona_entries (immutable audit log per voice memo)
-- ============================================================================

-- ── user_personas ────────────────────────────────────────────────────────────
-- One row per user. Created at onboarding, upserted after every voice memo.
-- All vector columns are JSONB arrays of floats (serialized from numpy).

CREATE TABLE IF NOT EXISTS user_personas (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Demographics (collected at onboarding)
  age_group         TEXT NOT NULL DEFAULT 'college',
  occupation        TEXT NOT NULL DEFAULT 'student',
  industry          TEXT DEFAULT '',
  language_code     VARCHAR(10) DEFAULT 'en',
  region_code       VARCHAR(10) DEFAULT 'US',
  living_situation  TEXT DEFAULT 'alone'
    CHECK (living_situation IN ('alone', 'partner', 'family', 'roommates')),

  -- Persona vectors (JSONB arrays of floats)
  acoustic_short    JSONB NOT NULL DEFAULT '[]'::jsonb,
  acoustic_long     JSONB NOT NULL DEFAULT '[]'::jsonb,
  linguistic_short  JSONB NOT NULL DEFAULT '[]'::jsonb,
  linguistic_long   JSONB NOT NULL DEFAULT '[]'::jsonb,
  identity_vec      JSONB NOT NULL DEFAULT '[]'::jsonb,
  behavioral        JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Baseline normalization stats
  baseline_mean     JSONB NOT NULL DEFAULT '[]'::jsonb,
  baseline_std      JSONB NOT NULL DEFAULT '[]'::jsonb,
  baseline_n_samples INT NOT NULL DEFAULT 0,

  -- Derived state (stored flat for matching queries)
  stressor_dist     JSONB NOT NULL DEFAULT '[]'::jsonb,
  stage             TEXT NOT NULL DEFAULT 'Finding ground'
    CHECK (stage IN ('In the storm', 'Finding ground', 'Through it')),
  stage_confidence  FLOAT NOT NULL DEFAULT 0.5
    CHECK (stage_confidence BETWEEN 0 AND 1),
  cluster_id        TEXT,

  -- Trajectory
  trajectory_stress   FLOAT NOT NULL DEFAULT 0.0,
  trajectory_recovery FLOAT NOT NULL DEFAULT 0.0,

  -- Metadata
  entry_count       INT NOT NULL DEFAULT 0,
  last_entry_at     TIMESTAMPTZ,
  is_available      BOOLEAN NOT NULL DEFAULT false,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for circle matching (stage + availability + stressor)
CREATE INDEX IF NOT EXISTS idx_personas_matching
  ON user_personas (stage, is_available);

-- ── persona_entries ──────────────────────────────────────────────────────────
-- Immutable audit log. One row per voice memo submission. Never updated.

CREATE TABLE IF NOT EXISTS persona_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  day_number        INT,
  hour_of_day       INT CHECK (hour_of_day BETWEEN 0 AND 23),
  memo_duration_s   FLOAT,

  -- Stage at time of entry
  stage             TEXT NOT NULL,
  stage_confidence  FLOAT CHECK (stage_confidence BETWEEN 0 AND 1),

  -- Scores
  stress_score      FLOAT CHECK (stress_score BETWEEN 0 AND 1),
  recovery_score    FLOAT CHECK (recovery_score BETWEEN 0 AND 1),

  -- Crisis
  crisis_flag       BOOLEAN NOT NULL DEFAULT false,
  crisis_reason     TEXT,

  -- Timing
  acoustic_ms       INT,
  linguistic_ms     INT,
  total_ms          INT,

  -- Linguistic features (nullable — only present if extraction succeeded)
  valence           FLOAT CHECK (valence BETWEEN 0 AND 1),
  arousal           FLOAT CHECK (arousal BETWEEN 0 AND 1),
  agency_score      FLOAT CHECK (agency_score BETWEEN 0 AND 1),
  distortion_score  FLOAT CHECK (distortion_score BETWEEN 0 AND 1),
  coping_score      FLOAT CHECK (coping_score BETWEEN 0 AND 1),
  urgency_signal    FLOAT CHECK (urgency_signal BETWEEN 0 AND 1),
  help_seeking_signal FLOAT CHECK (help_seeking_signal BETWEEN 0 AND 1),
  stressor_dist     JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persona_entries_user
  ON persona_entries (user_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE user_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_entries ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own persona
CREATE POLICY "users_own_persona_select"
  ON user_personas FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE supabase_auth_id = auth.uid()
  ));

CREATE POLICY "users_own_persona_update"
  ON user_personas FOR UPDATE
  USING (user_id IN (
    SELECT id FROM users WHERE supabase_auth_id = auth.uid()
  ));

-- Backend uses service role key (bypasses RLS) for insert/upsert
-- Users can read their own entries
CREATE POLICY "users_own_entries_select"
  ON persona_entries FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE supabase_auth_id = auth.uid()
  ));

-- Service role (backend) can insert entries — no user-facing insert policy needed
-- Admin read access
CREATE POLICY "admin_read_personas"
  ON user_personas FOR SELECT
  USING (auth_has_role('admin'));

CREATE POLICY "admin_read_entries"
  ON persona_entries FOR SELECT
  USING (auth_has_role('admin'));

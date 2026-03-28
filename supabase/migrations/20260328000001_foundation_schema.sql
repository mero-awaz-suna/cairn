-- ============================================================================
-- CAIRN — Foundation Database Schema
-- Production-grade PostgreSQL schema with RBAC, RLS, and full data model
-- ============================================================================

-- ── EXTENSIONS ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";       -- pgvector for semantic search

-- ============================================================================
-- 1. CUSTOM TYPES
-- ============================================================================

CREATE TYPE academic_stage_enum AS ENUM (
  'just_arrived', 'in_the_middle', 'finding_footing', 'helping_others'
);

CREATE TYPE primary_burden_enum AS ENUM (
  'career', 'family', 'belonging', 'all_of_it'
);

CREATE TYPE persona_enum AS ENUM (
  'storm', 'ground', 'through_it'
);

CREATE TYPE cultural_context_enum AS ENUM (
  'nepali', 'south_asian', 'international', 'universal'
);

CREATE TYPE circle_status_enum AS ENUM (
  'forming', 'active', 'closing', 'closed', 'purged'
);

CREATE TYPE circle_role_enum AS ENUM (
  'storm', 'finding_ground', 'through_it', 'helper'
);

CREATE TYPE input_type_enum AS ENUM (
  'audio', 'text'
);

CREATE TYPE memory_source_enum AS ENUM (
  'user_submitted', 'seed', 'ai_generated'
);

CREATE TYPE sender_type_enum AS ENUM (
  'member', 'facilitator'
);

CREATE TYPE app_role_enum AS ENUM (
  'user', 'moderator', 'admin'
);

-- ============================================================================
-- 2. RBAC — User Roles Table
-- ============================================================================

CREATE TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        app_role_enum NOT NULL DEFAULT 'user',
  granted_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role_enum)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Function to check if current auth user has a role
CREATE OR REPLACE FUNCTION public.auth_has_role(_role app_role_enum)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = _role
  );
$$;

-- ============================================================================
-- 3. CORE TABLES
-- ============================================================================

-- ── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Onboarding answers (non-PII, used for matching)
  academic_stage      academic_stage_enum NOT NULL DEFAULT 'just_arrived',
  primary_burden      primary_burden_enum NOT NULL DEFAULT 'all_of_it',

  -- AI-derived state, updated per journal entry
  current_persona     persona_enum NOT NULL DEFAULT 'ground',
  persona_confidence  FLOAT NOT NULL DEFAULT 0.5 CHECK (persona_confidence BETWEEN 0 AND 1),
  current_stress_level INT CHECK (current_stress_level BETWEEN 1 AND 10),

  -- Cultural context (self-identified, optional)
  cultural_context    cultural_context_enum,

  -- Engagement counters
  last_journal_at     TIMESTAMPTZ,
  journal_streak      INT NOT NULL DEFAULT 0,
  circles_joined      INT NOT NULL DEFAULT 0,
  burdens_dropped     INT NOT NULL DEFAULT 0,
  memories_saved      INT NOT NULL DEFAULT 0,

  -- Safety
  is_in_crisis        BOOLEAN NOT NULL DEFAULT false,
  crisis_flagged_at   TIMESTAMPTZ,
  is_suspended        BOOLEAN NOT NULL DEFAULT false,
  suspension_reason   TEXT,

  -- Consent & compliance
  consented_to_terms_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consented_to_ai_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_deletion_requested BOOLEAN NOT NULL DEFAULT false,
  deletion_requested_at   TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for matching algorithm performance
CREATE INDEX idx_users_persona_burden ON users(current_persona, primary_burden, cultural_context)
  WHERE is_suspended = false AND data_deletion_requested = false;

CREATE INDEX idx_users_auth_id ON users(supabase_auth_id);

-- ── JOURNAL ENTRIES ─────────────────────────────────────────────────────────
CREATE TABLE journal_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Input
  input_type          input_type_enum NOT NULL,
  audio_storage_path  TEXT,
  raw_transcript      TEXT,

  -- AI outputs
  assigned_persona    persona_enum NOT NULL,
  persona_confidence  FLOAT NOT NULL CHECK (persona_confidence BETWEEN 0 AND 1),
  stress_level        INT NOT NULL CHECK (stress_level BETWEEN 1 AND 10),
  burden_themes       TEXT[] NOT NULL DEFAULT '{}',
  recognition_message TEXT NOT NULL,
  micro_intervention  TEXT NOT NULL,

  -- Embedding for semantic search
  transcript_embedding VECTOR(1536),

  -- Processing metadata
  transcription_ms    INT,
  ai_processing_ms    INT,
  ai_model_used       TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',

  -- Safety
  crisis_detected     BOOLEAN NOT NULL DEFAULT false,
  crisis_keywords     TEXT[],

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_journal_entries_user_created ON journal_entries(user_id, created_at DESC);
CREATE INDEX idx_journal_entries_persona ON journal_entries(assigned_persona, created_at DESC);

-- ── BURDEN TAXONOMY ─────────────────────────────────────────────────────────
CREATE TABLE burden_taxonomy (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_key       TEXT UNIQUE NOT NULL,
  parent_theme    TEXT,
  display_label   TEXT NOT NULL,
  cultural_tags   TEXT[] DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── BURDEN DROPS ────────────────────────────────────────────────────────────
CREATE TABLE burden_drops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Input (encrypted at app layer, never shown to other users)
  raw_burden_text     TEXT NOT NULL,

  -- AI extraction (shared/counted)
  extracted_theme     TEXT NOT NULL,
  theme_confidence    FLOAT NOT NULL CHECK (theme_confidence BETWEEN 0 AND 1),
  burden_embedding    VECTOR(1536),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_burden_drops_user ON burden_drops(user_id, created_at DESC);
CREATE INDEX idx_burden_drops_theme ON burden_drops(extracted_theme);

-- ── BURDEN THEME COUNTS (materialized view) ─────────────────────────────────
CREATE MATERIALIZED VIEW burden_theme_counts AS
  SELECT
    extracted_theme,
    COUNT(*) AS total_count,
    COUNT(DISTINCT user_id) AS unique_user_count
  FROM burden_drops
  GROUP BY extracted_theme;

CREATE UNIQUE INDEX ON burden_theme_counts(extracted_theme);

-- ── MEMORIES (Memory Wall) ──────────────────────────────────────────────────
CREATE TABLE memories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  source_type         memory_source_enum NOT NULL,
  source_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  source_session_id   UUID,

  -- Content
  quote_text          TEXT NOT NULL,
  burden_tag          TEXT NOT NULL,
  cultural_tag        cultural_context_enum NOT NULL DEFAULT 'universal',

  -- Engagement
  helped_count        INT NOT NULL DEFAULT 0,

  -- Moderation
  is_approved         BOOLEAN NOT NULL DEFAULT false,
  ai_safety_score     FLOAT CHECK (ai_safety_score BETWEEN 0 AND 1),
  reviewed_by         UUID,
  reviewed_at         TIMESTAMPTZ,
  rejection_reason    TEXT,

  -- Display
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  display_weight      FLOAT NOT NULL DEFAULT 1.0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memories_approved_active ON memories(burden_tag, cultural_tag, helped_count DESC)
  WHERE is_approved = true;

-- ── CIRCLES ─────────────────────────────────────────────────────────────────
CREATE TABLE circles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  status              circle_status_enum NOT NULL DEFAULT 'forming',

  target_size         INT NOT NULL DEFAULT 4 CHECK (target_size BETWEEN 3 AND 6),

  primary_burden_tag  TEXT,
  cultural_context    cultural_context_enum,

  -- Timing
  formed_at           TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  purge_at            TIMESTAMPTZ,

  -- AI session state
  facilitator_state   JSONB NOT NULL DEFAULT '{}',
  intervention_count  INT NOT NULL DEFAULT 0,
  crisis_triggered    BOOLEAN NOT NULL DEFAULT false,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circles_forming ON circles(status, primary_burden_tag, cultural_context)
  WHERE status = 'forming';

-- ── CIRCLE MEMBERS ──────────────────────────────────────────────────────────
CREATE TABLE circle_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id           UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  role_label          circle_role_enum NOT NULL,
  anonymous_alias     TEXT NOT NULL,

  joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at      TIMESTAMPTZ,
  left_at             TIMESTAMPTZ,
  message_count       INT NOT NULL DEFAULT 0,

  session_summary     TEXT,
  insight_saved_to_wall BOOLEAN NOT NULL DEFAULT false,

  UNIQUE(circle_id, user_id)
);

CREATE INDEX idx_circle_members_user ON circle_members(user_id, joined_at DESC);

-- ── MESSAGES ────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id           UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,

  sender_type         sender_type_enum NOT NULL,
  member_id           UUID REFERENCES circle_members(id) ON DELETE SET NULL,

  content             TEXT NOT NULL,

  -- AI processing
  sentiment_score     FLOAT CHECK (sentiment_score BETWEEN -1 AND 1),
  crisis_score        FLOAT CHECK (crisis_score BETWEEN 0 AND 1),
  themes_detected     TEXT[],

  is_facilitator_msg  BOOLEAN NOT NULL DEFAULT false,
  is_crisis_resource  BOOLEAN NOT NULL DEFAULT false,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_circle_created ON messages(circle_id, created_at ASC);

-- ── USER PERSONA HISTORY ────────────────────────────────────────────────────
CREATE TABLE user_persona_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona         persona_enum NOT NULL,
  stress_level    INT CHECK (stress_level BETWEEN 1 AND 10),
  journal_entry_id UUID REFERENCES journal_entries(id),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_persona_history_user_date ON user_persona_history(user_id, recorded_at DESC);

-- ── RATE LIMIT EVENTS ───────────────────────────────────────────────────────
CREATE TABLE rate_limit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_hash         TEXT,
  action          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_events_lookup ON rate_limit_events(user_id, action, created_at DESC);

-- ── AUDIT LOG ───────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  metadata        JSONB,
  ip_hash         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Compute purge_at when circle closes
CREATE OR REPLACE FUNCTION set_circle_purge_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.purge_at = NOW() + INTERVAL '30 days';
    NEW.closed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_circle_purge
  BEFORE UPDATE ON circles
  FOR EACH ROW EXECUTE FUNCTION set_circle_purge_at();

-- Auto-assign default 'user' role on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_role();

-- ============================================================================
-- 5. SEED DATA — Burden Taxonomy
-- ============================================================================

INSERT INTO burden_taxonomy (theme_key, parent_theme, display_label, cultural_tags) VALUES
  ('job_search_rejection', 'career', 'Job search rejection', '{"south_asian", "international"}'),
  ('impostor_syndrome_professional', 'career', 'Professional impostor syndrome', '{}'),
  ('visa_career_intersection_anxiety', 'career', 'Visa-career anxiety', '{"international"}'),
  ('first_gen_professional_pressure', 'career', 'First-gen professional pressure', '{"south_asian"}'),
  ('family_expectation_gap', 'family', 'Family expectation gap', '{"nepali", "south_asian"}'),
  ('invisible_debt', 'family', 'The invisible debt', '{"nepali", "south_asian"}'),
  ('cultural_identity_friction', 'belonging', 'Cultural identity friction', '{"nepali", "south_asian"}'),
  ('belonging_nowhere', 'belonging', 'Belonging nowhere fully', '{"international"}'),
  ('academic_performance_weight', 'career', 'Academic performance weight', '{}'),
  ('loneliness_in_success', 'belonging', 'Loneliness in success', '{}'),
  ('financial_stress_hidden', 'family', 'Hidden financial stress', '{"south_asian"}'),
  ('relationship_cultural_clash', 'belonging', 'Relationship cultural clash', '{"south_asian"}'),
  ('parental_sacrifice_guilt', 'family', 'Parental sacrifice guilt', '{"nepali", "south_asian"}'),
  ('performance_of_okayness', 'belonging', 'The performance of okayness', '{}'),
  ('opt_h1b_anxiety', 'career', 'OPT/H1B timeline anxiety', '{"international"}'),
  ('burnout_silent', 'career', 'Silent burnout', '{}'),
  ('homesickness_complex', 'belonging', 'Complex homesickness', '{"nepali", "international"}'),
  ('grief_distance', 'family', 'Grief from distance', '{"international"}')
ON CONFLICT (theme_key) DO NOTHING;

-- Seed Memory Wall with initial approved memories
INSERT INTO memories (source_type, quote_text, burden_tag, cultural_tag, is_approved, helped_count, display_weight) VALUES
  ('seed', 'The distance between where I am and where my family thinks I should be — that gap has its own gravity.', 'family_expectation_gap', 'south_asian', true, 247, 1.5),
  ('seed', 'I learned to say I''m fine in two languages and mean it in neither.', 'performance_of_okayness', 'universal', true, 183, 1.3),
  ('seed', 'Every rejection email isn''t just a no — it''s a countdown on a clock nobody else can see.', 'opt_h1b_anxiety', 'international', true, 312, 1.5),
  ('seed', 'I carry the weight of every meal my mother skipped so I could be here.', 'parental_sacrifice_guilt', 'nepali', true, 156, 1.4),
  ('seed', 'Some days the hardest part isn''t the work — it''s pretending the work is the hardest part.', 'burnout_silent', 'universal', true, 201, 1.2)
ON CONFLICT DO NOTHING;

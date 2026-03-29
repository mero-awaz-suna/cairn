-- ============================================================================
-- Migration: Add demographics to users + fix onboarding flow
--
-- 1. Make academic_stage/primary_burden nullable (auth callback inserts
--    without them, onboarding sets them later)
-- 2. Make consented_to_terms_at/consented_to_ai_at nullable (used as
--    "onboarding completed" flag — NULL = not yet onboarded)
-- 3. Add demographics columns for persona matching engine
-- ============================================================================

-- ── Fix onboarding columns ───────────────────────────────────────────────────

ALTER TABLE users
  ALTER COLUMN academic_stage DROP NOT NULL,
  ALTER COLUMN academic_stage DROP DEFAULT;

ALTER TABLE users
  ALTER COLUMN primary_burden DROP NOT NULL,
  ALTER COLUMN primary_burden DROP DEFAULT;

ALTER TABLE users
  ALTER COLUMN consented_to_terms_at DROP NOT NULL,
  ALTER COLUMN consented_to_terms_at DROP DEFAULT;

ALTER TABLE users
  ALTER COLUMN consented_to_ai_at DROP NOT NULL,
  ALTER COLUMN consented_to_ai_at DROP DEFAULT;

-- Set existing rows that have consent timestamps to keep them
-- (only affects rows created before this migration)

-- ── Add demographics columns ─────────────────────────────────────────────────
-- These match the persona engine's UserDemographics model exactly:
--   age_group, occupation, industry, language_code, region_code, living_situation

ALTER TABLE users ADD COLUMN IF NOT EXISTS age_group TEXT;
-- Values: 'high_school', 'college', 'early_career', 'mid_career'

ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation TEXT;
-- Values: 'student', 'engineer', 'healthcare', 'business', 'creative', 'service', 'other'

ALTER TABLE users ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT '';
-- Free text, clustered downstream by persona engine

ALTER TABLE users ADD COLUMN IF NOT EXISTS language_code VARCHAR(10) DEFAULT 'en';
-- ISO 639-1: 'en', 'ne', 'hi', etc.

ALTER TABLE users ADD COLUMN IF NOT EXISTS region_code VARCHAR(10) DEFAULT 'US';
-- ISO 3166-1: 'NP', 'US', 'IN', etc.

ALTER TABLE users ADD COLUMN IF NOT EXISTS living_situation TEXT;
-- Values: 'alone', 'partner', 'family', 'roommates'

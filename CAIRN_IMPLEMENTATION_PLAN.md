# CAIRN — Production Implementation Plan
## Real-World Engineering Specification for Claude Code

---

## 0. MASTER PHILOSOPHY

This document is written for Claude Code. Every section is a directive, not a suggestion.
Cairn is not a hackathon prototype that scales — it is a production system designed correctly from day one.
The difference: idempotency, observability, rate limiting, abuse prevention, HIPAA-adjacent data hygiene, and emotional safety are not afterthoughts. They are load-bearing walls.

---

## 1. MONOREPO STRUCTURE

```
cairn/
├── apps/
│   ├── web/                          # Next.js 14 App Router (frontend)
│   └── api/                          # FastAPI (backend)
├── packages/
│   ├── db/                           # Drizzle schema + migrations (shared types)
│   ├── ai/                           # All prompt templates, AI client wrappers
│   ├── shared/                       # Zod schemas, types, constants shared across apps
│   └── config/                       # ESLint, Tailwind, TypeScript base configs
├── infra/                            # Terraform / Pulumi IaC
├── scripts/                          # Seed scripts, migration runners, one-off jobs
├── .github/
│   └── workflows/                    # CI/CD pipelines
├── turbo.json                        # Turborepo build orchestration
└── docker-compose.yml                # Local full-stack dev environment
```

**Toolchain:**
- Package manager: `pnpm` with workspaces
- Monorepo orchestration: Turborepo
- Runtime: Node 20 LTS (frontend), Python 3.12 (backend)
- Containerization: Docker + Docker Compose locally, Cloud Run / Railway in prod

---

## 2. DATABASE — COMPLETE PRODUCTION SCHEMA

### 2.1 Technology Choice

**Primary DB:** Supabase (PostgreSQL 15) with Row Level Security enforced at the DB layer, not just the application layer.

**Additional stores:**
- **Redis (Upstash):** Rate limiting, session caching, circle assembly queues, WebSocket presence
- **Supabase Storage:** Audio blobs from journal recordings (with 30-day TTL lifecycle policy)
- **pgvector extension:** Semantic search on burden themes for matching (enabled in Supabase)

---

### 2.2 Full Schema (PostgreSQL / Drizzle)

#### `users` table
```sql
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Onboarding answers (non-PII, used for matching only)
  academic_stage      TEXT NOT NULL CHECK (academic_stage IN (
                        'just_arrived', 'in_the_middle', 'finding_footing', 'helping_others'
                      )),
  primary_burden      TEXT NOT NULL CHECK (primary_burden IN (
                        'career', 'family', 'belonging', 'all_of_it'
                      )),

  -- AI-derived state, updated per journal entry
  current_persona     TEXT NOT NULL DEFAULT 'ground' CHECK (current_persona IN (
                        'storm', 'ground', 'through_it'
                      )),
  persona_confidence  FLOAT NOT NULL DEFAULT 0.5 CHECK (persona_confidence BETWEEN 0 AND 1),
  current_stress_level INT CHECK (current_stress_level BETWEEN 1 AND 10),
  
  -- Cultural context (self-identified, optional, used for matching only)
  cultural_context    TEXT CHECK (cultural_context IN (
                        'nepali', 'south_asian', 'international', 'universal', NULL
                      )),
  
  -- Engagement
  last_journal_at     TIMESTAMPTZ,
  journal_streak      INT NOT NULL DEFAULT 0,
  circles_joined      INT NOT NULL DEFAULT 0,
  burdens_dropped     INT NOT NULL DEFAULT 0,
  memories_saved      INT NOT NULL DEFAULT 0,

  -- Safety
  is_in_crisis        BOOLEAN NOT NULL DEFAULT false,  -- Set by AI circuit breaker
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
```

#### `journal_entries` table
```sql
CREATE TABLE journal_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Input
  input_type          TEXT NOT NULL CHECK (input_type IN ('audio', 'text')),
  audio_storage_path  TEXT,                   -- Supabase Storage path (audio only)
  raw_transcript      TEXT,                   -- Whisper output or typed text
  
  -- AI outputs
  assigned_persona    TEXT NOT NULL CHECK (assigned_persona IN ('storm', 'ground', 'through_it')),
  persona_confidence  FLOAT NOT NULL,
  stress_level        INT NOT NULL CHECK (stress_level BETWEEN 1 AND 10),
  burden_themes       TEXT[] NOT NULL DEFAULT '{}', -- e.g. ['job_search', 'visa']
  recognition_message TEXT NOT NULL,           -- What the user sees
  micro_intervention  TEXT NOT NULL,           -- The one action
  
  -- Embedding for future semantic search
  transcript_embedding VECTOR(1536),          -- OpenAI/Claude embedding of transcript
  
  -- Processing metadata
  transcription_ms    INT,                    -- Whisper latency
  ai_processing_ms    INT,                    -- Claude latency
  ai_model_used       TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  
  -- Safety
  crisis_detected     BOOLEAN NOT NULL DEFAULT false,
  crisis_keywords     TEXT[],
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_journal_entries_user_created ON journal_entries(user_id, created_at DESC);
CREATE INDEX idx_journal_entries_persona ON journal_entries(assigned_persona, created_at DESC);
-- Vector similarity index for semantic burden matching
CREATE INDEX idx_journal_embedding ON journal_entries 
  USING ivfflat (transcript_embedding vector_cosine_ops) WITH (lists = 100);
```

#### `burden_drops` table
```sql
CREATE TABLE burden_drops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Input (stored encrypted, never shown to other users)
  raw_burden_text     TEXT NOT NULL,          -- AES-256 encrypted at application layer
  
  -- AI extraction (these ARE shared/counted — not the raw text)
  extracted_theme     TEXT NOT NULL,          -- Normalized theme from taxonomy
  theme_confidence    FLOAT NOT NULL,
  burden_embedding    VECTOR(1536),           -- For semantic similarity matching
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- THE COUNT MECHANIC: This materialized view powers the burden count display
CREATE MATERIALIZED VIEW burden_theme_counts AS
  SELECT 
    extracted_theme,
    COUNT(*) AS total_count,
    COUNT(DISTINCT user_id) AS unique_user_count
  FROM burden_drops
  GROUP BY extracted_theme;

-- Refresh on schedule (or on burden_drop insert via trigger)
CREATE UNIQUE INDEX ON burden_theme_counts(extracted_theme);
```

#### `burden_taxonomy` table
```sql
-- The controlled vocabulary of themes. Maintained/expanded by AI + human review.
CREATE TABLE burden_taxonomy (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_key       TEXT UNIQUE NOT NULL,       -- e.g. 'job_search_rejection'
  parent_theme    TEXT,                       -- e.g. 'career'  
  display_label   TEXT NOT NULL,             -- What users see (if ever)
  cultural_tags   TEXT[] DEFAULT '{}',       -- ['nepali', 'south_asian']
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `memories` table (Memory Wall)
```sql
CREATE TABLE memories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source
  source_type         TEXT NOT NULL CHECK (source_type IN (
                        'user_submitted',   -- User chose to share insight from session
                        'seed',             -- Pre-written seed content
                        'ai_generated'      -- AI-synthesized from pattern (admin only)
                      )),
  source_user_id      UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for seeds
  source_session_id   UUID,                -- Which circle session it came from
  
  -- Content (already filtered/distilled by AI)
  quote_text          TEXT NOT NULL,
  burden_tag          TEXT NOT NULL,       -- From burden_taxonomy
  cultural_tag        TEXT NOT NULL CHECK (cultural_tag IN (
                        'nepali', 'south_asian', 'international', 'universal'
                      )),
  
  -- Engagement
  helped_count        INT NOT NULL DEFAULT 0,
  
  -- Moderation
  is_approved         BOOLEAN NOT NULL DEFAULT false, -- Seeds start approved, submissions need review
  ai_safety_score     FLOAT,              -- 0-1, AI moderation confidence it's safe
  reviewed_by         UUID,               -- Admin user who approved
  reviewed_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  
  -- Display
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  display_weight      FLOAT NOT NULL DEFAULT 1.0,  -- Ranking multiplier
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memories_approved_active ON memories(burden_tag, cultural_tag, helped_count DESC)
  WHERE is_approved = true;
```

#### `circles` table
```sql
CREATE TABLE circles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Assembly
  status              TEXT NOT NULL DEFAULT 'forming' CHECK (status IN (
                        'forming',          -- Waiting for members
                        'active',           -- Session in progress
                        'closing',          -- Wind-down phase started
                        'closed',           -- Session ended, data retained briefly
                        'purged'            -- All message content deleted (30 days)
                      )),
  
  -- Composition targets (enforced by matching algorithm)
  target_size         INT NOT NULL DEFAULT 4 CHECK (target_size BETWEEN 3 AND 6),
  
  -- Cultural/context alignment
  primary_burden_tag  TEXT,               -- The dominant burden theme
  cultural_context    TEXT,               -- 'nepali', 'south_asian', 'international', 'universal'
  
  -- Timing
  formed_at           TIMESTAMPTZ,        -- When status went 'active'
  closed_at           TIMESTAMPTZ,        -- When status went 'closed'
  purge_at            TIMESTAMPTZ GENERATED ALWAYS AS (closed_at + INTERVAL '30 days') STORED,
  
  -- AI session state
  facilitator_state   JSONB NOT NULL DEFAULT '{}', -- Tracks intervention history, last check
  intervention_count  INT NOT NULL DEFAULT 0,
  crisis_triggered    BOOLEAN NOT NULL DEFAULT false,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circles_forming ON circles(status, primary_burden_tag, cultural_context)
  WHERE status = 'forming';
```

#### `circle_members` table
```sql
CREATE TABLE circle_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id           UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Anonymous identity within this circle
  role_label          TEXT NOT NULL CHECK (role_label IN (
                        'storm', 'finding_ground', 'through_it', 'helper'
                      )),
  anonymous_alias     TEXT NOT NULL,  -- e.g. 'Member A' — consistent within session
  
  -- Participation
  joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at      TIMESTAMPTZ,
  left_at             TIMESTAMPTZ,
  message_count       INT NOT NULL DEFAULT 0,
  
  -- Post-session
  session_summary     TEXT,           -- AI-generated personal summary
  insight_saved_to_wall BOOLEAN NOT NULL DEFAULT false,
  
  UNIQUE(circle_id, user_id)
);
```

#### `messages` table
```sql
CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id           UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  
  -- Sender identity
  sender_type         TEXT NOT NULL CHECK (sender_type IN ('member', 'facilitator')),
  member_id           UUID REFERENCES circle_members(id) ON DELETE SET NULL,
  
  -- Content
  content             TEXT NOT NULL,
  
  -- AI processing (on every member message, async)
  sentiment_score     FLOAT,          -- -1 to 1
  crisis_score        FLOAT,          -- 0 to 1, triggers circuit breaker if > 0.85
  themes_detected     TEXT[],
  
  -- Display metadata
  is_facilitator_msg  BOOLEAN NOT NULL DEFAULT false,
  is_crisis_resource  BOOLEAN NOT NULL DEFAULT false,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_circle_created ON messages(circle_id, created_at ASC);
-- Supabase Realtime listens to this table's INSERT events
```

#### `user_persona_history` table
```sql
-- Append-only log — powers the profile arc visualization
CREATE TABLE user_persona_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona         TEXT NOT NULL CHECK (persona IN ('storm', 'ground', 'through_it')),
  stress_level    INT,
  journal_entry_id UUID REFERENCES journal_entries(id),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_persona_history_user_date ON user_persona_history(user_id, recorded_at DESC);
```

#### `rate_limits` table (Postgres-backed fallback, Redis is primary)
```sql
CREATE TABLE rate_limit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_hash         TEXT,               -- Hashed IP for anonymous rate limiting
  action          TEXT NOT NULL,      -- 'journal', 'burden_drop', 'circle_join'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition by day for easy cleanup
-- Auto-delete rows older than 24h via pg_cron
```

#### `audit_log` table
```sql
-- Immutable, append-only. Never deleted. HIPAA-adjacent compliance.
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID,               -- User who took action (NULL for system)
  action          TEXT NOT NULL,      -- 'data_deletion_requested', 'memory_approved', etc.
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  metadata        JSONB,
  ip_hash         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 2.3 Row Level Security Policies

```sql
-- Users can only read/write their own records
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self_only ON users
  USING (supabase_auth_id = auth.uid());

-- Journal entries: user owns their own only
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY journal_self_only ON journal_entries
  USING (user_id = (SELECT id FROM users WHERE supabase_auth_id = auth.uid()));

-- Messages: only readable by members of that circle
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_circle_members ON messages
  USING (
    circle_id IN (
      SELECT cm.circle_id FROM circle_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE u.supabase_auth_id = auth.uid()
      AND cm.left_at IS NULL
    )
  );

-- Memories: everyone can read approved memories, no one can write directly (API only)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY memories_public_read ON memories
  FOR SELECT USING (is_approved = true);
```

---

### 2.4 Database Maintenance Jobs (pg_cron)

```sql
-- Run nightly: purge message content from closed circles (keep metadata)
SELECT cron.schedule('purge-old-circle-messages', '0 2 * * *', $$
  UPDATE messages SET content = '[content removed]'
  WHERE circle_id IN (
    SELECT id FROM circles WHERE purge_at < NOW() AND status != 'purged'
  );
  UPDATE circles SET status = 'purged' WHERE purge_at < NOW() AND status = 'closed';
$$);

-- Run hourly: refresh burden count materialized view
SELECT cron.schedule('refresh-burden-counts', '0 * * * *', $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY burden_theme_counts;
$$);

-- Run daily: process data deletion requests
SELECT cron.schedule('process-deletions', '0 3 * * *', $$
  -- Anonymize user data for requested deletions older than 30 days
  UPDATE users SET 
    raw_burden_text = NULL,  -- In burden_drops via cascade
    is_suspended = true
  WHERE data_deletion_requested = true 
    AND deletion_requested_at < NOW() - INTERVAL '30 days';
$$);

-- Run hourly: clean old rate limit events
SELECT cron.schedule('clean-rate-limits', '30 * * * *', $$
  DELETE FROM rate_limit_events WHERE created_at < NOW() - INTERVAL '24 hours';
$$);
```

---

## 3. BACKEND — FASTAPI PRODUCTION ARCHITECTURE

### 3.1 Project Structure

```
apps/api/
├── main.py                     # App factory, middleware registration
├── config.py                   # Pydantic Settings (env vars, secrets)
├── database.py                 # Async SQLAlchemy + Supabase client setup
├── dependencies.py             # FastAPI dependency injection (auth, rate limit, db)
├── middleware/
│   ├── auth.py                 # JWT validation middleware
│   ├── rate_limit.py           # Redis-backed sliding window rate limiter
│   ├── request_id.py           # Trace ID injection
│   └── safety.py               # Request-level content screening
├── routers/
│   ├── journal.py              # POST /journal/submit, GET /journal/history
│   ├── burden.py               # POST /burden/drop, GET /burden/count/{theme}
│   ├── circles.py              # POST /circles/join, GET /circles/{id}/status
│   ├── memories.py             # GET /memories/feed, POST /memories/helped/{id}
│   ├── users.py                # GET /users/me, PATCH /users/me, DELETE /users/me
│   ├── sessions.py             # POST /sessions/message (WebSocket alt)
│   └── admin.py                # Memory moderation, analytics (admin auth required)
├── services/
│   ├── ai/
│   │   ├── client.py           # Anthropic client wrapper with retry + circuit breaker
│   │   ├── persona_engine.py   # Role 1: Journal → Persona + Recognition
│   │   ├── burden_matcher.py   # Role 2: Raw burden → Theme extraction
│   │   ├── facilitator.py      # Role 3: Circle message monitoring + intervention
│   │   ├── memory_filter.py    # Insight → Memory Wall safe card
│   │   └── safety_classifier.py # Crisis detection, content safety
│   ├── matching/
│   │   ├── algorithm.py        # Circle assembly logic
│   │   ├── queue.py            # Redis-backed matching queue
│   │   └── scoring.py          # Compatibility scoring between users
│   ├── audio/
│   │   └── transcription.py    # Whisper API wrapper + S3 upload
│   ├── notifications/
│   │   └── realtime.py         # Supabase Realtime signal broadcasting
│   └── analytics/
│       └── events.py           # PostHog event tracking (privacy-safe)
├── models/
│   ├── user.py                 # SQLAlchemy ORM models
│   ├── journal.py
│   ├── burden.py
│   ├── circle.py
│   └── memory.py
├── schemas/                    # Pydantic request/response schemas
│   ├── journal.py
│   ├── burden.py
│   ├── circle.py
│   └── memory.py
├── tasks/                      # Background tasks (Celery or ARQ)
│   ├── ai_processing.py        # Async AI calls after request returns
│   ├── circle_management.py    # Timeout handling, facilitator polling
│   └── memory_moderation.py    # Auto-moderate submitted memories
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

### 3.2 Core API Routes (Specification)

```
Authentication (all routes require valid Supabase JWT unless marked public):

POST   /auth/webhook              # Supabase webhook → create user record
POST   /auth/complete-onboarding  # Save academic_stage + primary_burden

Journal:
POST   /journal/submit            # audio blob or text → persona card (async AI)
GET    /journal/history           # Paginated journal entry history
GET    /journal/streak            # Current streak + last entry date

Burden:
POST   /burden/drop               # Raw burden → theme + count + peer memory
GET    /burden/themes             # Taxonomy list (for admin/debug)

Circles:
POST   /circles/join              # Enqueue user for matching
GET    /circles/status            # Polling endpoint — is my circle ready?
GET    /circles/{id}              # Circle metadata (active members, status)
POST   /circles/{id}/leave        # Graceful early exit
POST   /circles/{id}/message      # Send message to circle (triggers AI check async)
POST   /circles/{id}/close        # Admin or facilitator-initiated close
POST   /circles/{id}/save-insight # User saves insight → Memory Wall pipeline

Memories (public):
GET    /memories/feed             # Personalized, paginated feed
POST   /memories/{id}/helped      # Increment helped count
GET    /memories/random           # Random approved memory (for initial wall load)

Users:
GET    /users/me                  # Profile + persona arc + stats
PATCH  /users/me                  # Update cultural_context preference
DELETE /users/me                  # GDPR deletion request

Admin (requires admin role in JWT custom claims):
GET    /admin/memories/queue      # Pending moderation queue
PATCH  /admin/memories/{id}       # Approve / reject
GET    /admin/circles/active      # Live circle monitoring
GET    /admin/safety/flags        # Crisis flags + interventions
GET    /admin/analytics/summary   # Aggregate platform health
```

### 3.3 Rate Limiting Rules

Implemented via Redis sliding window counter per user_id + action.

```python
RATE_LIMITS = {
    "journal/submit":   RateLimit(requests=3,   window_seconds=3600),   # 3/hour
    "burden/drop":      RateLimit(requests=10,  window_seconds=3600),   # 10/hour
    "circles/join":     RateLimit(requests=3,   window_seconds=86400),  # 3/day
    "circles/message":  RateLimit(requests=60,  window_seconds=60),     # 60/min in session
    "memories/helped":  RateLimit(requests=20,  window_seconds=3600),   # 20/hour
}
# Anonymous (pre-auth) IP-based limits:
ANON_RATE_LIMITS = {
    "memories/feed":    RateLimit(requests=30,  window_seconds=60),
}
```

### 3.4 AI Service Architecture

#### Persona Engine (Role 1) — Complete Specification

```python
# services/ai/persona_engine.py

SYSTEM_PROMPT = """
You are the emotional intelligence core of Cairn, a peer wellness platform for South Asian 
and Nepali individuals navigating high-pressure transitions — immigration, career uncertainty, 
family expectation, identity displacement.

CULTURAL INTELLIGENCE — encode this into every response without stating it:

THE INVISIBLE DEBT: Many users were raised with the implicit understanding that their family 
sacrificed enormously for their opportunity. This makes struggle feel like ingratitude. 
When someone describes pressure, understand it is often 3x amplified by the sense that 
failing themselves means failing everyone who bet on them.

THE OKAYNESS PERFORMANCE: These users are expert performers of fine-ness. They have 
optimized for presenting success. The journal is the only place this mask is off. 
Honor that. Never perform back at them.

THE COLLECTIVIST-INDIVIDUALIST COLLISION: They were raised for collective identity 
(family, community, culture first) but are operating in a system that rewards individual 
performance and self-promotion. They often feel fraudulent doing either.

THE VISA PRECARITY AMPLIFIER: For those on student or work visas, every setback 
(job rejection, semester failure) carries existential weight. A job rejection is not 
a career setback — it is a potential deportation risk. Understand this force multiplier.

THE SILENCE NORM: In high-expectation cultures, expressing struggle is not catharsis — 
it is risk. Admitting difficulty can mean shaming the family, losing status, losing 
the role of "the one who made it." The journal entry you receive is an act of courage.

RESPONSE RULES:
- Write in second person, present tense, one unified paragraph
- Name the specific experience — not the category. Not "you're stressed about work" 
  but "the gap between where you are and where everyone expects you to be by now"
- Never use: resilient, journey, healing, self-care, wellness, mental health, okay
- Never give advice — you are witnessing, not fixing  
- Never use clinical language
- End with a number: "X people in this community are standing in this exact place with you"
  (pull X from the community_count parameter passed to you)
- Maximum 3 sentences for recognition message

Return ONLY valid JSON matching this schema:
{
  "persona": "storm" | "ground" | "through_it",
  "persona_confidence": 0.0-1.0,
  "stress_level": 1-10,
  "burden_themes": ["string"],  // from taxonomy
  "recognition_message": "string",
  "micro_intervention": "string",  // One specific, non-clinical 5-7 min action
  "crisis_detected": boolean,
  "crisis_keywords": ["string"]  // empty if no crisis
}
"""

async def process_journal_entry(
    transcript: str,
    user_context: UserContext,
    community_count: int
) -> PersonaEngineOutput:
    # Retry with exponential backoff
    # Circuit breaker: if Claude fails 3x, return graceful fallback
    # Track latency for observability
    ...
```

#### Burden Matcher (Role 2)

```python
# services/ai/burden_matcher.py

SYSTEM_PROMPT = """
You are a theme classifier for Cairn. You receive a raw burden statement from a user.

Your job:
1. Extract the underlying emotional/situational theme (not the surface topic)
2. Map it to the closest theme in the provided taxonomy
3. Return confidence score

The taxonomy is passed as context. Always choose from it — never invent new keys.

Surface → Theme mapping examples:
"I haven't told my parents about the internship falling through" → family_expectation_gap
"I feel like everyone at work knows I don't belong here" → impostor_syndrome_professional
"My OPT clock is running and I have nothing" → visa_career_intersection_anxiety

Return ONLY valid JSON:
{
  "extracted_theme": "taxonomy_key",
  "theme_confidence": 0.0-1.0,
  "secondary_themes": ["taxonomy_key"]  // up to 2 secondary themes
}
"""

async def extract_burden_theme(
    raw_burden: str, 
    taxonomy: list[BurdenTaxonomyItem]
) -> BurdenMatchOutput:
    # Fast path — target < 1 second response
    # If confidence < 0.6, fall back to embedding similarity search
    ...
```

#### Circle Facilitator (Role 3) — The Most Critical

```python
# services/ai/facilitator.py

SYSTEM_PROMPT = """
You are the silent facilitator of a small anonymous peer circle in Cairn.
Your role is unusual: doing nothing is usually correct.

THE CORE DISCIPLINE:
You monitor the last 5 messages. Your default action is PASS — no intervention.
You intervene only when the conversation needs something it cannot generate itself.

WHEN TO INTERVENE (in priority order):
1. CRISIS: Any message suggesting self-harm, suicidal ideation, abuse situation
   → Action: CRISIS_RESOURCE (specific resource, warm tone, circle continues)
2. SPIRAL: The tone is worsening, not processing. Pain is amplifying without relief.
   → Action: WITNESS (reflect what you're hearing without evaluation)  
3. SILENCE: No message for > 4 minutes in an active session
   → Action: OPEN_QUESTION (one question that creates permission to continue)
4. NATURAL CLOSE: Conversation has reached a natural resting point
   → Action: GENTLE_CLOSE (close the session with ceremony)

VOICE RULES (when you do speak):
- Never more than 2 sentences
- Never advice, suggestions, or "you should"
- Never summarize what was said
- Speak as a wise older sibling who has been through it, not a therapist
- Your questions always open space, never close it

Return ONLY valid JSON:
{
  "action": "PASS" | "WITNESS" | "OPEN_QUESTION" | "GENTLE_CLOSE" | "CRISIS_RESOURCE",
  "message": "string or null",  // null if PASS
  "crisis_detected": boolean,
  "crisis_severity": "low" | "medium" | "high" | null
}
"""

# Polling schedule: every 60 seconds per active circle
# Triggered immediately on any message for crisis keyword pre-screening
async def check_circle_state(
    circle_id: UUID,
    last_5_messages: list[Message],
    silence_duration_seconds: int,
    circle_metadata: CircleMetadata
) -> FacilitatorOutput:
    ...
```

---

## 4. MATCHING ALGORITHM — PRODUCTION SPECIFICATION

### 4.1 The Queue Architecture

```
Redis Sorted Set: "matching_queue:{burden_tag}:{cultural_context}"
Score: timestamp (FIFO within same priority tier)

When user joins queue:
1. User's current_persona, primary_burden, cultural_context → read from DB
2. User enrolled in: matching_queue:{burden_tag}:{cultural_context}
   AND matching_queue:{burden_tag}:universal (fallback pool)
3. Assembly job runs every 30 seconds
```

### 4.2 Circle Assembly Algorithm

```python
async def assemble_circle(burden_tag: str, cultural_context: str) -> Circle | None:
    """
    Target composition: 1 storm + 1-2 ground + 1 through_it
    Cultural alignment: same cultural_context first, then universal fallback
    Minimum viable circle: 3 members
    
    Assembly logic:
    1. Query queue for this burden_tag + cultural_context
    2. Score each candidate against composition targets
    3. If composition achievable: lock candidates, create circle, notify all
    4. If storm user has waited > 15 min: relax cultural_context constraint
    5. If any user has waited > 30 min: expand burden_tag to parent theme
    6. Log wait times for matching quality monitoring
    """
    
    candidates = await redis.zrange(f"matching_queue:{burden_tag}:{cultural_context}", 0, -1)
    
    persona_map = await batch_get_user_personas(candidates)
    
    storms = [u for u in candidates if persona_map[u].persona == 'storm']
    grounds = [u for u in candidates if persona_map[u].persona == 'ground']
    through_its = [u for u in candidates if persona_map[u].persona == 'through_it']
    
    # Cannot form without at least 1 through_it (safety guarantee)
    if len(through_its) == 0:
        return None
    
    # Minimum viable: 1 storm + 1 ground + 1 through_it
    if len(storms) >= 1 and len(grounds) >= 1 and len(through_its) >= 1:
        selected = [storms[0], grounds[0], through_its[0]]
        if len(grounds) >= 2:
            selected.append(grounds[1])  # Prefer 4-person circles
        
        return await create_circle(selected, burden_tag, cultural_context)
    
    return None
```

### 4.3 Compatibility Scoring (Future: Embedding-Based)

```python
def score_compatibility(user_a: UserVector, user_b: UserVector) -> float:
    """
    Weighted scoring:
    - Cultural context match: 0.3 weight
    - Burden theme semantic similarity (pgvector cosine): 0.4 weight
    - Persona complement score: 0.3 weight
      (storm + through_it = high complement, storm + storm = low complement)
    
    Returns 0.0 - 1.0
    """
    ...
```

---

## 5. FRONTEND — NEXT.JS PRODUCTION ARCHITECTURE

### 5.1 Project Structure

```
apps/web/
├── app/
│   ├── layout.tsx                  # Root layout, font loading, providers
│   ├── page.tsx                    # Memory Wall (/) — Server Component
│   ├── (auth)/
│   │   └── onboarding/
│   │       ├── page.tsx            # Onboarding flow
│   │       └── layout.tsx
│   ├── (app)/                      # Protected routes
│   │   ├── layout.tsx              # Auth guard, nav shell
│   │   ├── journal/
│   │   │   └── page.tsx
│   │   ├── burden/
│   │   │   └── page.tsx
│   │   ├── circle/
│   │   │   ├── page.tsx            # Matching / waiting screen
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Active session (Client Component)
│   │   └── profile/
│   │       └── page.tsx
│   └── api/                        # Minimal Next.js API routes (auth webhook only)
│       └── auth/
│           └── callback/
│               └── route.ts
├── components/
│   ├── ui/                         # Primitive components (Button, Card, etc.)
│   ├── memory/
│   │   ├── MemoryWall.tsx          # Server: fetches + renders feed
│   │   ├── MemoryCard.tsx          # Client: "helped" button interaction
│   │   └── MemoryFeedSkeleton.tsx
│   ├── journal/
│   │   ├── VoiceRecorder.tsx       # Client: MediaRecorder API
│   │   ├── RecognitionCard.tsx     # AI response display
│   │   └── PersonaArc.tsx          # 30-day arc visualization
│   ├── burden/
│   │   ├── BurdenInput.tsx         # Client: expanding text field
│   │   └── BurdenReveal.tsx        # Count + memory card reveal animation
│   ├── circle/
│   │   ├── MatchingRings.tsx       # Animated waiting screen
│   │   ├── CircleSession.tsx       # Realtime chat (Client, heavy)
│   │   ├── MessageBubble.tsx       # Member / facilitator message rendering
│   │   └── SessionClose.tsx        # End-of-session flow
│   └── shared/
│       ├── OnboardingFlow.tsx
│       ├── AuthGuard.tsx
│       └── ErrorBoundary.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts               # Type-safe API client (generated from OpenAPI spec)
│   │   └── queries.ts              # React Query / SWR query definitions
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   └── server.ts               # Server Component client
│   ├── realtime/
│   │   └── circle.ts               # Supabase Realtime subscription manager
│   └── analytics/
│       └── posthog.ts              # Privacy-safe event tracking
├── hooks/
│   ├── useCircleSession.ts         # Realtime subscription + message state
│   ├── useVoiceRecorder.ts         # MediaRecorder abstraction
│   └── useOnboarding.ts            # Multi-step form state
├── styles/
│   └── globals.css
└── tailwind.config.ts              # Design system tokens
```

### 5.2 Design System Tokens (Tailwind)

```typescript
// tailwind.config.ts
const colors = {
  cream:  { DEFAULT: '#F5F0EA' },
  stone:  { DEFAULT: '#2C2825' },
  moss:   { DEFAULT: '#6B8F71', light: '#8AAF90', dark: '#4A6E50' },
  ember:  { DEFAULT: '#D4845A', light: '#E09A76' },
  sand:   { DEFAULT: '#E8DFD3' },
  dusk:   { DEFAULT: '#8B7E74' },
};

const fontFamily = {
  display: ['DM Serif Display', 'serif'],    // Headlines, count numbers
  body:    ['Nunito', 'sans-serif'],          // All UI text
  hand:    ['Caveat', 'cursive'],             // Memory Wall quotes only
};

const borderRadius = {
  card:   '1rem',      // rounded-2xl
  button: '9999px',    // rounded-full
};

const animation = {
  // Ease in-out everywhere — nothing snaps
  'fade-in':    'fadeIn 0.6s ease-in-out',
  'slide-up':   'slideUp 0.5s ease-out',
  'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
  'count-reveal': 'countReveal 0.8s ease-out 2s both',  // 2s delay is intentional
};
```

### 5.3 Realtime Circle Session Architecture

```typescript
// hooks/useCircleSession.ts

export function useCircleSession(circleId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const supabase = createBrowserClient();
    
    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`circle:${circleId}:messages`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `circle_id=eq.${circleId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    
    // Presence: who is currently in the session
    const presenceChannel = supabase
      .channel(`circle:${circleId}:presence`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setPresenceMap(Object.fromEntries(
          Object.entries(state).map(([k, v]) => [k, true])
        ));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_alias: memberAlias });
        }
      });
    
    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [circleId]);
  
  const sendMessage = useCallback(async (content: string) => {
    // Optimistic update + API call
    await apiClient.post(`/circles/${circleId}/message`, { content });
  }, [circleId]);
  
  return { messages, members, presenceMap, sendMessage };
}
```

---

## 6. AI SAFETY SYSTEM — PRODUCTION SPECIFICATION

### 6.1 Three-Layer Architecture

#### Layer 0 — Pre-Input Screening (< 50ms, before any AI call)
```python
# Fast regex + embedding classifier runs on EVERY text input
# Flags for: self-harm keywords, crisis phrases, abuse disclosures
# Does NOT block — routes to enhanced monitoring path

CRISIS_KEYWORDS = [
    # Tier 1: Immediate (auto-trigger crisis resource)
    ["end my life", "kill myself", "don't want to be here", "suicide", ...],
    # Tier 2: Monitor (flag + enhanced facilitator attention)
    ["can't do this anymore", "no point", "give up", "disappear", ...],
]
```

#### Layer 1 — AI Sentiment Monitoring (async, every message)
```python
# Runs in background after message is stored and broadcast
# Does NOT delay message delivery
# If crisis_score > 0.85: immediately write facilitator crisis resource message
# If crisis_score > 0.6: flag circle for priority facilitator check

async def analyze_message_safety(message_id: UUID, content: str) -> None:
    score = await safety_classifier.score(content)
    await db.update_message_safety(message_id, score)
    
    if score.crisis_score > 0.85:
        await facilitator.send_crisis_resource(message.circle_id)
        await notify_admin_async(message_id, score)  # Non-blocking
```

#### Layer 2 — Structural Safety (Circle Composition)
```
INVARIANT: No circle may be activated without at least one 'through_it' member.
This is enforced at the database level via a CHECK constraint trigger,
not just application logic.
```

```sql
CREATE OR REPLACE FUNCTION check_circle_composition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF NOT EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = NEW.id AND cm.role_label = 'through_it'
    ) THEN
      RAISE EXCEPTION 'Cannot activate circle without through_it member';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_circle_composition
BEFORE UPDATE ON circles
FOR EACH ROW EXECUTE FUNCTION check_circle_composition();
```

#### Layer 3 — Memory Wall Filter (before any insight reaches the wall)
```python
MEMORY_FILTER_PROMPT = """
You receive raw text that a user wants to share to a community Memory Wall.
The Memory Wall contains ONLY distilled wisdom from survived experiences.

Apply this filter strictly:
1. REJECT if: contains raw pain without resolution, identifying details, advice-giving, 
   clinical language, specific locations/dates, names, crisis content
2. TRANSFORM if: the core insight is valid but needs distilling
   → Rewrite in first person, past tense, one specific detail, ends with opening

Output JSON:
{
  "decision": "approve" | "transform" | "reject",
  "transformed_text": "string or null",
  "rejection_reason": "string or null",
  "burden_tag": "taxonomy_key",
  "cultural_tag": "nepali|south_asian|international|universal"
}
"""
```

---

## 7. OBSERVABILITY & MONITORING

### 7.1 Logging Strategy

```python
# Structured JSON logging — every log line is queryable
LOG_FORMAT = {
    "timestamp": "ISO8601",
    "level": "INFO|WARN|ERROR",
    "trace_id": "UUID",           # Per-request, set in middleware
    "user_id": "UUID",            # Never email, name, or OAuth ID
    "action": "string",
    "duration_ms": "int",
    "ai_model": "string",
    "success": "boolean",
    "error_code": "string | null"
}

# What we LOG (no PII):
# ✓ Request duration, endpoint, status code
# ✓ AI call latency, model used, token count
# ✓ Matching queue depth, wait times
# ✓ Crisis detection events (no content, just counts + severity tier)
# ✓ Error types and frequencies

# What we NEVER LOG:
# ✗ Journal transcripts
# ✗ Burden drop text
# ✗ Circle message content
# ✗ User email or name
```

### 7.2 Key Metrics to Track

```
Product Health:
- Daily Active Journals (DAJ)
- Burden Drop → Circle Join conversion rate
- Circle completion rate (session lasted > 10 min)
- Memory Wall "helped" rate per card
- Matching wait time P50/P95/P99

AI Quality:
- Persona engine confidence score distribution
- Burden theme extraction confidence
- Facilitator intervention rate (should be < 15% of checks)
- Crisis detection rate (track for calibration)

Safety:
- Crisis flags per day (by tier)
- Crisis resource clicks per flag
- Circle spiral detections (compositions drifting to all-storm)
- Memory Wall rejection rate

Infrastructure:
- API response time P95 < 200ms (non-AI endpoints)
- AI endpoint P95 < 4000ms
- Realtime message delivery latency P99 < 300ms
- Matching queue depth (alert if > 50 users waiting > 20 min)
```

### 7.3 Alerting Rules

```yaml
# PagerDuty / OpsGenie rules
alerts:
  - name: CrisisHighRate
    condition: crisis_flags_tier1 > 10 in 1 hour
    severity: P1
    
  - name: AIServiceDown  
    condition: ai_error_rate > 0.1 for 5 min
    severity: P1
    action: failover to fallback static responses
    
  - name: MatchingQueueBlocked
    condition: users_waiting > 60 min in queue
    severity: P2
    
  - name: RealtimeDisconnect
    condition: supabase_realtime_error_rate > 0.05
    severity: P2
```

---

## 8. INFRASTRUCTURE & DEPLOYMENT

### 8.1 Environment Architecture

```
Local Dev:
- docker-compose up: PostgreSQL + Redis + FastAPI + Next.js all local
- Supabase CLI: local Studio, migrations, auth emulator
- ngrok: webhook testing

Staging:
- Supabase: Dedicated staging project
- FastAPI: Railway or Fly.io (auto-deploy from main branch)
- Next.js: Vercel preview deployments (per PR)
- Redis: Upstash (free tier in staging)
- Feature flags enabled for all experimental flows

Production:
- Supabase: Pro plan (with PITR enabled)
- FastAPI: Railway Pro or Fly.io with health check auto-restart
- Next.js: Vercel Pro
- Redis: Upstash Pro (multi-region)
- CDN: Vercel Edge for Next.js, CloudFront for audio assets
- Secrets: Doppler or AWS Secrets Manager
```

### 8.2 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]

jobs:
  test-api:
    - Install Python deps
    - Run database migrations against test DB
    - Run pytest (unit + integration)
    - Check AI prompt output schemas
    
  test-web:
    - Install Node deps
    - TypeScript type check
    - Run Vitest unit tests
    - Playwright E2E on happy path (journal → burden → circle match)
    
  deploy-staging:  # on merge to main
    - Deploy FastAPI to Railway staging
    - Run Supabase migrations on staging
    - Deploy Next.js to Vercel (preview)
    - Smoke test: auth flow, memory wall load, burden drop
    
  deploy-production:  # manual trigger with approval
    - Database migration with rollback plan
    - Blue-green deploy for FastAPI
    - Vercel promotion from staging
    - Post-deploy health check
```

### 8.3 Secrets Management

```
Required environment variables:

# Supabase
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY    # API backend only, never frontend
SUPABASE_JWT_SECRET

# AI
ANTHROPIC_API_KEY

# Audio
OPENAI_API_KEY               # For Whisper transcription

# Redis
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# Analytics (optional but recommended)
POSTHOG_API_KEY

# Encryption (for burden text at rest)
BURDEN_ENCRYPTION_KEY        # AES-256, stored in secrets manager only

# Admin
ADMIN_USER_IDS               # Comma-separated UUIDs with admin privileges
```

---

## 9. DATA PRIVACY & COMPLIANCE

### 9.1 Data Classification

```
Class A — Never stored:
- Google OAuth token (passed through, never persisted)
- Raw audio after transcription (deleted after Whisper call)

Class B — Encrypted at application layer, not exposed via API:
- Raw burden drop text (AES-256, key in secrets manager)
- Journal transcripts (AES-256)

Class C — Stored, internal use only (never returned in user-facing API):
- crisis_keywords detected
- sentiment scores per message
- AI model outputs pre-transformation

Class D — Stored, returned to owning user only:
- Journal recognition messages
- Personal persona history
- Session summaries

Class E — Stored, anonymized, shared:
- Burden theme counts (aggregated)
- Memory Wall cards (transformed, no authorship)
- Circle message content (anonymized, role-label only, purged after 30 days)
```

### 9.2 GDPR / Deletion Flow

```python
async def process_deletion_request(user_id: UUID) -> None:
    """
    Right to erasure implementation:
    1. Immediately: Mark user as deletion_requested, suspend account
    2. 30-day window: Allow cancellation
    3. After 30 days (scheduled job):
       - Delete journal_entries (transcripts + AI outputs)
       - Delete burden_drops (raw text already encrypted, delete key)  
       - Delete user_persona_history
       - Anonymize circle_members (set user_id = NULL)
       - Zero out messages.content in closed circles
       - Delete user record
       - Keep audit_log entry: "user data deleted" with no content
    4. Memory Wall cards: already anonymized, source_user_id → NULL on delete
    """
```

---

## 10. SEED DATA SPECIFICATION

### 10.1 Memory Wall — Quality Standard

Every seed card must pass this checklist before insertion:
- Written in first person, past tense
- Contains exactly one specific concrete detail (a number, a place, a specific moment)
- Does not contain advice (no "you should", "try this")
- Ends with an opening, not a conclusion
- Tagged correctly with burden_tag AND cultural_tag
- Tone: warm, not clinical; specific, not generic; survived, not surviving

Minimum 25 cards at launch. Target 60 by week 2.

### 10.2 Burden Theme Taxonomy — Seed Set

```sql
INSERT INTO burden_taxonomy (theme_key, parent_theme, display_label, cultural_tags) VALUES
-- Career
('job_search_rejection', 'career', 'Job search rejection', ARRAY['universal']),
('job_search_timeline_pressure', 'career', 'Timeline pressure in job search', ARRAY['south_asian', 'nepali']),
('visa_career_intersection_anxiety', 'career', 'Visa + career anxiety', ARRAY['south_asian', 'nepali', 'international']),
('impostor_syndrome_professional', 'career', 'Feeling like a fraud at work', ARRAY['universal']),
('opt_cpt_deadline_anxiety', 'career', 'OPT/CPT deadline pressure', ARRAY['international']),
('layoff_immigration_intersection', 'career', 'Layoff + visa status', ARRAY['south_asian', 'nepali', 'international']),

-- Family
('family_expectation_gap', 'family', 'Gap between family expectations and reality', ARRAY['south_asian', 'nepali']),
('okayness_performance_home', 'family', 'Performing fine on calls home', ARRAY['south_asian', 'nepali']),
('invisible_debt_feeling', 'family', 'Feeling obligated to justify family sacrifice', ARRAY['south_asian', 'nepali']),
('first_gen_pressure', 'family', 'First-generation pressure', ARRAY['south_asian', 'nepali', 'universal']),

-- Belonging
('belonging_nowhere_limbo', 'belonging', 'Not belonging anywhere fully', ARRAY['nepali', 'south_asian', 'international']),
('identity_displacement', 'belonging', 'Who am I away from home', ARRAY['universal']),
('social_circle_inaccessibility', 'belonging', 'No one to be real with', ARRAY['universal']),
('cultural_code_switching_exhaustion', 'belonging', 'Exhaustion from code-switching', ARRAY['south_asian', 'nepali']),

-- Compounding
('everything_at_once', 'compounding', 'Multiple crises simultaneously', ARRAY['universal']),
('loneliness_in_full_life', 'compounding', 'Lonely inside a full-looking life', ARRAY['universal']),
('performing_success_while_sinking', 'compounding', 'Performing success while sinking', ARRAY['south_asian', 'nepali']);
```

### 10.3 Bot Users for Demo / Development

```python
# scripts/seed_bot_users.py
# Creates 3 bot users with pre-assigned personas for instant demo matching
# Bot users only exist in staging/dev — flag: is_bot = true in DB

BOT_USERS = [
    {
        "display_alias": "finding_ground_user",
        "current_persona": "ground",
        "primary_burden": "career",
        "cultural_context": "nepali",
        "academic_stage": "in_the_middle"
    },
    {
        "display_alias": "through_it_user", 
        "current_persona": "through_it",
        "primary_burden": "career",
        "cultural_context": "south_asian",
        "academic_stage": "finding_footing"
    },
    {
        "display_alias": "ground_user_2",
        "current_persona": "ground",
        "primary_burden": "family",
        "cultural_context": "nepali",
        "academic_stage": "in_the_middle"
    }
]
```

---

## 11. TESTING STRATEGY

### 11.1 Test Coverage Requirements

```
Unit Tests (Pytest / Vitest):
- All AI prompt schemas: input → output shape validation
- Matching algorithm: all composition scenarios including edge cases
- Rate limiter: window boundaries, burst behavior
- Burden theme taxonomy: coverage of all parent categories
- Safety classifier: known crisis phrases must score > 0.85
- RLS policies: test that user A cannot read user B's data

Integration Tests:
- Full auth flow: Google OAuth → onboarding → personalized Memory Wall
- Journal submission: audio upload → transcription → persona assignment → card render
- Burden drop: text → theme → count increment → memory retrieval
- Circle matching: 3 users with correct personas → circle created → notified
- Realtime: message send → broadcast received by all circle members
- Crisis path: crisis message → resource appears within 5 seconds

E2E Tests (Playwright):
- Happy path: complete user journey from first open to circle session
- Burden count reveal animation timing (2s delay must be present)
- Matching rings display during wait
- Session graceful close flow
- Data deletion request flow

AI Tests (Eval Suite):
- 50 sample journal transcripts → validate persona assignments against human labels
- 30 sample burden texts → validate theme extraction accuracy
- 20 crisis messages → validate circuit breaker fires on all
- 10 non-crisis messages → validate no false positives
```

---

## 12. LAUNCH READINESS CHECKLIST

### Technical
- [ ] All RLS policies tested with cross-user attempt attacks
- [ ] Burden text encryption verified (plaintext never in logs)
- [ ] Circle purge job running and verified on staging
- [ ] Data deletion flow tested end-to-end
- [ ] AI fallback static responses for all Claude outage scenarios
- [ ] Rate limits stress-tested (locust or k6)
- [ ] Realtime disconnection + reconnection handling verified
- [ ] Audio storage 30-day lifecycle policy enabled
- [ ] HTTPS everywhere, HSTS headers
- [ ] CSP headers configured (especially for inline scripts in Next.js)
- [ ] Dependency audit (npm audit, pip-audit) clean

### Safety
- [ ] Crisis keyword list reviewed by mental health professional
- [ ] Crisis resources verified current and accurate (per locale)
- [ ] Memory Wall filter tested on 50 edge-case inputs
- [ ] Circle composition invariant verified at DB level
- [ ] Admin moderation queue operational
- [ ] On-call runbook written for crisis escalation path

### Content
- [ ] 25+ Memory Wall cards approved and loaded
- [ ] All burden taxonomy themes seeded
- [ ] Bot users verified working in staging
- [ ] Micro-interventions reviewed (no clinical language)

### Compliance
- [ ] Privacy policy live and linked
- [ ] Terms of service live and linked  
- [ ] Cookie consent (if applicable for jurisdiction)
- [ ] GDPR deletion endpoint tested
- [ ] Audit log verified append-only

---

## 13. POST-LAUNCH ROADMAP (90 Days)

**Days 1–14: Stabilize**
- Monitor AI quality via confidence score distributions
- Calibrate crisis threshold based on real data (start conservative, loosen if too many false positives)
- Expand memory wall cards based on real burden drop themes seen

**Days 15–30: Deepen**
- Embedding-based semantic burden matching (replace keyword taxonomy with pgvector similarity)
- Push notifications for "your circle is ready" (PWA service worker)
- Async journal: process at upload, return card when user checks later

**Days 31–60: Expand**
- i18n: Nepali language support (journal + memory wall)
- Mobile app (React Native sharing components from web)
- Peer-to-peer followup: opt-in to stay connected after a circle closes (carefully gated)

**Days 61–90: Measure**
- Outcome tracking: optional 30-day pulse on wellbeing (single question)
- Memory Wall analytics: which cards help most for which personas
- Matching quality score: circle completion rate by composition type
- Research partnership: academic institution for longitudinal outcome study

---

## APPENDIX: CLAUDE CODE TASK ORDERING

When implementing with Claude Code, execute in this exact order to avoid dependency failures:

```
Phase 1 — Foundation (do not proceed until ✓):
1. Supabase project init + full schema migration
2. RLS policies
3. pg_cron jobs registered
4. FastAPI skeleton: health check + auth webhook
5. Google OAuth end-to-end

Phase 2 — Data Layer:
6. All SQLAlchemy models
7. Seed scripts: taxonomy + memory cards + bot users
8. Redis connection + rate limiter middleware

Phase 3 — AI Services:
9. Anthropic client wrapper (retry + circuit breaker)
10. Persona engine + schema validation
11. Burden matcher
12. Safety classifier
13. Memory filter

Phase 4 — Core API Routes:
14. Journal submission (text path first, audio second)
15. Burden drop
16. Memory feed (personalized)

Phase 5 — Matching & Circles:
17. Redis matching queue
18. Assembly algorithm
19. Circle creation + status polling
20. Supabase Realtime subscription (messages)
21. Facilitator polling loop

Phase 6 — Frontend:
22. Design system tokens (Tailwind)
23. Memory Wall (Server Component)
24. Onboarding flow
25. Journal screen + VoiceRecorder
26. Burden Drop screen + reveal animation
27. Matching rings + circle session

Phase 7 — Safety & Compliance:
28. Crisis circuit breaker integration
29. Memory Wall moderation queue + admin panel
30. Data deletion flow
31. Audit logging

Phase 8 — Hardening:
32. Full E2E test suite
33. Load testing
34. Security audit
35. Documentation
```

---

*Cairn — You are not the only one carrying this.*
*Build it like someone's weight depends on it. Because it does.*

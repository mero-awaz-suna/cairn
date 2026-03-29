# Cairn

> *A voice journal that knows when you need people — and finds exactly the right ones.*

Named after the stone markers hikers leave on mountains: someone was here before you, and they made it through.

Cairn is a mental health peer-support platform. It processes daily voice memos to build a private emotional persona for each user, then forms balanced support circles of real people when someone needs help. After a session ends, positive insights are distilled into a **Memory Wall** — surfaced to future users by stressor similarity, not by algorithm.

---

## What it actually does

1. **Voice journaling** — record a short memo each day. Cairn transcribes it, extracts emotional and linguistic signals (valence, arousal, agency, distortion, coping), and quietly builds your persona over time using dual-speed exponential moving averages.
2. **Persona engine** — your *stage* (In the storm / Finding ground / Through it) is derived from your recent entries, not stored as a label. A user who joins already calm can reach *Through it* without ever touching *In the storm*. The system is a GPS, not a subway line.
3. **Circle matching** — when you press "I need help," Cairn forms a group of 3–6 real people. Their life context matches yours (same occupation cluster, language, life stage). Their recovery stages are deliberately diverse — someone who has been through what you're facing is always in the room.
4. **Memory Wall** — when a session ends, an LLM distills only the positive insights from the conversation. Future users with similar stressors can find and reflect on those echoes. Raw pain is never stored.

---

## Repository structure

```
cairn/                               ← monorepo root
│
├── backend/                         ← FastAPI + persona engine
│   ├── main.py                      ← FastAPI app entrypoint
│   ├── requirements.txt
│   ├── .env.example                 ← copy to .env and fill in
│   ├── generate_token.py            ← local JWT helper for Swagger / WS tests
│   │
│   ├── api/app.py                   ← all route handlers
│   │
│   ├── core/                        ← persona engine (pure Python, no DB)
│   │   ├── config.py                ← all tunable parameters (EMA alphas, thresholds)
│   │   ├── models.py                ← dataclasses (UserPersona, Circle, MemoryWallEntry…)
│   │   ├── persona.py               ← EMA update, identity encoding
│   │   ├── stage.py                 ← stage classifier + inertia gate
│   │   ├── matching.py              ← circle formation algorithm
│   │   ├── memory_wall.py           ← termination → summarisation → retrieval
│   │   ├── pipeline.py              ← orchestrates full memo → persona update
│   │   └── utils.py                 ← EMA math, cosine similarity, normalization
│   │
│   ├── db/                          ← Supabase persistence layer
│   │   ├── persona_store.py         ← UserPersona ↔ Supabase (read/write/upsert)
│   │   ├── circle_store.py          ← form circle, add message, terminate
│   │   ├── memory_wall_store.py     ← LLM summarisation + stressor-similarity retrieval
│   │   ├── cluster_job.py           ← offline HDBSCAN clustering (run periodically)
│   │   └── migrations/
│   │       └── 001_persona_circle_cluster_checklist.sql
│   │
│   ├── extractors/
│   │   ├── acoustic.py              ← wav2vec2-base feature extractor + PCA projection
│   │   └── linguistic.py            ← Gemini structured extractor
│   │
│   └── tests/
│       ├── voice_memos/             ← place sample .wav files here for audio tests
│       └── test_memory_wall_pipeline.py
│
└── frontend/                        ← Next.js app
    ├── .env.example                 ← copy to .env.local and fill in
    ├── package.json
    └── app/                         ← Next.js App Router
        ├── (auth)/                  ← signup / login
        ├── journal/                 ← voice memo recording + text entry
        ├── circle/                  ← live circle chat session
        ├── memory-wall/             ← browse past circle insights
        └── profile/                 ← persona stage + stressor profile
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python 3.12, Uvicorn |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth + custom JWT |
| Realtime chat | Supabase Realtime |
| Voice transcription | Groq Whisper API *(optional)* |
| Acoustic features | wav2vec2-base (HuggingFace Transformers) |
| LLM — persona extraction | Gemini 2.5 Flash |
| LLM — memory wall | Gemini 1.5 Flash *(configurable)* |
| Clustering | HDBSCAN |

---

## Prerequisites

- Python 3.12+
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)
- A [Groq](https://console.groq.com) API key *(optional — only needed for voice transcription)*

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-org/cairn.git
cd cairn
```

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create your env file
cp .env.example .env
# Open .env and fill in the values — see "Environment variables" below

# Apply the DB migration in the Supabase SQL editor
# Paste the contents of: db/migrations/001_persona_circle_cluster_checklist.sql

# Start the API
uvicorn main:app --reload
# API:   http://127.0.0.1:8000
# Docs:  http://127.0.0.1:8000/docs
```

### 3. Frontend

```bash
cd frontend

npm install

cp .env.example .env.local
# Open .env.local and fill in the values — see "Environment variables" below

npm run dev
# → http://localhost:3000
```

---

## Environment variables

All values that differ between environments are configured via env files. Nothing is hardcoded.

### Backend — `backend/.env`

Create this file by copying `backend/.env.example`.

#### Required — the API will not start without these

| Variable | What it does | How to get it |
|----------|-------------|---------------|
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings → API → **Project URL** |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for privileged DB access. **Never expose in frontend.** | Supabase Dashboard → Project Settings → API → **service_role** key |
| `JWT_SECRET` | Signs your app's access tokens | Run: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `JWT_ALGORITHM` | JWT signing algorithm | Use `HS256` |
| `JWT_EXPIRE_MINUTES` | How long tokens stay valid (minutes) | Use `60` |
| `GEMINI_API_KEY` | Used by the persona extractor and memory wall LLM | [Google AI Studio](https://aistudio.google.com) → API keys |

#### Optional — enables additional features

| Variable | What it does | Default if unset |
|----------|-------------|------------------|
| `GROQ_API_KEY` | Enables voice transcription via Groq Whisper. Without this, the audio journal route falls back to text-only. | Not set (text-only mode) |
| `MEMORY_WALL_GEMINI_MODEL` | Override which Gemini model summarises circle conversations | `gemini-1.5-flash` |
| `GOOGLE_API_KEY` | Fallback key name if `GEMINI_API_KEY` is not set | Not set |

#### Optional — test scripts only

| Variable | What it does | Default |
|----------|-------------|---------|
| `CAIRN_BASE_URL` | API base URL used by test scripts | `http://127.0.0.1:8000` |
| `TEST_EMAIL` | Account email for `generate_token.py` | — |
| `TEST_PASSWORD` | Account password for `generate_token.py` | — |
| `USE_SUPABASE_AUTH` | Use Supabase auth flow in tests | `false` |
| `CAIRN_MEMO_DIR` | Directory of `.wav` files for memo upload tests | `tests/voice_memos` |
| `CAIRN_MEMO_COUNT` | Number of memos to submit in batch tests | `5` |
| `CAIRN_CLUSTER_MIN_ENTRY_COUNT` | Minimum entries before a user enters clustering | `3` |
| `CAIRN_REQUESTER_USER_ID` | Fixed user ID for circle request tests | — |
| `CAIRN_TEST_CLEANUP` | Delete test rows after test run (`true`/`false`) | `true` |

---

### Frontend — `frontend/.env.local`

Create this file by copying `frontend/.env.example`.

| Variable | What it does | How to get it |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Same value as `SUPABASE_URL` above |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key — safe for browser use, respects RLS policies | Supabase Dashboard → Project Settings → API → **anon** key |
| `NEXT_PUBLIC_API_URL` | FastAPI backend base URL | `http://127.0.0.1:8000` locally, or your deployed backend URL |

---

## Database setup

In your [Supabase SQL editor](https://supabase.com/dashboard/project/_/sql), paste and run:

```
backend/db/migrations/001_persona_circle_cluster_checklist.sql
```

This migration creates and configures:

| Table | Purpose |
|-------|---------|
| `user_personas` | Per-user EMA vectors, stage, stressor distribution, cluster assignment |
| `persona_entries` | Append-only log of every processed memo (for audit and trajectory analysis) |
| `circles` | Circle session lifecycle: forming → active → terminated |
| `circle_members` | Per-user membership with stage at join time |
| `active_sessions` | Tracks who is currently in a session. One row per user enforced by primary key. |
| `memories` | Memory Wall entries with stressor distribution vector for similarity retrieval |

It also creates two lightweight SQL helper functions for atomic counter increments:
```sql
increment_message_count(member_row_id uuid)
increment_turn_count(circle_row_id uuid)
```

---

## Verifying the setup

```bash
# Check the backend imports cleanly
cd backend
python -c "import main; print('main ok')"

# Generate a bearer token for Swagger / WebSocket testing
python generate_token.py

# Run the memory wall end-to-end test
python tests/test_memory_wall_pipeline.py

# Hit the health endpoint
curl http://127.0.0.1:8000/health
```

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | System status + active session count |
| `POST` | `/users/onboard` | Create user + encode identity vector |
| `POST` | `/memos/submit` | Submit voice memo or transcript → update persona |
| `GET` | `/users/{user_id}/persona` | Current stage, stress, recovery, stressor profile |
| `POST` | `/circles/request` | "I need help" → form and return a circle |
| `POST` | `/circles/{circle_id}/message` | Send a message to an active circle |
| `POST` | `/circles/{circle_id}/terminate` | End session → generate Memory Wall entry |
| `GET` | `/memory-wall` | Fetch entries ranked by stressor similarity |
| `POST` | `/memory-wall/{entry_id}/helpful` | Mark an entry as helpful |

Full interactive docs available at `/docs` when the backend is running.

---

## Running the demo (no API keys or server needed)

To see the full system — persona building, circle formation, conversation, termination, and Memory Wall retrieval — run in one command:

```bash
cd backend
python run_demo.py
```

This simulates 5 users with distinct profiles (crisis, finding ground, recovery) submitting 32 voice memos, forming a circle, having a conversation, and generating a Memory Wall entry — all with mock extractors. Nothing is written to any database.

---

## How the persona system works

```
Voice memo
    │
    ├─ wav2vec2-base (frozen)
    │   └─ 768-dim embedding → PCA → 64-dim acoustic vector
    │
    └─ Gemini (structured JSON extraction)
        └─ 16 emotional/linguistic scores
                │
                ┌──────────────────────────────────────────────┐
                │  Persona Engine — dual EMA update            │
                │                                              │
                │  acoustic_short  (α=0.50, reacts fast)       │
                │  acoustic_long   (α=0.15, stable baseline)   │
                │  linguistic_short                            │
                │  linguistic_long                             │
                │  identity vector (demographics, fixed)       │
                │  behavioral      (streak, time, length)      │
                └──────────────────┬───────────────────────────┘
                                   │
                          Stage classifier
                          ┌─────────────────────┐
                          │ In the storm        │  stress > 0.65, not improving
                          │ Finding ground      │  default
                          │ Through it          │  recovery > 0.60
                          └─────────────────────┘
                                   │
                     Inertia gate: ~7 consistent entries
                     to transition. Acute crisis (stress > 0.85)
                     overrides immediately.
```

---

## Security

- `SUPABASE_SERVICE_ROLE_KEY` bypasses Supabase RLS and is only ever used server-side in the FastAPI backend. It is never set in the frontend or exposed to the browser.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally public — it is safe to expose and only grants access subject to your RLS policies.
- Circle conversations are anonymised before any LLM call — user IDs are replaced with stage role labels (*In the storm*, *Finding ground*, *Through it*). No raw transcripts are stored permanently.
- The Memory Wall LLM prompt explicitly instructs the model to extract only positive insights. Crisis details and raw pain are filtered at the source.
- Add `.env` and `.env.local` to `.gitignore` before your first commit. Rotate any keys that are accidentally committed.

---

## Deployment

The backend is a standard ASGI application. Deploy to Railway, Render, Fly.io, or any platform that runs:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The frontend is a standard Next.js app. Deploy to Vercel with zero configuration — point it at your repo and set the env variables in the Vercel dashboard.

The HDBSCAN clustering job (`backend/db/cluster_job.py`) should run periodically — every few hours is sufficient. Use a pg_cron job in Supabase, a Supabase Edge Function cron trigger, or a scheduled task on your deployment platform.

---

*Built at [Hackathon name] · [Date] · Team: [Your names]*

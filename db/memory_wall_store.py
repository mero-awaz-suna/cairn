"""
cairn/db/memory_wall_store.py

Memory Wall store — owns the full lifecycle of a memory wall entry.

Lifecycle:
    1. Circle closes (last member leaves via circles.py)
    2. circles.py calls MemoryWallStore.process_closed_circle(circle_id)
    3. Store fetches all messages for that circle from the DB
    4. Formats them anonymously (alias + role, no user_ids)
    5. Calls Gemini to extract ONLY positive insights
    6. Persists the result to memory_wall_entries
    7. Future users call get_relevant() to browse entries ranked by
       cosine similarity to their own stressor distribution

What is stored:
    - headline       — one sentence: what the circle unlocked
    - insights       — 2–4 bullet points (positive only)
    - stressor_dist  — 8-dim float array for similarity retrieval
    - primary_stressor — dominant stressor label for UI filter pills

What is NOT stored:
    - Raw message text (discarded after summarization — privacy)
    - Any user identifiers (aliases only during summarization)
    - Negative content, crisis details, raw pain

Run memory_wall_migration.sql in Supabase before using this module.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Optional

try:
    import google.generativeai as genai
except ModuleNotFoundError:
    genai = None
import numpy as np
from supabase import Client

from persona.core.models import StressorType

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# LLM config
# ─────────────────────────────────────────────────────────────────────────────

_LLM_MODEL = os.environ.get("GOOGLE_API_KEY", "gemini-1.5-flash")
_MAX_TOKENS = 600

_SUMMARIZATION_PROMPT = """\
You are extracting positive insights from an anonymous peer support circle conversation.

STRICT RULES:
1. Extract ONLY what was helpful, what shifted, what gave hope or relief.
2. Ignore and never mention: crisis details, raw pain, negative moments, identifying info.
3. Write in third person, past tense: "Someone shared...", "The circle found...", "A member noticed..."
4. If there are NO positive insights in the conversation, return an empty insights list.
5. The ai_safety_score must reflect how safe this content is to show to vulnerable users:
   1.0 = completely safe, 0.0 = unsafe (contains triggering or harmful content).
6. Return ONLY valid JSON — no markdown fences, no preamble.

JSON schema:
{{
  "headline": "<one sentence — what this circle unlocked, max 15 words>",
  "insights": [
    "<concrete, actionable insight, max 20 words>",
    "<concrete, actionable insight, max 20 words>"
  ],
  "primary_stressor": "<exactly one of: work_pressure | career_uncertainty | relationships | identity | finances | health | isolation | loss>",
  "stressor_dist": [<8 floats summing to 1.0, one per stressor in the order above>],
  "ai_safety_score": <float 0.0–1.0>
}}

Conversation (aliases only, no real names):
{conversation}
"""

_STRESSOR_ORDER = [s.value for s in StressorType]


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _format_conversation(messages: list[dict]) -> str:
    """
    Format DB message rows into an anonymized transcript for the LLM.
    Uses alias + role only — no user_ids, no timestamps.
    Skips facilitator and crisis-resource messages.
    """
    lines = []
    for msg in messages:
        if msg.get("is_facilitator_msg") or msg.get("is_crisis_resource"):
            continue
        alias = msg.get("alias") or msg.get("anonymous_alias") or "Member"
        role = msg.get("role") or msg.get("role_label") or ""
        label = f"{alias} ({role})" if role else alias
        content = (msg.get("content") or "").strip()
        if content and content != "[Voice message]":
            lines.append(f"{label}: {content}")

    if not lines:
        return "(No conversation recorded)"
    return "\n".join(lines)


def _parse_llm_response(raw: str) -> dict:
    """Parse and validate the LLM JSON response. Returns {} on any error."""
    try:
        clean = raw.strip().replace("```json", "").replace("```", "").strip()
        data = json.loads(clean)

        # Validate stressor_dist shape
        dist = data.get("stressor_dist", [])
        if len(dist) != 8:
            logger.warning("stressor_dist length %d != 8, using uniform", len(dist))
            data["stressor_dist"] = [1 / 8] * 8
        else:
            # Renormalize in case of floating point drift
            total = sum(dist)
            data["stressor_dist"] = (
                [v / total for v in dist] if total > 1e-9 else [1 / 8] * 8
            )

        # Clamp safety score
        score = data.get("ai_safety_score", 1.0)
        data["ai_safety_score"] = float(max(0.0, min(1.0, score)))

        # Must have at least a headline
        if not data.get("headline"):
            return {}

        return data

    except Exception as exc:
        logger.error("Failed to parse LLM response: %s | raw=%s", exc, raw[:200])
        return {}


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two equal-length float lists."""
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom < 1e-9:
        return 0.0
    return float(np.dot(va, vb) / denom)


# ─────────────────────────────────────────────────────────────────────────────
# MemoryWallStore
# ─────────────────────────────────────────────────────────────────────────────


class MemoryWallStore:
    """
    Manages the full Memory Wall lifecycle.

    All DB reads/writes go through supabase-py.
    LLM calls use the Gemini Python SDK.

    Usage (called from circles.py when circle closes):
        store = MemoryWallStore(supabase_client)
        entry = store.process_closed_circle(circle_id)

    Usage (called from a /memory-wall GET route):
        entries = store.get_relevant(user_stressor_dist, top_k=10)
    """

    # Minimum messages needed to attempt summarization.
    # Conversations shorter than this are too thin to yield real insights.
    MIN_MESSAGES = 4

    def __init__(self, supabase: Client):
        self.db = supabase
        if genai is None:
            raise RuntimeError("google-generativeai package is not installed")

        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set")

        genai.configure(api_key=api_key)
        self._llm = genai.GenerativeModel(_LLM_MODEL)

    # ── Public: trigger on circle close ──────────────────────────────────────

    def process_closed_circle(self, circle_id: str) -> Optional[dict]:
        """
        Full pipeline: fetch → format → summarize → persist.

        Called automatically when the last member leaves a circle.
        Returns the saved DB row on success, None if skipped or failed.

        Reasons to return None (non-fatal):
            - Fewer than MIN_MESSAGES messages in the circle
            - LLM extracted no positive insights
            - Any unhandled exception (logged, not re-raised)
        """
        try:
            return self._process(circle_id)
        except Exception as exc:
            logger.exception(
                "MemoryWallStore.process_closed_circle failed for circle=%s: %s",
                circle_id,
                exc,
            )
            return None

    # ── Public: retrieve for a user ───────────────────────────────────────────

    def get_relevant(
        self,
        user_stressor_dist: list[float],
        top_k: int = 10,
        min_similarity: float = 0.25,
        filter_stressor: Optional[str] = None,
    ) -> list[dict]:
        """
        Retrieve approved Memory Wall entries ranked by stressor similarity.

        Args:
            user_stressor_dist: 8-float list from user_personas.stressor_dist
            top_k:              max entries to return
            min_similarity:     cosine similarity floor (0.25 default)
            filter_stressor:    optional — only return entries with this
                                primary_stressor (for UI filter pills)

        Returns:
            List of entry dicts sorted by similarity desc, each with an added
            "similarity" key. Empty list on any DB error.
        """
        try:
            return self._retrieve(
                user_stressor_dist, top_k, min_similarity, filter_stressor
            )
        except Exception as exc:
            logger.error("MemoryWallStore.get_relevant failed: %s", exc)
            return []

    def mark_helpful(self, entry_id: str) -> bool:
        """
        Increment helpful_count for an entry.
        Returns True on success. Called when a user taps the helpful button.
        """
        try:
            row = (
                self.db.table("memory_wall_entries")
                .select("helpful_count")
                .eq("id", entry_id)
                .single()
                .execute()
            )
            current = (row.data or {}).get("helpful_count", 0)
            self.db.table("memory_wall_entries").update(
                {"helpful_count": current + 1}
            ).eq("id", entry_id).execute()
            return True
        except Exception as exc:
            logger.error("mark_helpful failed entry=%s: %s", entry_id, exc)
            return False

    # ── Private: core pipeline ────────────────────────────────────────────────

    def _process(self, circle_id: str) -> Optional[dict]:

        # Step 1: Fetch messages
        messages = self._fetch_messages(circle_id)
        if len(messages) < self.MIN_MESSAGES:
            logger.info(
                "Circle %s has only %d messages (min=%d) — skipping memory wall.",
                circle_id,
                len(messages),
                self.MIN_MESSAGES,
            )
            return None

        # Step 2: Format conversation (anonymized)
        conversation_text = _format_conversation(messages)
        if conversation_text == "(No conversation recorded)":
            logger.info(
                "Circle %s: no usable messages after filtering — skipping.", circle_id
            )
            return None

        logger.info(
            "Summarizing circle=%s (%d messages, %d chars)",
            circle_id,
            len(messages),
            len(conversation_text),
        )

        # Step 3: LLM summarization
        summary = self._call_llm(conversation_text)
        if not summary:
            logger.info(
                "Circle %s: LLM returned no positive insights — skipping.", circle_id
            )
            return None

        # Step 4: Fetch circle metadata (cultural context, primary burden)
        circle_meta = self._fetch_circle_meta(circle_id)

        # Step 5: Persist
        entry = self._save_entry(circle_id, summary, circle_meta)
        logger.info(
            "Memory wall entry saved: id=%s circle=%s stressor=%s safety=%.2f",
            entry.get("id"),
            circle_id,
            summary.get("primary_stressor"),
            summary.get("ai_safety_score", 1.0),
        )
        return entry

    # ── Private: DB reads ─────────────────────────────────────────────────────

    def _fetch_messages(self, circle_id: str) -> list[dict]:
        """
        Fetch all messages for a circle, joined with circle_members for aliases.
        Ordered chronologically.
        """
        resp = (
            self.db.table("messages")
            .select(
                "id, content, is_facilitator_msg, is_crisis_resource, "
                "circle_members(anonymous_alias, role_label)"
            )
            .eq("circle_id", circle_id)
            .order("created_at", desc=False)
            .execute()
        )
        rows = resp.data or []

        # Flatten member fields
        out = []
        for row in rows:
            member = row.pop("circle_members", None) or {}
            row["alias"] = member.get("anonymous_alias", "Member")
            row["role"] = member.get("role_label", "")
            out.append(row)
        return out

    def _fetch_circle_meta(self, circle_id: str) -> dict:
        """Fetch cultural_context and primary_burden_tag from circles row."""
        try:
            resp = (
                self.db.table("circles")
                .select("cultural_context, primary_burden_tag")
                .eq("id", circle_id)
                .single()
                .execute()
            )
            return resp.data or {}
        except Exception:
            return {}

    # ── Private: LLM ─────────────────────────────────────────────────────────

    def _call_llm(self, conversation_text: str) -> dict:
        """
        Call Gemini to extract positive insights.
        Returns parsed dict or {} on failure.
        """
        prompt = _SUMMARIZATION_PROMPT.format(conversation=conversation_text)
        try:
            response = self._llm.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.2,
                    "max_output_tokens": _MAX_TOKENS,
                },
            )

            raw = getattr(response, "text", None)
            if not raw:
                raw = ""
                for cand in getattr(response, "candidates", []) or []:
                    parts = getattr(getattr(cand, "content", None), "parts", []) or []
                    for part in parts:
                        text = getattr(part, "text", None)
                        if text:
                            raw += text

            result = _parse_llm_response(raw)

            # Skip if no real insights extracted
            if not result or not result.get("insights"):
                return {}

            return result

        except Exception as exc:
            logger.error("LLM call failed: %s", exc)
            return {}

    # ── Private: DB write ─────────────────────────────────────────────────────

    def _save_entry(
        self,
        circle_id: str,
        summary: dict,
        circle_meta: dict,
    ) -> dict:
        """Insert a new memory_wall_entries row and return it."""
        row = {
            "source_circle_id": circle_id,
            "primary_stressor": summary.get("primary_stressor", ""),
            "headline": summary.get("headline", ""),
            "insights": summary.get("insights", []),
            "stressor_dist": summary.get("stressor_dist", [1 / 8] * 8),
            "ai_safety_score": summary.get("ai_safety_score", 1.0),
            "is_approved": True,  # auto-approve per product decision
            "helpful_count": 0,
            "cultural_context": circle_meta.get("cultural_context"),
        }
        resp = self.db.table("memory_wall_entries").insert(row).execute()
        return resp.data[0] if resp.data else row

    # ── Private: retrieval ────────────────────────────────────────────────────

    def _retrieve(
        self,
        user_stressor_dist: list[float],
        top_k: int,
        min_similarity: float,
        filter_stressor: Optional[str],
    ) -> list[dict]:
        """
        Load approved entries, score by cosine similarity, return top_k.
        Filtering by primary_stressor happens in the DB query if provided.
        """
        query = (
            self.db.table("memory_wall_entries")
            .select(
                "id, headline, insights, primary_stressor, "
                "stressor_dist, helpful_count, cultural_context, created_at"
            )
            .eq("is_approved", True)
        )

        if filter_stressor:
            query = query.eq("primary_stressor", filter_stressor)

        resp = query.execute()
        rows = resp.data or []

        # Score each entry
        scored: list[tuple[float, dict]] = []
        for row in rows:
            dist = row.get("stressor_dist") or []
            if isinstance(dist, str):
                try:
                    dist = json.loads(dist)
                except Exception:
                    dist = []
            if len(dist) != 8:
                continue

            sim = _cosine_similarity(user_stressor_dist, dist)
            if sim >= min_similarity:
                row["similarity"] = round(sim, 4)
                scored.append((sim, row))

        # Sort: similarity desc, helpful_count as tiebreaker
        scored.sort(key=lambda x: (x[0], x[1].get("helpful_count", 0)), reverse=True)
        return [row for _, row in scored[:top_k]]

"""
cairn/core/memory_wall.py

Memory Wall — real positive insights from real past circles.

Lifecycle:
    1. Circle session ends (requester calls terminate)
    2. MemoryWallEngine.process_termination(circle) is called
    3. LLM extracts only the positive insights from the conversation
    4. MemoryWallEntry stored with requester's stressor_dist for retrieval
    5. Future users view entries ranked by stressor similarity to their own

What is stored:
    - A headline (one sentence: what the circle unlocked)
    - 2–4 bullet insights (positive only — what helped, what shifted)
    - The stressor distribution of the originating circle (for matching)
    - Primary stressor label (for UI filtering)

What is NOT stored:
    - Raw conversation text (privacy — discarded after summarization)
    - User identities (fully anonymous)
    - Any negative content, crisis details, or raw pain
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.models import Circle, MemoryWallEntry, StressorType
from core.utils import cosine_similarity

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# In-memory store (replace with DB in production)
# ─────────────────────────────────────────────────────────────────────────────


class MemoryWallStore:
    """
    Simple in-memory store for hackathon.
    In production: swap this for a Postgres table or Redis sorted set.
    Interface stays identical.
    """

    def __init__(self):
        self._entries: list[MemoryWallEntry] = []

    def save(self, entry: MemoryWallEntry) -> None:
        self._entries.append(entry)
        logger.info(
            "Memory wall entry saved: id=%s stressor=%s",
            entry.entry_id,
            entry.primary_stressor,
        )

    def get_all(self) -> list[MemoryWallEntry]:
        return list(self._entries)

    def get_by_id(self, entry_id: str) -> Optional[MemoryWallEntry]:
        return next((e for e in self._entries if e.entry_id == entry_id), None)

    def increment_helpful(self, entry_id: str) -> None:
        entry = self.get_by_id(entry_id)
        if entry:
            entry.helpful_count += 1

    def __len__(self) -> int:
        return len(self._entries)


# ─────────────────────────────────────────────────────────────────────────────
# LLM summarization
# ─────────────────────────────────────────────────────────────────────────────

_SUMMARIZATION_PROMPT = """You are extracting positive insights from a support circle conversation.

RULES:
1. Extract ONLY what was helpful, what shifted, what gave hope.
2. No crisis details, no raw pain, no identifying information.
3. Write in the third person, past tense ("Someone shared...", "The circle found...").
4. If the conversation has no positive insights, return empty insights list.

Return ONLY valid JSON, no markdown:
{{
  "headline": "one sentence — what this circle unlocked (max 15 words)",
  "insights": [
    "insight 1 — concrete and actionable (max 20 words)",
    "insight 2 — concrete and actionable (max 20 words)"
  ],
  "primary_stressor": "one of: work_pressure, career_uncertainty, relationships, identity, finances, health, isolation, loss"
}}

Conversation:
{conversation}
"""


def _format_conversation(circle: Circle) -> str:
    """Format conversation turns for the LLM prompt."""
    if not circle.conversation_turns:
        return "(No conversation recorded)"
    lines = []
    for i, turn in enumerate(circle.conversation_turns):
        # Anonymize: replace user_id with role
        member = next(
            (m for m in circle.members if m.user_id == turn.get("user_id")), None
        )
        role = member.stage.value if member else "Member"
        lines.append(f"{role}: {turn.get('text', '')}")
    return "\n".join(lines)


def _call_llm_for_summary(conversation_text: str, use_mock: bool = False) -> dict:
    """
    Call LLM to extract positive insights.
    Returns parsed JSON dict or empty fallback.
    """
    if use_mock:
        return _mock_summary(conversation_text)

    try:
        import anthropic

        client = anthropic.Anthropic()
        response = client.messages.create(
            model=CONFIG_LLM_MODEL,
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": _SUMMARIZATION_PROMPT.format(
                        conversation=conversation_text
                    ),
                }
            ],
        )
        raw = response.content[0].text.strip()
        clean = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)

    except Exception as e:
        logger.error("LLM summarization failed: %s", e)
        return {}


CONFIG_LLM_MODEL = "claude-sonnet-4-20250514"


def _mock_summary(conversation_text: str) -> dict:
    """Deterministic mock summary for testing."""
    seed = hash(conversation_text) % (2**31)
    rng = __import__("numpy").random.RandomState(seed)

    stressors = [s.value for s in StressorType]
    primary = stressors[rng.randint(0, len(stressors))]

    mock_insights = [
        "Reframing the question from 'how do I fix this' to 'what am I learning' shifted the pressure.",
        "Naming the feeling out loud made it smaller — the circle found that language reduces overwhelm.",
        "Someone shared that progress comes from movement, not from having everything figured out.",
        "Setting one small boundary created unexpected relief and a sense of agency.",
        "The circle discovered that reaching out was itself an act of recovery.",
    ]
    chosen = rng.choice(
        mock_insights, size=min(3, len(mock_insights)), replace=False
    ).tolist()

    return {
        "headline": f"Circle found clarity around {primary.replace('_', ' ')}",
        "insights": chosen[:2],
        "primary_stressor": primary,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Memory Wall engine
# ─────────────────────────────────────────────────────────────────────────────


class MemoryWallEngine:
    """
    Processes terminated circles into Memory Wall entries,
    and retrieves relevant entries for a given user.

    Usage:
        engine = MemoryWallEngine(store=MemoryWallStore(), use_mock=True)

        # At circle termination:
        entry = engine.process_termination(circle)

        # When user opens Memory Wall:
        entries = engine.get_relevant(user_stressor_dist, top_k=10)
    """

    def __init__(
        self,
        store: Optional[MemoryWallStore] = None,
        use_mock: bool = False,
    ):
        self.store = store if store is not None else MemoryWallStore()
        self.use_mock = use_mock

    def process_termination(self, circle: Circle) -> Optional[MemoryWallEntry]:
        """
        Called when the requester ends a circle session.

        1. Formats the conversation (anonymized)
        2. LLM extracts positive insights only
        3. Stores the MemoryWallEntry with stressor_dist for future retrieval
        4. Raw conversation is NOT stored — discarded after this call

        Returns the created entry, or None if conversation was empty/failed.
        """
        if not circle.terminated_at:
            logger.warning(
                "process_termination called on active circle %s", circle.circle_id
            )
            circle.terminate()

        if not circle.conversation_turns:
            logger.info(
                "Circle %s had no conversation — skipping memory wall", circle.circle_id
            )
            return None

        conversation_text = _format_conversation(circle)
        summary = _call_llm_for_summary(conversation_text, self.use_mock)

        if not summary or not summary.get("insights"):
            logger.info(
                "No positive insights extracted from circle %s", circle.circle_id
            )
            return None

        # Stressor distribution: use requester's dist if stored, else uniform
        stressor_dist = (
            circle.requester_stressor_dist
            if circle.requester_stressor_dist is not None
            else np.ones(8, dtype=np.float32) / 8.0
        )

        entry = MemoryWallEntry(
            entry_id=uuid.uuid4().hex,
            circle_id=circle.circle_id,
            created_at=time.time(),
            headline=summary.get("headline", ""),
            insights=summary.get("insights", []),
            stressor_dist=stressor_dist,
            primary_stressor=summary.get("primary_stressor", ""),
            helpful_count=0,
        )

        self.store.save(entry)
        return entry

    def get_relevant(
        self,
        user_stressor_dist: np.ndarray,
        top_k: int = 10,
        min_similarity: float = 0.30,
        filter_stressor: Optional[str] = None,
    ) -> list[tuple[MemoryWallEntry, float]]:
        """
        Retrieve the most relevant Memory Wall entries for a user.

        Ranked by cosine similarity between the user's stressor distribution
        and each entry's stressor distribution.

        Args:
            user_stressor_dist: (8,) array — user's current stressor profile
            top_k:              max entries to return
            min_similarity:     minimum similarity threshold (0.30 default)
            filter_stressor:    optional — only return entries with this
                                primary_stressor (for UI filter pills)

        Returns:
            List of (MemoryWallEntry, similarity_score) tuples, sorted by score.
        """
        all_entries = self.store.get_all()

        if not all_entries:
            return []

        scored = []
        for entry in all_entries:
            if filter_stressor and entry.primary_stressor != filter_stressor:
                continue

            sim = cosine_similarity(user_stressor_dist, entry.stressor_dist)
            if sim >= min_similarity:
                scored.append((entry, sim))

        # Sort by similarity descending, then by helpful_count as tiebreaker
        scored.sort(key=lambda x: (x[1], x[0].helpful_count), reverse=True)
        return scored[:top_k]

    def mark_helpful(self, entry_id: str) -> None:
        """Increment helpful count when user taps the helpful button."""
        self.store.increment_helpful(entry_id)

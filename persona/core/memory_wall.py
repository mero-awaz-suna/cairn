"""
cairn/core/memory_wall.py

Memory Wall engine — public API for the rest of the codebase.

This module is now a thin orchestration layer. All DB I/O and LLM calls
live in db/memory_wall_store.py. Import MemoryWallStore directly if you
need the low-level methods.

Public surface:
    on_circle_closed(circle_id)          — call from circles.py leave endpoint
    get_wall_for_user(user_id, ...)      — call from a /memory-wall GET route
    mark_helpful(entry_id)               — call from a /memory-wall/helpful POST route

Trigger point (circles.py → this module):

    from core.memory_wall import on_circle_closed

    # Inside the leave endpoint, after _maybe_close_circle():
    if circle_was_just_closed:
        on_circle_closed(circle_id)
"""

from __future__ import annotations

import logging
from typing import Optional, TYPE_CHECKING

from auth import supabase

if TYPE_CHECKING:
    from db.memory_wall_store import MemoryWallStore

logger = logging.getLogger(__name__)

# Single shared instance, initialized lazily so missing optional deps
# (e.g. Gemini package / API key) don't crash API startup.
_store: Optional["MemoryWallStore"] = None
_store_init_error: Optional[str] = None


def _get_store() -> Optional["MemoryWallStore"]:
    global _store, _store_init_error
    if _store is not None:
        return _store
    if _store_init_error is not None:
        return None

    try:
        from db.memory_wall_store import MemoryWallStore

        _store = MemoryWallStore(supabase)
        return _store
    except Exception as exc:
        _store_init_error = str(exc)
        logger.error("Memory wall disabled: %s", exc)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Trigger: called when a circle closes
# ─────────────────────────────────────────────────────────────────────────────


def on_circle_closed(circle_id: str) -> Optional[dict]:
    """
    Entry point called by circles.py when the last member leaves.

    Fetches the full conversation, runs Gemini summarization,
    and writes a new memory_wall_entries row.

    Returns the saved entry dict on success, None if skipped.
    Never raises — all errors are caught and logged.

    Usage in circles.py:
        from core.memory_wall import on_circle_closed
        ...
        def _maybe_close_circle(circle_id: str) -> bool:
            # existing close logic ...
            if circle_was_closed:
                on_circle_closed(circle_id)   # ← add this line
                return True
            return False
    """
    store = _get_store()
    if store is None:
        logger.warning(
            "Memory wall skipped for circle=%s: store unavailable (%s)",
            circle_id,
            _store_init_error,
        )
        return None

    logger.info("Memory wall: processing closed circle=%s", circle_id)
    entry = store.process_closed_circle(circle_id)
    if entry:
        logger.info(
            "Memory wall entry created: id=%s stressor=%s",
            entry.get("id"),
            entry.get("primary_stressor"),
        )
    else:
        logger.info("Memory wall: no entry created for circle=%s", circle_id)
    return entry


# ─────────────────────────────────────────────────────────────────────────────
# Retrieval: called from a GET /memory-wall route
# ─────────────────────────────────────────────────────────────────────────────


def get_wall_for_user(
    user_id: str,
    top_k: int = 10,
    min_similarity: float = 0.25,
    filter_stressor: Optional[str] = None,
) -> list[dict]:
    """
    Return the most relevant Memory Wall entries for a user.

    Loads the user's stressor_dist from user_personas, then delegates
    to MemoryWallStore.get_relevant() for cosine-similarity ranking.

    Args:
        user_id:          UUID string of the requesting user
        top_k:            max entries to return (default 10)
        min_similarity:   cosine similarity floor (default 0.25)
        filter_stressor:  optional stressor key for UI filter pills
                          e.g. "career_uncertainty", "isolation"

    Returns:
        List of entry dicts, each with a "similarity" float added.
        Empty list if user has no persona or on any error.
    """
    stressor_dist = _load_user_stressor_dist(user_id)
    if stressor_dist is None:
        logger.warning(
            "get_wall_for_user: no stressor_dist for user=%s — returning empty", user_id
        )
        return []

    store = _get_store()
    if store is None:
        logger.warning("get_wall_for_user: store unavailable (%s)", _store_init_error)
        return []

    return store.get_relevant(
        user_stressor_dist=stressor_dist,
        top_k=top_k,
        min_similarity=min_similarity,
        filter_stressor=filter_stressor,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Engagement: helpful button
# ─────────────────────────────────────────────────────────────────────────────


def mark_helpful(entry_id: str) -> bool:
    """
    Increment the helpful_count for a Memory Wall entry.
    Returns True on success, False on failure.
    """
    store = _get_store()
    if store is None:
        logger.warning("mark_helpful: store unavailable (%s)", _store_init_error)
        return False
    return store.mark_helpful(entry_id)


# ─────────────────────────────────────────────────────────────────────────────
# Private helpers
# ─────────────────────────────────────────────────────────────────────────────


def _load_user_stressor_dist(user_id: str) -> Optional[list[float]]:
    """
    Load stressor_dist from user_personas for a given user.
    Returns an 8-float list, or None if the row doesn't exist or is malformed.
    """
    try:
        import json

        resp = (
            supabase.table("user_personas")
            .select("stressor_dist")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        raw = (resp.data or {}).get("stressor_dist")
        if raw is None:
            return None

        if isinstance(raw, str):
            raw = json.loads(raw)

        dist = [float(v) for v in raw]
        if len(dist) != 8:
            logger.warning(
                "stressor_dist for user=%s has length %d, expected 8",
                user_id,
                len(dist),
            )
            return None

        total = sum(dist)
        if total < 1e-9:
            return [1 / 8] * 8  # uniform fallback
        return [v / total for v in dist]

    except Exception as exc:
        logger.error("_load_user_stressor_dist failed user=%s: %s", user_id, exc)
        return None

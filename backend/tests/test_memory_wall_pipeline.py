"""Simple integration test for memory wall creation with dummy chat data.

Flow:
1) Insert a dummy circle row.
2) Insert demo chat messages for that circle.
3) Call MemoryWallStore.process_closed_circle(circle_id).
4) Verify a memory_wall_entries row is persisted.

Usage:
    py tests/test_memory_wall_pipeline.py

Optional env:
    CAIRN_TEST_CLEANUP=true   # delete inserted rows after test (default: false)
"""

from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from auth import supabase
from db.memory_wall_store import MemoryWallStore


CLEANUP_AFTER_TEST = os.getenv("CAIRN_TEST_CLEANUP", "false").lower() == "true"


def _assert_ok(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _create_dummy_circle() -> str:
    circle_id = str(uuid.uuid4())

    # target_size must satisfy circles_target_size_check (3..6).
    supabase.table("circles").insert(
        {
            "id": circle_id,
            "target_size": 3,
            "primary_burden_tag": "isolation",
            "status": "closed",
            "formed_at": None,
            "facilitator_state": {},
            "intervention_count": 0,
            "crisis_triggered": False,
        }
    ).execute()

    return circle_id


def _seed_demo_messages(circle_id: str) -> None:
    rows = [
        {
            "circle_id": circle_id,
            "member_id": None,
            "content": "I slept better after setting a wind-down routine.",
            "sender_type": "user",
            "is_facilitator_msg": False,
            "is_crisis_resource": False,
        },
        {
            "circle_id": circle_id,
            "member_id": None,
            "content": "Journaling at night made tomorrow feel less overwhelming.",
            "sender_type": "user",
            "is_facilitator_msg": False,
            "is_crisis_resource": False,
        },
        {
            "circle_id": circle_id,
            "member_id": None,
            "content": "A short walk between tasks helped me reset.",
            "sender_type": "user",
            "is_facilitator_msg": False,
            "is_crisis_resource": False,
        },
        {
            "circle_id": circle_id,
            "member_id": None,
            "content": "I can ask a friend for check-ins this week.",
            "sender_type": "user",
            "is_facilitator_msg": False,
            "is_crisis_resource": False,
        },
    ]
    supabase.table("messages").insert(rows).execute()


def _build_store_with_mocked_summary() -> MemoryWallStore:
    os.environ.setdefault("GEMINI_API_KEY", "test-key")
    store = MemoryWallStore(supabase)

    def _mock_call_llm(_conversation_text: str) -> dict:
        return {
            "headline": "Members found practical routines that reduced overwhelm.",
            "insights": [
                "Someone used a wind-down routine to improve sleep consistency.",
                "A member used short walks to reset between tasks.",
            ],
            "primary_stressor": "isolation",
            "stressor_dist": [0.05, 0.05, 0.1, 0.05, 0.05, 0.1, 0.5, 0.1],
            "ai_safety_score": 0.98,
        }

    store._call_llm = _mock_call_llm  # type: ignore[method-assign]
    return store


def _cleanup(circle_id: str) -> None:
    # Best-effort cleanup to keep DB tidy across repeated test runs.
    try:
        supabase.table("memory_wall_entries").delete().eq(
            "source_circle_id", circle_id
        ).execute()
    except Exception:
        pass
    try:
        supabase.table("messages").delete().eq("circle_id", circle_id).execute()
    except Exception:
        pass
    try:
        supabase.table("circles").delete().eq("id", circle_id).execute()
    except Exception:
        pass


def test_memory_wall_with_dummy_chat() -> None:
    circle_id = _create_dummy_circle()
    _seed_demo_messages(circle_id)
    store = _build_store_with_mocked_summary()

    try:
        summary = store.process_closed_circle(circle_id)
        _assert_ok(summary is not None, "memory wall summary was not created")

        row_resp = (
            supabase.table("memory_wall_entries")
            .select("id, source_circle_id, headline, insights, created_at")
            .eq("source_circle_id", circle_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = row_resp.data or []
        _assert_ok(bool(rows), "memory wall entry was not inserted into DB")

        entry = rows[0]
        _assert_ok(
            bool(entry.get("headline")), f"memory wall headline missing: {entry}"
        )
        _assert_ok(
            bool(entry.get("insights")), f"memory wall insights missing: {entry}"
        )

        print("PASS: dummy chat memory wall pipeline validated")
        print(f"circle_id={circle_id}")
        print(f"memory_wall_entry_id={entry.get('id')}")
        if CLEANUP_AFTER_TEST:
            print("cleanup_mode=enabled")
        else:
            print("cleanup_mode=disabled (rows kept for DB inspection)")

    finally:
        if CLEANUP_AFTER_TEST:
            _cleanup(circle_id)


if __name__ == "__main__":
    test_memory_wall_with_dummy_chat()

"""
Integration test for cluster creation and circle formation.

Flow covered:
1) Read existing persona_state payloads.
2) Sync them into user_personas rows required by ClusterStore/CircleStore.
3) Run cluster job.
4) Form one circle from the clustered pool.

Usage:
    python tests/test_cluster_and_circle_flow.py

Prerequisites:
- Database has persona_state rows (for example from test_user_persona_flow.py).
- Required tables exist: user_personas, clusters, circles, circle_members.
"""

from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone
from typing import Any
from pathlib import Path

# Allow running this file directly: `py tests/test_cluster_and_circle_flow.py`
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from auth import supabase
from db.circle_store import CircleStore
from db.cluster_store import ClusterStore


MIN_ENTRY_COUNT = int(os.getenv("CAIRN_CLUSTER_MIN_ENTRY_COUNT", "3"))
REQUESTER_USER_ID = os.getenv("CAIRN_REQUESTER_USER_ID")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_timestamptz(value: Any) -> str:
    """Normalize epoch/iso/None into an ISO-8601 UTC timestamp string."""
    if value is None:
        return _now_iso()

    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc).isoformat()

    if isinstance(value, str):
        # Already timestamp-like; keep as is.
        return value

    return _now_iso()


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _load_persona_state_rows(limit: int = 200) -> list[dict[str, Any]]:
    result = (
        supabase.table("persona_state")
        .select("user_id, persona_payload")
        .limit(limit)
        .execute()
    )
    return result.data or []


def _sync_persona_payload_to_user_personas(row: dict[str, Any]) -> None:
    payload = row.get("persona_payload") or {}
    demographics = payload.get("demographics") or {}
    vectors = payload.get("vectors") or {}
    baseline = payload.get("baseline") or {}
    stage = payload.get("stage") or {}

    user_row = {
        "user_id": payload.get("user_id") or row.get("user_id"),
        "age_group": demographics.get("age_group", "early_20s"),
        "occupation": demographics.get("occupation", "other"),
        "industry": demographics.get("industry", "unknown"),
        "language_code": demographics.get("language_code", "en"),
        "region_code": demographics.get("region_code", "US"),
        "living_situation": demographics.get("living_situation", "alone"),
        "acoustic_short": vectors.get("acoustic_short", []),
        "acoustic_long": vectors.get("acoustic_long", []),
        "linguistic_short": vectors.get("linguistic_short", []),
        "linguistic_long": vectors.get("linguistic_long", []),
        "identity_vec": vectors.get("identity", []),
        "behavioral": vectors.get("behavioral", []),
        "baseline_mean": baseline.get("feature_mean", []),
        "baseline_std": baseline.get("feature_std", []),
        "baseline_n_samples": int(baseline.get("n_samples", 0)),
        "stage": stage.get("current", "Finding ground"),
        "stage_confidence": float(stage.get("confidence", 0.5)),
        "stressor_dist": payload.get("stressor_dist", []),
        "cluster_id": payload.get("cluster_id"),
        "entry_count": int(payload.get("entry_count", 0)),
        "last_entry_at": _to_timestamptz(payload.get("last_entry_time")),
        "is_available": bool(payload.get("is_available", False)),
        "updated_at": _now_iso(),
    }

    supabase.table("user_personas").upsert(user_row, on_conflict="user_id").execute()


def _free_user_from_active_circle(user_id: str) -> None:
    # Ensure requester is not blocked by active membership when test runs repeatedly.
    supabase.table("circle_members").update({"left_at": _now_iso()}).eq(
        "user_id", user_id
    ).is_("left_at", "null").execute()
    supabase.table("users").update({"circle_id": None}).eq("id", user_id).execute()


def test_cluster_then_form_circle() -> None:
    rows = _load_persona_state_rows(limit=500)
    _assert(rows, "No persona_state rows found. Run persona creation test first.")

    # Keep only users with enough signal for clustering.
    eligible_rows = []
    for row in rows:
        payload = row.get("persona_payload") or {}
        if int(payload.get("entry_count", 0)) >= MIN_ENTRY_COUNT:
            eligible_rows.append(row)

    _assert(
        len(eligible_rows) >= 3,
        f"Need at least 3 eligible personas (entry_count>={MIN_ENTRY_COUNT}), got {len(eligible_rows)}",
    )

    for row in eligible_rows:
        _sync_persona_payload_to_user_personas(row)

    cluster_store = ClusterStore(supabase)
    summary = cluster_store.run_cluster_job()
    _assert(not summary.get("error"), f"Cluster job failed: {summary}")
    _assert(
        summary.get("personas_clustered", 0) >= 3,
        f"Cluster job clustered too few personas: {summary}",
    )

    clustered = (
        supabase.table("user_personas")
        .select("user_id, cluster_id, entry_count")
        .gte("entry_count", MIN_ENTRY_COUNT)
        .not_.is_("cluster_id", "null")
        .limit(200)
        .execute()
    )
    clustered_rows = clustered.data or []
    _assert(clustered_rows, "No clustered users found after cluster job.")

    requester = REQUESTER_USER_ID or clustered_rows[0]["user_id"]
    _free_user_from_active_circle(requester)

    circle_store = CircleStore(supabase)
    result = circle_store.form_circle(requester)

    _assert(
        result.success,
        (
            "Circle formation failed: "
            f"reason={result.failure_reason}, pool_size={result.pool_size}, "
            f"candidate_count={result.candidate_count}"
        ),
    )
    _assert(
        result.circle_db_id is not None, "Circle formed but no DB circle_id returned"
    )

    persisted = (
        supabase.table("circles")
        .select("id, status, target_size")
        .eq("id", result.circle_db_id)
        .single()
        .execute()
    )
    _assert(persisted.data is not None, "Circle row was not persisted")

    members = (
        supabase.table("circle_members")
        .select("id", count="exact")
        .eq("circle_id", result.circle_db_id)
        .execute()
    )
    _assert((members.count or 0) >= 3, "Persisted circle has fewer than 3 members")

    print("PASS: cluster job completed and circle formed successfully")
    print(f"cluster_summary={summary}")
    print(
        f"circle_id={result.circle_db_id}, pool_size={result.pool_size}, "
        f"candidate_count={result.candidate_count}, duration_ms={result.duration_ms}"
    )


if __name__ == "__main__":
    test_cluster_then_form_circle()

"""
cairn/core/cluster_store.py

Cluster store — owns everything related to persona clustering.

Responsibilities:
    1. Load all UserPersona objects from Supabase (user_personas table)
    2. Run HDBSCAN clustering via matching.assign_clusters()
    3. Persist cluster assignments back to user_personas and clusters tables
    4. Expose a background scheduler that fires this job every hour

Typical usage (at app startup):
    from core.cluster_store import ClusterStore

    store = ClusterStore(supabase_client)
    store.start_scheduler()          # fires every hour in background
    await store.run_cluster_job()    # also callable manually / on deploy

The scheduler uses APScheduler (no Redis, no Celery — zero extra infra).
Install: pip install apscheduler
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

import numpy as np
from supabase import Client

try:
    from apscheduler.schedulers.background import BackgroundScheduler
except ImportError:
    BackgroundScheduler = None

from persona.core.matching import assign_clusters, build_cluster_input
from persona.core.models import (
    AgeGroup,
    OccupationCategory,
    PersonaBaseline,
    PersonaVectors,
    Stage,
    StageState,
    UserDemographics,
    UserPersona,
    Dims,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers: Supabase row ↔ UserPersona
# ─────────────────────────────────────────────────────────────────────────────

RAW_FEATURE_DIM = 20


def _parse_jsonb_array(value, dim: int) -> np.ndarray:
    """
    Supabase returns JSONB arrays as Python lists (or already-parsed).
    Falls back to zero vector on any parse error.
    """
    try:
        if isinstance(value, str):
            value = json.loads(value)
        arr = np.array(value, dtype=np.float32)
        if arr.shape != (dim,):
            logger.warning("Vector dim mismatch: expected %d got %s", dim, arr.shape)
            return np.zeros(dim, dtype=np.float32)
        return arr
    except Exception:
        return np.zeros(dim, dtype=np.float32)


def row_to_persona(row: dict) -> UserPersona:
    """
    Convert a user_personas table row (dict) into a UserPersona dataclass.
    Missing / malformed fields fall back to safe zero-state defaults.
    """
    user_id = str(row["user_id"])

    # ── Demographics ──────────────────────────────────────────────────────────
    try:
        age_group = AgeGroup(row.get("age_group", "early_20s"))
    except ValueError:
        age_group = AgeGroup.EARLY_20S

    try:
        occupation = OccupationCategory(row.get("occupation", "other"))
    except ValueError:
        occupation = OccupationCategory.OTHER

    demographics = UserDemographics(
        age_group=age_group,
        occupation=occupation,
        industry=row.get("industry", ""),
        language_code=row.get("language_code", "en"),
        region_code=row.get("region_code", "US"),
        living_situation=row.get("living_situation", "alone"),
    )

    # ── Vectors ───────────────────────────────────────────────────────────────
    vectors = PersonaVectors(
        acoustic_short=_parse_jsonb_array(row.get("acoustic_short", []), Dims.ACOUSTIC),
        acoustic_long=_parse_jsonb_array(row.get("acoustic_long", []), Dims.ACOUSTIC),
        linguistic_short=_parse_jsonb_array(
            row.get("linguistic_short", []), Dims.LINGUISTIC
        ),
        linguistic_long=_parse_jsonb_array(
            row.get("linguistic_long", []), Dims.LINGUISTIC
        ),
        identity=_parse_jsonb_array(row.get("identity_vec", []), Dims.IDENTITY),
        behavioral=_parse_jsonb_array(row.get("behavioral", []), Dims.BEHAVIORAL),
    )

    # ── Baseline ──────────────────────────────────────────────────────────────
    baseline = PersonaBaseline(
        feature_mean=_parse_jsonb_array(row.get("baseline_mean", []), RAW_FEATURE_DIM),
        feature_std=_parse_jsonb_array(row.get("baseline_std", []), RAW_FEATURE_DIM),
        n_samples=int(row.get("baseline_n_samples", 0)),
    )

    # ── Stage ─────────────────────────────────────────────────────────────────
    try:
        current_stage = Stage(row.get("stage", Stage.FINDING_GROUND.value))
    except ValueError:
        current_stage = Stage.FINDING_GROUND

    stage = StageState(
        current=current_stage,
        confidence=float(row.get("stage_confidence", 0.5)),
    )

    # ── Stressor dist ─────────────────────────────────────────────────────────
    stressor_dist = _parse_jsonb_array(row.get("stressor_dist", []), Dims.STRESSOR)
    stressor_sum = stressor_dist.sum()
    if stressor_sum > 1e-9:
        stressor_dist = stressor_dist / stressor_sum
    else:
        stressor_dist = np.ones(Dims.STRESSOR, dtype=np.float32) / Dims.STRESSOR

    # ── Assemble ──────────────────────────────────────────────────────────────
    persona = UserPersona(
        user_id=user_id,
        demographics=demographics,
        vectors=vectors,
        baseline=baseline,
        stage=stage,
        stressor_dist=stressor_dist,
        cluster_id=row.get("cluster_id"),
        entry_count=int(row.get("entry_count", 0)),
        last_entry_time=float(
            row.get("last_entry_at") or 0.0
            if not isinstance(row.get("last_entry_at"), str)
            else time.time()  # non-null but unparseable → now
        ),
        is_available=bool(row.get("is_available", False)),
    )

    return persona


# ─────────────────────────────────────────────────────────────────────────────
# ClusterStore
# ─────────────────────────────────────────────────────────────────────────────


class ClusterStore:
    """
    Manages the hourly clustering job.

    Clustering logic (HDBSCAN) lives in matching.assign_clusters().
    This class owns only the DB read/write and job scheduling.

    Thread safety:
        run_cluster_job() is safe to call from the APScheduler thread.
        Supabase-py uses httpx under the hood; each call is independent.
    """

    # Minimum entries a user must have before they're included in clustering.
    # Users with fewer entries land in 'default_pool' which the matching
    # engine handles gracefully.
    MIN_ENTRIES_FOR_CLUSTERING = 3

    def __init__(self, supabase: Client, cluster_interval_minutes: int = 60):
        self.db = supabase
        self._interval = cluster_interval_minutes
        self._scheduler: Optional[Any] = None

    # ── Public API ────────────────────────────────────────────────────────────

    def start_scheduler(self) -> None:
        """
        Start the APScheduler background job.
        Call once at app startup. Safe to call multiple times (no-op if running).
        """
        if BackgroundScheduler is None:
            logger.warning(
                "APScheduler not installed; ClusterStore.start_scheduler() is disabled."
            )
            return

        if self._scheduler and self._scheduler.running:
            logger.info("ClusterStore scheduler already running.")
            return

        self._scheduler = BackgroundScheduler(timezone="UTC")
        self._scheduler.add_job(
            func=self._scheduler_job,
            trigger="interval",
            minutes=self._interval,
            id="cairn_cluster_job",
            replace_existing=True,
            next_run_time=datetime.now(timezone.utc),  # run immediately on start
        )
        self._scheduler.start()
        logger.info("ClusterStore scheduler started — interval=%dm", self._interval)

    def stop_scheduler(self) -> None:
        """Graceful shutdown. Call on app teardown."""
        if self._scheduler and self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            logger.info("ClusterStore scheduler stopped.")

    def run_cluster_job(self) -> dict:
        """
        Run one full clustering cycle synchronously.

        Returns a summary dict:
            {
                "personas_loaded": int,
                "personas_clustered": int,
                "clusters_written": int,
                "skipped_low_entries": int,
                "duration_ms": int,
                "error": str | None,
            }
        """
        t0 = time.perf_counter()
        summary = {
            "personas_loaded": 0,
            "personas_clustered": 0,
            "clusters_written": 0,
            "skipped_low_entries": 0,
            "duration_ms": 0,
            "error": None,
        }

        try:
            # Step 1: Load all personas
            personas = self._load_all_personas()
            summary["personas_loaded"] = len(personas)

            if not personas:
                logger.warning("ClusterJob: no personas found, skipping.")
                return summary

            # Step 2: Filter to users with enough entries
            eligible = [
                p for p in personas if p.entry_count >= self.MIN_ENTRIES_FOR_CLUSTERING
            ]
            summary["skipped_low_entries"] = len(personas) - len(eligible)

            if not eligible:
                logger.warning(
                    "ClusterJob: no eligible personas (all below min_entries=%d).",
                    self.MIN_ENTRIES_FOR_CLUSTERING,
                )
                return summary

            summary["personas_clustered"] = len(eligible)

            # Step 3: Run HDBSCAN clustering
            cluster_map: dict[str, str] = assign_clusters(
                personas=eligible,
                min_cluster_size=5,
            )

            # Step 4: Persist cluster assignments
            unique_clusters = set(cluster_map.values())
            self._upsert_clusters(unique_clusters)
            summary["clusters_written"] = len(unique_clusters)

            self._update_user_cluster_assignments(cluster_map)

            logger.info(
                "ClusterJob complete: %d personas → %d clusters (%d skipped)",
                len(eligible),
                len(unique_clusters),
                summary["skipped_low_entries"],
            )

        except Exception as exc:
            logger.exception("ClusterJob failed: %s", exc)
            summary["error"] = str(exc)

        summary["duration_ms"] = round((time.perf_counter() - t0) * 1000)
        return summary

    # ── DB operations ─────────────────────────────────────────────────────────

    def _load_all_personas(self) -> list[UserPersona]:
        """
        Fetch all rows from user_personas and deserialize to UserPersona objects.
        Loads in pages of 1000 to avoid Supabase's default 1000-row limit.
        """
        personas: list[UserPersona] = []
        page_size = 1000
        offset = 0

        while True:
            response = (
                self.db.table("user_personas")
                .select("*")
                .range(offset, offset + page_size - 1)
                .execute()
            )
            rows = response.data or []
            if not rows:
                break

            for row in rows:
                try:
                    personas.append(row_to_persona(row))
                except Exception as exc:
                    logger.warning(
                        "Skipping malformed persona row user_id=%s: %s",
                        row.get("user_id"),
                        exc,
                    )

            if len(rows) < page_size:
                break  # last page
            offset += page_size

        logger.debug("Loaded %d personas from DB.", len(personas))
        return personas

    def _upsert_clusters(self, cluster_ids: set[str]) -> None:
        """
        Ensure every cluster_id has a row in the clusters table.
        Uses upsert so re-runs are idempotent.
        """
        now = datetime.now(timezone.utc).isoformat()
        rows = [
            {
                "id": cid,
                "name": cid,
                "updated_at": now,
                "metadata": {},
            }
            for cid in cluster_ids
        ]
        if rows:
            self.db.table("clusters").upsert(rows, on_conflict="id").execute()

    def _update_user_cluster_assignments(self, cluster_map: dict[str, str]) -> None:
        """
        Write cluster_id back to user_personas for each user.
        Batches updates in groups of 100 to stay within Supabase limits.
        """
        items = list(cluster_map.items())
        batch_size = 100

        for i in range(0, len(items), batch_size):
            batch = items[i : i + batch_size]
            for user_id, cluster_id in batch:
                try:
                    self.db.table("user_personas").update(
                        {"cluster_id": cluster_id}
                    ).eq("user_id", user_id).execute()
                except Exception as exc:
                    logger.warning(
                        "Failed to update cluster for user_id=%s: %s", user_id, exc
                    )

        logger.debug("Updated cluster assignments for %d users.", len(items))

    # ── Scheduler wrapper (sync, catches all exceptions) ─────────────────────

    def _scheduler_job(self) -> None:
        """Called by APScheduler. Swallows exceptions so the scheduler survives."""
        logger.info("ClusterJob triggered by scheduler.")
        summary = self.run_cluster_job()
        if summary.get("error"):
            logger.error("ClusterJob scheduler run failed: %s", summary["error"])
        else:
            logger.info("ClusterJob scheduler run OK: %s", summary)

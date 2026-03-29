"""
cairn/db/persona_store.py

All Supabase read/write for the persona system.

Two responsibilities:
    1. Serialization — UserPersona (numpy dataclass) ↔ Supabase-safe dict
    2. Storage — load, save, and log entries to Supabase

Nothing in this file knows about FastAPI or HTTP.
The route layer calls these functions and handles HTTP concerns.

Usage:
    store = PersonaStore(supabase_client)

    # At onboarding:
    persona = store.create(user_id, demographics)

    # After pipeline.process():
    store.save(persona, pipeline_result)

    # At request time:
    persona = store.load(user_id)          # returns None if not found
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from persona.core.models import (
    AgeGroup,
    Dims,
    OccupationCategory,
    PersonaBaseline,
    PersonaVectors,
    Stage,
    StageState,
    UserDemographics,
    UserPersona,
)
from persona.core.persona import create_persona
from persona.core.pipeline import PipelineResult

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Serialization helpers — numpy ↔ plain Python
# ─────────────────────────────────────────────────────────────────────────────


def _arr_to_list(arr: np.ndarray) -> list[float]:
    """numpy array → JSON-serializable list of Python floats."""
    return arr.astype(float).tolist()


def _list_to_arr(lst: list, dtype=np.float32) -> np.ndarray:
    """JSON list → numpy array. Returns zeros if list is empty or None."""
    if not lst:
        return np.array([], dtype=dtype)
    return np.array(lst, dtype=dtype)


def _list_to_arr_or_zeros(lst: list, size: int, dtype=np.float32) -> np.ndarray:
    """JSON list → numpy array, falling back to zeros of given size."""
    if not lst or len(lst) != size:
        return np.zeros(size, dtype=dtype)
    return np.array(lst, dtype=dtype)


# ─────────────────────────────────────────────────────────────────────────────
# Persona → Supabase row
# ─────────────────────────────────────────────────────────────────────────────


def persona_to_row(persona: UserPersona) -> dict:
    """
    Serialize a UserPersona into a flat dict suitable for Supabase upsert.
    All numpy arrays become JSON lists. All enums become strings.
    """
    d = persona.demographics
    v = persona.vectors
    b = persona.baseline

    return {
        "user_id": persona.user_id,
        # Demographics
        "age_group": d.age_group.value,
        "occupation": d.occupation.value,
        "industry": d.industry,
        "language_code": d.language_code,
        "region_code": d.region_code,
        "living_situation": d.living_situation,
        # Vectors
        "acoustic_short": _arr_to_list(v.acoustic_short),
        "acoustic_long": _arr_to_list(v.acoustic_long),
        "linguistic_short": _arr_to_list(v.linguistic_short),
        "linguistic_long": _arr_to_list(v.linguistic_long),
        "identity_vec": _arr_to_list(v.identity),
        "behavioral": _arr_to_list(v.behavioral),
        # Baseline
        "baseline_mean": _arr_to_list(b.feature_mean),
        "baseline_std": _arr_to_list(b.feature_std),
        "baseline_n_samples": b.n_samples,
        # Derived — stored flat for matchability
        "stressor_dist": _arr_to_list(persona.stressor_dist),
        "stage": persona.stage.current.value,
        "stage_confidence": round(float(persona.stage.confidence), 4),
        "cluster_id": persona.cluster_id,
        "trajectory_stress": round(float(persona.trajectory_stress), 4),
        "trajectory_recovery": round(float(persona.trajectory_recovery), 4),
        # Metadata
        "entry_count": persona.entry_count,
        "last_entry_at": (
            None
            if persona.last_entry_time == 0.0
            else _unix_to_iso(persona.last_entry_time)
        ),
        "is_available": persona.is_available,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Supabase row → Persona
# ─────────────────────────────────────────────────────────────────────────────


def row_to_persona(row: dict) -> UserPersona:
    """
    Deserialize a Supabase row back into a UserPersona.
    Inverse of persona_to_row().
    """
    demographics = UserDemographics(
        age_group=AgeGroup(row["age_group"]),
        occupation=OccupationCategory(row["occupation"]),
        industry=row["industry"],
        language_code=row["language_code"],
        region_code=row["region_code"],
        living_situation=row["living_situation"],
    )

    vectors = PersonaVectors(
        acoustic_short=_list_to_arr_or_zeros(row.get("acoustic_short"), Dims.ACOUSTIC),
        acoustic_long=_list_to_arr_or_zeros(row.get("acoustic_long"), Dims.ACOUSTIC),
        linguistic_short=_list_to_arr_or_zeros(
            row.get("linguistic_short"), Dims.LINGUISTIC
        ),
        linguistic_long=_list_to_arr_or_zeros(
            row.get("linguistic_long"), Dims.LINGUISTIC
        ),
        identity=_list_to_arr_or_zeros(row.get("identity_vec"), Dims.IDENTITY),
        behavioral=_list_to_arr_or_zeros(row.get("behavioral"), Dims.BEHAVIORAL),
    )

    baseline = PersonaBaseline(
        feature_mean=_list_to_arr_or_zeros(row.get("baseline_mean"), 20),
        feature_std=_list_to_arr_or_zeros(row.get("baseline_std"), 20),
        n_samples=row.get("baseline_n_samples", 0),
    )
    # Ensure std is never zero (safe division in normalization)
    baseline.feature_std = np.maximum(baseline.feature_std, 1e-6)

    stage_state = StageState(
        current=Stage(row.get("stage", Stage.FINDING_GROUND.value)),
        confidence=float(row.get("stage_confidence", 0.5)),
    )

    persona = UserPersona(
        user_id=row["user_id"],
        demographics=demographics,
        vectors=vectors,
        baseline=baseline,
        stage=stage_state,
        stressor_dist=_list_to_arr_or_zeros(row.get("stressor_dist"), Dims.STRESSOR),
        cluster_id=row.get("cluster_id"),
        entry_count=row.get("entry_count", 0),
        last_entry_time=_iso_to_unix(row.get("last_entry_at")),
        is_available=row.get("is_available", False),
    )

    return persona


# ─────────────────────────────────────────────────────────────────────────────
# Entry row — the immutable audit log
# ─────────────────────────────────────────────────────────────────────────────


# Map FastAPI stage values → DB persona_enum values
_STAGE_TO_PERSONA_ENUM = {
    "In the storm": "storm",
    "Finding ground": "ground",
    "Through it": "through_it",
}


def result_to_entry_row(persona: UserPersona, result: PipelineResult) -> dict:
    """
    Build the user_persona_history insert row from a PipelineResult.
    Maps to existing columns + the new columns from the migration.
    Called once per memo submission — never updated.
    """
    ef = result.entry_features
    ss = result.stage_scores
    stage_val = persona.stage.current.value
    persona_enum_val = _STAGE_TO_PERSONA_ENUM.get(stage_val, "ground")

    row = {
        "user_id": persona.user_id,
        "persona": persona_enum_val,  # existing column (persona_enum: storm/ground/through_it)
        "stress_level": min(10, max(1, round(ss.stress_score * 10))),  # existing: 1-10
        # New columns from migration:
        "stage": stage_val,
        "stress_score": round(float(ss.stress_score), 4),
        "recovery_score": round(float(ss.recovery_score), 4),
        "day_number": ef.day_number if ef else 0,
    }

    # Linguistic features — only present if extraction succeeded
    if ef:
        ling = ef.linguistic
        row["valence"] = round(float(ling.valence), 4)
        row["agency_score"] = round(float(ling.agency_score), 4)

    return row


# ─────────────────────────────────────────────────────────────────────────────
# Time helpers
# ─────────────────────────────────────────────────────────────────────────────


def _unix_to_iso(ts: float) -> str:
    """Unix timestamp → ISO 8601 string for Postgres timestamptz."""
    from datetime import datetime, timezone

    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def _iso_to_unix(iso: Optional[str]) -> float:
    """ISO 8601 string → Unix timestamp. Returns 0.0 if None."""
    if not iso:
        return 0.0
    from datetime import datetime, timezone

    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.timestamp()
    except (ValueError, AttributeError):
        return 0.0


# ─────────────────────────────────────────────────────────────────────────────
# The store
# ─────────────────────────────────────────────────────────────────────────────


class PersonaStore:
    """
    All Supabase I/O for the persona system.

    Pass in the Supabase client from auth.py — don't create a new one here.
    One instance, shared across all requests via FastAPI dependency injection.

    Usage:
        store = PersonaStore(supabase)  # once, at app startup
        app.state.persona_store = store

        # In routes — inject via Depends
        def get_store(request: Request) -> PersonaStore:
            return request.app.state.persona_store
    """

    def __init__(self, supabase_client):
        self._db = supabase_client

    # ── Read ──────────────────────────────────────────────────────────────────

    def load(self, user_id: str) -> Optional[UserPersona]:
        """
        Load a persona from Supabase by user_id.
        Returns None if the user hasn't onboarded yet.
        """
        try:
            result = (
                self._db.table("persona_state")
                .select("persona_payload")
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            if not result.data or not result.data.get("persona_payload"):
                return None
            return row_to_persona(result.data["persona_payload"])
        except Exception as e:
            # .single() raises if no row found — treat as None
            logger.debug("Persona not found for user_id=%s: %s", user_id, e)
            return None

    # ── Write ─────────────────────────────────────────────────────────────────

    def create(
        self,
        user_id: str,
        demographics: UserDemographics,
    ) -> UserPersona:
        """
        Create a fresh persona at onboarding and persist it.
        Returns the new UserPersona.
        Raises if the user already has a persona (use load() first).
        """
        persona = create_persona(user_id, demographics)
        payload = persona_to_row(persona)

        self._db.table("persona_state").insert({
            "user_id": user_id,
            "persona_payload": payload,
        }).execute()
        logger.info("Created persona for user_id=%s", user_id)
        return persona

    def save(
        self,
        persona: UserPersona,
        result: PipelineResult,
    ) -> None:
        """
        Persist updated persona + log the entry.
        Call this after every successful pipeline.process().

        Two writes:
            1. Upsert persona_state        — updates the live persona (JSONB)
            2. Insert user_persona_history  — appends to the audit log
        """
        payload = persona_to_row(persona)
        entry_row = result_to_entry_row(persona, result)

        # Upsert persona state (JSONB blob — flexible as the model evolves)
        self._db.table("persona_state").upsert({
            "user_id": persona.user_id,
            "persona_payload": payload,
        }).execute()

        # Append entry to history (uses existing user_persona_history table)
        self._db.table("user_persona_history").insert(entry_row).execute()

        logger.info(
            "Saved persona: user=%s entry=%d stage=%s crisis=%s",
            persona.user_id,
            persona.entry_count,
            persona.stage.current.value,
            result.crisis_flag,
        )

    def set_available(self, user_id: str, available: bool) -> None:
        """
        Toggle is_available. Call when user goes online/offline or
        joins/leaves a session.
        """
        # Load current payload, update the flag, save back
        current = self.load(user_id)
        if current is None:
            return
        current.is_available = available
        payload = persona_to_row(current)
        self._db.table("persona_state").upsert({
            "user_id": user_id,
            "persona_payload": payload,
        }).execute()

    # ── History ───────────────────────────────────────────────────────────────

    def get_entry_history(
        self,
        user_id: str,
        limit: int = 30,
    ) -> list[dict]:
        """
        Fetch the most recent `limit` entries for a user.
        Returns raw dicts — the route layer shapes them for the response.
        """
        result = (
            self._db.table("user_persona_history")
            .select(
                "recorded_at, day_number, stage, stress_score, recovery_score, "
                "valence, agency_score"
            )
            .eq("user_id", user_id)
            .order("recorded_at", desc=True)
            .limit(limit)
            .execute()
        )
        # Remap recorded_at → created_at for the route layer
        rows = result.data or []
        for row in rows:
            row["created_at"] = row.pop("recorded_at", row.get("created_at"))
        return rows

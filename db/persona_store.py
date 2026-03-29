from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

import numpy as np

from persona.core.models import (
    AgeGroup,
    OccupationCategory,
    Stage,
    StageState,
    UserDemographics,
    UserPersona,
)
from persona.core.persona import create_persona

logger = logging.getLogger(__name__)


class PersonaStore:
    """
    Supabase-backed persistence for UserPersona.

    Primary storage:
            - persona_state.user_id (unique)
            - persona_state.persona_payload (json/jsonb)

    Read model synchronization:
            - users.state
            - users.cluster_id
            - users.current_persona
            - users.current_stress_level
            - users.persona_confidence
            - users.is_in_crisis
            - users.last_journal_at
    """

    def __init__(
        self,
        client,
        persona_table: str = "persona_state",
        history_table: str = "user_persona_history",
        users_table: str = "users",
    ):
        self.client = client
        self.persona_table = persona_table
        self.history_table = history_table
        self.users_table = users_table

    def create(self, user_id: str, demographics: UserDemographics) -> UserPersona:
        """Create and persist a new persona for a user."""
        persona = create_persona(user_id=user_id, demographics=demographics)
        self._upsert_persona_state(persona)
        self._sync_users_from_persona(persona)
        return persona

    def load(self, user_id: str) -> Optional[UserPersona]:
        """Load persona from DB. Returns None when not found."""
        try:
            result = (
                self.client.table(self.persona_table)
                .select("persona_payload")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            logger.warning("load persona failed for user=%s: %s", user_id, exc)
            return None

        if not result.data:
            return None

        payload = result.data[0].get("persona_payload")
        if not payload:
            return None

        try:
            return self._deserialize_persona(payload)
        except Exception as exc:
            logger.error("persona deserialization failed user=%s: %s", user_id, exc)
            return None

    def save(self, persona: UserPersona, result: Any) -> None:
        """
        Persist persona updates after pipeline processing.

        `result` is expected to be PipelineResult-like and provide:
                - stage_scores
                - crisis_flag
                - entry_features (optional)
        """
        self._upsert_persona_state(persona)
        self._sync_users_from_persona(persona, result=result)
        self._insert_history_row(persona, result)

    def get_entry_history(self, user_id: str, limit: int = 14) -> list[dict]:
        """Return newest-first persona history rows for UI timelines."""
        safe_limit = max(1, min(int(limit), 100))
        try:
            result = (
                self.client.table(self.history_table)
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(safe_limit)
                .execute()
            )
            return result.data or []
        except Exception as exc:
            logger.warning("history lookup failed for user=%s: %s", user_id, exc)
            return []

    def load_all(self, limit: Optional[int] = None) -> list[UserPersona]:
        """Load all persisted personas for clustering jobs."""
        try:
            query = self.client.table(self.persona_table).select("persona_payload")
            if limit is not None:
                query = query.limit(max(1, int(limit)))
            result = query.execute()
        except Exception as exc:
            logger.warning("bulk persona load failed: %s", exc)
            return []

        personas: list[UserPersona] = []
        for row in result.data or []:
            payload = row.get("persona_payload")
            if not payload:
                continue
            try:
                personas.append(self._deserialize_persona(payload))
            except Exception as exc:
                user_hint = (
                    payload.get("user_id") if isinstance(payload, dict) else "unknown"
                )
                logger.warning(
                    "skipping invalid persona payload user=%s: %s", user_hint, exc
                )
        return personas

    def _upsert_persona_state(self, persona: UserPersona) -> None:
        payload = {
            "user_id": persona.user_id,
            "persona_payload": self._serialize_persona(persona),
            "updated_at": self._now_iso(),
        }
        self.client.table(self.persona_table).upsert(
            payload, on_conflict="user_id"
        ).execute()

    def _sync_users_from_persona(
        self, persona: UserPersona, result: Any = None
    ) -> None:
        user_update: dict[str, Any] = {
            "state": persona.stage.current.value,
            "cluster_id": persona.cluster_id,
            "current_persona": self._stage_to_legacy_persona(persona.stage.current),
            "persona_confidence": float(persona.stage.confidence),
            "trajectory_stress": float(persona.trajectory_stress),
            "trajectory_recovery": float(persona.trajectory_recovery),
        }

        if result is not None:
            stress_score = getattr(
                getattr(result, "stage_scores", None), "stress_score", None
            )
            if stress_score is not None:
                user_update["current_stress_level"] = int(
                    round(float(stress_score) * 10)
                )

            crisis_flag = getattr(result, "crisis_flag", None)
            if crisis_flag is not None:
                user_update["is_in_crisis"] = bool(crisis_flag)

            user_update["last_journal_at"] = self._now_iso()

        try:
            self.client.table(self.users_table).update(user_update).eq(
                "id", persona.user_id
            ).execute()
        except Exception as exc:
            # Keep persona persistence resilient if optional columns do not exist.
            logger.warning(
                "users sync with trajectory fields failed for user=%s: %s; retrying base fields",
                persona.user_id,
                exc,
            )
            user_update.pop("trajectory_stress", None)
            user_update.pop("trajectory_recovery", None)
            self.client.table(self.users_table).update(user_update).eq(
                "id", persona.user_id
            ).execute()

    def _insert_history_row(self, persona: UserPersona, result: Any) -> None:
        stage_scores = getattr(result, "stage_scores", None)
        entry_features = getattr(result, "entry_features", None)

        row = {
            "user_id": persona.user_id,
            "persona": self._stage_to_legacy_persona(persona.stage.current),
            "stage": persona.stage.current.value,
            "stress_level": (
                int(round(float(stage_scores.stress_score) * 10))
                if stage_scores
                else None
            ),
            "stress_score": float(stage_scores.stress_score) if stage_scores else None,
            "recovery_score": (
                float(stage_scores.recovery_score) if stage_scores else None
            ),
            "day_number": getattr(entry_features, "day_number", persona.entry_count),
            "valence": (
                float(entry_features.linguistic.valence) if entry_features else None
            ),
            "agency_score": (
                float(entry_features.linguistic.agency_score)
                if entry_features
                else None
            ),
            "created_at": self._now_iso(),
        }

        try:
            self.client.table(self.history_table).insert(row).execute()
        except Exception as exc:
            logger.warning(
                "rich history insert failed user=%s; retrying minimal row: %s",
                persona.user_id,
                exc,
            )
            minimal_row = {
                "user_id": persona.user_id,
                "persona": row["persona"],
                "stress_level": row["stress_level"],
            }
            try:
                self.client.table(self.history_table).insert(minimal_row).execute()
            except Exception as inner_exc:
                logger.error(
                    "history insert failed user=%s: %s", persona.user_id, inner_exc
                )

    def _serialize_persona(self, persona: UserPersona) -> dict[str, Any]:
        return {
            "user_id": persona.user_id,
            "demographics": {
                "age_group": persona.demographics.age_group.value,
                "occupation": persona.demographics.occupation.value,
                "industry": persona.demographics.industry,
                "language_code": persona.demographics.language_code,
                "region_code": persona.demographics.region_code,
                "living_situation": persona.demographics.living_situation,
            },
            "vectors": {
                "acoustic_short": self._array_to_list(persona.vectors.acoustic_short),
                "acoustic_long": self._array_to_list(persona.vectors.acoustic_long),
                "linguistic_short": self._array_to_list(
                    persona.vectors.linguistic_short
                ),
                "linguistic_long": self._array_to_list(persona.vectors.linguistic_long),
                "identity": self._array_to_list(persona.vectors.identity),
                "behavioral": self._array_to_list(persona.vectors.behavioral),
            },
            "baseline": {
                "feature_mean": self._array_to_list(persona.baseline.feature_mean),
                "feature_std": self._array_to_list(persona.baseline.feature_std),
                "n_samples": int(persona.baseline.n_samples),
            },
            "stage": {
                "current": persona.stage.current.value,
                "confidence": float(persona.stage.confidence),
            },
            "stressor_dist": self._array_to_list(persona.stressor_dist),
            "cluster_id": persona.cluster_id,
            "entry_count": int(persona.entry_count),
            "last_entry_time": float(persona.last_entry_time),
            "is_available": bool(persona.is_available),
        }

    def _deserialize_persona(self, payload: dict[str, Any]) -> UserPersona:
        dem = payload.get("demographics", {})
        demographics = UserDemographics(
            age_group=AgeGroup(dem.get("age_group", AgeGroup.LATE_20S.value)),
            occupation=OccupationCategory(
                dem.get("occupation", OccupationCategory.OTHER.value)
            ),
            industry=dem.get("industry", "unknown"),
            language_code=dem.get("language_code", "en"),
            region_code=dem.get("region_code", "US"),
            living_situation=dem.get("living_situation", "alone"),
        )

        persona = create_persona(user_id=payload["user_id"], demographics=demographics)

        vec = payload.get("vectors", {})
        persona.vectors.acoustic_short = self._list_to_array(
            vec.get("acoustic_short", [])
        )
        persona.vectors.acoustic_long = self._list_to_array(
            vec.get("acoustic_long", [])
        )
        persona.vectors.linguistic_short = self._list_to_array(
            vec.get("linguistic_short", [])
        )
        persona.vectors.linguistic_long = self._list_to_array(
            vec.get("linguistic_long", [])
        )
        persona.vectors.identity = self._list_to_array(vec.get("identity", []))
        persona.vectors.behavioral = self._list_to_array(vec.get("behavioral", []))

        baseline = payload.get("baseline", {})
        persona.baseline.feature_mean = self._list_to_array(
            baseline.get("feature_mean", []), dtype=np.float32
        )
        persona.baseline.feature_std = self._list_to_array(
            baseline.get("feature_std", []), dtype=np.float32
        )
        persona.baseline.n_samples = int(baseline.get("n_samples", 0))

        stage_payload = payload.get("stage", {})
        stage_raw = stage_payload.get("current", Stage.FINDING_GROUND.value)
        persona.stage = StageState(
            current=Stage(stage_raw),
            confidence=float(stage_payload.get("confidence", 0.5)),
        )

        persona.stressor_dist = self._list_to_array(
            payload.get("stressor_dist", []), dtype=np.float32
        )
        persona.cluster_id = payload.get("cluster_id")
        persona.entry_count = int(payload.get("entry_count", 0))
        persona.last_entry_time = float(payload.get("last_entry_time", 0.0))
        persona.is_available = bool(payload.get("is_available", False))

        return persona

    @staticmethod
    def _array_to_list(arr: np.ndarray | list[float]) -> list[float]:
        if isinstance(arr, list):
            return [float(v) for v in arr]
        return [float(v) for v in np.asarray(arr).tolist()]

    @staticmethod
    def _list_to_array(values: list[float], dtype=np.float32) -> np.ndarray:
        return np.asarray(values, dtype=dtype)

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _stage_to_legacy_persona(stage: Stage) -> str:
        if stage == Stage.IN_THE_STORM:
            return "storm"
        if stage == Stage.THROUGH_IT:
            return "through_it"
        return "ground"

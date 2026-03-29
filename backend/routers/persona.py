"""
cairn/routes/persona.py

FastAPI routes for the persona system.

Three endpoints:

    POST /persona/onboard
        Called once at signup. Collects demographics, creates the persona.
        Must be called before any memo submissions.

    POST /persona/submit
        Called every time a user submits a voice memo.
        Runs the full pipeline: acoustic → linguistic → persona update → stage.
        Returns updated stage, scores, and a crisis flag if triggered.

    GET /persona/me
        Returns the user's current persona state for the UI.
        Stage, stressor breakdown, trajectory, entry count, history.
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from auth import get_cairn_user
from persona.core.models import (
    AgeGroup,
    OccupationCategory,
    RawEntry,
    Stage,
    UserDemographics,
)
from db.persona_store import PersonaStore
from persona.core.pipeline import CairnPipeline

logger = logging.getLogger(__name__)
router = APIRouter(tags=["persona"])


# ─────────────────────────────────────────────────────────────────────────────
# Dependency injection
# Shared instances — built once at startup, injected into every route.
# ─────────────────────────────────────────────────────────────────────────────


def get_store(request: Request) -> PersonaStore:
    return request.app.state.persona_store


def get_pipeline(request: Request) -> CairnPipeline:
    return request.app.state.pipeline


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────────────────────────────────────


class OnboardRequest(BaseModel):
    age_group: AgeGroup
    occupation: OccupationCategory
    industry: str = Field(min_length=1, max_length=100)
    language_code: str = Field(min_length=2, max_length=10)
    region_code: str = Field(min_length=2, max_length=10)
    living_situation: str = Field(pattern="^(alone|partner|family|roommates)$")


class OnboardResponse(BaseModel):
    user_id: str
    stage: str
    entry_count: int
    message: str


class SubmitMemoRequest(BaseModel):
    transcript: str = Field(
        min_length=10, max_length=10_000, description="Whisper output or manual text"
    )
    audio_path: str = Field(description="Server-side path to the uploaded audio file")
    day_number: int = Field(ge=1)


class StressorBreakdown(BaseModel):
    work_pressure: float
    career_uncertainty: float
    relationships: float
    identity: float
    finances: float
    health: float
    isolation: float
    loss: float


class SubmitMemoResponse(BaseModel):
    entry_count: int
    stage: str
    stage_confidence: float
    stress_score: float
    recovery_score: float
    is_improving: bool
    stressor_breakdown: StressorBreakdown
    crisis_flag: bool
    crisis_reason: Optional[str]
    timing_ms: int


class EntryHistoryItem(BaseModel):
    date: str
    day_number: int
    stage: str
    stress_score: float
    recovery_score: float
    valence: Optional[float]
    agency_score: Optional[float]


class PersonaStateResponse(BaseModel):
    user_id: str
    stage: str
    stage_confidence: float
    entry_count: int
    trajectory_stress: float
    trajectory_recovery: float
    stressor_breakdown: StressorBreakdown
    confidence_weight: float
    last_entry_at: Optional[str]
    recent_entries: list[EntryHistoryItem]


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/onboard", response_model=OnboardResponse, status_code=201)
async def onboard(
    payload: OnboardRequest,
    cairn_user: dict = Depends(get_cairn_user),
    store: PersonaStore = Depends(get_store),
):
    """
    Create a persona for a new user.

    Call once at signup, after the user fills in demographics.
    Returns 409 if a persona already exists for this user — use /me to fetch it.
    """
    user_id = cairn_user["id"]

    # Idempotency guard — don't overwrite an existing persona
    existing = store.load(user_id)
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="Persona already exists for this user. Use GET /persona/me.",
        )

    demographics = UserDemographics(
        age_group=payload.age_group,
        occupation=payload.occupation,
        industry=payload.industry,
        language_code=payload.language_code.lower(),
        region_code=payload.region_code.upper(),
        living_situation=payload.living_situation,
    )

    try:
        persona = store.create(user_id, demographics)
    except Exception as e:
        logger.error("Failed to create persona for user=%s: %s", user_id, e)
        raise HTTPException(status_code=500, detail="Failed to create persona.")

    return OnboardResponse(
        user_id=user_id,
        stage=persona.stage.current.value,
        entry_count=persona.entry_count,
        message="Persona created. Submit your first voice memo to begin.",
    )


@router.post("/submit", response_model=SubmitMemoResponse)
async def submit_memo(
    payload: SubmitMemoRequest,
    cairn_user: dict = Depends(get_cairn_user),
    store: PersonaStore = Depends(get_store),
    pipeline: CairnPipeline = Depends(get_pipeline),
):
    """
    Submit a voice memo and update the persona.

    The audio file must already be uploaded to the server before calling this.
    Pass the server-side path as `audio_path`.

    Returns updated stage, scores, stressor breakdown, and a crisis flag.
    The crisis flag does not block this response — the client handles it.
    """
    user_id = cairn_user["id"]

    # ── Load persona ──────────────────────────────────────────────────────────
    persona = store.load(user_id)
    if persona is None:
        raise HTTPException(
            status_code=404,
            detail="No persona found. Call POST /persona/onboard first.",
        )

    # ── Build raw entry ───────────────────────────────────────────────────────
    entry = RawEntry(
        user_id=user_id,
        audio_path=payload.audio_path,
        transcript=payload.transcript,
        timestamp=time.time(),
        day_number=payload.day_number,
    )

    # ── Run pipeline ──────────────────────────────────────────────────────────
    try:
        result = pipeline.process(entry=entry, persona=persona)
    except Exception as e:
        logger.error("Pipeline failed for user=%s: %s", user_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process voice memo.")

    # ── Persist ───────────────────────────────────────────────────────────────
    try:
        store.save(persona, result)
    except Exception as e:
        logger.error("Failed to save persona for user=%s: %s", user_id, e)
        # Don't surface DB errors to the client — the pipeline result is valid
        # Log and continue; the client gets the result even if persistence failed.
        # In production: push to a dead-letter queue for retry.

    # ── Build response ────────────────────────────────────────────────────────
    sd = persona.stressor_dist  # (8,) — one per StressorType

    return SubmitMemoResponse(
        entry_count=persona.entry_count,
        stage=persona.stage.current.value,
        stage_confidence=round(float(persona.stage.confidence), 3),
        stress_score=round(float(result.stage_scores.stress_score), 3),
        recovery_score=round(float(result.stage_scores.recovery_score), 3),
        is_improving=bool(result.stage_scores.is_improving),
        stressor_breakdown=StressorBreakdown(
            work_pressure=round(float(sd[0]), 3),
            career_uncertainty=round(float(sd[1]), 3),
            relationships=round(float(sd[2]), 3),
            identity=round(float(sd[3]), 3),
            finances=round(float(sd[4]), 3),
            health=round(float(sd[5]), 3),
            isolation=round(float(sd[6]), 3),
            loss=round(float(sd[7]), 3),
        ),
        crisis_flag=result.crisis_flag,
        crisis_reason=result.crisis_reason,
        timing_ms=result.timing.get("total_ms", 0),
    )


@router.get("/me", response_model=PersonaStateResponse)
async def get_my_persona(
    cairn_user: dict = Depends(get_cairn_user),
    store: PersonaStore = Depends(get_store),
):
    """
    Return the current persona state for the authenticated user.

    Used by the UI to show stage, stressor breakdown, and entry history.
    Does not run the pipeline — purely a read.
    """
    user_id = cairn_user["id"]

    persona = store.load(user_id)
    if persona is None:
        raise HTTPException(
            status_code=404,
            detail="No persona found. Call POST /persona/onboard first.",
        )

    history_rows = store.get_entry_history(user_id, limit=14)
    history = [
        EntryHistoryItem(
            date=row["created_at"],
            day_number=row["day_number"],
            stage=row["stage"],
            stress_score=round(float(row.get("stress_score") or 0), 3),
            recovery_score=round(float(row.get("recovery_score") or 0), 3),
            valence=(
                round(float(v), 3) if (v := row.get("valence")) is not None else None
            ),
            agency_score=(
                round(float(a), 3)
                if (a := row.get("agency_score")) is not None
                else None
            ),
        )
        for row in history_rows
    ]

    sd = persona.stressor_dist
    last_entry = (
        None
        if persona.last_entry_time == 0.0
        else _unix_to_iso(persona.last_entry_time)
    )

    return PersonaStateResponse(
        user_id=user_id,
        stage=persona.stage.current.value,
        stage_confidence=round(float(persona.stage.confidence), 3),
        entry_count=persona.entry_count,
        trajectory_stress=round(float(persona.trajectory_stress), 4),
        trajectory_recovery=round(float(persona.trajectory_recovery), 4),
        stressor_breakdown=StressorBreakdown(
            work_pressure=round(float(sd[0]), 3),
            career_uncertainty=round(float(sd[1]), 3),
            relationships=round(float(sd[2]), 3),
            identity=round(float(sd[3]), 3),
            finances=round(float(sd[4]), 3),
            health=round(float(sd[5]), 3),
            isolation=round(float(sd[6]), 3),
            loss=round(float(sd[7]), 3),
        ),
        confidence_weight=round(float(persona.baseline.confidence_weight), 3),
        last_entry_at=last_entry,
        recent_entries=history,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Helper (local copy — avoids circular import with persona_store)
# ─────────────────────────────────────────────────────────────────────────────


def _unix_to_iso(ts: float) -> str:
    from datetime import datetime, timezone

    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()

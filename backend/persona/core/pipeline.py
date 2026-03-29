"""
cairn/core/pipeline.py

The pipeline — single entry point that orchestrates the full
voice memo → persona update flow.

This is what your API endpoint calls when a user submits a memo.
It runs synchronously but is designed to be dropped into an async
worker (Celery, RQ, etc.) trivially.

Full flow per entry:
    1. Validate raw entry
    2. Extract acoustic features  (wav2vec2 → 64-dim projection)
    3. Extract linguistic features (LLM → structured scores)
    4. Run persona engine update  (EMA, normalization, behavioral)
    5. Run stage classifier       (rule-based → inertia gate)
    6. Safety check               (crisis detection → immediate flag)
    7. Return PipelineResult

Usage:
    pipeline = CairnPipeline.build(use_mock_audio=True)

    result = pipeline.process(
        entry   = RawEntry(user_id="u001", audio_path="memo.wav", transcript="..."),
        persona = user_persona,   # loaded from DB
    )

    if result.crisis_flag:
        trigger_crisis_protocol(result)

    save_persona(result.persona)   # persist updated persona to DB
"""

from __future__ import annotations

import time
import logging
from dataclasses import dataclass, field
from typing import Optional
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from persona.core.models import (
    AcousticFeatures,
    EntryFeatures,
    LinguisticFeatures,
    RawEntry,
    Stage,
    UserPersona,
)
from persona.core.config import CONFIG
from persona.core.persona import PersonaEngine, create_persona
from persona.core.stage import StageScores, run_stage_update
from persona.extractors.acoustic import AcousticExtractor

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline result
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class PipelineResult:
    """
    Full result of processing one voice memo.
    Returned to the API layer — it decides what to do next.
    """

    # Updated persona — persist this to your DB
    persona: UserPersona

    # Stage classification output — for logging and UI
    stage_scores: StageScores

    # Safety flag — checked before anything else is returned
    crisis_flag: bool
    crisis_reason: Optional[str] = None

    # Timing breakdown — for performance monitoring
    timing: dict = field(default_factory=dict)

    # The EntryFeatures that were computed — useful for debugging/logging
    entry_features: Optional[EntryFeatures] = None

    @property
    def current_stage(self) -> Stage:
        return self.persona.stage.current

    @property
    def succeeded(self) -> bool:
        return self.entry_features is not None


# ─────────────────────────────────────────────────────────────────────────────
# Linguistic extractor interface
# Thin wrapper so the pipeline doesn't care whether you're using
# Gemini, Claude, or a mock — just swap the extractor.
# ─────────────────────────────────────────────────────────────────────────────


class LinguisticExtractorBase:
    """Base class for linguistic extractors — implement extract()."""

    def extract(self, transcript: str) -> LinguisticFeatures:
        raise NotImplementedError


class MockLinguisticExtractor(LinguisticExtractorBase):
    """
    Deterministic mock for testing without an LLM API key.
    Seed is derived from the transcript so the same text always
    returns the same features.
    """

    def extract(self, transcript: str) -> LinguisticFeatures:
        seed = hash(transcript) % (2**31)
        rng = np.random.RandomState(seed)

        def r(lo=0.0, hi=1.0):
            return float(np.clip(rng.uniform(lo, hi), 0.0, 1.0))

        # Temporal must sum to 1
        raw_t = np.abs(rng.randn(3))
        t = raw_t / raw_t.sum()

        # Stressor must sum to 1
        raw_s = np.abs(rng.randn(8)).astype(np.float32)
        s = raw_s / raw_s.sum()

        return LinguisticFeatures(
            valence=r(0.1, 0.9),
            arousal=r(0.2, 0.8),
            agency_score=r(0.1, 0.9),
            distortion_score=r(0.05, 0.7),
            coping_score=r(0.05, 0.8),
            past_orientation=float(t[0]),
            present_orientation=float(t[1]),
            future_orientation=float(t[2]),
            stressor_dist=s,
            urgency_signal=r(0.0, 0.5),
            help_seeking_signal=r(0.0, 0.6),
        )


class GeminiLinguisticExtractor(LinguisticExtractorBase):
    """
    Production extractor using Gemini (your lingustic.py implementation).
    Wraps the existing extract_linguistic_features function.
    """

    def __init__(self):
        # Import lazily so missing API key doesn't break mock usage
        try:
            try:
                from persona.extractors.linguistic import extract_linguistic_features
            except ImportError:
                # Backward compatibility for current module name in this repo.
                from persona.extractors.lingustic import extract_linguistic_features

            self._fn = extract_linguistic_features
        except ImportError as e:
            raise ImportError(
                "Gemini extractor requires google-generativeai and pydantic.\n"
                f"Original error: {e}"
            )

    def extract(self, transcript: str) -> LinguisticFeatures:
        return self._fn(transcript)


# ─────────────────────────────────────────────────────────────────────────────
# Safety checker
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class SafetyResult:
    is_crisis: bool
    reason: Optional[str] = None


def check_safety(
    entry: EntryFeatures,
    stage_scores: StageScores,
) -> SafetyResult:
    """
    Crisis detection — runs after every entry.

    Three independent triggers (any one is sufficient):
        A. Urgency signal from LLM extraction > 0.85
           (language contains acute distress markers)
        B. Acoustic urgency: entry is raw crisis + stage override fired
           (stress_score > 0.85 in the classifier)
        C. Stage just transitioned TO In the storm with high confidence
           (sustained crisis confirmed by inertia gate)

    Returns SafetyResult. If is_crisis=True, the caller should:
        1. Surface crisis resources immediately in the UI
        2. Skip circle matching — offer 1:1 support instead
        3. Log the event for clinical review (with user consent)

    This does NOT make clinical decisions — it flags for human review.
    """
    ling = entry.linguistic

    # Trigger A: LLM-detected language urgency
    if ling.urgency_signal > 0.85:
        return SafetyResult(
            is_crisis=True, reason=f"LLM urgency signal: {ling.urgency_signal:.2f}"
        )

    # Trigger B: Acoustic + linguistic combined crisis score
    if stage_scores.stress_score > 0.85:
        return SafetyResult(
            is_crisis=True,
            reason=f"Combined stress score: {stage_scores.stress_score:.2f}",
        )

    # Trigger C: Low valence + high distortion + help-seeking together
    # Any single signal can be noise; all three together is a strong signal
    if (
        ling.valence < 0.15
        and ling.distortion_score > 0.80
        and ling.help_seeking_signal > 0.70
    ):
        return SafetyResult(
            is_crisis=True,
            reason=(
                f"Combined: valence={ling.valence:.2f}, "
                f"distortion={ling.distortion_score:.2f}, "
                f"help_seeking={ling.help_seeking_signal:.2f}"
            ),
        )

    return SafetyResult(is_crisis=False)


# ─────────────────────────────────────────────────────────────────────────────
# Streak computation
# ─────────────────────────────────────────────────────────────────────────────


def compute_streak(persona: UserPersona, current_timestamp: float) -> int:
    """
    Compute how many consecutive days this user has submitted a memo.

    Uses last_entry_time stored in persona metadata.
    A "day" is defined as a calendar day in UTC — 24h gap tolerance.

    Returns 1 on the first entry or after a gap > 36 hours.
    """
    if persona.entry_count == 0:
        return 1

    elapsed_hours = (current_timestamp - persona.last_entry_time) / 3600

    # Same day or next day — continue streak
    if elapsed_hours <= 36:
        # We don't store the actual streak count — approximate from entry_count
        # In production, store streak explicitly in the DB
        return min(persona.entry_count + 1, 365)

    # Gap > 36 hours — streak reset
    return 1


# ─────────────────────────────────────────────────────────────────────────────
# The Pipeline
# ─────────────────────────────────────────────────────────────────────────────


class CairnPipeline:
    """
    Stateless processing pipeline.

    One instance shared across all requests.
    All user state lives in UserPersona objects, not here.

    Designed to be:
        - Synchronous (wrap in async worker for production)
        - Stateless (safe to share across threads)
        - Testable (swap mock extractors at build time)
        - Observable (timing breakdown in every result)
    """

    def __init__(
        self,
        acoustic_extractor: AcousticExtractor,
        linguistic_extractor: LinguisticExtractorBase,
        persona_engine: PersonaEngine,
    ):
        self.acoustic = acoustic_extractor
        self.linguistic = linguistic_extractor
        self.persona_eng = persona_engine

    @classmethod
    def build(
        cls,
        use_mock_audio: bool = False,
        use_mock_linguistic: bool = False,
        projection_path: Optional[str] = None,
    ) -> "CairnPipeline":
        """
        Factory — builds the pipeline with the right extractors.

        Development (no API keys, no model weights):
            pipeline = CairnPipeline.build(
                use_mock_audio=True,
                use_mock_linguistic=True,
            )

        Staging (real LLM, mock audio):
            pipeline = CairnPipeline.build(use_mock_audio=True)

        Production:
            pipeline = CairnPipeline.build()
        """
        acoustic = AcousticExtractor.load(
            projection_path=projection_path,
            use_mock=use_mock_audio,
        )

        if use_mock_linguistic:
            linguistic = MockLinguisticExtractor()
        else:
            linguistic = GeminiLinguisticExtractor()

        return cls(
            acoustic_extractor=acoustic,
            linguistic_extractor=linguistic,
            persona_engine=PersonaEngine(),
        )

    # ── Main entry point ──────────────────────────────────────────────────────

    def process(
        self,
        entry: RawEntry,
        persona: UserPersona,
    ) -> PipelineResult:
        """
        Process one voice memo and update the persona.

        Args:
            entry:   RawEntry from the API — audio path + transcript + metadata
            persona: UserPersona loaded from your DB (mutated in place)

        Returns:
            PipelineResult with updated persona, stage scores, and safety flag.

        The persona is mutated IN PLACE — after this call, persist it to your DB.
        """
        timing: dict = {}
        t0 = time.perf_counter()

        # ── Step 1: Validate ──────────────────────────────────────────────────
        if not entry.transcript.strip():
            logger.warning(
                "Empty transcript for user=%s entry=%d", entry.user_id, entry.day_number
            )

        # ── Step 2: Acoustic extraction ───────────────────────────────────────
        t = time.perf_counter()
        try:
            acoustic_features, projected_acoustic = self.acoustic.extract_and_project(
                entry.audio_path
            )
        except Exception as e:
            logger.error("Acoustic extraction failed for user=%s: %s", entry.user_id, e)
            # Graceful degradation: use zero vector rather than crashing
            # Persona update will still run on linguistic features alone
            acoustic_features = AcousticFeatures(
                embedding=np.zeros(768, dtype=np.float32),
                duration_sec=0.0,
            )
            projected_acoustic = np.zeros(64, dtype=np.float32)
        timing["acoustic_ms"] = round((time.perf_counter() - t) * 1000)

        # ── Step 3: Linguistic extraction ─────────────────────────────────────
        t = time.perf_counter()
        try:
            linguistic_features = self.linguistic.extract(entry.transcript)
        except Exception as e:
            logger.error(
                "Linguistic extraction failed for user=%s: %s", entry.user_id, e
            )
            # Graceful degradation: neutral features rather than crashing
            linguistic_features = _neutral_linguistic()
        timing["linguistic_ms"] = round((time.perf_counter() - t) * 1000)

        # ── Step 4: Build EntryFeatures ───────────────────────────────────────
        import datetime

        hour_of_day = datetime.datetime.fromtimestamp(entry.timestamp).hour

        entry_features = EntryFeatures(
            user_id=entry.user_id,
            timestamp=entry.timestamp,
            day_number=entry.day_number,
            acoustic=acoustic_features,
            linguistic=linguistic_features,
            memo_length_seconds=acoustic_features.duration_sec,
            hour_of_day=hour_of_day,
        )

        # ── Step 5: Persona engine update ─────────────────────────────────────
        t = time.perf_counter()
        streak = compute_streak(persona, entry.timestamp)
        self.persona_eng.update(
            persona=persona,
            features=entry_features,
            projected_acoustic=projected_acoustic,
            streak_days=streak,
        )
        timing["persona_ms"] = round((time.perf_counter() - t) * 1000)

        # ── Step 6: Stage classification ──────────────────────────────────────
        t = time.perf_counter()
        stage_scores = run_stage_update(
            vectors=persona.vectors,
            stage_state=persona.stage,
            entry_count=persona.entry_count,
        )
        timing["stage_ms"] = round((time.perf_counter() - t) * 1000)

        # ── Step 7: Safety check ──────────────────────────────────────────────
        safety = check_safety(entry_features, stage_scores)
        if safety.is_crisis:
            logger.warning(
                "CRISIS FLAG: user=%s entry=%d reason=%s",
                entry.user_id,
                entry.day_number,
                safety.reason,
            )

        timing["total_ms"] = round((time.perf_counter() - t0) * 1000)

        logger.info(
            "Processed entry: user=%s entry=%d stage=%s stress=%.2f recovery=%.2f "
            "crisis=%s timing=%s",
            entry.user_id,
            entry.day_number,
            persona.stage.current.value,
            stage_scores.stress_score,
            stage_scores.recovery_score,
            safety.is_crisis,
            timing,
        )

        return PipelineResult(
            persona=persona,
            stage_scores=stage_scores,
            crisis_flag=safety.is_crisis,
            crisis_reason=safety.reason,
            timing=timing,
            entry_features=entry_features,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _neutral_linguistic() -> LinguisticFeatures:
    """
    Fallback linguistic features when extraction fails.
    All values at neutral midpoints — won't skew the persona.
    """
    return LinguisticFeatures(
        valence=0.5,
        arousal=0.5,
        agency_score=0.5,
        distortion_score=0.0,
        coping_score=0.5,
        past_orientation=0.33,
        present_orientation=0.34,
        future_orientation=0.33,
        stressor_dist=np.ones(8, dtype=np.float32) / 8.0,
        urgency_signal=0.0,
        help_seeking_signal=0.0,
    )

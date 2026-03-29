"""
cairn/core/stage.py

Stage classifier — derives In the storm / Finding ground / Through it
from the current persona state.

Two responsibilities:
    1. classify_stage()  — maps PersonaVectors → raw Stage (stateless)
    2. update_stage()    — applies inertia via StageState (stateful)

Always call both in sequence:
    raw = classify_stage(persona.vectors)
    update_stage(persona.stage, raw)

Design decisions:
    - Rule-based for now. Drop-in replacement with a trained MLP later
      by swapping classify_stage() — everything else stays the same.
    - Stage is DERIVED, never stored as user input.
    - Inertia requires ~3-4 consistent entries to flip a stage.
      One bad day won't move a recovering person back to crisis.
"""

from __future__ import annotations

from dataclasses import dataclass
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from persona.core.config import CONFIG
from persona.core.models import Dims, PersonaVectors, Stage, StageState


# ─────────────────────────────────────────────────────────────────────────────
# Linguistic dim indices inside PersonaVectors.linguistic_short / long
# Single source of truth — if the packing order in persona.py ever changes,
# update these constants and nothing else breaks.
# ─────────────────────────────────────────────────────────────────────────────


class _LingDim:
    VALENCE = 0
    AROUSAL = 1
    AGENCY = 2
    DISTORTION = 3
    COPING = 4
    TEMPORAL = 5  # future_orientation - past_orientation
    # dims 6-13: stressor_dist (8 values)
    URGENCY = 14
    HELP = 15


# ─────────────────────────────────────────────────────────────────────────────
# Stage input — the slice of persona state used for classification
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class StageInput:
    """
    The exact features the classifier sees.
    Extracted from PersonaVectors so the classifier has no direct
    dependency on the full vector layout.
    """

    # Current short-term state
    valence: float  # 0=very negative, 1=very positive
    arousal: float  # 0=low energy, 1=high energy
    agency: float  # 0=passive, 1=active ownership
    distortion: float  # 0=clear thinking, 1=heavy distortions
    coping: float  # 0=no coping, 1=active healthy coping
    stress_acoustic: float  # acoustic stress proxy (mean abs of short - long)

    # Trajectory (short - long): positive = moving in that direction
    trajectory_valence: float  # positive = getting more positive
    trajectory_stress: float  # positive = getting more stressed
    trajectory_agency: float  # positive = gaining agency

    # Confidence — how many entries back this persona
    entry_count: int


def extract_stage_input(vectors: PersonaVectors, entry_count: int) -> StageInput:
    """
    Pull the stage-relevant slice from PersonaVectors.
    Everything the classifier needs, nothing it doesn't.
    """
    ls = vectors.linguistic_short  # (16,)
    traj = vectors.trajectory  # (128,) — acoustic (64) + linguistic (64)

    # Linguistic trajectory starts at index Dims.ACOUSTIC in trajectory
    ling_traj = traj[Dims.ACOUSTIC :]

    # Acoustic stress proxy: how much has the acoustic state shifted?
    # Mean absolute difference between short and long acoustic vectors.
    acoustic_traj = traj[: Dims.ACOUSTIC]
    stress_acoustic = float(np.mean(np.abs(acoustic_traj)))

    return StageInput(
        valence=float(np.clip(ls[_LingDim.VALENCE], 0.0, 1.0)),
        arousal=float(np.clip(ls[_LingDim.AROUSAL], 0.0, 1.0)),
        agency=float(np.clip(ls[_LingDim.AGENCY], 0.0, 1.0)),
        distortion=float(np.clip(ls[_LingDim.DISTORTION], 0.0, 1.0)),
        coping=float(np.clip(ls[_LingDim.COPING], 0.0, 1.0)),
        stress_acoustic=float(np.clip(stress_acoustic, 0.0, 1.0)),
        trajectory_valence=float(ling_traj[_LingDim.VALENCE]),
        trajectory_stress=float(
            -ling_traj[_LingDim.VALENCE] * 0.5 + ling_traj[_LingDim.DISTORTION] * 0.5
        ),
        trajectory_agency=float(ling_traj[_LingDim.AGENCY]),
        entry_count=entry_count,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Rule-based classifier
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class StageScores:
    """Intermediate scores — useful for debugging and future calibration."""

    stress_score: float
    recovery_score: float
    is_improving: bool
    raw_stage: Stage


def compute_stage_scores(si: StageInput) -> StageScores:
    """
    Compute stress and recovery composite scores from the stage input.

    stress_score:
        High when valence is low, distortions are present, agency is absent,
        and acoustic stress signal is elevated.

    recovery_score:
        High when valence is positive, coping is active, and agency is present.
        Temporal orientation toward future also contributes.

    Both scores are in [0, 1].
    """
    stress_score = (
        (1.0 - si.valence) * 0.35
        + si.distortion * 0.30
        + (1.0 - si.agency) * 0.25
        + si.stress_acoustic * 0.10
    )

    recovery_score = si.valence * 0.30 + si.coping * 0.40 + si.agency * 0.30

    # Clip both to [0, 1] — weighted sums can slightly exceed due to rounding
    stress_score = float(np.clip(stress_score, 0.0, 1.0))
    recovery_score = float(np.clip(recovery_score, 0.0, 1.0))

    # "Improving" = moving toward more positive valence AND less stress
    # Both conditions must hold — valence alone can be noisy
    is_improving = si.trajectory_valence > 0.01 and si.trajectory_stress < 0.01

    # ── Classification rules (from design doc) ────────────────────────────
    cfg = CONFIG.stage

    if stress_score > cfg.storm_threshold and not is_improving:
        raw_stage = Stage.IN_THE_STORM

    elif recovery_score > cfg.recovery_threshold and (
        is_improving or not cfg.require_improving_for_recovery
    ):
        raw_stage = Stage.THROUGH_IT

    else:
        raw_stage = Stage.FINDING_GROUND

    return StageScores(
        stress_score=stress_score,
        recovery_score=recovery_score,
        is_improving=is_improving,
        raw_stage=raw_stage,
    )


def classify_stage(vectors: PersonaVectors, entry_count: int) -> StageScores:
    """
    Stateless classification — no side effects.

    Returns StageScores which includes the raw_stage and all
    intermediate values (useful for logging and calibration).
    """
    si = extract_stage_input(vectors, entry_count)
    scores = compute_stage_scores(si)

    # On very early entries (< 3), the EMA hasn't converged —
    # suppress stage transitions EXCEPT acute crisis (stress > override threshold).
    # We never want to miss a genuine crisis just because it's someone's first entry.
    URGENCY_OVERRIDE_THRESHOLD = 0.85
    if entry_count < 3 and scores.stress_score <= URGENCY_OVERRIDE_THRESHOLD:
        return StageScores(
            stress_score=scores.stress_score,
            recovery_score=scores.recovery_score,
            is_improving=scores.is_improving,
            raw_stage=Stage.FINDING_GROUND,
        )

    return scores


# ─────────────────────────────────────────────────────────────────────────────
# Inertia gate — prevents stage flipping on a single bad day
# ─────────────────────────────────────────────────────────────────────────────


def update_stage(stage_state: StageState, scores: StageScores) -> None:
    """
    Apply the inertia gate and update StageState in place.

    StageState.update() already implements the confidence accumulation
    logic defined in models.py. This function is a thin wrapper that
    feeds it and handles the urgency override.

    Urgency override: if the raw classifier says IN_THE_STORM and
    the stress score is very high (> 0.85), bypass inertia entirely.
    This ensures acute crises are caught immediately rather than
    requiring 3-4 confirming entries.
    """
    URGENCY_OVERRIDE_THRESHOLD = 0.85

    if (
        scores.raw_stage == Stage.IN_THE_STORM
        and scores.stress_score > URGENCY_OVERRIDE_THRESHOLD
    ):
        # Immediate flip — don't wait for inertia to accumulate
        stage_state.current = Stage.IN_THE_STORM
        stage_state.confidence = 1.0
        return

    # Normal inertia path
    stage_state.update(scores.raw_stage)


# ─────────────────────────────────────────────────────────────────────────────
# Convenience: classify + update in one call
# ─────────────────────────────────────────────────────────────────────────────


def run_stage_update(
    vectors: PersonaVectors,
    stage_state: StageState,
    entry_count: int,
) -> StageScores:
    """
    Full stage update in one call.
    Classifies from vectors, applies inertia, mutates stage_state.

    Returns StageScores for logging.

    Usage in pipeline.py:
        scores = run_stage_update(
            vectors     = persona.vectors,
            stage_state = persona.stage,
            entry_count = persona.entry_count,
        )
    """
    scores = classify_stage(vectors, entry_count)
    update_stage(stage_state, scores)
    return scores


# ─────────────────────────────────────────────────────────────────────────────
# Smoke test
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import time
    from models import (
        AcousticFeatures,
        AgeGroup,
        EntryFeatures,
        LinguisticFeatures,
        OccupationCategory,
        PersonaBaseline,
        PersonaVectors,
        StageState,
        UserDemographics,
        UserPersona,
    )
    from .persona import PersonaEngine, create_persona

    print("=" * 60)
    print("Stage Classifier — smoke test")
    print("=" * 60)

    demographics = UserDemographics(
        age_group=AgeGroup.LATE_20S,
        occupation=OccupationCategory.EARLY_CAREER,
        industry="software",
        language_code="ne",
        region_code="NP",
        living_situation="family",
    )

    engine = PersonaEngine()

    def run_scenario(label: str, linguistic_kwargs: dict, n_entries: int = 5):
        print(f"\n{'─'*50}")
        print(f"Scenario: {label}")
        print(f"{'─'*50}")

        rng = np.random.RandomState(hash(label) % 2**31)
        persona = create_persona("test", demographics)

        for i in range(n_entries):
            projected = rng.randn(Dims.ACOUSTIC).astype(np.float32)
            projected /= np.linalg.norm(projected)

            ling = LinguisticFeatures(
                stressor_dist=np.array(
                    [0.1, 0.5, 0.1, 0.1, 0.1, 0.0, 0.1, 0.0], dtype=np.float32
                ),
                **linguistic_kwargs,
            )
            entry = EntryFeatures(
                user_id="test",
                timestamp=time.time() + i * 86400,
                day_number=i + 1,
                acoustic=AcousticFeatures(
                    embedding=rng.randn(768).astype(np.float32),
                    duration_sec=60.0,
                ),
                linguistic=ling,
                memo_length_seconds=60.0,
                hour_of_day=21,
            )
            engine.update(persona, entry, projected, streak_days=i + 1)
            scores = run_stage_update(
                persona.vectors, persona.stage, persona.entry_count
            )
            print(
                f"  Entry {i+1}: "
                f"stress={scores.stress_score:.2f}  "
                f"recovery={scores.recovery_score:.2f}  "
                f"improving={scores.is_improving}  "
                f"raw={scores.raw_stage.value:<16}  "
                f"→ current={persona.stage.current.value}  "
                f"conf={persona.stage.confidence:.2f}"
            )

    # Scenario 1: clear crisis — should reach IN_THE_STORM after ~3 entries
    run_scenario(
        label="Crisis — sustained high stress",
        linguistic_kwargs=dict(
            valence=0.15,
            arousal=0.80,
            agency_score=0.15,
            distortion_score=0.80,
            coping_score=0.10,
            past_orientation=0.70,
            present_orientation=0.20,
            future_orientation=0.10,
            urgency_signal=0.70,
            help_seeking_signal=0.60,
        ),
    )

    # Scenario 2: recovery — should reach THROUGH_IT after ~3 entries
    run_scenario(
        label="Recovery — sustained improvement",
        linguistic_kwargs=dict(
            valence=0.80,
            arousal=0.50,
            agency_score=0.80,
            distortion_score=0.10,
            coping_score=0.85,
            past_orientation=0.15,
            present_orientation=0.45,
            future_orientation=0.40,
            urgency_signal=0.05,
            help_seeking_signal=0.10,
        ),
    )

    # Scenario 3: inertia — one bad entry shouldn't flip a recovering person
    run_scenario(
        label="Inertia — one bad day mid-recovery",
        linguistic_kwargs=dict(
            valence=0.70,
            arousal=0.50,
            agency_score=0.70,
            distortion_score=0.15,
            coping_score=0.75,
            past_orientation=0.20,
            present_orientation=0.50,
            future_orientation=0.30,
            urgency_signal=0.10,
            help_seeking_signal=0.10,
        ),
        n_entries=3,
    )

    # Scenario 4: acute crisis override — stress > 0.85 bypasses inertia
    run_scenario(
        label="Acute crisis — urgency override fires immediately",
        linguistic_kwargs=dict(
            valence=0.05,
            arousal=0.95,
            agency_score=0.05,
            distortion_score=0.95,
            coping_score=0.05,
            past_orientation=0.80,
            present_orientation=0.10,
            future_orientation=0.10,
            urgency_signal=0.95,
            help_seeking_signal=0.90,
        ),
        n_entries=1,
    )

    print(f"\n{'='*60}")
    print("Smoke test complete.")

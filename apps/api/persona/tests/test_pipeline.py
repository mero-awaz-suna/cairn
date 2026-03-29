"""
cairn/tests/test_pipeline.py

End-to-end integration test — runs the full pipeline from
RawEntry → updated UserPersona across a simulated 14-day arc.

Uses mock extractors throughout so no API keys or model weights needed.

Scenarios:
    1. Crisis arc    — stress builds → "In the storm" by day 8
    2. Recovery arc  — strong signals → "Through it" by day 8
    3. Mixed arc     — realistic variation, ends in "Finding ground"
    4. Crisis safety — urgency_signal > 0.85 triggers crisis flag on day 1
    5. Fallback      — broken audio path handled gracefully
"""

import sys
import time
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.models import (
    AgeGroup,
    LinguisticFeatures,
    OccupationCategory,
    RawEntry,
    Stage,
    UserDemographics,
)
from core.persona import create_persona
from core.pipeline import (
    CairnPipeline,
    MockLinguisticExtractor,
    PipelineResult,
    check_safety,
)


# ─────────────────────────────────────────────────────────────────────────────
# Test fixtures
# ─────────────────────────────────────────────────────────────────────────────

BASE_DEMO = UserDemographics(
    age_group=AgeGroup.LATE_20S,
    occupation=OccupationCategory.EARLY_CAREER,
    industry="software",
    language_code="ne",
    region_code="NP",
    living_situation="family",
)

CRISIS_LING = dict(
    valence=0.12,
    arousal=0.85,
    agency_score=0.10,
    distortion_score=0.85,
    coping_score=0.08,
    past_orientation=0.75,
    present_orientation=0.15,
    future_orientation=0.10,
    urgency_signal=0.65,
    help_seeking_signal=0.70,
)

RECOVERY_LING = dict(
    valence=0.88,
    arousal=0.50,
    agency_score=0.88,
    distortion_score=0.06,
    coping_score=0.90,
    past_orientation=0.08,
    present_orientation=0.47,
    future_orientation=0.45,
    urgency_signal=0.03,
    help_seeking_signal=0.08,
)

NEUTRAL_LING = dict(
    valence=0.50,
    arousal=0.50,
    agency_score=0.50,
    distortion_score=0.25,
    coping_score=0.50,
    past_orientation=0.33,
    present_orientation=0.34,
    future_orientation=0.33,
    urgency_signal=0.15,
    help_seeking_signal=0.25,
)

STRESSOR_WORK = np.array([0.6, 0.2, 0.05, 0.05, 0.05, 0.0, 0.05, 0.0], dtype=np.float32)


def make_ling(kwargs: dict) -> LinguisticFeatures:
    return LinguisticFeatures(stressor_dist=STRESSOR_WORK, **kwargs)


def build_pipeline() -> CairnPipeline:
    return CairnPipeline.build(use_mock_audio=True, use_mock_linguistic=True)


def run_arc(
    pipeline: CairnPipeline,
    ling_kwargs: dict,
    n_entries: int,
    label: str,
    verbose: bool = True,
) -> list[PipelineResult]:
    """Run n_entries through the pipeline with fixed linguistic signal."""
    persona = create_persona("test_user", BASE_DEMO)
    results = []

    if verbose:
        print(f"\n{'─'*55}")
        print(f"Arc: {label}")
        print(f"{'─'*55}")

    for i in range(n_entries):
        # Patch the mock extractor to return our controlled signal
        pipeline.linguistic = _ControlledExtractor(make_ling(ling_kwargs))

        entry = RawEntry(
            user_id="test_user",
            audio_path=f"memo_day{i+1}.wav",
            transcript=f"Day {i+1} memo text.",
            timestamp=time.time() + i * 86400,
            day_number=i + 1,
        )
        result = pipeline.process(entry, persona)
        results.append(result)

        if verbose:
            print(
                f"  Day {i+1:2d}: stress={result.stage_scores.stress_score:.2f}  "
                f"recovery={result.stage_scores.recovery_score:.2f}  "
                f"raw={result.stage_scores.raw_stage.value:<16}  "
                f"→ {result.current_stage.value:<16}  "
                f"crisis={result.crisis_flag}"
            )

    return results


class _ControlledExtractor(MockLinguisticExtractor):
    """Override mock to return a specific fixed LinguisticFeatures."""

    def __init__(self, features: LinguisticFeatures):
        self._features = features

    def extract(self, transcript: str) -> LinguisticFeatures:
        return self._features


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────


def test_crisis_arc():
    """Sustained crisis signal → In the storm by day 8-10."""
    pipeline = build_pipeline()
    results = run_arc(pipeline, CRISIS_LING, n_entries=10, label="Crisis arc")

    final_stage = results[-1].current_stage
    assert (
        final_stage == Stage.IN_THE_STORM
    ), f"Expected IN_THE_STORM after 10 crisis entries, got {final_stage}"

    # Stress score should be consistently high
    for r in results[3:]:
        assert (
            r.stage_scores.stress_score > 0.60
        ), f"Expected stress > 0.60, got {r.stage_scores.stress_score:.2f}"

    print("  PASS: crisis arc reaches In the storm")


def test_recovery_arc():
    """Sustained recovery signal → Through it by day 8-10."""
    pipeline = build_pipeline()
    results = run_arc(pipeline, RECOVERY_LING, n_entries=10, label="Recovery arc")

    final_stage = results[-1].current_stage
    assert (
        final_stage == Stage.THROUGH_IT
    ), f"Expected THROUGH_IT after 10 recovery entries, got {final_stage}"

    # Recovery score should be consistently high after the EMA warm-up period.
    for r in results[5:]:
        assert (
            r.stage_scores.recovery_score > 0.70
        ), f"Expected recovery > 0.70, got {r.stage_scores.recovery_score:.2f}"

    print("  PASS: recovery arc reaches Through it")


def test_mixed_arc_stays_finding_ground():
    """Neutral signal stays in Finding ground — no strong evidence either way."""
    pipeline = build_pipeline()
    results = run_arc(pipeline, NEUTRAL_LING, n_entries=10, label="Neutral arc")

    final_stage = results[-1].current_stage
    assert (
        final_stage == Stage.FINDING_GROUND
    ), f"Expected FINDING_GROUND for neutral entries, got {final_stage}"

    print("  PASS: neutral arc stays in Finding ground")


def test_no_compulsory_storm_passage():
    """
    Recovery arc should reach Through it WITHOUT ever touching In the storm.
    This validates the core design: stage is not a linear progression.
    """
    pipeline = build_pipeline()
    results = run_arc(
        pipeline,
        RECOVERY_LING,
        n_entries=10,
        label="Recovery — no storm passage",
        verbose=False,
    )

    stages_visited = {r.current_stage for r in results}
    assert (
        Stage.IN_THE_STORM not in stages_visited
    ), "User should NOT pass through In the storm on a recovery arc"
    assert (
        Stage.THROUGH_IT in stages_visited
    ), "User should reach Through it on a recovery arc"

    print("  PASS: Through it reached without touching In the storm")


def test_regression_possible():
    """
    User can move backward: Through it → Finding ground if signal changes.
    Stage is a GPS, not a one-way road.
    """
    pipeline = build_pipeline()
    persona = create_persona("regression_user", BASE_DEMO)

    # First 10 entries: recovery
    for i in range(10):
        pipeline.linguistic = _ControlledExtractor(make_ling(RECOVERY_LING))
        entry = RawEntry(
            user_id="regression_user",
            audio_path=f"memo_day{i+1}.wav",
            transcript="Feeling good.",
            timestamp=time.time() + i * 86400,
            day_number=i + 1,
        )
        pipeline.process(entry, persona)

    assert (
        persona.stage.current == Stage.THROUGH_IT
    ), f"Should be THROUGH_IT after 10 recovery entries, got {persona.stage.current}"

    # Next 10 entries: crisis signal
    print("\n  Simulating regression (10 crisis entries after Through it):")
    for i in range(10):
        pipeline.linguistic = _ControlledExtractor(make_ling(CRISIS_LING))
        entry = RawEntry(
            user_id="regression_user",
            audio_path=f"memo_day{i+11}.wav",
            transcript="Things got hard again.",
            timestamp=time.time() + (i + 10) * 86400,
            day_number=i + 11,
        )
        result = pipeline.process(entry, persona)
        print(
            f"    Day {i+11:2d}: raw={result.stage_scores.raw_stage.value:<16} "
            f"→ {result.current_stage.value}"
        )

    # After 10 crisis entries the persona should have regressed
    assert (
        persona.stage.current != Stage.THROUGH_IT
    ), "Stage should have regressed after sustained crisis signal"
    print("  PASS: regression from Through it to lower stage works")


def test_crisis_safety_flag():
    """Urgency signal > 0.85 triggers crisis flag immediately."""
    pipeline = build_pipeline()
    persona = create_persona("crisis_user", BASE_DEMO)

    acute_crisis = dict(CRISIS_LING)
    acute_crisis["urgency_signal"] = 0.92
    pipeline.linguistic = _ControlledExtractor(make_ling(acute_crisis))

    entry = RawEntry(
        user_id="crisis_user",
        audio_path="memo_day1.wav",
        transcript="I can't take this anymore.",
        timestamp=time.time(),
        day_number=1,
    )
    result = pipeline.process(entry, persona)

    assert result.crisis_flag, "Crisis flag should be True for urgency_signal=0.92"
    assert result.crisis_reason is not None
    print(f"  PASS: crisis flag fires on day 1 — reason: {result.crisis_reason}")


def test_broken_audio_graceful():
    """Broken audio path does not crash pipeline — degrades gracefully."""
    pipeline = build_pipeline()
    persona = create_persona("graceful_user", BASE_DEMO)

    entry = RawEntry(
        user_id="graceful_user",
        audio_path="/nonexistent/path/memo.wav",
        transcript="I recorded something but the file got corrupted.",
        timestamp=time.time(),
        day_number=1,
    )
    # Should not raise — should return a result with zero acoustic features
    result = pipeline.process(entry, persona)
    assert result.succeeded, "Pipeline should succeed even with broken audio"
    assert persona.entry_count == 1, "Persona should still be updated"
    print("  PASS: broken audio path handled gracefully")


def test_timing_keys_present():
    """PipelineResult.timing contains expected keys."""
    pipeline = build_pipeline()
    persona = create_persona("timing_user", BASE_DEMO)

    entry = RawEntry(
        user_id="timing_user",
        audio_path="memo.wav",
        transcript="Quick check.",
        timestamp=time.time(),
        day_number=1,
    )
    result = pipeline.process(entry, persona)

    for key in ["acoustic_ms", "linguistic_ms", "persona_ms", "stage_ms", "total_ms"]:
        assert key in result.timing, f"Missing timing key: {key}"
    print(f"  PASS: timing keys present — {result.timing}")


def test_full_persona_shape():
    """After 5 entries, all persona vectors have correct shapes."""
    pipeline = build_pipeline()
    persona = create_persona("shape_user", BASE_DEMO)

    for i in range(5):
        entry = RawEntry(
            user_id="shape_user",
            audio_path=f"memo_day{i+1}.wav",
            transcript=f"Day {i+1}.",
            timestamp=time.time() + i * 86400,
            day_number=i + 1,
        )
        pipeline.process(entry, persona)

    assert persona.vectors.full_vector.shape == (100,), "full_vector should be (100,)"
    assert persona.vectors.state_vector.shape == (80,), "state_vector should be (80,)"
    assert persona.vectors.identity.shape == (16,), "identity should be (16,)"
    assert persona.stressor_dist.shape == (8,), "stressor_dist should be (8,)"
    assert (
        abs(persona.stressor_dist.sum() - 1.0) < 0.01
    ), "stressor_dist should sum to 1"
    print(f"  PASS: all persona vector shapes correct after 5 entries")


# ─────────────────────────────────────────────────────────────────────────────
# Runner
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("Cairn Pipeline — end-to-end integration tests")
    print("=" * 55)

    test_crisis_arc()
    test_recovery_arc()
    test_mixed_arc_stays_finding_ground()
    test_no_compulsory_storm_passage()
    test_regression_possible()
    test_crisis_safety_flag()
    test_broken_audio_graceful()
    test_timing_keys_present()
    test_full_persona_shape()

    print("\n" + "=" * 55)
    print("All pipeline tests passed.")
    print("=" * 55)

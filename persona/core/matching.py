"""
cairn/core/matching.py

Circle formation engine — the online matching algorithm that runs
when a user presses "I need help."

Implements the 8-step constrained diversity selection from the design doc:

    Step 1  — Find the user's pre-computed match pool (cluster)
    Step 2  — Filter by availability (online, not in session)
    Step 3  — Filter by minimum identity + stressor similarity
    Step 4  — Separate candidates into stage buckets
    Step 5  — Trajectory safety gate (exclude rapidly worsening users)
    Step 6  — Score and rank within each stage bucket
    Step 7  — Compose the circle (1 storm + 1-2 finding + 1 through-it)
    Step 8  — Fallback: synthetic echo if a stage bucket is empty

Key design principle:
    Similarity and contrast are computed on DIFFERENT slices of the persona:
        identity + stressor  → who belongs in the same pool (relatability)
        stage + trajectory   → who belongs in which role  (contrast)
        stressor similarity  → who is the best fit within a bucket (ranking)

    Never flatten everything into one similarity score.
"""

from __future__ import annotations

import uuid
import logging
from dataclasses import dataclass, field
from typing import Optional
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from persona.core.config import CONFIG
from persona.core.models import (
    Circle,
    CircleMember,
    Dims,
    Stage,
    UserPersona,
)
from persona.core.utils import cosine_similarity, clip_normalize

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Similarity helpers
# ─────────────────────────────────────────────────────────────────────────────


def identity_similarity(a: UserPersona, b: UserPersona) -> float:
    """Cosine similarity on the 16-dim identity vectors."""
    return cosine_similarity(a.vectors.identity, b.vectors.identity)


def stressor_similarity(a: UserPersona, b: UserPersona) -> float:
    """
    Cosine similarity on the 8-dim stressor distributions.
    High = they share the same domain of pain (work, relationships, loss, etc.)
    This is what makes a circle feel relevant, not generic.
    """
    return cosine_similarity(a.stressor_dist, b.stressor_dist)


def acoustic_similarity(a: UserPersona, b: UserPersona) -> float:
    """
    Cosine similarity on long-term acoustic vectors.
    Captures speech rhythm, pace, energy patterns.
    Used as a soft tiebreaker — not a hard filter.
    """
    return cosine_similarity(a.vectors.acoustic_long, b.vectors.acoustic_long)


# ─────────────────────────────────────────────────────────────────────────────
# Candidate scoring
# ─────────────────────────────────────────────────────────────────────────────


def score_candidate(requester: UserPersona, candidate: UserPersona) -> float:
    """
    Score a candidate within their stage bucket.
    Higher = better match for the requester.

    Three components (weights from MatchingConfig):
        stressor_similarity   — shares the same pain domain     (0.50)
        entry_count           — established persona, reliable    (0.30)
        trajectory_recovery   — moving in a positive direction   (0.20)

    We do NOT score on identity similarity here — identity was already
    used as a hard filter in Step 3. Within the bucket, stressor domain
    alignment is what matters most.
    """
    cfg = CONFIG.matching

    stressor_sim = stressor_similarity(requester, candidate)

    entry_norm = clip_normalize(
        candidate.entry_count,
        min_val=0.0,
        max_val=float(cfg.max_entry_count_norm),
    )

    # trajectory_recovery is in (-1, 1) — normalize to [0, 1]
    recovery_norm = clip_normalize(
        candidate.trajectory_recovery,
        min_val=-1.0,
        max_val=1.0,
    )

    return (
        cfg.stressor_similarity_weight * stressor_sim
        + cfg.entry_count_weight * entry_norm
        + cfg.trajectory_recovery_weight * recovery_norm
    )


# ─────────────────────────────────────────────────────────────────────────────
# Synthetic echo (Memory Wall fallback)
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class SyntheticEchoConfig:
    """
    Configuration for a synthetic "Through it" echo.
    In production, this would be seeded from real past circles
    whose stressor profile matches the requester.
    For now it's a placeholder that the session layer can render
    as a Memory Wall message.
    """

    stressor_dist: np.ndarray  # matched to requester's stressor profile
    stage: Stage = Stage.THROUGH_IT
    source_label: str = "memory_wall"


def make_synthetic_echo(requester: UserPersona) -> CircleMember:
    """
    Create a synthetic CircleMember to fill a missing stage slot.

    The synthetic member carries the requester's stressor distribution
    so the session layer can surface relevant past echoes.
    In the session, this renders as a curated message from someone who
    went through the same stressor domain and came out the other side.
    """
    return CircleMember(
        user_id=f"synthetic_{uuid.uuid4().hex[:8]}",
        stage=Stage.THROUGH_IT,
        is_synthetic=True,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Stage buckets
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class StageBuckets:
    """
    Candidates split by stage after all filters are applied.
    Each list is already sorted by score (best first).
    """

    in_storm: list[UserPersona] = field(default_factory=list)
    finding: list[UserPersona] = field(default_factory=list)
    through_it: list[UserPersona] = field(default_factory=list)

    def total(self) -> int:
        return len(self.in_storm) + len(self.finding) + len(self.through_it)


# ─────────────────────────────────────────────────────────────────────────────
# Matching result — richer than just a Circle
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class MatchResult:
    """
    Full result of a match attempt.
    Circle is None if matching failed entirely (not enough candidates).
    """

    circle: Optional[Circle]
    requester_id: str
    pool_size: int  # how many users were in the cluster
    available_count: int  # after availability filter
    candidate_count: int  # after similarity filter
    used_synthetic: bool  # True if a memory wall echo was inserted
    failure_reason: Optional[str] = None  # set if circle is None

    @property
    def succeeded(self) -> bool:
        return self.circle is not None


# ─────────────────────────────────────────────────────────────────────────────
# The matching engine
# ─────────────────────────────────────────────────────────────────────────────


class MatchingEngine:
    """
    Stateless circle formation engine.

    One instance shared across all requests.
    All state is in UserPersona objects passed by the caller.

    In production:
        - `pool` comes from a pre-computed cluster (HDBSCAN offline job).
        - The engine is called on the hot path — it must be fast.
        - No I/O, no model inference. Pure numpy + comparisons.

    Usage:
        engine = MatchingEngine()
        result = engine.match(requester=user_persona, pool=cluster_members)

        if result.succeeded:
            session.start(result.circle)
        else:
            handle_failure(result.failure_reason)
    """

    # ── Public API ────────────────────────────────────────────────────────────

    def match(
        self,
        requester: UserPersona,
        pool: list[UserPersona],
    ) -> MatchResult:
        """
        Full 8-step circle formation.

        Args:
            requester:  the user pressing "I need help"
            pool:       pre-computed match pool for this user's cluster.
                        Must NOT include the requester themselves.

        Returns:
            MatchResult with a Circle if successful, failure info otherwise.
        """
        pool_size = len(pool)

        # ── Step 2: Availability filter ───────────────────────────────────
        available = [u for u in pool if u.is_available]
        available_count = len(available)

        if not available:
            return self._fail(
                requester,
                pool_size,
                available_count=0,
                reason="No users currently available in match pool.",
            )

        # ── Step 3: Minimum similarity filter ─────────────────────────────
        cfg = CONFIG.matching
        candidates = [
            u
            for u in available
            if (
                identity_similarity(requester, u) >= cfg.min_identity_similarity
                and stressor_similarity(requester, u) >= cfg.min_stressor_similarity
            )
        ]
        candidate_count = len(candidates)

        if not candidates:
            return self._fail(
                requester,
                pool_size,
                available_count,
                reason=(
                    f"No candidates passed similarity filter "
                    f"(identity≥{cfg.min_identity_similarity}, "
                    f"stressor≥{cfg.min_stressor_similarity}). "
                    f"Pool may be too small or too homogeneous in stage."
                ),
            )

        # ── Step 4: Split into stage buckets ──────────────────────────────
        buckets = self._split_by_stage(candidates)

        # ── Step 5: Trajectory safety gate ────────────────────────────────
        # Exclude anyone on a rapid downward spiral from group sessions.
        # They need 1:1 crisis support, not a circle.
        # IN_THE_STORM members are allowed — they ARE the crisis presence.
        # But even storm members must not be rapidly worsening (that's a
        # different kind of acute — unstable, not just struggling).
        max_traj = cfg.max_trajectory_stress_for_circle

        buckets.in_storm = [
            u for u in buckets.in_storm if u.trajectory_stress < max_traj
        ]
        buckets.finding = [u for u in buckets.finding if u.trajectory_stress < max_traj]
        buckets.through_it = [
            u for u in buckets.through_it if u.trajectory_stress < 0.10
        ]

        # ── Step 6: Score and rank within each bucket ─────────────────────
        buckets.in_storm = sorted(
            buckets.in_storm, key=lambda u: score_candidate(requester, u), reverse=True
        )
        buckets.finding = sorted(
            buckets.finding, key=lambda u: score_candidate(requester, u), reverse=True
        )
        buckets.through_it = sorted(
            buckets.through_it,
            key=lambda u: score_candidate(requester, u),
            reverse=True,
        )

        # ── Step 7: Compose the circle ────────────────────────────────────
        members, used_synthetic = self._compose(requester, buckets)

        if len(members) < cfg.min_circle_size:
            return self._fail(
                requester,
                pool_size,
                available_count,
                candidate_count=candidate_count,
                reason=(
                    f"Not enough stage-diverse candidates to form a circle "
                    f"(need ≥{cfg.min_circle_size}, got {len(members)} after "
                    f"stage composition + trajectory gate)."
                ),
            )

        circle = Circle(
            circle_id=uuid.uuid4().hex,
            members=members,
            requester_id=requester.user_id,
        )

        logger.info(
            "Circle formed: id=%s requester=%s size=%d synthetic=%s stage_summary=%s",
            circle.circle_id,
            requester.user_id,
            circle.size,
            used_synthetic,
            circle.stage_summary(),
        )

        return MatchResult(
            circle=circle,
            requester_id=requester.user_id,
            pool_size=pool_size,
            available_count=available_count,
            candidate_count=candidate_count,
            used_synthetic=used_synthetic,
        )

    # ── Internal steps ────────────────────────────────────────────────────────

    def _split_by_stage(self, candidates: list[UserPersona]) -> StageBuckets:
        buckets = StageBuckets()
        for u in candidates:
            if u.stage.current == Stage.IN_THE_STORM:
                buckets.in_storm.append(u)
            elif u.stage.current == Stage.THROUGH_IT:
                buckets.through_it.append(u)
            else:
                buckets.finding.append(u)
        return buckets

    def _compose(
        self,
        requester: UserPersona,
        buckets: StageBuckets,
    ) -> tuple[list[CircleMember], bool]:
        """
        Step 7 + 8: compose the circle from stage buckets, with fallback.

        Target composition:
            1 IN_THE_STORM   — the requester themselves, or top storm candidate
            1-2 FINDING_GROUND — the bridge (processing, not crisis)
            1 THROUGH_IT     — the anchor (has come out the other side)

        The requester always joins as their own stage.
        """
        members: list[CircleMember] = []
        used_synthetic = False

        # Always add the requester first
        members.append(
            CircleMember(
                user_id=requester.user_id,
                stage=requester.stage.current,
            )
        )

        requester_stage = requester.stage.current

        # ── Storm slot ────────────────────────────────────────────────────
        # If requester is not in storm, add one storm member for contrast.
        # If requester IS in storm, the slot is already filled by them.
        if requester_stage != Stage.IN_THE_STORM:
            if buckets.in_storm:
                members.append(
                    CircleMember(
                        user_id=buckets.in_storm[0].user_id,
                        stage=Stage.IN_THE_STORM,
                    )
                )

        # ── Finding ground slots (1-2) ────────────────────────────────────
        # Take up to 2. Skip the requester if they're already in finding.
        finding_added = 0
        for u in buckets.finding:
            if u.user_id == requester.user_id:
                continue
            if finding_added >= 2:
                break
            members.append(
                CircleMember(
                    user_id=u.user_id,
                    stage=Stage.FINDING_GROUND,
                )
            )
            finding_added += 1

        # ── Through-it slot ───────────────────────────────────────────────
        # Step 8: if nobody available, insert synthetic echo.
        through_it_candidates = [
            u for u in buckets.through_it if u.user_id != requester.user_id
        ]

        if through_it_candidates:
            members.append(
                CircleMember(
                    user_id=through_it_candidates[0].user_id,
                    stage=Stage.THROUGH_IT,
                )
            )
        else:
            # Fallback: Memory Wall synthetic echo
            members.append(make_synthetic_echo(requester))
            used_synthetic = True
            logger.info(
                "No live Through-it member available for requester=%s — "
                "inserted synthetic echo.",
                requester.user_id,
            )

        # Enforce max circle size
        cfg = CONFIG.matching
        if len(members) > cfg.max_circle_size:
            members = members[: cfg.max_circle_size]

        return members, used_synthetic

    def _fail(
        self,
        requester: UserPersona,
        pool_size: int,
        available_count: int = 0,
        candidate_count: int = 0,
        reason: str = "",
    ) -> MatchResult:
        logger.warning(
            "Circle formation failed for requester=%s: %s",
            requester.user_id,
            reason,
        )
        return MatchResult(
            circle=None,
            requester_id=requester.user_id,
            pool_size=pool_size,
            available_count=available_count,
            candidate_count=candidate_count,
            used_synthetic=False,
            failure_reason=reason,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Offline clustering helpers (pre-computation, not on hot path)
# ─────────────────────────────────────────────────────────────────────────────


def build_cluster_input(persona: UserPersona) -> np.ndarray:
    """
    24-dim vector used for offline HDBSCAN clustering.

    Layout: [identity (16), stressor_dist (8)]
    = 24 dims — small and fast to cluster.

    Only identity + stressor go into clustering because:
        - Identity defines who belongs together (life context)
        - Stressor defines the pain domain
        - Stage is NOT included — we want stage-diverse pools,
          not pools where everyone is in the same stage.
    """
    return np.concatenate(
        [
            persona.vectors.identity,  # (16,)
            persona.stressor_dist,  # (8,)
        ]
    ).astype(np.float32)


def assign_clusters(
    personas: list[UserPersona],
    min_cluster_size: int = 10,
) -> dict[str, str]:
    """
    Run HDBSCAN on all active personas and return a user_id → cluster_id map.

    Call this offline every few hours, not on the matching hot path.
    Results are stored in persona.cluster_id.

    Requires: pip install hdbscan

    Returns:
        dict mapping user_id → cluster_id string.
        Users labeled as noise (cluster=-1) get cluster_id="unassigned".
    """
    try:
        import hdbscan
    except ImportError:
        raise ImportError(
            "hdbscan is required for clustering. " "Install with: pip install hdbscan"
        )

    if len(personas) < min_cluster_size:
        # Not enough users to cluster — put everyone in one pool
        return {p.user_id: "default_pool" for p in personas}

    X = np.stack([build_cluster_input(p) for p in personas])

    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        metric="cosine",
        cluster_selection_method="eom",
    )
    labels = clusterer.fit_predict(X)

    result = {}
    for persona, label in zip(personas, labels):
        cluster_id = f"cluster_{label:03d}" if label >= 0 else "unassigned"
        result[persona.user_id] = cluster_id

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = int((labels == -1).sum())
    logger.info(
        "Clustering complete: %d users → %d clusters, %d noise",
        len(personas),
        n_clusters,
        n_noise,
    )

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Smoke test
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import time
    from persona.core.models import (
        AcousticFeatures,
        AgeGroup,
        EntryFeatures,
        LinguisticFeatures,
        OccupationCategory,
        StageState,
        UserDemographics,
    )
    from persona.core.persona import PersonaEngine, create_persona
    from persona.core.stage import run_stage_update

    print("=" * 60)
    print("Matching Engine — smoke test")
    print("=" * 60)

    engine_p = PersonaEngine()
    engine_m = MatchingEngine()
    rng = np.random.RandomState(0)

    # ── Shared demographics (same cluster) ───────────────────────────────
    base_demo = dict(
        age_group=AgeGroup.LATE_20S,
        occupation=OccupationCategory.EARLY_CAREER,
        industry="software",
        language_code="ne",
        region_code="NP",
        living_situation="family",
    )

    def make_user(uid: str, ling_kwargs: dict, n: int = 8) -> UserPersona:
        """Build a persona with n entries of consistent linguistic signal."""
        demo = UserDemographics(**base_demo)
        p = create_persona(uid, demo)
        for i in range(n):
            proj = rng.randn(Dims.ACOUSTIC).astype(np.float32)
            proj /= np.linalg.norm(proj)
            ling = LinguisticFeatures(
                stressor_dist=np.array(
                    [0.05, 0.55, 0.1, 0.1, 0.1, 0.0, 0.1, 0.0],
                    dtype=np.float32,
                ),
                **ling_kwargs,
            )
            entry = EntryFeatures(
                user_id=uid,
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
            engine_p.update(p, entry, proj, streak_days=i + 1)
            run_stage_update(p.vectors, p.stage, p.entry_count)
        p.is_available = True
        return p

    # Build a pool with stage diversity
    crisis_kwargs = dict(
        valence=0.15,
        arousal=0.80,
        agency_score=0.15,
        distortion_score=0.80,
        coping_score=0.10,
        past_orientation=0.70,
        present_orientation=0.20,
        future_orientation=0.10,
        urgency_signal=0.60,
        help_seeking_signal=0.60,
    )
    finding_kwargs = dict(
        valence=0.50,
        arousal=0.50,
        agency_score=0.50,
        distortion_score=0.30,
        coping_score=0.50,
        past_orientation=0.35,
        present_orientation=0.40,
        future_orientation=0.25,
        urgency_signal=0.20,
        help_seeking_signal=0.30,
    )
    recovery_kwargs = dict(
        valence=0.85,
        arousal=0.50,
        agency_score=0.85,
        distortion_score=0.08,
        coping_score=0.88,
        past_orientation=0.10,
        present_orientation=0.45,
        future_orientation=0.45,
        urgency_signal=0.03,
        help_seeking_signal=0.05,
    )

    print("\nBuilding personas...")
    requester = make_user("requester", crisis_kwargs, n=8)
    finding_1 = make_user("finding_1", finding_kwargs, n=10)
    finding_2 = make_user("finding_2", finding_kwargs, n=7)
    through_1 = make_user("through_1", recovery_kwargs, n=15)

    pool = [finding_1, finding_2, through_1]

    print(f"\nPersona stages:")
    for p in [requester] + pool:
        print(
            f"  {p.user_id:<12} stage={p.stage.current.value:<16} "
            f"conf={p.stage.confidence:.2f}  "
            f"traj_stress={p.trajectory_stress:.3f}  "
            f"traj_recov={p.trajectory_recovery:.3f}"
        )

    # ── Scenario 1: normal match ──────────────────────────────────────────
    print("\n─── Scenario 1: Normal match ───")
    result = engine_m.match(requester=requester, pool=pool)
    print(f"  succeeded:     {result.succeeded}")
    print(f"  pool_size:     {result.pool_size}")
    print(f"  candidates:    {result.candidate_count}")
    print(f"  used_synthetic:{result.used_synthetic}")
    if result.circle:
        print(f"  circle_id:     {result.circle.circle_id}")
        print(f"  size:          {result.circle.size}")
        print(f"  stage_summary: {result.circle.stage_summary()}")
        print(f"  members:")
        for m in result.circle.members:
            tag = " [synthetic]" if m.is_synthetic else ""
            print(f"    {m.user_id:<16} {m.stage.value}{tag}")

    # ── Scenario 2: no through-it available → synthetic fallback ─────────
    print("\n─── Scenario 2: No Through-it → synthetic echo ───")
    pool_no_recovery = [finding_1, finding_2]
    result2 = engine_m.match(requester=requester, pool=pool_no_recovery)
    print(f"  succeeded:      {result2.succeeded}")
    print(f"  used_synthetic: {result2.used_synthetic}")
    if result2.circle:
        print(f"  stage_summary:  {result2.circle.stage_summary()}")
        for m in result2.circle.members:
            tag = " [synthetic]" if m.is_synthetic else ""
            print(f"    {m.user_id:<16} {m.stage.value}{tag}")

    # ── Scenario 3: empty pool → graceful failure ─────────────────────────
    print("\n─── Scenario 3: Empty pool → graceful failure ───")
    result3 = engine_m.match(requester=requester, pool=[])
    print(f"  succeeded:      {result3.succeeded}")
    print(f"  failure_reason: {result3.failure_reason}")

    # ── Scenario 4: pool available but nobody passes similarity filter ────
    print("\n─── Scenario 4: Similarity filter blocks all candidates ───")
    # Make a user with very different demographics
    diff_demo = UserDemographics(
        age_group=AgeGroup.OLDER,
        occupation=OccupationCategory.LEADERSHIP,
        industry="government",
        language_code="ar",
        region_code="NG",
        living_situation="alone",
    )
    outlier = create_persona("outlier", diff_demo)
    outlier.is_available = True
    # Give them some entries so they're not zero vectors
    for i in range(5):
        proj = rng.randn(Dims.ACOUSTIC).astype(np.float32)
        proj /= np.linalg.norm(proj)
        ling = LinguisticFeatures(
            stressor_dist=np.array(
                [0.0, 0.0, 0.0, 0.0, 0.1, 0.8, 0.1, 0.0], dtype=np.float32
            ),
            valence=0.50,
            arousal=0.50,
            agency_score=0.50,
            distortion_score=0.30,
            coping_score=0.50,
            past_orientation=0.35,
            present_orientation=0.40,
            future_orientation=0.25,
            urgency_signal=0.10,
            help_seeking_signal=0.10,
        )
        entry = EntryFeatures(
            user_id="outlier",
            timestamp=time.time() + i * 86400,
            day_number=i + 1,
            acoustic=AcousticFeatures(
                embedding=rng.randn(768).astype(np.float32), duration_sec=60.0
            ),
            linguistic=ling,
            memo_length_seconds=60.0,
            hour_of_day=14,
        )
        engine_p.update(outlier, entry, proj, streak_days=i + 1)
        run_stage_update(outlier.vectors, outlier.stage, outlier.entry_count)

    result4 = engine_m.match(requester=requester, pool=[outlier])
    print(f"  succeeded:      {result4.succeeded}")
    print(f"  failure_reason: {result4.failure_reason}")

    print(f"\n{'='*60}")
    print("Smoke test complete.")

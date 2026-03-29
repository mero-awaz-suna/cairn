"""
cairn/core/matching.py

Circle formation engine — runs when a user presses "I need help."

Key design:
    - Offline users ARE matched — only hard exclusion is being in another session
    - No synthetic echo in circle — Memory Wall is a separate UI feature
    - Simplified for hackathon demo

Steps:
    1. Exclude users currently in another active session
    2. Minimum identity + stressor similarity filter
    3. Split into stage buckets
    4. Trajectory safety gate
    5. Score and rank within each bucket
    6. Compose circle
"""

from __future__ import annotations

import uuid
import logging
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from .config import CONFIG
from .models import Circle, CircleMember, Stage, UserPersona
from .utils import cosine_similarity, clip_normalize

logger = logging.getLogger(__name__)


def identity_similarity(a: UserPersona, b: UserPersona) -> float:
    return cosine_similarity(a.vectors.identity, b.vectors.identity)


def stressor_similarity(a: UserPersona, b: UserPersona) -> float:
    return cosine_similarity(a.stressor_dist, b.stressor_dist)


def score_candidate(requester: UserPersona, candidate: UserPersona) -> float:
    cfg = CONFIG.matching
    return (
        cfg.stressor_similarity_weight * stressor_similarity(requester, candidate)
        + cfg.entry_count_weight
        * clip_normalize(candidate.entry_count, 0.0, float(cfg.max_entry_count_norm))
        + cfg.trajectory_recovery_weight
        * clip_normalize(candidate.trajectory_recovery, -1.0, 1.0)
    )


@dataclass
class StageBuckets:
    in_storm: list[UserPersona] = field(default_factory=list)
    finding: list[UserPersona] = field(default_factory=list)
    through_it: list[UserPersona] = field(default_factory=list)


@dataclass
class MatchResult:
    circle: Optional[Circle]
    requester_id: str
    pool_size: int
    candidate_count: int
    failure_reason: Optional[str] = None

    @property
    def succeeded(self) -> bool:
        return self.circle is not None


class MatchingEngine:
    """
    Stateless circle formation engine.

    Offline users are included — system notifies them when matched.
    Only users in an active session are excluded.
    """

    def match(
        self,
        requester: UserPersona,
        pool: list[UserPersona],
        active_sessions: Optional[set] = None,
    ) -> MatchResult:
        active_sessions = active_sessions or set()
        pool_size = len(pool)

        # Step 1: exclude users in another active session only
        candidates = [u for u in pool if u.user_id not in active_sessions]
        if not candidates:
            return self._fail(
                requester,
                pool_size,
                0,
                "All pool members are currently in another session.",
            )

        # Step 2: similarity filter
        cfg = CONFIG.matching
        candidates = [
            u
            for u in candidates
            if identity_similarity(requester, u) >= cfg.min_identity_similarity
            and stressor_similarity(requester, u) >= cfg.min_stressor_similarity
        ]
        if not candidates:
            return self._fail(
                requester,
                pool_size,
                0,
                f"No candidates passed similarity filter "
                f"(id≥{cfg.min_identity_similarity}, "
                f"stressor≥{cfg.min_stressor_similarity}).",
            )

        candidate_count = len(candidates)

        # Step 3: stage buckets
        buckets = StageBuckets()
        for u in candidates:
            if u.stage.current == Stage.IN_THE_STORM:
                buckets.in_storm.append(u)
            elif u.stage.current == Stage.THROUGH_IT:
                buckets.through_it.append(u)
            else:
                buckets.finding.append(u)

        # Step 4: trajectory safety gate
        max_t = cfg.max_trajectory_stress_for_circle
        buckets.in_storm = [u for u in buckets.in_storm if u.trajectory_stress < max_t]
        buckets.finding = [u for u in buckets.finding if u.trajectory_stress < max_t]
        buckets.through_it = [
            u for u in buckets.through_it if u.trajectory_stress < 0.10
        ]

        # Step 5: rank within each bucket
        for lst in (buckets.in_storm, buckets.finding, buckets.through_it):
            lst.sort(key=lambda u: score_candidate(requester, u), reverse=True)

        # Step 6: compose
        members = self._compose(requester, buckets)

        if len(members) < cfg.min_circle_size:
            return self._fail(
                requester,
                pool_size,
                candidate_count,
                f"Not enough stage-diverse candidates "
                f"(need ≥{cfg.min_circle_size}, got {len(members)}).",
            )

        circle = Circle(
            circle_id=uuid.uuid4().hex,
            members=members,
            requester_id=requester.user_id,
            requester_stressor_dist=requester.stressor_dist.copy(),
        )
        logger.info(
            "Circle formed: id=%s requester=%s size=%d stage=%s",
            circle.circle_id,
            requester.user_id,
            circle.size,
            circle.stage_summary(),
        )

        return MatchResult(
            circle=circle,
            requester_id=requester.user_id,
            pool_size=pool_size,
            candidate_count=candidate_count,
        )

    def _compose(
        self, requester: UserPersona, buckets: StageBuckets
    ) -> list[CircleMember]:
        members = [
            CircleMember(user_id=requester.user_id, stage=requester.stage.current)
        ]

        if requester.stage.current != Stage.IN_THE_STORM and buckets.in_storm:
            members.append(
                CircleMember(
                    user_id=buckets.in_storm[0].user_id, stage=Stage.IN_THE_STORM
                )
            )

        count = 0
        for u in buckets.finding:
            if u.user_id == requester.user_id or count >= 2:
                continue
            members.append(CircleMember(user_id=u.user_id, stage=Stage.FINDING_GROUND))
            count += 1

        for u in buckets.through_it:
            if u.user_id != requester.user_id:
                members.append(CircleMember(user_id=u.user_id, stage=Stage.THROUGH_IT))
                break

        return members[: CONFIG.matching.max_circle_size]

    def _fail(self, requester, pool_size, candidate_count, reason) -> MatchResult:
        logger.warning("Match failed: user=%s reason=%s", requester.user_id, reason)
        return MatchResult(
            circle=None,
            requester_id=requester.user_id,
            pool_size=pool_size,
            candidate_count=candidate_count,
            failure_reason=reason,
        )


def build_cluster_input(persona: UserPersona) -> np.ndarray:
    return np.concatenate([persona.vectors.identity, persona.stressor_dist]).astype(
        np.float32
    )


def assign_clusters(
    personas: list[UserPersona], min_cluster_size: int = 5
) -> dict[str, str]:
    """Offline HDBSCAN clustering. Call periodically, not on hot path."""
    try:
        import hdbscan
    except ImportError:
        raise ImportError("pip install hdbscan")

    if len(personas) < min_cluster_size:
        return {p.user_id: "default_pool" for p in personas}

    X = np.stack([build_cluster_input(p) for p in personas])

    try:
        labels = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size, metric="cosine"
        ).fit_predict(X)
    except ValueError as exc:
        # Some sklearn/hdbscan builds on Windows reject 'cosine' in BallTree.
        # Fallback: L2-normalize vectors and use euclidean, which approximates
        # cosine neighborhoods for clustering purposes.
        if "Unrecognized metric 'cosine'" not in str(exc):
            raise

        norms = np.linalg.norm(X, axis=1, keepdims=True) + 1e-9
        Xn = X / norms
        labels = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size, metric="euclidean"
        ).fit_predict(Xn)

    logger.info(
        "Clustering: %d users → %d clusters",
        len(personas),
        len(set(labels)) - (1 if -1 in labels else 0),
    )
    return {
        p.user_id: (f"cluster_{l:03d}" if l >= 0 else "default_pool")
        for p, l in zip(personas, labels)
    }

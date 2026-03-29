"""
cairn/core/circle_store.py

Circle store — owns everything related to on-demand circle formation.

Called when a user presses "I need help."

Responsibilities:
    1. Load the requester's UserPersona from Supabase
    2. Load the candidate pool from the requester's cluster
       (falls back to global pool if cluster is empty or too small)
    3. Collect the set of user_ids currently in an active session
       (circles.status = 'active')
    4. Run MatchingEngine.match()
    5. If match succeeded → persist Circle + CircleMember rows, update
       user_personas.is_available flags, return CircleResult(success)
    6. If match failed → return CircleResult(failure, reason) — caller handles

No retries, no widening, no queuing — caller decides what to do on failure.

Usage:
    from core.circle_store import CircleStore, CircleResult

    store = CircleStore(supabase_client)
    result = store.form_circle(user_id="abc-123")

    if result.success:
        # result.circle is the formed Circle dataclass
        # result.circle_id is the DB uuid
        join_session(result.circle_id)
    else:
        show_error(result.failure_reason)
"""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass
from typing import Optional

from supabase import Client

from db.cluster_store import row_to_persona
from persona.core.matching import MatchingEngine, MatchResult
from persona.core.models import Circle, CircleMember, Stage, UserPersona

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Result type returned to the caller
# ─────────────────────────────────────────────────────────────────────────────

ANONYMOUS_ALIASES = [
    "Maple",
    "Cedar",
    "River",
    "Stone",
    "Ember",
    "Birch",
    "Fern",
    "Cloud",
    "Ridge",
    "Moss",
    "Aspen",
    "Brook",
    "Cliff",
    "Dune",
    "Glen",
]


@dataclass
class CircleResult:
    """
    Everything the caller needs after attempting circle formation.

    success=True  → circle and circle_db_id are populated.
    success=False → failure_reason explains why; circle is None.
    """

    success: bool
    circle: Optional[Circle] = None
    circle_db_id: Optional[str] = None  # UUID string from circles.id
    failure_reason: Optional[str] = None

    # Diagnostic info — useful for logging / analytics
    pool_size: int = 0
    candidate_count: int = 0
    duration_ms: int = 0


# ─────────────────────────────────────────────────────────────────────────────
# CircleStore
# ─────────────────────────────────────────────────────────────────────────────


class CircleStore:
    """
    Stateless store — all user state lives in Supabase, not here.

    One instance shared across all requests is fine; supabase-py is
    thread-safe for concurrent reads/writes.

    Pool selection strategy:
        1. Primary: users in the same cluster_id as the requester.
        2. Fallback: all users if the cluster pool is below MIN_POOL_SIZE.
           (Protects against sparse clusters in early growth / new regions.)
    """

    # If the requester's cluster has fewer than this many candidates,
    # fall back to the global pool.
    MIN_POOL_SIZE = 10

    def __init__(self, supabase: Client):
        self.db = supabase
        self._engine = MatchingEngine()

    # ── Public API ────────────────────────────────────────────────────────────

    def form_circle(self, user_id: str) -> CircleResult:
        """
        Attempt to form a circle for the given user.

        This is the single entry point called by the "I need help" handler.
        Safe to call from any thread / async worker.

        Returns CircleResult — never raises. All errors are caught and
        returned as failure results so the caller can surface them cleanly.
        """
        t0 = time.perf_counter()

        try:
            return self._form_circle_inner(user_id, t0)
        except Exception as exc:
            logger.exception(
                "Unexpected error in form_circle for user=%s: %s", user_id, exc
            )
            return CircleResult(
                success=False,
                failure_reason=f"Internal error: {exc}",
                duration_ms=round((time.perf_counter() - t0) * 1000),
            )

    # ── Core flow ─────────────────────────────────────────────────────────────

    def _form_circle_inner(self, user_id: str, t0: float) -> CircleResult:

        # ── Step 1: Load requester persona ────────────────────────────────────
        requester = self._load_persona(user_id)
        if requester is None:
            return CircleResult(
                success=False,
                failure_reason=f"No persona found for user_id={user_id}. "
                "Complete at least one journal entry first.",
                duration_ms=round((time.perf_counter() - t0) * 1000),
            )

        # ── Step 2: Load candidate pool ───────────────────────────────────────
        pool = self._load_pool(requester)
        # Exclude the requester themselves from the pool
        pool = [p for p in pool if p.user_id != user_id]

        # ── Step 3: Get active session user_ids (hard exclusion) ──────────────
        active_sessions = self._get_active_session_user_ids()

        # ── Step 4: Run matching engine ───────────────────────────────────────
        match_result: MatchResult = self._engine.match(
            requester=requester,
            pool=pool,
            active_sessions=active_sessions,
        )

        if not match_result.succeeded:
            logger.info(
                "Circle formation failed: user=%s reason=%s pool=%d candidates=%d",
                user_id,
                match_result.failure_reason,
                match_result.pool_size,
                match_result.candidate_count,
            )
            return CircleResult(
                success=False,
                failure_reason=match_result.failure_reason,
                pool_size=match_result.pool_size,
                candidate_count=match_result.candidate_count,
                duration_ms=round((time.perf_counter() - t0) * 1000),
            )

        # ── Step 5: Persist circle to DB ──────────────────────────────────────
        circle_db_id = self._persist_circle(match_result.circle, requester)

        logger.info(
            "Circle formed and persisted: db_id=%s size=%d user=%s stage_summary=%s",
            circle_db_id,
            match_result.circle.size,
            user_id,
            match_result.circle.stage_summary(),
        )

        return CircleResult(
            success=True,
            circle=match_result.circle,
            circle_db_id=circle_db_id,
            pool_size=match_result.pool_size,
            candidate_count=match_result.candidate_count,
            duration_ms=round((time.perf_counter() - t0) * 1000),
        )

    # ── DB: Load ──────────────────────────────────────────────────────────────

    def _load_persona(self, user_id: str) -> Optional[UserPersona]:
        """Load a single UserPersona by user_id. Returns None if not found."""
        try:
            response = (
                self.db.table("user_personas")
                .select("*")
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            if not response.data:
                return None
            return row_to_persona(response.data)
        except Exception as exc:
            logger.error("Failed to load persona for user_id=%s: %s", user_id, exc)
            return None

    def _load_pool(self, requester: UserPersona) -> list[UserPersona]:
        """
        Load the candidate pool for matching.

        Primary: same cluster as the requester.
        Fallback: full user_personas table (if cluster pool < MIN_POOL_SIZE).

        Only loads users where is_available=true OR is_available=false
        (offline users ARE included per matching.py design — only active
        session members are excluded, which happens in the engine).
        """
        cluster_id = requester.cluster_id

        # Try cluster pool first
        if cluster_id:
            cluster_pool = self._load_personas_by_cluster(cluster_id)
            if len(cluster_pool) >= self.MIN_POOL_SIZE:
                logger.debug(
                    "Using cluster pool: cluster=%s size=%d",
                    cluster_id,
                    len(cluster_pool),
                )
                return cluster_pool
            else:
                logger.info(
                    "Cluster pool too small (cluster=%s, size=%d < min=%d), "
                    "falling back to global pool.",
                    cluster_id,
                    len(cluster_pool),
                    self.MIN_POOL_SIZE,
                )

        # Fallback: global pool
        return self._load_all_personas_for_matching()

    def _load_personas_by_cluster(self, cluster_id: str) -> list[UserPersona]:
        """Fetch all user_personas rows for a given cluster_id."""
        try:
            response = (
                self.db.table("user_personas")
                .select("*")
                .eq("cluster_id", cluster_id)
                .execute()
            )
            rows = response.data or []
            return self._deserialize_rows(rows)
        except Exception as exc:
            logger.error("Failed to load cluster pool cluster=%s: %s", cluster_id, exc)
            return []

    def _load_all_personas_for_matching(self) -> list[UserPersona]:
        """
        Global fallback pool — load all personas.
        Paginated to handle large tables.
        """
        personas: list[UserPersona] = []
        page_size = 1000
        offset = 0

        while True:
            try:
                response = (
                    self.db.table("user_personas")
                    .select("*")
                    .range(offset, offset + page_size - 1)
                    .execute()
                )
            except Exception as exc:
                logger.error("Failed to load global pool at offset=%d: %s", offset, exc)
                break

            rows = response.data or []
            personas.extend(self._deserialize_rows(rows))

            if len(rows) < page_size:
                break
            offset += page_size

        logger.debug("Loaded global pool: %d personas.", len(personas))
        return personas

    def _deserialize_rows(self, rows: list[dict]) -> list[UserPersona]:
        """Deserialize a list of raw DB rows into UserPersona objects, skipping bad rows."""
        personas = []
        for row in rows:
            try:
                personas.append(row_to_persona(row))
            except Exception as exc:
                logger.warning(
                    "Skipping malformed persona row user_id=%s: %s",
                    row.get("user_id"),
                    exc,
                )
        return personas

    def _get_active_session_user_ids(self) -> set[str]:
        """
        Return the set of user_ids who are currently in an active circle session.

        Queries circle_members joined with circles where circles.status = 'active'
        and circle_members.left_at IS NULL (still in the session).

        These users are the hard exclusion in MatchingEngine.match().
        """
        try:
            response = (
                self.db.table("circle_members")
                .select("user_id, circles!inner(status)")
                .eq("circles.status", "active")
                .is_("left_at", "null")
                .execute()
            )
            rows = response.data or []
            return {str(row["user_id"]) for row in rows}
        except Exception as exc:
            logger.error("Failed to load active session user_ids: %s", exc)
            # Fail open — don't block matching if this query fails.
            # The worst case is a user gets matched into two circles simultaneously,
            # which the session layer will catch.
            return set()

    # ── DB: Persist ───────────────────────────────────────────────────────────

    def _persist_circle(self, circle: Circle, requester: UserPersona) -> str:
        """
        Write the circle and its members to Supabase.

        Writes:
            1. circles row (status='forming')
            2. circle_members rows (one per member)
            3. users.circle_id FK update for each member

        Returns the circles.id UUID string.
        """
        circle_db_id = str(uuid.uuid4())

        # ── 1. Insert circle row ──────────────────────────────────────────────
        primary_burden_tag = self._primary_stressor_tag(requester)

        self.db.table("circles").insert(
            {
                "id": circle_db_id,
                "target_size": circle.size,
                "primary_burden_tag": primary_burden_tag,
                "status": "forming",
                "formed_at": None,  # set to now() when all members join
                "facilitator_state": {},
                "intervention_count": 0,
                "crisis_triggered": False,
            }
        ).execute()

        # ── 2. Insert circle_members rows ─────────────────────────────────────
        aliases = _assign_aliases(circle.members)

        member_rows = []
        for member in circle.members:
            member_rows.append(
                {
                    "id": str(uuid.uuid4()),
                    "circle_id": circle_db_id,
                    "user_id": member.user_id,
                    "anonymous_alias": aliases[member.user_id],
                    "role_label": _role_label(member),
                    "message_count": 0,
                    "insight_saved_to_wall": False,
                }
            )

        if member_rows:
            self.db.table("circle_members").insert(member_rows).execute()

        # ── 3. Update users.circle_id for each member ─────────────────────────
        for member in circle.members:
            try:
                self.db.table("users").update({"circle_id": circle_db_id}).eq(
                    "id", member.user_id
                ).execute()
            except Exception as exc:
                # Non-fatal — circle_members is the source of truth for membership
                logger.warning(
                    "Could not update users.circle_id for user_id=%s: %s",
                    member.user_id,
                    exc,
                )

        return circle_db_id

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _primary_stressor_tag(persona: UserPersona) -> Optional[str]:
        """
        Return the dominant stressor label from the persona's stressor_dist,
        or None if the distribution is all zeros.
        """
        from persona.core.models import StressorType

        try:
            idx = int(persona.stressor_dist.argmax())
            return list(StressorType)[idx].value
        except Exception:
            return None


# ─────────────────────────────────────────────────────────────────────────────
# Module-level helpers
# ─────────────────────────────────────────────────────────────────────────────


def _assign_aliases(members: list[CircleMember]) -> dict[str, str]:
    """
    Assign a unique anonymous alias to each circle member.
    Aliases are drawn from ANONYMOUS_ALIASES in order; extras get 'Member N'.
    """
    aliases: dict[str, str] = {}
    for i, member in enumerate(members):
        if i < len(ANONYMOUS_ALIASES):
            aliases[member.user_id] = ANONYMOUS_ALIASES[i]
        else:
            aliases[member.user_id] = f"Member {i + 1}"
    return aliases


def _role_label(member: CircleMember) -> str:
    """
    Human-readable role hint for the facilitator / UI.
    Not exposed to other members — internal only.
    """
    mapping = {
        Stage.IN_THE_STORM: "in_storm",
        Stage.FINDING_GROUND: "finding_ground",
        Stage.THROUGH_IT: "through_it",
    }
    return mapping.get(member.stage, "peer")

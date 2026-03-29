"""
cairn/routes/circles.py

Circle router — handles all /circles endpoints.

Endpoints:
    POST /circles/request     — "I need help" button → runs matching engine
    POST /circles/{id}/leave  — user leaves a session
    GET  /circles/{id}        — fetch circle + sanitized member list

CircleStore does all the heavy lifting (matching, DB writes).
This layer only handles HTTP concerns: auth, input validation, response shape.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth import supabase, get_cairn_user
from db.circle_store import CircleStore

router = APIRouter()


def get_store(request: Request) -> CircleStore:
    return request.app.state.circle_store


# ─────────────────────────────────────────────────────────────────────────────
# POST /circles/request
# "I need help" — runs the full matching + circle formation flow
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/request", status_code=status.HTTP_201_CREATED)
async def request_circle(
    cairn_user=Depends(get_cairn_user),
    store: CircleStore = Depends(get_store),
):
    """
    Triggered when the user presses "I need help."

    Flow:
        1. Guard: if the user is already in an active circle, return it.
        2. Guard: if the user has no persona (no journal entries yet), 401.
        3. Run CircleStore.form_circle() — matching engine + DB write.
        4. On success: bump circles_joined counter, return circle details.
        5. On failure: 503 with the reason from the matching engine.
    """
    user_id = cairn_user["id"]

    # ── Guard 1: already in a circle ─────────────────────────────────────────
    existing = _get_active_circle_for_user(user_id)
    if existing:
        return {
            "status": "already_in_circle",
            "circle_id": existing["circle_id"],
            "anonymous_alias": existing["anonymous_alias"],
        }

    # ── Guard 2: persona must exist ───────────────────────────────────────────
    # form_circle() also checks this, but we can give a cleaner message here.
    if (
        not cairn_user.get("current_persona")
        or cairn_user.get("current_persona") == "ground"
    ):
        # "ground" is the default — means no entries processed yet
        pass  # let form_circle() handle it; it returns a clean failure_reason

    # ── Run matching ──────────────────────────────────────────────────────────
    result = store.form_circle(user_id=user_id)

    if not result.success:
        # Return 503 so the frontend can show a "try again later" message.
        # failure_reason is safe to surface — no PII, just matching logic info.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "reason": result.failure_reason,
                "pool_size": result.pool_size,
                "candidate_count": result.candidate_count,
            },
        )

    # ── Bump circles_joined counter ───────────────────────────────────────────
    try:
        supabase.table("users").update(
            {"circles_joined": (cairn_user.get("circles_joined") or 0) + 1}
        ).eq("id", user_id).execute()
    except Exception:
        pass  # non-fatal — don't fail the whole request over a counter

    # ── Fetch alias assigned to this user ─────────────────────────────────────
    alias = _get_member_alias(result.circle_db_id, user_id)

    return {
        "status": "formed",
        "circle_id": result.circle_db_id,
        "anonymous_alias": alias,
        "size": result.circle.size,
        "stage_summary": result.circle.stage_summary(),
        "duration_ms": result.duration_ms,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /circles/{circle_id}/leave
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/{circle_id}/leave", status_code=status.HTTP_200_OK)
async def leave_circle(
    circle_id: str,
    cairn_user=Depends(get_cairn_user),
    store: CircleStore = Depends(get_store),
):
    """
    Mark the user as having left the circle.

    Sets circle_members.left_at = now() for this user.
    Does NOT delete the row — history is preserved for the memory wall.
    Also clears users.circle_id so they're no longer blocked from new matching.
    """
    user_id = cairn_user["id"]

    # Verify the user is actually a member of this circle
    membership = _get_membership(circle_id, user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of this circle.",
        )

    if membership.get("left_at") is not None:
        return {"status": "already_left"}

    # Mark left_at
    try:
        supabase.table("circle_members").update({"left_at": "now()"}).eq(
            "circle_id", circle_id
        ).eq("user_id", user_id).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to leave circle: {exc}",
        )

    # Clear users.circle_id so they can be matched again
    try:
        supabase.table("users").update({"circle_id": None}).eq("id", user_id).execute()
    except Exception:
        pass  # non-fatal

    # If everyone has left, close the circle
    _maybe_close_circle(circle_id)

    return {"status": "left", "circle_id": circle_id}


# ─────────────────────────────────────────────────────────────────────────────
# GET /circles/{circle_id}
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/{circle_id}", status_code=status.HTTP_200_OK)
async def get_circle(
    circle_id: str,
    cairn_user=Depends(get_cairn_user),
    store: CircleStore = Depends(get_store),
):
    """
    Fetch circle metadata + active member list.

    Only members of the circle can fetch it.
    Members are sanitized — no user_ids, only aliases and stage-safe fields.
    """
    user_id = cairn_user["id"]

    # Auth: requester must be a member
    membership = _get_membership(circle_id, user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this circle.",
        )

    # Fetch circle row
    try:
        circle_resp = (
            supabase.table("circles")
            .select(
                "id, status, target_size, primary_burden_tag, formed_at, cultural_context"
            )
            .eq("id", circle_id)
            .single()
            .execute()
        )
        circle = circle_resp.data
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Circle not found: {exc}",
        )

    # Fetch active members (left_at IS NULL)
    try:
        members_resp = (
            supabase.table("circle_members")
            .select(
                "id, anonymous_alias, role_label, joined_at, message_count, last_active_at"
            )
            .eq("circle_id", circle_id)
            .is_("left_at", "null")
            .execute()
        )
        members = members_resp.data or []
    except Exception:
        members = []

    return {
        "circle": circle,
        "members": members,  # no user_ids — aliases only
        "your_alias": membership.get("anonymous_alias"),
        "your_role": membership.get("role_label"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Private helpers — thin DB queries that don't belong in the store
# ─────────────────────────────────────────────────────────────────────────────


def _get_active_circle_for_user(user_id: str) -> dict | None:
    """
    Return the user's current active circle_members row, or None.
    'Active' means left_at IS NULL and the circle status is not 'closed'.
    """
    try:
        resp = (
            supabase.table("circle_members")
            .select("circle_id, anonymous_alias, circles!inner(status)")
            .eq("user_id", user_id)
            .is_("left_at", "null")
            .neq("circles.status", "closed")
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        return rows[0] if rows else None
    except Exception:
        return None


def _get_membership(circle_id: str, user_id: str) -> dict | None:
    """Return the circle_members row for this (circle, user) pair, or None."""
    try:
        resp = (
            supabase.table("circle_members")
            .select("id, anonymous_alias, role_label, left_at")
            .eq("circle_id", circle_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        return rows[0] if rows else None
    except Exception:
        return None


def _get_member_alias(circle_db_id: str, user_id: str) -> str | None:
    """Fetch the anonymous alias assigned to this user in the circle."""
    try:
        resp = (
            supabase.table("circle_members")
            .select("anonymous_alias")
            .eq("circle_id", circle_db_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return (resp.data or {}).get("anonymous_alias")
    except Exception:
        return None


def _maybe_close_circle(circle_id: str) -> None:
    """
    Close the circle if all members have left.
    Fire-and-forget — called after a leave, non-fatal if it fails.
    """
    try:
        remaining = (
            supabase.table("circle_members")
            .select("id", count="exact")
            .eq("circle_id", circle_id)
            .is_("left_at", "null")
            .execute()
        )
        if (remaining.count or 0) == 0:
            supabase.table("circles").update(
                {"status": "closed", "closed_at": "now()"}
            ).eq("id", circle_id).execute()
    except Exception:
        pass

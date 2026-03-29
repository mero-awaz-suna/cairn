"""
cairn/routes/memory_wall.py

Memory Wall router.

Endpoints:
    GET /memory-wall/  — personalized memory wall entries for current user
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query

from auth import get_cairn_user
from persona.core.memory_wall import get_wall_for_user

router = APIRouter()


@router.get("/")
async def get_memory_wall(
    top_k: int = Query(10, ge=1, le=50),
    min_similarity: float = Query(0.25, ge=0.0, le=1.0),
    filter_stressor: Optional[str] = Query(None),
    cairn_user=Depends(get_cairn_user),
):
    """
    Return memory wall entries ranked by similarity to the current user.
    """
    user_id = cairn_user["id"]

    entries = get_wall_for_user(
        user_id=user_id,
        top_k=top_k,
        min_similarity=min_similarity,
        filter_stressor=filter_stressor,
    )

    return {
        "count": len(entries),
        "entries": entries,
    }

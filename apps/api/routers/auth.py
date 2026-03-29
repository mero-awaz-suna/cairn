"""
cairn/routers/auth.py

Auth routes — minimal, since Supabase handles authentication.
The frontend uses Supabase OAuth (Google). This router only provides
utility endpoints for the backend.
"""

from fastapi import APIRouter, Depends
from auth import get_cairn_user

router = APIRouter()


@router.get("/me")
async def get_current_user_info(cairn_user: dict = Depends(get_cairn_user)):
    """
    Return the authenticated user's profile.
    Useful for the frontend to verify the backend can see the same user.
    """
    return {
        "id": cairn_user["id"],
        "current_persona": cairn_user.get("current_persona"),
        "academic_stage": cairn_user.get("academic_stage"),
        "primary_burden": cairn_user.get("primary_burden"),
    }

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import supabase, get_current_user, get_cairn_user
from datetime import datetime

router = APIRouter()

class UpdatePersonaPayload(BaseModel):
    persona: str
    stress_level: int
    persona_confidence: float

# GET /users/me
@router.get("/me")
async def get_me(cairn_user=Depends(get_cairn_user)):
    # Don't expose hashed_password
    cairn_user.pop("hashed_password", None)
    return cairn_user

# PATCH /users/me/persona
@router.patch("/me/persona")
async def update_persona(
    payload: UpdatePersonaPayload,
    cairn_user=Depends(get_cairn_user)
):
    supabase.table("users").update({
        "current_persona": payload.persona,
        "current_stress_level": payload.stress_level,
        "persona_confidence": payload.persona_confidence,
        "last_journal_at": datetime.utcnow().isoformat(),
    }).eq("id", cairn_user["id"]).execute()

    supabase.table("user_persona_history").insert({
        "user_id": cairn_user["id"],
        "persona": payload.persona,
        "stress_level": payload.stress_level,
    }).execute()

    return {"status": "updated"}

# DELETE /users/me
@router.delete("/me")
async def request_deletion(cairn_user=Depends(get_cairn_user)):
    supabase.table("users").update({
        "data_deletion_requested": True,
        "deletion_requested_at": datetime.utcnow().isoformat(),
    }).eq("id", cairn_user["id"]).execute()

    supabase.table("audit_log").insert({
        "actor_id": cairn_user["id"],
        "action": "deletion_requested",
        "entity_type": "users",
        "entity_id": cairn_user["id"],
    }).execute()

    return {"status": "deletion_requested"}
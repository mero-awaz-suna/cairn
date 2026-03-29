from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from auth import supabase, get_cairn_user
from datetime import datetime

from db.persona_store import PersonaStore
from persona.core.models import AgeGroup, OccupationCategory, UserDemographics

router = APIRouter()


def get_store(request: Request) -> PersonaStore:
    return request.app.state.persona_store


class UpdatePersonaPayload(BaseModel):
    persona: str
    stress_level: int
    persona_confidence: float


class PersonaOnboardPayload(BaseModel):
    age_group: AgeGroup
    occupation: OccupationCategory
    industry: str
    language_code: str
    region_code: str
    living_situation: str


# GET /users/me
@router.get("/me")
async def get_me(cairn_user=Depends(get_cairn_user)):
    # Don't expose hashed_password
    cairn_user.pop("hashed_password", None)
    return cairn_user


# PATCH /users/me/persona
@router.patch("/me/persona")
async def update_persona(
    payload: UpdatePersonaPayload, cairn_user=Depends(get_cairn_user)
):
    state_map = {
        "storm": "In the storm",
        "through_it": "Through it",
        "ground": "Finding ground",
    }
    state_value = state_map.get(payload.persona, payload.persona)

    supabase.table("users").update(
        {
            "current_persona": payload.persona,
            "current_stress_level": payload.stress_level,
            "persona_confidence": payload.persona_confidence,
            "state": state_value,
            "last_journal_at": datetime.utcnow().isoformat(),
        }
    ).eq("id", cairn_user["id"]).execute()

    supabase.table("user_persona_history").insert(
        {
            "user_id": cairn_user["id"],
            "persona": payload.persona,
            "stage": state_value,
            "stress_level": payload.stress_level,
        }
    ).execute()

    return {"status": "updated"}


# POST /users/me/persona/onboard
@router.post("/me/persona/onboard")
async def onboard_persona(
    payload: PersonaOnboardPayload,
    cairn_user=Depends(get_cairn_user),
    store: PersonaStore = Depends(get_store),
):
    user_id = cairn_user["id"]

    existing = store.load(user_id)
    if existing is not None:
        return {
            "status": "already_exists",
            "user_id": user_id,
            "stage": existing.stage.current.value,
            "entry_count": existing.entry_count,
        }

    demographics = UserDemographics(
        age_group=payload.age_group,
        occupation=payload.occupation,
        industry=payload.industry,
        language_code=payload.language_code.lower(),
        region_code=payload.region_code.upper(),
        living_situation=payload.living_situation,
    )

    try:
        persona = store.create(user_id=user_id, demographics=demographics)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to onboard persona: {exc}")

    return {
        "status": "created",
        "user_id": user_id,
        "stage": persona.stage.current.value,
        "entry_count": persona.entry_count,
    }


# DELETE /users/me
@router.delete("/me")
async def request_deletion(cairn_user=Depends(get_cairn_user)):
    supabase.table("users").update(
        {
            "data_deletion_requested": True,
            "deletion_requested_at": datetime.utcnow().isoformat(),
        }
    ).eq("id", cairn_user["id"]).execute()

    supabase.table("audit_log").insert(
        {
            "actor_id": cairn_user["id"],
            "action": "deletion_requested",
            "entity_type": "users",
            "entity_id": cairn_user["id"],
        }
    ).execute()

    return {"status": "deletion_requested"}

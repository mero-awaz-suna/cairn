from fastapi import APIRouter, Depends
from pydantic import BaseModel
from auth import supabase, get_cairn_user

router = APIRouter()

class DropBurdenPayload(BaseModel):
    raw_burden_text: str
    extracted_theme: str
    theme_confidence: float

# POST /burdens — drop a burden
@router.post("/")
async def drop_burden(
    payload: DropBurdenPayload,
    cairn_user=Depends(get_cairn_user)
):
    result = supabase.table("burden_drops").insert({
        "user_id": cairn_user["id"],
        "raw_burden_text": payload.raw_burden_text,
        "extracted_theme": payload.extracted_theme,
        "theme_confidence": payload.theme_confidence,
    }).execute()

    supabase.table("users").update({
        "burdens_dropped": cairn_user["burdens_dropped"] + 1
    }).eq("id", cairn_user["id"]).execute()

    return result.data[0]

# GET /burdens/taxonomy — available burden themes
@router.get("/taxonomy")
async def get_taxonomy():
    result = supabase.table("burden_taxonomy")\
        .select("*")\
        .eq("is_active", True)\
        .execute()
    return result.data
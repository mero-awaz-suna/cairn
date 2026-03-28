from fastapi import APIRouter, Depends
from pydantic import BaseModel
from auth import supabase, get_cairn_user

router = APIRouter()

class SubmitMemoryPayload(BaseModel):
    quote_text: str
    burden_tag: str
    cultural_tag: str = "universal"
    source_session_id: str | None = None

# GET /memories — Memory Wall
@router.get("/")
async def get_memories(cultural_tag: str | None = None):
    query = supabase.table("memories")\
        .select("id, quote_text, burden_tag, cultural_tag, helped_count, author_persona, is_featured, created_at")\
        .eq("is_approved", True)\
        .order("display_weight", desc=True)\
        .limit(30)

    if cultural_tag:
        query = query.eq("cultural_tag", cultural_tag)

    return query.execute().data

# POST /memories — submit a memory from a session
@router.post("/")
async def submit_memory(
    payload: SubmitMemoryPayload,
    cairn_user=Depends(get_cairn_user)
):
    result = supabase.table("memories").insert({
        "source_type": "user_session",
        "source_user_id": cairn_user["id"],
        "source_session_id": payload.source_session_id,
        "quote_text": payload.quote_text,
        "burden_tag": payload.burden_tag,
        "cultural_tag": payload.cultural_tag,
        "is_approved": False,   # goes through safety review
    }).execute()

    supabase.table("users").update({
        "memories_saved": cairn_user["memories_saved"] + 1
    }).eq("id", cairn_user["id"]).execute()

    return result.data[0]

# POST /memories/{id}/helpful — upvote
@router.post("/{memory_id}/helpful")
async def mark_helpful(memory_id: str, cairn_user=Depends(get_cairn_user)):
    supabase.rpc("increment_helped_count", {"memory_id": memory_id}).execute()
    return {"status": "ok"}
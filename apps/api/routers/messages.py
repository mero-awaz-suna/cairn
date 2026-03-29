from fastapi import APIRouter, Depends
from pydantic import BaseModel
from auth import supabase, get_cairn_user

router = APIRouter()

class SendMessagePayload(BaseModel):
    circle_id: str
    content: str
    sentiment_score: float | None = None
    crisis_score: float | None = None
    themes_detected: list[str] = []

# POST /messages — send a message
@router.post("/")
async def send_message(
    payload: SendMessagePayload,
    cairn_user=Depends(get_cairn_user)
):
    # Get the member row for this user in this circle
    member = supabase.table("circle_members")\
        .select("id")\
        .eq("circle_id", payload.circle_id)\
        .eq("user_id", cairn_user["id"])\
        .single()\
        .execute()

    if not member.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not a member of this circle")

    result = supabase.table("messages").insert({
        "circle_id": payload.circle_id,
        "member_id": member.data["id"],
        "sender_type": "user",
        "content": payload.content,
        "sentiment_score": payload.sentiment_score,
        "crisis_score": payload.crisis_score,
        "themes_detected": payload.themes_detected,
        "is_facilitator_msg": False,
        "is_crisis_resource": False,
    }).execute()

    # Increment message count on member row
    supabase.rpc("increment_message_count", {
        "member_id": member.data["id"]
    }).execute()

    return result.data[0]

# POST /messages/ai — AI facilitator sends a message
@router.post("/ai")
async def send_ai_message(
    circle_id: str,
    content: str,
    is_crisis_resource: bool = False,
    cairn_user=Depends(get_cairn_user)  # still requires auth
):
    result = supabase.table("messages").insert({
        "circle_id": circle_id,
        "member_id": None,
        "sender_type": "ai_facilitator",
        "content": content,
        "is_facilitator_msg": True,
        "is_crisis_resource": is_crisis_resource,
    }).execute()
    return result.data[0]

# GET /messages/{circle_id} — full chat history
@router.get("/{circle_id}")
async def get_messages(circle_id: str, cairn_user=Depends(get_cairn_user)):
    result = supabase.table("messages")\
        .select("*")\
        .eq("circle_id", circle_id)\
        .order("created_at", ascending=True)\
        .execute()
    return result.data
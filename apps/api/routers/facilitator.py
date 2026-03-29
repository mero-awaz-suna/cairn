"""
cairn/apps/api/routers/facilitator.py

AI Facilitator — the silent intelligence behind circle sessions.
Speaks only when it serves the group: crisis detection, silence breaking,
witnessing pain, or gently closing a session.

Default action is PASS — silence is usually correct.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from auth import supabase, get_cairn_user
from datetime import datetime, timezone
import json
import os
import logging
import httpx

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Crisis keywords (checked BEFORE any AI call for speed) ──
CRISIS_KEYWORDS = [
    "end my life", "kill myself", "don't want to be here",
    "no reason to live", "want to disappear", "can't do this anymore",
    "give up on everything", "hurt myself", "suicide", "self harm",
    "not worth it", "better off without me", "want to die",
]

CRISIS_RESPONSE = (
    "It sounds like you might be carrying something larger than what a circle "
    "can hold right now. There are people available right now who want to help:\n\n"
    "Crisis Text Line — text HOME to 741741\n"
    "988 Suicide & Crisis Lifeline — call or text 988\n\n"
    "You don't have to be in immediate danger to reach out. "
    "The circle is still here for you."
)

FACILITATOR_SYSTEM = """You are the silent facilitator of a small anonymous peer support circle in Cairn — a platform for South Asian and Nepali individuals navigating high-pressure transitions.

Your default action is PASS. Doing nothing is usually correct. You are not a therapist. You are a wise older sibling who has been through it.

WHEN TO SPEAK (and ONLY when):
1. SILENCE > 3 minutes with no messages — ask a gentle open question to re-engage
2. PAIN AMPLIFYING — 3+ messages showing distress with no relief or acknowledgment from peers — WITNESS the pain, do not fix it
3. NATURAL ENDING — conversation has reached a natural pause after meaningful exchange — offer a gentle close
4. SOMEONE SHARES SOMETHING BRAVE — and no one responds for 60+ seconds — acknowledge the courage

WHEN TO NEVER SPEAK:
- When conversation is flowing naturally between members
- When someone just shared and others are responding
- To give advice, summarize, or say "you should"
- To use words like: resilient, journey, healing, self-care, wellness, mindful, boundaries
- More than once every 3 minutes

VOICE: Warm, specific, grounded. Maximum 2 sentences. Never clinical.

Return ONLY valid JSON:
{
  "action": "PASS" | "WITNESS" | "OPEN_QUESTION" | "GENTLE_CLOSE" | "ACKNOWLEDGE",
  "message": "string or null",
  "reasoning": "brief internal note (not shown to users)"
}"""


class FacilitatorCheckRequest(BaseModel):
    circle_id: str


class FacilitatorCheckResponse(BaseModel):
    action: str
    message: str | None = None
    was_crisis: bool = False


class MessageSafetyRequest(BaseModel):
    circle_id: str
    message_id: str
    content: str


def _detect_crisis(content: str) -> bool:
    """Fast keyword-based crisis detection. Runs before any AI call."""
    lower = content.lower()
    return any(kw in lower for kw in CRISIS_KEYWORDS)


async def _call_llm(system: str, user_msg: str) -> dict:
    """
    Call available LLM provider. Priority: Groq (fast) > Anthropic > fallback.
    Returns parsed JSON dict.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    google_key = os.getenv("GOOGLE_API_KEY")

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Try Groq first (fastest, free tier)
        if groq_key:
            try:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user_msg},
                        ],
                        "temperature": 0.3,
                        "max_tokens": 300,
                        "response_format": {"type": "json_object"},
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return json.loads(data["choices"][0]["message"]["content"])
            except Exception as e:
                logger.warning(f"Groq call failed: {e}")

        # Try Anthropic
        if anthropic_key:
            try:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 300,
                        "system": system,
                        "messages": [{"role": "user", "content": user_msg}],
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    raw = data["content"][0]["text"]
                    # Extract JSON from response
                    start = raw.find("{")
                    end = raw.rfind("}") + 1
                    if start >= 0 and end > start:
                        return json.loads(raw[start:end])
            except Exception as e:
                logger.warning(f"Anthropic call failed: {e}")

        # Try Google Gemini
        if google_key:
            try:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={google_key}",
                    json={
                        "contents": [{"parts": [{"text": f"{system}\n\n---\n\n{user_msg}"}]}],
                        "generationConfig": {
                            "temperature": 0.3,
                            "maxOutputTokens": 300,
                            "responseMimeType": "application/json",
                        },
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    raw = data["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(raw)
            except Exception as e:
                logger.warning(f"Gemini call failed: {e}")

    # Fallback — always PASS
    return {"action": "PASS", "message": None, "reasoning": "No LLM available"}


# ── POST /facilitator/check — evaluate whether the facilitator should speak ──
@router.post("/check", response_model=FacilitatorCheckResponse)
async def facilitator_check(
    payload: FacilitatorCheckRequest,
    cairn_user=Depends(get_cairn_user),
):
    """
    Called by the frontend periodically (every 30-60s) or on specific triggers.
    Reads recent messages, evaluates whether to speak, and if so — writes
    the facilitator message directly to the messages table (Supabase Realtime
    broadcasts it to all circle members).
    """
    circle_id = payload.circle_id

    # Verify user is in this circle
    membership = supabase.table("circle_members") \
        .select("id") \
        .eq("circle_id", circle_id) \
        .eq("user_id", cairn_user["id"]) \
        .is_("left_at", "null") \
        .execute()

    if not membership.data:
        raise HTTPException(403, "Not a member of this circle")

    # Get last 8 messages
    msgs_result = supabase.table("messages") \
        .select("content, sender_type, created_at, is_facilitator_msg, is_crisis_resource") \
        .eq("circle_id", circle_id) \
        .order("created_at", desc=False) \
        .limit(8) \
        .execute()

    messages = msgs_result.data or []

    if not messages:
        return FacilitatorCheckResponse(action="PASS")

    # Calculate silence duration
    last_msg = messages[-1]
    last_time = datetime.fromisoformat(last_msg["created_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    silence_seconds = (now - last_time).total_seconds()

    # Count recent facilitator messages (avoid spamming)
    recent_fac_msgs = [m for m in messages if m.get("is_facilitator_msg")]
    if len(recent_fac_msgs) >= 2:
        # Already spoke twice in recent history — hold back
        return FacilitatorCheckResponse(action="PASS")

    # Don't intervene if last message was a facilitator message
    if last_msg.get("is_facilitator_msg"):
        return FacilitatorCheckResponse(action="PASS")

    # Build context for LLM
    non_fac = [m for m in messages if not m.get("is_facilitator_msg")]
    messages_text = "\n".join([
        f"[{m['sender_type']}]: {m['content']}"
        for m in non_fac[-6:]  # last 6 non-facilitator messages
    ])

    total_messages = len(non_fac)

    user_prompt = f"""Circle conversation (last {total_messages} messages from members):

{messages_text}

Silence duration since last message: {int(silence_seconds)} seconds
Total member messages in session: {total_messages}
Facilitator has spoken {len(recent_fac_msgs)} time(s) already.

Should you speak? If yes, what do you say? Remember: PASS is almost always correct."""

    result = await _call_llm(FACILITATOR_SYSTEM, user_prompt)

    action = result.get("action", "PASS")
    message = result.get("message")

    if action != "PASS" and message:
        # Write facilitator message to DB — Supabase Realtime broadcasts it
        supabase.table("messages").insert({
            "circle_id": circle_id,
            "member_id": None,
            "sender_type": "ai_facilitator",
            "content": message,
            "is_facilitator_msg": True,
            "is_crisis_resource": False,
        }).execute()

        return FacilitatorCheckResponse(action=action, message=message)

    return FacilitatorCheckResponse(action="PASS")


# ── POST /facilitator/safety — check a message for crisis content ──
@router.post("/safety")
async def check_message_safety(
    payload: MessageSafetyRequest,
    background_tasks: BackgroundTasks,
):
    """
    Called after every user message. Checks for crisis keywords first (instant),
    then optionally does a deeper LLM check in the background.
    """
    is_crisis = _detect_crisis(payload.content)

    if is_crisis:
        # Write crisis resource message immediately
        supabase.table("messages").insert({
            "circle_id": payload.circle_id,
            "member_id": None,
            "sender_type": "ai_facilitator",
            "content": CRISIS_RESPONSE,
            "is_facilitator_msg": True,
            "is_crisis_resource": True,
        }).execute()

        # Flag in audit log
        supabase.table("audit_log").insert({
            "action": "crisis_detected",
            "target_type": "message",
            "target_id": payload.message_id,
            "details": {"circle_id": payload.circle_id, "detection_method": "keyword"},
        }).execute()

        return {"crisis_detected": True, "action_taken": "crisis_resource_sent"}

    return {"crisis_detected": False}

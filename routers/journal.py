from fastapi import APIRouter, Depends, UploadFile, File, Form
from pydantic import BaseModel
from auth import supabase, get_cairn_user
import time

router = APIRouter()

class JournalTextPayload(BaseModel):
    raw_transcript: str
    # AI-processed fields (sent from your LLM layer)
    assigned_persona: str
    persona_confidence: float
    stress_level: int
    burden_themes: list[str]
    recognition_message: str
    micro_intervention: str
    crisis_detected: bool = False
    crisis_keywords: list[str] = []
    ai_model_used: str = "claude-sonnet-4-20250514"
    ai_processing_ms: int = 0

# POST /journal/audio — upload audio + store memo
@router.post("/audio")
async def submit_audio_journal(
    audio: UploadFile = File(...),
    cairn_user=Depends(get_cairn_user)
):
    start = time.time()
    audio_bytes = await audio.read()
    path = f"{cairn_user['id']}/{int(time.time())}.webm"

    supabase.storage.from_("voice-memos").upload(
        path, audio_bytes, {"content-type": "audio/webm"}
    )

    transcription_ms = int((time.time() - start) * 1000)

    # Store as pending — AI fields filled by FastAPI after Whisper/LLM
    result = supabase.table("journal_entries").insert({
        "user_id": cairn_user["id"],
        "input_type": "audio",
        "audio_storage_path": path,
        "assigned_persona": "ground",       # placeholder until AI processes
        "persona_confidence": 0.0,
        "stress_level": 5,
        "burden_themes": [],
        "recognition_message": "",
        "micro_intervention": "",
        "transcription_ms": transcription_ms,
    }).execute()

    return {
        "entry_id": result.data[0]["id"],
        "storage_path": path,
        "status": "pending_ai_processing"
    }

# POST /journal/text — text journal (demo/debug mode from blueprint)
@router.post("/text")
async def submit_text_journal(
    payload: JournalTextPayload,
    cairn_user=Depends(get_cairn_user)
):
    result = supabase.table("journal_entries").insert({
        "user_id": cairn_user["id"],
        "input_type": "text",
        "raw_transcript": payload.raw_transcript,
        "assigned_persona": payload.assigned_persona,
        "persona_confidence": payload.persona_confidence,
        "stress_level": payload.stress_level,
        "burden_themes": payload.burden_themes,
        "recognition_message": payload.recognition_message,
        "micro_intervention": payload.micro_intervention,
        "crisis_detected": payload.crisis_detected,
        "crisis_keywords": payload.crisis_keywords,
        "ai_model_used": payload.ai_model_used,
        "ai_processing_ms": payload.ai_processing_ms,
    }).execute()

    entry = result.data[0]

    # Update user persona
    supabase.table("users").update({
        "current_persona": payload.assigned_persona,
        "current_stress_level": payload.stress_level,
        "persona_confidence": payload.persona_confidence,
        "is_in_crisis": payload.crisis_detected,
    }).eq("id", cairn_user["id"]).execute()

    # Log crisis if detected
    if payload.crisis_detected:
        supabase.table("audit_log").insert({
            "actor_id": cairn_user["id"],
            "action": "crisis_detected",
            "entity_type": "journal_entries",
            "entity_id": entry["id"],
            "metadata": {"keywords": payload.crisis_keywords},
        }).execute()

    return entry

# GET /journal/history — user's past entries
@router.get("/history")
async def get_journal_history(cairn_user=Depends(get_cairn_user)):
    result = supabase.table("journal_entries")\
        .select("id, input_type, assigned_persona, stress_level, burden_themes, crisis_detected, created_at")\
        .eq("user_id", cairn_user["id"])\
        .order("created_at", desc=True)\
        .limit(20)\
        .execute()
    return result.data
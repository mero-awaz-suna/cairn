from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from auth import supabase, get_cairn_user
from dotenv import load_dotenv
import time
import os
import importlib
from datetime import datetime, timezone

from db.persona_store import PersonaStore
from persona.core.models import AgeGroup, OccupationCategory, RawEntry, UserDemographics
from persona.core.pipeline import CairnPipeline

load_dotenv()

Groq = None
try:
    groq_module = importlib.import_module("groq")
    Groq = getattr(groq_module, "Groq", None)
except ImportError:
    Groq = None

router = APIRouter()

groq_client = (
    Groq(api_key=os.environ.get("GROQ_API_KEY"))
    if Groq is not None and os.environ.get("GROQ_API_KEY")
    else None
)


def get_store(request: Request) -> PersonaStore:
    return request.app.state.persona_store


def get_pipeline(request: Request) -> CairnPipeline:
    return request.app.state.pipeline


def _ensure_persona_for_user(cairn_user: dict, store: PersonaStore):
    persona = store.load(cairn_user["id"])
    if persona is not None:
        return persona

    demographics = UserDemographics(
        age_group=AgeGroup(cairn_user.get("age_group", AgeGroup.LATE_20S.value)),
        occupation=OccupationCategory(
            cairn_user.get("occupation", OccupationCategory.OTHER.value)
        ),
        industry=cairn_user.get("industry") or "unknown",
        language_code=(cairn_user.get("language_code") or "en").lower(),
        region_code=(cairn_user.get("region_code") or "US").upper(),
        living_situation=cairn_user.get("living_situation") or "alone",
    )
    return store.create(cairn_user["id"], demographics)


def _stage_to_legacy_persona(stage_value: str) -> str:
    if stage_value == "In the storm":
        return "storm"
    if stage_value == "Through it":
        return "through_it"
    return "ground"


def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    if groq_client is None:
        return ""
    try:
        transcription = groq_client.audio.transcriptions.create(
            file=(filename, audio_bytes), model="whisper-large-v3", language="en"
        )
        return transcription.text
    except Exception as e:
        return ""


@router.post(
    "/audio",
    openapi_extra={
        "requestBody": {
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "audio": {
                                "type": "string",
                                "format": "binary",
                                "description": "Audio file (webm, mp3, wav, ogg, m4a, max 10MB)",
                            }
                        },
                        "required": ["audio"],
                    }
                }
            }
        }
    },
)
async def submit_audio_journal(
    audio: UploadFile = File(..., description="Audio journal file"),
    cairn_user=Depends(get_cairn_user),
    store: PersonaStore = Depends(get_store),
    pipeline: CairnPipeline = Depends(get_pipeline),
):
    # Validate file extension
    file_extension = audio.filename.split(".")[-1].lower() if audio.filename else ""
    allowed_extensions = ["webm", "mp3", "wav", "ogg", "m4a", "mp4"]
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}",
        )

    # Validate file size — 10MB max
    MAX_SIZE = 10 * 1024 * 1024
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=413, detail="Audio file too large. Maximum size is 10MB."
        )

    start = time.time()

    # Current date and time
    now = datetime.now(timezone.utc)
    added_date = now.date().isoformat()
    added_time = now.time().strftime("%H:%M:%S")

    # Storage path — grouped by user
    timestamp = int(time.time())
    path = f"{cairn_user['id']}/{timestamp}.{file_extension}"

    # Map to Supabase-supported MIME types
    mime_map = {
        "m4a": "audio/mp4",
        "mp4": "audio/mp4",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "ogg": "audio/ogg",
        "webm": "audio/webm",
    }
    safe_mime = mime_map.get(file_extension, "audio/webm")

    # Upload to Supabase Storage
    try:
        supabase.storage.from_("journal-audio").upload(
            path, audio_bytes, {"content-type": safe_mime}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio upload failed: {str(e)}")

    # Transcribe audio using Groq Whisper
    transcript = transcribe_audio(
        audio_bytes, audio.filename or f"journal.{file_extension}"
    )
    transcript_length = len(transcript.split()) if transcript else 0

    transcription_ms = int((time.time() - start) * 1000)

    day_number = max(1, int(cairn_user.get("journal_streak", 0)) + 1)

    stage_value = "Finding ground"
    persona_label = "ground"
    persona_confidence = 0.0
    stress_level = 5
    crisis_detected = False

    # Run persona pipeline and persist persona state
    try:
        persona = _ensure_persona_for_user(cairn_user, store)
        entry = RawEntry(
            user_id=cairn_user["id"],
            audio_path=path,
            transcript=transcript,
            timestamp=time.time(),
            day_number=day_number,
        )
        pipeline_result = pipeline.process(entry=entry, persona=persona)
        store.save(persona, pipeline_result)

        stage_value = persona.stage.current.value
        persona_label = _stage_to_legacy_persona(stage_value)
        persona_confidence = round(float(persona.stage.confidence), 3)
        stress_level = int(round(float(pipeline_result.stage_scores.stress_score) * 10))
        crisis_detected = bool(pipeline_result.crisis_flag)
    except Exception:
        # Keep journal ingestion resilient even if persona processing fails.
        pass

    # Store journal entry
    try:
        result = (
            supabase.table("journal_entries")
            .insert(
                {
                    "user_id": cairn_user["id"],
                    "input_type": "audio",
                    "audio_storage_path": path,
                    "transcript": transcript,
                    "transcript_length": transcript_length,
                    "added_date": added_date,
                    "added_time": added_time,
                    "assigned_persona": persona_label,
                    "persona_confidence": persona_confidence,
                    "stress_level": stress_level,
                    "burden_themes": [],
                    "recognition_message": "",
                    "micro_intervention": "",
                    "transcription_ms": transcription_ms,
                    "crisis_detected": crisis_detected,
                }
            )
            .execute()
        )
    except Exception as e:
        supabase.storage.from_("journal-audio").remove([path])
        raise HTTPException(
            status_code=500, detail=f"Failed to save journal entry: {str(e)}"
        )

    entry = result.data[0]
    entry_id = entry["id"]

    # Update user — append journal id to journal_ids array + update streak
    existing_ids = cairn_user.get("journal_ids") or []
    existing_ids.append(entry_id)

    supabase.table("users").update(
        {
            "last_journal_at": entry["created_at"],
            "journal_streak": cairn_user["journal_streak"] + 1,
            "journal_ids": existing_ids,
            "state": stage_value,
            "current_persona": persona_label,
            "current_stress_level": stress_level,
            "persona_confidence": persona_confidence,
            "is_in_crisis": crisis_detected,
        }
    ).eq("id", cairn_user["id"]).execute()

    return {
        "entry_id": entry_id,
        "user_id": cairn_user["id"],
        "storage_path": path,
        "transcript": transcript,
        "transcript_length": transcript_length,
        "added_date": added_date,
        "added_time": added_time,
        "file_size_bytes": len(audio_bytes),
        "transcription_ms": transcription_ms,
        "status": "uploaded_and_transcribed",
        "created_at": entry["created_at"],
    }


# GET /journal/history — full audio journal history for current user
@router.get("/history")
async def get_journal_history(cairn_user=Depends(get_cairn_user)):
    result = (
        supabase.table("journal_entries")
        .select(
            "id, audio_storage_path, transcript, transcript_length, "
            "added_date, added_time, assigned_persona, "
            "persona_confidence, stress_level, burden_themes, "
            "crisis_detected, transcription_ms, created_at"
        )
        .eq("user_id", cairn_user["id"])
        .eq("input_type", "audio")
        .order("created_at", desc=True)
        .execute()
    )

    entries = result.data

    # Generate signed URLs so frontend can play the audio
    for entry in entries:
        if entry.get("audio_storage_path"):
            try:
                signed = supabase.storage.from_("journal-audio").create_signed_url(
                    entry["audio_storage_path"], 3600
                )
                entry["audio_url"] = signed.get("signedURL") or signed.get("signedUrl")
            except:
                entry["audio_url"] = None

    return {
        "user_id": cairn_user["id"],
        "total_entries": len(entries),
        "journal_ids": cairn_user.get("journal_ids") or [],
        "entries": entries,
    }


# GET /journal/history/{entry_id} — single entry with playable audio URL
@router.get("/history/{entry_id}")
async def get_journal_entry(entry_id: str, cairn_user=Depends(get_cairn_user)):
    result = (
        supabase.table("journal_entries")
        .select("*")
        .eq("id", entry_id)
        .eq("user_id", cairn_user["id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    entry = result.data

    if entry.get("audio_storage_path"):
        try:
            signed = supabase.storage.from_("journal-audio").create_signed_url(
                entry["audio_storage_path"], 3600
            )
            entry["audio_url"] = signed.get("signedURL") or signed.get("signedUrl")
        except:
            entry["audio_url"] = None

    return entry


# DELETE /journal/history/{entry_id} — delete entry + audio file
@router.delete("/history/{entry_id}")
async def delete_journal_entry(entry_id: str, cairn_user=Depends(get_cairn_user)):
    result = (
        supabase.table("journal_entries")
        .select("id, audio_storage_path, user_id")
        .eq("id", entry_id)
        .eq("user_id", cairn_user["id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    entry = result.data

    # Delete audio from storage
    if entry.get("audio_storage_path"):
        try:
            supabase.storage.from_("journal-audio").remove(
                [entry["audio_storage_path"]]
            )
        except:
            pass

    # Delete DB record
    supabase.table("journal_entries").delete().eq("id", entry_id).execute()

    # Remove from user's journal_ids array
    existing_ids = cairn_user.get("journal_ids") or []
    updated_ids = [j for j in existing_ids if j != entry_id]
    supabase.table("users").update({"journal_ids": updated_ids}).eq(
        "id", cairn_user["id"]
    ).execute()

    return {"status": "deleted", "entry_id": entry_id}

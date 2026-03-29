"""
cairn/routes/chat.py

Circle chatroom — WebSocket + REST endpoints.

Endpoints:
    WS  /chat/ws/{circle_id}?token=...   — real-time chat connection
    POST /chat/voice/{circle_id}          — upload audio, transcribe, broadcast

WebSocket message types (client → server):
    { "type": "text",  "content": "..." }
    { "type": "ping" }

WebSocket message types (server → client):
    { "type": "history",  "messages": [...], "online_members": [...] }
    { "type": "text",     "message_id", "alias", "role", "content", "timestamp" }
    { "type": "voice",    "message_id", "alias", "role", "audio_url", "transcript", "timestamp" }
    { "type": "system",   "content", "online_members", "timestamp" }
    { "type": "pong" }
    { "type": "error",    "content" }

Access rules:
    - JWT token required for both WS and REST endpoints
    - User must be an active circle member (left_at IS NULL)
    - Users who have left cannot reconnect (WS closes with 4003)
    - Users in a suspended account cannot connect (closes with 4003)

Schema changes required (run in Supabase SQL editor):
    ALTER TABLE public.messages ADD COLUMN audio_storage_path text;
    ALTER TABLE public.messages ADD COLUMN transcript        text;
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from groq import Groq

from auth import decode_token, get_cairn_user, supabase

logger = logging.getLogger(__name__)

router = APIRouter()

groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])

AUDIO_BUCKET = "circle-audio"
AUDIO_SIGNED_URL_TTL = 60 * 60  # 1 hour


# ─────────────────────────────────────────────────────────────────────────────
# Connection manager
# ─────────────────────────────────────────────────────────────────────────────


class ConnectionManager:
    """
    In-memory WebSocket registry.

    Structure: { circle_id: { user_id: WebSocket } }

    ⚠ Single-process only. For multi-worker deployments replace with
      a Redis pub/sub backend (e.g. broadcaster library).
    """

    def __init__(self):
        self._connections: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, circle_id: str, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(circle_id, {})[user_id] = ws
        logger.debug("WS connected: circle=%s user=%s", circle_id, user_id)

    def disconnect(self, circle_id: str, user_id: str) -> None:
        circle_conns = self._connections.get(circle_id, {})
        circle_conns.pop(user_id, None)
        if not circle_conns:
            self._connections.pop(circle_id, None)
        logger.debug("WS disconnected: circle=%s user=%s", circle_id, user_id)

    def get_online_user_ids(self, circle_id: str) -> list[str]:
        return list(self._connections.get(circle_id, {}).keys())

    async def broadcast(
        self,
        circle_id: str,
        payload: dict,
        exclude_user_id: str | None = None,
    ) -> None:
        """
        Send payload to all connected members of a circle.
        Silently drops stale connections — they will error on next send/receive.
        """
        dead: list[str] = []
        for uid, ws in list(self._connections.get(circle_id, {}).items()):
            if uid == exclude_user_id:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(uid)

        for uid in dead:
            self.disconnect(circle_id, uid)

    async def send_to(self, circle_id: str, user_id: str, payload: dict) -> None:
        """Send a payload to one specific user only."""
        ws = self._connections.get(circle_id, {}).get(user_id)
        if ws:
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(circle_id, user_id)


manager = ConnectionManager()


# ─────────────────────────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────────────────────────


def _verify_active_membership(circle_id: str, user_id: str) -> dict:
    """
    Return the circle_members row for (circle_id, user_id) where left_at IS NULL.
    Raises HTTPException / returns None for WebSocket callers to check.
    """
    resp = (
        supabase.table("circle_members")
        .select("id, anonymous_alias, role_label, left_at")
        .eq("circle_id", circle_id)
        .eq("user_id", user_id)
        .is_("left_at", "null")
        .limit(1)
        .execute()
    )
    return resp.data[0] if resp.data else None


def _verify_user_not_suspended(user_id: str) -> bool:
    resp = (
        supabase.table("users")
        .select("is_suspended")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return not (resp.data or {}).get("is_suspended", False)


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────


def _fetch_history(circle_id: str, limit: int = 50) -> list[dict]:
    """Return the last `limit` messages for a circle, oldest first."""
    resp = (
        supabase.table("messages")
        .select(
            "id, content, sender_type, is_facilitator_msg, "
            "audio_storage_path, transcript, created_at, "
            "circle_members(anonymous_alias, role_label)"
        )
        .eq("circle_id", circle_id)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    rows = resp.data or []

    # Flatten member fields and attach signed URL for any audio rows
    out = []
    for row in rows:
        member = row.pop("circle_members", None) or {}
        row["alias"] = member.get("anonymous_alias", "unknown")
        row["role"] = member.get("role_label")
        if row.get("audio_storage_path"):
            row["audio_url"] = _signed_url(row["audio_storage_path"])
        out.append(row)
    return out


def _save_text_message(
    circle_id: str,
    member_id: str,
    content: str,
) -> dict:
    resp = (
        supabase.table("messages")
        .insert(
            {
                "circle_id": circle_id,
                "member_id": member_id,
                "content": content,
                "sender_type": "user",
                "is_facilitator_msg": False,
                "is_crisis_resource": False,
            }
        )
        .execute()
    )
    return resp.data[0] if resp.data else {}


def _save_voice_message(
    circle_id: str,
    member_id: str,
    audio_storage_path: str,
    transcript: str,
) -> dict:
    content = transcript if transcript else "[Voice message]"
    resp = (
        supabase.table("messages")
        .insert(
            {
                "circle_id": circle_id,
                "member_id": member_id,
                "content": content,
                "sender_type": "user",
                "is_facilitator_msg": False,
                "is_crisis_resource": False,
                "audio_storage_path": audio_storage_path,
                "transcript": transcript,
            }
        )
        .execute()
    )
    return resp.data[0] if resp.data else {}


def _increment_message_count(member_id: str) -> None:
    """Non-fatal counter bump — fire and forget."""
    try:
        supabase.rpc(
            "increment_message_count",
            {"p_member_id": member_id},
        ).execute()
    except Exception:
        # Fallback if RPC doesn't exist yet: direct update via read-then-write
        try:
            row = (
                supabase.table("circle_members")
                .select("message_count")
                .eq("id", member_id)
                .single()
                .execute()
            )
            current = (row.data or {}).get("message_count", 0)
            supabase.table("circle_members").update(
                {"message_count": current + 1, "last_active_at": "now()"}
            ).eq("id", member_id).execute()
        except Exception:
            pass


def _update_last_active(member_id: str) -> None:
    try:
        supabase.table("circle_members").update({"last_active_at": "now()"}).eq(
            "id", member_id
        ).execute()
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Storage helpers
# ─────────────────────────────────────────────────────────────────────────────


def _upload_audio(audio_bytes: bytes, path: str) -> str:
    """Upload to Supabase Storage. Returns the storage path."""
    supabase.storage.from_(AUDIO_BUCKET).upload(
        path,
        audio_bytes,
        {"content-type": "audio/webm"},
    )
    return path


def _signed_url(storage_path: str) -> str | None:
    """Generate a signed URL for a storage path. Returns None on failure."""
    try:
        result = supabase.storage.from_(AUDIO_BUCKET).create_signed_url(
            storage_path, AUDIO_SIGNED_URL_TTL
        )
        return result.get("signedURL") or result.get("signedUrl")
    except Exception:
        return None


def _transcribe(audio_bytes: bytes, filename: str) -> str:
    """
    Transcribe audio bytes via Groq Whisper.
    Returns empty string on failure so the message still saves.
    """
    try:
        response = groq_client.audio.transcriptions.create(
            file=(filename, audio_bytes, "audio/webm"),
            model="whisper-large-v3",
            response_format="text",
        )
        return str(response).strip()
    except Exception as exc:
        logger.warning("Transcription failed: %s", exc)
        return ""


# ─────────────────────────────────────────────────────────────────────────────
# Timestamp helper
# ─────────────────────────────────────────────────────────────────────────────


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket endpoint
# ─────────────────────────────────────────────────────────────────────────────


@router.websocket("/ws/{circle_id}")
async def circle_websocket(websocket: WebSocket, circle_id: str):
    """
    Main real-time chat connection.

    Auth flow:
        1. Extract JWT from ?token= query param (browsers can't set WS headers)
        2. Decode → user_id
        3. Verify active membership (left_at IS NULL)
        4. Verify user is not suspended

    On connect:
        - Send last 50 messages as history
        - Broadcast "{alias} joined" system message to other members

    Message loop:
        - "text" → save to DB, broadcast to all members including sender
        - "ping" → pong back to sender only

    On disconnect:
        - Broadcast "{alias} left" system message
        - Clean up connection registry
    """

    # ── Step 1: Authenticate ──────────────────────────────────────────────────
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    try:
        payload = decode_token(token)
        user_id = payload["user_id"]
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # ── Step 2: Verify membership ─────────────────────────────────────────────
    membership = _verify_active_membership(circle_id, user_id)
    if not membership:
        await websocket.close(code=4003, reason="Not an active member of this circle")
        return

    if not _verify_user_not_suspended(user_id):
        await websocket.close(code=4003, reason="Account suspended")
        return

    member_id = membership["id"]
    alias = membership["anonymous_alias"]
    role = membership["role_label"]

    # ── Step 3: Accept connection ─────────────────────────────────────────────
    await manager.connect(circle_id, user_id, websocket)
    _update_last_active(member_id)

    # ── Step 4: Send history to this user ─────────────────────────────────────
    history = _fetch_history(circle_id)
    await manager.send_to(
        circle_id,
        user_id,
        {
            "type": "history",
            "messages": history,
            "online_members": manager.get_online_user_ids(circle_id),
        },
    )

    # ── Step 5: Announce join to others ───────────────────────────────────────
    await manager.broadcast(
        circle_id,
        {
            "type": "system",
            "content": f"{alias} joined the circle",
            "online_members": manager.get_online_user_ids(circle_id),
            "timestamp": _now_iso(),
        },
        exclude_user_id=user_id,
    )

    # ── Step 6: Message loop ──────────────────────────────────────────────────
    try:
        while True:
            raw = await websocket.receive_text()

            # Re-verify membership on every message —
            # catches users who left via the REST endpoint mid-session
            membership = _verify_active_membership(circle_id, user_id)
            if not membership:
                await websocket.send_json(
                    {
                        "type": "error",
                        "content": "You are no longer a member of this circle.",
                    }
                )
                await websocket.close(code=4003, reason="Membership ended")
                break

            try:
                import json as _json

                msg = _json.loads(raw)
            except Exception:
                msg = {"type": "text", "content": raw}

            msg_type = msg.get("type", "text")

            # ── TEXT ──────────────────────────────────────────────────────────
            if msg_type == "text":
                content = (msg.get("content") or "").strip()
                if not content:
                    await websocket.send_json(
                        {"type": "error", "content": "Empty message."}
                    )
                    continue

                saved = _save_text_message(circle_id, member_id, content)
                _increment_message_count(member_id)

                await manager.broadcast(
                    circle_id,
                    {
                        "type": "text",
                        "message_id": saved.get("id"),
                        "alias": alias,
                        "role": role,
                        "content": content,
                        "timestamp": saved.get("created_at") or _now_iso(),
                    },
                )

            # ── PING ──────────────────────────────────────────────────────────
            elif msg_type == "ping":
                await manager.send_to(circle_id, user_id, {"type": "pong"})

            else:
                await manager.send_to(
                    circle_id,
                    user_id,
                    {
                        "type": "error",
                        "content": f"Unknown message type: {msg_type!r}",
                    },
                )

    except WebSocketDisconnect:
        pass

    finally:
        # ── Step 7: Clean up & announce departure ─────────────────────────────
        manager.disconnect(circle_id, user_id)
        await manager.broadcast(
            circle_id,
            {
                "type": "system",
                "content": f"{alias} left the circle",
                "online_members": manager.get_online_user_ids(circle_id),
                "timestamp": _now_iso(),
            },
        )


# ─────────────────────────────────────────────────────────────────────────────
# Voice message endpoint
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/voice/{circle_id}", status_code=status.HTTP_201_CREATED)
async def send_voice_message(
    circle_id: str,
    audio: UploadFile = File(...),
    cairn_user=Depends(get_cairn_user),
):
    """
    Upload a voice memo to a circle.

    Flow:
        1. Verify active membership
        2. Read audio bytes
        3. Upload to Supabase Storage (circle-audio/{circle_id}/{user_id}/{ts}.webm)
        4. Transcribe via Groq Whisper (async-friendly — runs in threadpool)
        5. Save message row with audio_storage_path + transcript
        6. Generate a signed URL (1 hour TTL)
        7. Broadcast to all circle members via WebSocket

    Audio is not blocked on transcription failure — message saves with
    "[Voice message]" as content if Whisper fails.
    """
    user_id = cairn_user["id"]

    # ── Verify membership ─────────────────────────────────────────────────────
    membership = _verify_active_membership(circle_id, user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not an active member of this circle.",
        )

    member_id = membership["id"]
    alias = membership["anonymous_alias"]
    role = membership["role_label"]

    # ── Read audio ────────────────────────────────────────────────────────────
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio file.",
        )

    storage_path = f"{circle_id}/{user_id}/{int(time.time())}.webm"

    # ── Upload + transcribe (both can fail independently) ─────────────────────
    try:
        _upload_audio(audio_bytes, storage_path)
    except Exception as exc:
        logger.error(
            "Audio upload failed circle=%s user=%s: %s", circle_id, user_id, exc
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Audio upload failed. Please try again.",
        )

    # Run transcription in the default threadpool so it doesn't block the event loop
    transcript = await asyncio.get_event_loop().run_in_executor(
        None, _transcribe, audio_bytes, audio.filename or "audio.webm"
    )

    # ── Persist ───────────────────────────────────────────────────────────────
    saved = _save_voice_message(circle_id, member_id, storage_path, transcript)
    _increment_message_count(member_id)

    # ── Generate signed URL for broadcast ─────────────────────────────────────
    audio_url = _signed_url(storage_path)

    # ── Broadcast ─────────────────────────────────────────────────────────────
    await manager.broadcast(
        circle_id,
        {
            "type": "voice",
            "message_id": saved.get("id"),
            "alias": alias,
            "role": role,
            "audio_url": audio_url,
            "transcript": transcript or None,
            "timestamp": saved.get("created_at") or _now_iso(),
        },
    )

    return {
        "status": "sent",
        "message_id": saved.get("id"),
        "audio_url": audio_url,
        "transcript": transcript or None,
    }

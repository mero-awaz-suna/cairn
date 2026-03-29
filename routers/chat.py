"""
cairn/routes/chat.py

Circle chatroom — WebSocket endpoint (text only).

Endpoints:
    WS  /chat/ws/{circle_id}?token=...   — real-time chat connection

WebSocket message types (client → server):
    { "type": "text",  "content": "..." }
    { "type": "ping" }

WebSocket message types (server → client):
    { "type": "history",  "messages": [...], "online_members": [...] }
    { "type": "text",     "message_id", "alias", "role", "content", "timestamp" }
    { "type": "system",   "content", "online_members", "timestamp" }
    { "type": "pong" }
    { "type": "error",    "content" }

Access rules:
    - JWT token required
    - User must be an active circle member (left_at IS NULL)
    - Users who have left cannot reconnect (WS closes with 4003)
    - Suspended accounts cannot connect (WS closes with 4003)
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from auth import decode_token, supabase

logger = logging.getLogger(__name__)

router = APIRouter()


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


def _verify_active_membership(circle_id: str, user_id: str) -> dict | None:
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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fetch_history(circle_id: str, limit: int = 50) -> list[dict]:
    resp = (
        supabase.table("messages")
        .select(
            "id, content, sender_type, is_facilitator_msg, created_at, "
            "circle_members(anonymous_alias, role_label)"
        )
        .eq("circle_id", circle_id)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    out = []
    for row in resp.data or []:
        member = row.pop("circle_members", None) or {}
        row["alias"] = member.get("anonymous_alias", "unknown")
        row["role"] = member.get("role_label")
        out.append(row)
    return out


def _save_text_message(circle_id: str, member_id: str, content: str) -> dict:
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


def _increment_message_count(member_id: str) -> None:
    try:
        supabase.rpc("increment_message_count", {"p_member_id": member_id}).execute()
    except Exception:
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
# WebSocket endpoint
# ─────────────────────────────────────────────────────────────────────────────


@router.websocket("/ws/{circle_id}")
async def circle_websocket(websocket: WebSocket, circle_id: str):

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

    # ── Step 4: Send history ──────────────────────────────────────────────────
    await manager.send_to(
        circle_id,
        user_id,
        {
            "type": "history",
            "messages": _fetch_history(circle_id),
            "online_members": manager.get_online_user_ids(circle_id),
        },
    )

    # ── Step 5: Announce join ─────────────────────────────────────────────────
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

            # Re-check membership on every message — enforces mid-session leaves
            if not _verify_active_membership(circle_id, user_id):
                await websocket.send_json(
                    {
                        "type": "error",
                        "content": "You are no longer a member of this circle.",
                    }
                )
                await websocket.close(code=4003, reason="Membership ended")
                break

            try:
                msg = json.loads(raw)
            except Exception:
                msg = {"type": "text", "content": raw}

            msg_type = msg.get("type", "text")

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

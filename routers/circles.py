from fastapi import APIRouter, Depends, HTTPException
from auth import supabase, get_cairn_user
import random
import string
from datetime import datetime

router = APIRouter()

def random_alias():
    return "".join(random.choices(string.ascii_lowercase, k=6))

# POST /circles/join
@router.post("/join")
async def join_circle(cairn_user=Depends(get_cairn_user)):
    persona = cairn_user["current_persona"]

    # Check if user already has an active membership (not left)
    existing_membership = supabase.table("circle_members")\
        .select("circle_id")\
        .eq("user_id", cairn_user["id"])\
        .is_("left_at", "null")\
        .execute()

    if existing_membership.data:
        return {
            "circle_id": existing_membership.data[0]["circle_id"],
            "status": "already_in_circle"
        }

    # Find a forming circle
    forming = supabase.table("circles")\
        .select("id")\
        .eq("status", "forming")\
        .limit(1)\
        .execute()

    if forming.data:
        circle_id = forming.data[0]["id"]
    else:
        new_circle = supabase.table("circles").insert({
            "status": "forming",
            "primary_burden_tag": cairn_user.get("primary_burden"),
            "facilitator_state": {},
        }).execute()
        circle_id = new_circle.data[0]["id"]

    # Check if user has a previous LEFT membership in this circle
    previous = supabase.table("circle_members")\
        .select("id")\
        .eq("circle_id", circle_id)\
        .eq("user_id", cairn_user["id"])\
        .execute()

    if previous.data:
        # Update the existing row instead of inserting a new one
        supabase.table("circle_members").update({
            "left_at": None,
            "role_label": persona,
            "joined_at": datetime.utcnow().isoformat(),
            "anonymous_alias": random_alias(),
        }).eq("id", previous.data[0]["id"]).execute()
    else:
        # Fresh insert
        supabase.table("circle_members").insert({
            "circle_id": circle_id,
            "user_id": cairn_user["id"],
            "role_label": persona,
            "anonymous_alias": random_alias(),
        }).execute()

    # Update user stats
    supabase.table("users").update({
        "circles_joined": cairn_user["circles_joined"] + 1
    }).eq("id", cairn_user["id"]).execute()

    # If circle has 3+ members activate it
    member_count = supabase.table("circle_members")\
        .select("id", count="exact")\
        .eq("circle_id", circle_id)\
        .is_("left_at", "null")\
        .execute()

    if member_count.count >= 3:
        supabase.table("circles")\
            .update({"status": "active"})\
            .eq("id", circle_id)\
            .execute()

    return {"circle_id": circle_id, "status": "joined"}

# POST /circles/{circle_id}/leave
@router.post("/{circle_id}/leave")
async def leave_circle(circle_id: str, cairn_user=Depends(get_cairn_user)):
    supabase.table("circle_members")\
        .update({"left_at": datetime.utcnow().isoformat()})\
        .eq("circle_id", circle_id)\
        .eq("user_id", cairn_user["id"])\
        .execute()
    return {"status": "left"}

# GET /circles/{circle_id}
@router.get("/{circle_id}")
async def get_circle(circle_id: str, cairn_user=Depends(get_cairn_user)):
    circle = supabase.table("circles")\
        .select("*")\
        .eq("id", circle_id)\
        .single()\
        .execute()

    members = supabase.table("circle_members")\
        .select("id, role_label, anonymous_alias, joined_at, message_count")\
        .eq("circle_id", circle_id)\
        .is_("left_at", "null")\
        .execute()

    return {"circle": circle.data, "members": members.data}
from fastapi import APIRouter, Depends, HTTPException
from auth import supabase, get_cairn_user

router = APIRouter()

def require_admin(cairn_user=Depends(get_cairn_user)):
    role_check = supabase.table("user_roles")\
        .select("role")\
        .eq("user_id", cairn_user["supabase_auth_id"])\
        .execute()
    roles = [r["role"] for r in (role_check.data or [])]
    if "admin" not in roles and "moderator" not in roles:
        raise HTTPException(status_code=403, detail="Admin only")
    return cairn_user

# GET /admin/memories/pending — memories awaiting safety review
@router.get("/memories/pending")
async def get_pending_memories(admin=Depends(require_admin)):
    return supabase.table("memories")\
        .select("*")\
        .eq("is_approved", False)\
        .is_("reviewed_by", "null")\
        .order("created_at")\
        .execute().data

# POST /admin/memories/{id}/approve
@router.post("/memories/{memory_id}/approve")
async def approve_memory(memory_id: str, admin=Depends(require_admin)):
    from datetime import datetime
    supabase.table("memories").update({
        "is_approved": True,
        "reviewed_by": admin["supabase_auth_id"],
        "reviewed_at": datetime.utcnow().isoformat(),
    }).eq("id", memory_id).execute()
    return {"status": "approved"}

# POST /admin/memories/{id}/reject
@router.post("/memories/{memory_id}/reject")
async def reject_memory(memory_id: str, reason: str, admin=Depends(require_admin)):
    from datetime import datetime
    supabase.table("memories").update({
        "is_approved": False,
        "reviewed_by": admin["supabase_auth_id"],
        "reviewed_at": datetime.utcnow().isoformat(),
        "rejection_reason": reason,
    }).eq("id", memory_id).execute()
    return {"status": "rejected"}

# GET /admin/audit-log
@router.get("/audit-log")
async def get_audit_log(admin=Depends(require_admin)):
    return supabase.table("audit_log")\
        .select("*")\
        .order("created_at", desc=True)\
        .limit(100)\
        .execute().data

# GET /admin/crisis-users — users currently flagged in crisis
@router.get("/crisis-users")
async def get_crisis_users(admin=Depends(require_admin)):
    return supabase.table("users")\
        .select("id, current_persona, current_stress_level, crisis_flagged_at, created_at")\
        .eq("is_in_crisis", True)\
        .execute().data
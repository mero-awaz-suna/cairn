"""
cairn/apps/api/auth.py

Unified auth — accepts Supabase session tokens from the frontend.
No custom JWT, no passwords. Supabase Auth is the single source of truth.

How it works:
    1. Frontend authenticates via Google OAuth (Supabase Auth)
    2. Frontend sends Supabase access_token in Authorization: Bearer <token>
    3. Backend verifies token with Supabase's auth.getUser()
    4. Backend looks up the user in the `users` table by supabase_auth_id

Usage in routes:
    @router.get("/something")
    async def something(cairn_user: dict = Depends(get_cairn_user)):
        user_id = cairn_user["id"]
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Verify the Supabase access token and return the auth user.

    Uses the service-role client to call auth.get_user(token),
    which validates the JWT signature against Supabase's keys.
    Returns the Supabase auth user dict (contains .id = auth.uid()).
    """
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return {"auth_uid": response.user.id, "email": response.user.email}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


async def get_cairn_user(auth_user: dict = Depends(get_current_user)) -> dict:
    """
    Look up the Cairn user profile by supabase_auth_id.

    This maps the Supabase auth.uid() to our users table.
    Returns the full user row from the `users` table.
    """
    result = (
        supabase.table("users")
        .select("*")
        .eq("supabase_auth_id", auth_user["auth_uid"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="User profile not found")
    return result.data

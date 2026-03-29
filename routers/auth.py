from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from auth import supabase, hash_password, verify_password, create_access_token, decode_token
from datetime import datetime

router = APIRouter()

class RegisterPayload(BaseModel):
    email: str
    password: str
    academic_stage: str = "just_arrived"
    primary_burden: str = "all_of_it"
    cultural_context: str | None = None

class LoginPayload(BaseModel):
    email: str
    password: str

# POST /auth/register
@router.post("/register")
async def register(payload: RegisterPayload):
    # Check if email already exists
    try:
        existing = supabase.table("users")\
            .select("id")\
            .eq("email", payload.email)\
            .execute()
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        )

    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Build user data
    user_data = {
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
        "academic_stage": payload.academic_stage,
        "primary_burden": payload.primary_burden,
        "consented_to_terms_at": datetime.utcnow().isoformat(),
        "consented_to_ai_at": datetime.utcnow().isoformat(),
    }
    if payload.cultural_context:
        user_data["cultural_context"] = payload.cultural_context

    # Single insert into users
    try:
        user = supabase.table("users").insert(user_data).execute()
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Registration failed: database is unreachable or misconfigured.",
        )

    if not user.data:
        raise HTTPException(status_code=500, detail="Registration failed")

    user_id = user.data[0]["id"]

    # Audit log
    try:
        supabase.table("audit_log").insert({
            "actor_id": user_id,
            "action": "user_registered",
            "entity_type": "users",
            "entity_id": user_id,
        }).execute()
    except:
        pass

    token = create_access_token({
        "user_id": user_id,
        "email": payload.email,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_id,
        "message": "Registration successful"
    }

# POST /auth/login
@router.post("/login")
async def login(payload: LoginPayload):
    # Find user by email
    try:
        user = supabase.table("users")\
            .select("id, hashed_password, current_persona, current_stress_level")\
            .eq("email", payload.email)\
            .execute()
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Login failed: database is unreachable or misconfigured.",
        )

    if not user.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_data = user.data[0]

    # Verify password
    if not verify_password(payload.password, user_data["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({
        "user_id": user_data["id"],
        "email": payload.email,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_data["id"],
        "persona": user_data["current_persona"],
        "message": "Login successful"
    }

# POST /auth/refresh
@router.post("/refresh")
async def refresh(credentials: str):
    payload = decode_token(credentials)
    new_token = create_access_token({
        "user_id": payload["user_id"],
        "email": payload["email"],
    })
    return {"access_token": new_token, "token_type": "bearer"}
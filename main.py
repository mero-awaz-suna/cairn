import logging

from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
import os
from urllib.parse import urlsplit
from routers import users, journal, circles, messages, memories, burdens, admin, auth
from fastapi.middleware.cors import CORSMiddleware

from auth import supabase
from db.persona_store import PersonaStore


from persona.core.pipeline import CairnPipeline
from routers.persona import router as persona_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Build shared instances at startup.
    These are stateless — safe to share across all requests and threads.
    """
    logger.info("Starting Cairn API...")

    # ── Persona store ─────────────────────────────────────────────────────────
    app.state.persona_store = PersonaStore(supabase)
    logger.info("PersonaStore ready.")

    # ── Pipeline ──────────────────────────────────────────────────────────────
    # Development: both extractors mocked (no API keys or model weights needed)
    # Staging:     use_mock_audio=True, real Gemini linguistic extractor
    # Production:  both False
    app.state.pipeline = CairnPipeline.build(
        use_mock_audio=True,  # ← set False in production
        use_mock_linguistic=True,  # ← set False once Gemini key is configured
    )
    logger.info("CairnPipeline ready.")

    yield

    logger.info("Shutting down.")


load_dotenv()

security = HTTPBearer()



def normalize_origin(origin: str) -> str:
    cleaned = origin.strip().rstrip("/")
    if not cleaned:
        return ""
    parsed = urlsplit(cleaned)
    # CORS compares scheme + host + optional port, never path/query.
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return cleaned


def get_cors_origins() -> list[str]:
    cors_origins = os.getenv("CORS_ORIGINS", "").strip()
    if cors_origins:
        origins = [normalize_origin(origin) for origin in cors_origins.split(",")]
        return [origin for origin in dict.fromkeys(origins) if origin]
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

app = FastAPI(
    title="Cairn API",
    swagger_ui_parameters={"persistAuthorization": True},
    lifespan=lifespan,
)

cors_config = {
    "allow_origins": get_cors_origins(),
    "allow_origin_regex": os.getenv(
        "CORS_ORIGIN_REGEX",
        r"^http://((localhost|127\.0\.0\.1)|(192\.168\.[0-9]{1,3}\.[0-9]{1,3})|(10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})|(172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3})):3000$",
    ),
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

# Auth router has NO prefix — keeps /auth/login and /auth/register clean
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(journal.router, prefix="/journal", tags=["Journal"])
app.include_router(circles.router, prefix="/circles", tags=["Circles"])
app.include_router(messages.router, prefix="/messages", tags=["Messages"])
app.include_router(memories.router, prefix="/memories", tags=["Memories"])
app.include_router(burdens.router, prefix="/burdens", tags=["Burdens"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(persona_router, prefix="/persona", tags=["Persona"])


@app.get("/health")
async def health():
    return {"status": "ok"}

app.include_router(burdens.router,  prefix="/burdens",  tags=["Burdens"])
app.include_router(admin.router,    prefix="/admin",    tags=["Admin"])

# Wrap the whole ASGI app so CORS headers are present even on error responses.
app = CORSMiddleware(app=app, **cors_config)
import logging

from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from routers import users, journal, circles, messages, memories, burdens, admin, auth, facilitator

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


security = HTTPBearer()


app = FastAPI(
    title="Cairn API",
    swagger_ui_parameters={"persistAuthorization": True},
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
    # Vercel deployments
    "https://web-blush-mu-51.vercel.app",
    "https://cairn-app.vercel.app",
    "https://carinapp.vercel.app",
]
# Allow any Vercel preview URL
import os
extra_origin = os.getenv("CORS_ALLOW_ORIGIN", "")
if extra_origin:
    ALLOWED_ORIGINS.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(facilitator.router, prefix="/facilitator", tags=["Facilitator"])


@app.get("/health")
async def health():
    return {"status": "ok"}

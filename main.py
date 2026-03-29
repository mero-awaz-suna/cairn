import logging
import asyncio

from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from routers import users, journal, circles, messages, memories, burdens, admin, auth
from fastapi.middleware.cors import CORSMiddleware

from auth import supabase
from db.persona_store import PersonaStore
from db.circle_store import CircleStore
from db.cluster_store import ClusterStore


from persona.core.pipeline import CairnPipeline
from routers.persona import router as persona_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_cluster_refresh_once(app: FastAPI) -> None:
    cluster_store = app.state.cluster_store

    if hasattr(cluster_store, "batch_assign_from_personas"):
        personas = app.state.persona_store.load_all()
        if not personas:
            logger.info("Cluster refresh skipped: no personas available.")
            return

        assignments = cluster_store.batch_assign_from_personas(personas)
        logger.info(
            "Cluster refresh complete: personas=%d assignments=%d",
            len(personas),
            len(assignments),
        )
        return

    if hasattr(cluster_store, "run_cluster_job"):
        summary = cluster_store.run_cluster_job()
        logger.info("Cluster refresh complete via run_cluster_job: %s", summary)
        return

    logger.warning(
        "Cluster refresh skipped: cluster_store has no supported job method."
    )


async def cluster_refresh_loop(app: FastAPI, interval_seconds: int = 3600) -> None:
    while True:
        try:
            await run_cluster_refresh_once(app)
        except Exception:
            logger.exception("Cluster refresh job failed.")
        await asyncio.sleep(interval_seconds)


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

    # ── Circle / Cluster stores ───────────────────────────────────────────────
    app.state.circle_store = CircleStore(supabase)
    app.state.cluster_store = ClusterStore(supabase)
    logger.info("CircleStore and ClusterStore ready.")

    # ── Pipeline ──────────────────────────────────────────────────────────────
    # Development: both extractors mocked (no API keys or model weights needed)
    # Staging:     use_mock_audio=True, real Gemini linguistic extractor
    # Production:  both False
    app.state.pipeline = CairnPipeline.build(
        use_mock_audio=True,  # ← set False in production
        use_mock_linguistic=True,  # ← set False once Gemini key is configured
    )
    logger.info("CairnPipeline ready.")

    # ── Background cluster refresh (hourly) ──────────────────────────────────
    app.state.cluster_refresh_task = asyncio.create_task(cluster_refresh_loop(app))
    logger.info("Hourly cluster refresh loop started.")

    yield

    task = getattr(app.state, "cluster_refresh_task", None)
    if task is not None:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            logger.info("Cluster refresh loop stopped.")

    logger.info("Shutting down.")


security = HTTPBearer()


app = FastAPI(
    title="Cairn API",
    swagger_ui_parameters={"persistAuthorization": True},
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:3000",
    ],
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


@app.get("/health")
async def health():
    return {"status": "ok"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from routers import users, journal, circles, messages, memories, burdens, admin, auth

security = HTTPBearer()

app = FastAPI(
    title="Cairn API",
    swagger_ui_parameters={"persistAuthorization": True}
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
app.include_router(auth.router,     prefix="/auth",     tags=["Auth"])
app.include_router(users.router,    prefix="/users",    tags=["Users"])
app.include_router(journal.router,  prefix="/journal",  tags=["Journal"])
app.include_router(circles.router,  prefix="/circles",  tags=["Circles"])
app.include_router(messages.router, prefix="/messages", tags=["Messages"])
app.include_router(memories.router, prefix="/memories", tags=["Memories"])
app.include_router(burdens.router,  prefix="/burdens",  tags=["Burdens"])
app.include_router(admin.router,    prefix="/admin",    tags=["Admin"])
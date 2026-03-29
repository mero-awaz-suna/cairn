# Cairn Backend (FastAPI)

Backend API for Cairn, built with FastAPI and Supabase.

## Prerequisites

- Python 3.12+ (project currently runs on Python 3.13)
- A Supabase project with required tables

## 1. Create and activate virtual environment

From this folder:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

## 2. Install dependencies

```powershell
pip install -r requirements.txt
```

## 3. Configure environment variables

Create a `.env` file using `.env.example`:

```powershell
Copy-Item .env.example .env
```

Then edit `.env` and set your real values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `JWT_EXPIRE_MINUTES`

Optional:

- `SUPABASE_JWT_SECRET`
- `CORS_ORIGINS`
- `CORS_ORIGIN_REGEX`

Important:

- Keep `.env` private. Do not commit secrets.
- `.env` is already ignored via `.gitignore`.

## 4. Run the API

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

If port 8000 is busy, use another port (for example, 8001).

## 5. API docs

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## CORS notes

The backend reads CORS config from `.env`:

- `CORS_ORIGINS`: comma-separated list of exact origins (scheme + host + port)
- `CORS_ORIGIN_REGEX`: optional regex for dynamic LAN origins

Example:

`CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.74:3000`

Do not include paths like `/login` in origins.

## Common troubleshooting

- `503 Service Unavailable` during register/login:
  - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- `No module named uvicorn`:
  - Reinstall dependencies with `pip install -r requirements.txt` in `.venv`.
- CORS blocked in browser:
  - Add your frontend origin to `CORS_ORIGINS` and restart backend.

import os

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

BASE_URL = os.getenv("CAIRN_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
TEST_EMAIL = os.getenv("TEST_EMAIL", "persona_test_087d36e584@example.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "TestPassword123!")
USE_SUPABASE_AUTH = os.getenv("USE_SUPABASE_AUTH", "false").lower() == "true"

# # Step 1: Create the test user (only needed once)
# try:
#     supabase.auth.admin.create_user({
#         "email": TEST_EMAIL,
#         "password": TEST_PASSWORD,
#         "email_confirm": True  # skip email verification
#     })
#     print("Test user created")
# except Exception as e:
#     print(f"User may already exist: {e}")


def login_via_app_auth() -> str:
    """Login using the app's /auth/login route (users table credentials)."""
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=30,
    )
    if not resp.ok:
        raise RuntimeError(f"App login failed: {resp.status_code} {resp.text}")

    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise RuntimeError(f"No access_token in app login response: {data}")
    return token


def login_via_supabase_auth() -> str:
    """Login using Supabase Auth (only works for auth.users accounts)."""
    response = supabase.auth.sign_in_with_password(
        {"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    return response.session.access_token


try:
    if USE_SUPABASE_AUTH:
        token = login_via_supabase_auth()
    else:
        token = login_via_app_auth()
except Exception as exc:
    raise SystemExit(
        "Token generation failed.\n"
        f"email={TEST_EMAIL}\n"
        f"mode={'supabase-auth' if USE_SUPABASE_AUTH else 'app-auth'}\n"
        f"error={exc}\n"
        "Hint: test_user_persona_flow.py creates users via /auth/register in your app, "
        "so use app-auth mode (default)."
    )

print("\nYour Bearer token:\n")
print(f"Bearer {token}\n")
print("Copy the full line above into Swagger Authorize")

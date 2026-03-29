"""
Integration test for user persona lifecycle.

Flow covered:
1) Create a new user.
2) Onboard persona with identity demographics.
3) Upload 5 voice memos from a local folder.
4) Verify persona state updates after each upload.

Usage:
    # Start API first (uvicorn main:app --reload)
    python tests/test_user_persona_flow.py

Optional environment variables:
    CAIRN_BASE_URL=http://127.0.0.1:8000
    CAIRN_MEMO_DIR=tests/voice_memos
"""

from __future__ import annotations

import glob
import os
import uuid
from pathlib import Path

import requests


BASE_URL = os.getenv("CAIRN_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
MEMO_DIR = os.getenv("CAIRN_MEMO_DIR", "tests/voice_memos")
TIMEOUT_SECONDS = 60


def _assert_ok(resp: requests.Response, context: str) -> dict:
    if not resp.ok:
        raise AssertionError(
            f"{context} failed: status={resp.status_code}, body={resp.text}"
        )
    return resp.json()


def _pick_memos(memo_dir: str, count: int = 5) -> list[str]:
    exts = ("*.wav", "*.mp3", "*.m4a", "*.ogg", "*.webm", "*.mp4")
    files: list[str] = []
    for ext in exts:
        files.extend(glob.glob(str(Path(memo_dir) / ext)))
    files = sorted(files)

    if len(files) < count:
        raise AssertionError(
            f"Need at least {count} memo files in '{memo_dir}', found {len(files)}"
        )
    return files[:count]


def _register_user() -> tuple[str, str]:
    email = f"persona_test_his@example.com"
    password = "TestPassword123!"

    payload = {
        "email": email,
        "password": password,
        "academic_stage": "just_arrived",
        "primary_burden": "all_of_it",
    }
    resp = requests.post(
        f"{BASE_URL}/auth/register", json=payload, timeout=TIMEOUT_SECONDS
    )
    data = _assert_ok(resp, "User registration")
    token = data.get("access_token")
    if not token:
        raise AssertionError("Register response missing access_token")
    return token, data.get("user_id", "")


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_create_onboard_and_upload_five_memos() -> None:
    memos = _pick_memos(MEMO_DIR, count=5)

    token, user_id = _register_user()
    headers = _auth_headers(token)

    onboard_payload = {
        "age_group": "late_20s",
        "occupation": "student",
        "industry": "software",
        "language_code": "en",
        "region_code": "US",
        "living_situation": "alone",
    }
    onboard_resp = requests.post(
        f"{BASE_URL}/users/me/persona/onboard",
        json=onboard_payload,
        headers=headers,
        timeout=TIMEOUT_SECONDS,
    )
    onboard_data = _assert_ok(onboard_resp, "Persona onboarding")
    assert onboard_data.get("user_id") == user_id or user_id == ""

    for idx, memo_path in enumerate(memos, start=1):
        with open(memo_path, "rb") as f:
            files = {"audio": (Path(memo_path).name, f, "audio/wav")}
            upload_resp = requests.post(
                f"{BASE_URL}/journal/audio",
                files=files,
                headers=headers,
                timeout=TIMEOUT_SECONDS,
            )

        upload_data = _assert_ok(upload_resp, f"Memo upload #{idx}")
        assert upload_data.get("entry_id"), f"Missing entry_id for memo #{idx}"

        persona_resp = requests.get(
            f"{BASE_URL}/persona/me", headers=headers, timeout=TIMEOUT_SECONDS
        )
        persona_data = _assert_ok(persona_resp, f"Persona fetch after memo #{idx}")

        assert isinstance(persona_data.get("stage"), str)
        assert persona_data.get("entry_count", 0) >= idx

        users_me = requests.get(
            f"{BASE_URL}/users/me", headers=headers, timeout=TIMEOUT_SECONDS
        )
        users_me_data = _assert_ok(users_me, f"User state fetch after memo #{idx}")
        assert users_me_data.get("state") in {
            "In the storm",
            "Finding ground",
            "Through it",
            None,
        }
        assert users_me_data.get("current_persona") in {
            "storm",
            "ground",
            "through_it",
            None,
        }

    print(
        "PASS: user creation, persona onboarding, and 5 memo-driven updates completed"
    )


if __name__ == "__main__":
    test_create_onboard_and_upload_five_memos()

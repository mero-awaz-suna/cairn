"""
Integration test for circles GET and LEAVE API endpoints.

What this test covers:
1) Obtain an authenticated user token.
2) Obtain a circle_id (from env or by requesting a circle).
3) Call GET /circles/{circle_id}.
4) Call POST /circles/{circle_id}/leave.
5) Call leave again to validate idempotent behavior.

Usage:
    python tests/test_circle_leave_get_api.py

Optional environment variables:
    CAIRN_BASE_URL=http://127.0.0.1:8000
    CAIRN_TEST_TOKEN=<bearer-token>
    CAIRN_TEST_CIRCLE_ID=<circle-id>
    CAIRN_MEMO_DIR=tests/voice_memos
    CAIRN_MEMO_COUNT=5
"""

from __future__ import annotations

import glob
import os
import sys
import uuid
from pathlib import Path

import requests


BASE_URL = os.getenv("CAIRN_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
MEMO_DIR = os.getenv("CAIRN_MEMO_DIR", "tests/voice_memos")
MEMO_COUNT = int(os.getenv("CAIRN_MEMO_COUNT", "5"))
TIMEOUT_SECONDS = 90


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


def _assert_ok(resp: requests.Response, context: str) -> dict:
    if not resp.ok:
        raise AssertionError(
            f"{context} failed: status={resp.status_code}, body={resp.text}"
        )
    return resp.json()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _pick_memos(memo_dir: str, count: int) -> list[str]:
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
    email = f"circle_leave_get_{uuid.uuid4().hex[:10]}@example.com"
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
    user_id = data.get("user_id")
    if not token or not user_id:
        raise AssertionError(f"Invalid register response: {data}")
    return token, user_id


def _onboard_persona(token: str) -> None:
    payload = {
        "age_group": "late_20s",
        "occupation": "early_career",
        "industry": "software",
        "language_code": "en",
        "region_code": "US",
        "living_situation": "alone",
    }
    resp = requests.post(
        f"{BASE_URL}/users/me/persona/onboard",
        json=payload,
        headers=_auth_headers(token),
        timeout=TIMEOUT_SECONDS,
    )
    # Onboard route may return "created" or "already_exists".
    data = _assert_ok(resp, "Persona onboard")
    status = data.get("status")
    if status not in {"created", "already_exists", None}:
        raise AssertionError(f"Unexpected onboard status: {data}")


def _upload_memos(token: str, count: int) -> None:
    memos = _pick_memos(MEMO_DIR, count=count)
    for idx, memo_path in enumerate(memos, start=1):
        with open(memo_path, "rb") as f:
            files = {"audio": (Path(memo_path).name, f, "audio/wav")}
            resp = requests.post(
                f"{BASE_URL}/journal/audio",
                files=files,
                headers=_auth_headers(token),
                timeout=TIMEOUT_SECONDS,
            )
        data = _assert_ok(resp, f"Journal upload #{idx}")
        if not data.get("entry_id"):
            raise AssertionError(f"Missing entry_id for memo #{idx}: {data}")


def _request_circle(token: str) -> str:
    resp = requests.post(
        f"{BASE_URL}/circles/request",
        headers=_auth_headers(token),
        timeout=TIMEOUT_SECONDS,
    )
    data = _assert_ok(resp, "Circle request")

    status = data.get("status")
    if status not in {"formed", "already_in_circle"}:
        raise AssertionError(f"Unexpected circle request status: {data}")

    circle_id = data.get("circle_id")
    if not circle_id:
        raise AssertionError(f"No circle_id in circle response: {data}")
    return circle_id


def test_get_and_leave_circle_api() -> None:
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjEwYmRjMjUtNWM5Yi00YWJhLTk1NGItYjliZWNmM2ZkNTk4IiwiZW1haWwiOiJwZXJzb25hX3Rlc3RfMDg3ZDM2ZTU4NEBleGFtcGxlLmNvbSIsImV4cCI6MTc3NDc4MTQ3MH0.kyqXWRTelvEmrsidZC3gnnjOGaBX0PsIaXs43ZFrlPI"
    circle_id = "59827280-58c8-4f3d-ba98-14b899913b63"

    if not token:
        token, _ = _register_user()
        _onboard_persona(token)
        _upload_memos(token, count=MEMO_COUNT)

    if not circle_id:
        circle_id = _request_circle(token)

    # 1) GET circle details
    get_resp = requests.get(
        f"{BASE_URL}/circles/{circle_id}",
        headers=_auth_headers(token),
        timeout=TIMEOUT_SECONDS,
    )
    get_data = _assert_ok(get_resp, "GET circle")
    if "circle" not in get_data or "members" not in get_data:
        raise AssertionError(f"Malformed GET /circles response: {get_data}")

    # 2) LEAVE once
    leave_resp = requests.post(
        f"{BASE_URL}/circles/{circle_id}/leave",
        headers=_auth_headers(token),
        timeout=TIMEOUT_SECONDS,
    )
    leave_data = _assert_ok(leave_resp, "Leave circle")
    if leave_data.get("status") not in {"left", "already_left"}:
        raise AssertionError(f"Unexpected leave response: {leave_data}")

    # 3) LEAVE again (should be idempotent)
    leave_again_resp = requests.post(
        f"{BASE_URL}/circles/{circle_id}/leave",
        headers=_auth_headers(token),
        timeout=TIMEOUT_SECONDS,
    )
    leave_again_data = _assert_ok(leave_again_resp, "Leave circle again")
    if leave_again_data.get("status") != "already_left":
        raise AssertionError(
            f"Expected already_left on second leave: {leave_again_data}"
        )

    print("PASS: GET and LEAVE circle APIs validated")
    print(f"circle_id={circle_id}")


if __name__ == "__main__":
    test_get_and_leave_circle_api()

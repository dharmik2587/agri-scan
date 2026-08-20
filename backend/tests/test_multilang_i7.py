"""Iteration 7 backend regression: multi-language support for /api/auth/language.

Validates that all 6 language codes {en,hi,mr,ta,te,bn} are accepted.
Currently expected to FAIL for mr/ta/te/bn because backend/models.py LanguageInput
is Literal["en","hi"] — this test flags the bug.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def auth_headers():
    email = f"TEST_lang_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "Lang Tester",
        "email": email,
        "password": "testpass123",
    }, timeout=15)
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"
    token = r.json().get("token") or r.json().get("access_token") or r.json().get("session_token")
    # Common variations
    if not token:
        for k in ("data", "user"):
            if k in r.json() and isinstance(r.json()[k], dict):
                token = r.json()[k].get("token")
                if token:
                    break
    assert token, f"no token in register response: {r.json()}"
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize("code", ["en", "hi", "mr", "ta", "te", "bn"])
def test_set_language_accepts_all_six_codes(auth_headers, code):
    r = requests.post(f"{API}/auth/language", json={"language": code}, headers=auth_headers, timeout=10)
    assert r.status_code == 200, (
        f"Language '{code}' rejected with {r.status_code}: {r.text}. "
        f"LanguageInput Literal likely still ['en','hi']."
    )
    body = r.json()
    assert body.get("language") == code


def test_advisor_accepts_new_language_code_schema(auth_headers):
    """Just validate advisor endpoint schema accepts mr/ta/te/bn (do NOT run LLM).
    We send an obviously-invalid payload so validation errors would surface first.
    A 422 that mentions 'language' would indicate schema rejection.
    Otherwise any 200/4xx/5xx unrelated to language field is fine.
    """
    r = requests.post(f"{API}/advisor/query", json={
        "crop": "Tomato",
        "state": "Maharashtra",
        "district": "Pune",
        "question": "",
        "language": "mr",
    }, headers=auth_headers, timeout=60)
    # Accept 200 or any error; only fail if validation explicitly rejects "language"
    if r.status_code == 422:
        detail = str(r.json())
        assert "language" not in detail.lower(), f"advisor rejects language 'mr': {detail}"


def test_voice_transcribe_accepts_language_field_schema():
    """Voice transcribe uses Form(language). Send a bogus multipart to confirm
    the language field itself is not rejected at parse time."""
    # No audio -> likely 400/422, but not about language
    files = {"audio": ("x.webm", b"", "audio/webm")}
    data = {"language": "bn"}
    r = requests.post(f"{API}/voice/transcribe", files=files, data=data, timeout=15)
    # Just confirm response body if 422 does not complain about the language value
    if r.status_code == 422:
        body = str(r.json()).lower()
        # complaint about language enum would be a bug; complaint about audio/file is fine
        assert "language" not in body or "audio" in body or "file" in body, body

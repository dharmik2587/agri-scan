"""End-to-end backend API tests for AgriScan."""
import os
import base64
import io
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://farm-care-hub-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---- small 32x32 red jpeg (base64) ----
def _tiny_jpeg_b64():
    # generate via PIL if available, else use static bytes
    try:
        from PIL import Image
        buf = io.BytesIO()
        Image.new("RGB", (32, 32), (34, 139, 34)).save(buf, format="JPEG", quality=60)
        return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        # a valid tiny jpeg fallback
        raw = base64.b64decode(
            "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAgACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigAooooAKKKKACiiigAooooA//9k="
        )
        return base64.b64encode(raw).decode()


TINY_JPEG_B64 = _tiny_jpeg_b64()


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def user_creds():
    return {
        "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
        "password": "TestPass123!",
        "name": "TEST User",
    }


@pytest.fixture(scope="session")
def auth(session, user_creds):
    r = session.post(f"{API}/auth/register", json=user_creds)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return data["token"], data["user"]


@pytest.fixture
def auth_headers(auth):
    return {"Authorization": f"Bearer {auth[0]}"}


# ------------- Health -------------
def test_health(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    j = r.json()
    assert j.get("status") == "ok"


# ------------- Auth -------------
def test_register_and_me(session, auth, user_creds):
    token, user = auth
    assert token and user["email"] == user_creds["email"]

    r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == user_creds["email"]


def test_login(session, user_creds, auth):
    r = session.post(f"{API}/auth/login", json={"email": user_creds["email"], "password": user_creds["password"]})
    assert r.status_code == 200
    assert "token" in r.json()


def test_language_persistence(session, auth_headers):
    r = session.post(f"{API}/auth/language", json={"language": "hi"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["language"] == "hi"

    me = session.get(f"{API}/auth/me", headers=auth_headers).json()
    assert me.get("language") == "hi"


# ------------- Calculator -------------
def test_calculator(session):
    payload = {
        "crop_type": "Tomato",
        "area": 1.0,
        "area_unit": "hectare",
        "severity": "moderate",
        "growth_stage": "vegetative",
        "product_type": "fertilizer",
    }
    r = session.post(f"{API}/calculator", json=payload)
    assert r.status_code == 200, r.text
    j = r.json()
    for key in ["quantity_kg_or_l", "npk", "recommended_dosage_kg_per_ha", "max_safe_dosage_kg_per_ha", "mix_ratio", "safety_warnings"]:
        assert key in j, f"missing {key}: {j}"


# ------------- Market -------------
def test_market_crops(session):
    r = session.get(f"{API}/market/crops")
    assert r.status_code == 200
    j = r.json()
    assert len(j["crops"]) >= 20
    assert len(j["regions"]) >= 10


def test_market_prices(session):
    r = session.get(f"{API}/market/prices", params={"crop": "Tomato", "region": "Maharashtra"})
    assert r.status_code == 200
    assert "prices" in r.json()


def test_market_trend(session):
    r = session.get(f"{API}/market/trend", params={"crop": "Tomato", "days": 7})
    assert r.status_code == 200
    j = r.json()
    assert len(j["trend"]) == 7


def test_market_listing_crud(session, auth_headers):
    payload = {
        "crop": "Tomato",
        "quantity_kg": 100,
        "asking_price_per_kg": 25.5,
        "region": "Maharashtra",
        "contact": "9999999999",
    }
    r = session.post(f"{API}/market/listings", json=payload, headers=auth_headers)
    assert r.status_code == 200, r.text
    listing = r.json()
    assert listing["crop"] == "Tomato"
    assert "listing_id" in listing

    lst = session.get(f"{API}/market/listings").json()
    assert any(x.get("listing_id") == listing["listing_id"] for x in lst)


# ------------- Advisor meta -------------
def test_advisor_meta(session):
    r = session.get(f"{API}/advisor/meta")
    assert r.status_code == 200
    j = r.json()
    assert len(j["crops"]) >= 90
    assert len(j["states"]) >= 30


def test_advisor_districts(session):
    r = session.get(f"{API}/advisor/districts", params={"state": "Maharashtra"})
    assert r.status_code == 200
    assert len(r.json()["districts"]) > 0


# ------------- Advisor query (LLM) -------------
def test_advisor_query_en(session):
    payload = {"crop": "Tomato", "state": "Maharashtra", "district": "Pune", "language": "en"}
    r = session.post(f"{API}/advisor/query", json=payload, timeout=90)
    assert r.status_code == 200, r.text
    j = r.json()
    for key in ["summary", "soil", "fertilizers", "pesticides", "diseases", "pests", "soil_problems", "safety_precautions", "local_notes", "disclaimer"]:
        assert key in j, f"missing {key}"
    assert isinstance(j["fertilizers"], list) and len(j["fertilizers"]) > 0
    assert isinstance(j["diseases"], list) and len(j["diseases"]) > 0
    soil = j["soil"]
    for k in ["type", "ph_range", "key_nutrients", "recommendations"]:
        assert k in soil


def test_advisor_query_hi(session):
    payload = {"crop": "Tomato", "state": "Maharashtra", "district": "Pune", "language": "hi"}
    r = session.post(f"{API}/advisor/query", json=payload, timeout=90)
    assert r.status_code == 200, r.text
    j = r.json()
    summary = j.get("summary", "")
    # Devanagari range 0x0900-0x097F
    devanagari = [c for c in summary if 0x0900 <= ord(c) <= 0x097F]
    assert len(devanagari) > 5, f"summary not in Hindi: {summary!r}"


# ------------- Diagnose + scans -------------
@pytest.fixture(scope="session")
def diagnose_scan(session, auth):
    token, _ = auth
    payload = {"image_base64": TINY_JPEG_B64, "mime_type": "image/jpeg"}
    r = session.post(f"{API}/diagnose", json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=90)
    assert r.status_code == 200, r.text
    return r.json()


def test_diagnose_returns_report(diagnose_scan):
    j = diagnose_scan
    for key in ["scan_id", "plant_name", "disease_name", "severity", "disease_confidence", "fertilizer", "pest_prevention", "treatment", "summary", "image_url"]:
        assert key in j, f"missing {key}"


def test_scans_list_and_get_and_delete(session, auth_headers, diagnose_scan):
    scan_id = diagnose_scan["scan_id"]
    time.sleep(0.5)

    r = session.get(f"{API}/scans", headers=auth_headers)
    assert r.status_code == 200
    assert any(s["scan_id"] == scan_id for s in r.json())

    r = session.get(f"{API}/scans/{scan_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["scan_id"] == scan_id

    r = session.delete(f"{API}/scans/{scan_id}", headers=auth_headers)
    assert r.status_code == 200

    r = session.get(f"{API}/scans/{scan_id}", headers=auth_headers)
    assert r.status_code == 404

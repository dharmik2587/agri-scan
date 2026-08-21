"""Backend tests for /api/pesticide/lookup — Claude Sonnet 5 driven."""
import os
import re
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://farm-care-hub-6.preview.emergentagent.com").rstrip("/")
ENDPOINT = f"{BASE_URL}/api/pesticide/lookup"
TIMEOUT = 60


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Validation ----
class TestPesticideValidation:
    def test_missing_both_returns_400(self, api_client):
        r = api_client.post(ENDPOINT, json={}, timeout=TIMEOUT)
        assert r.status_code == 400
        body = r.json()
        assert "detail" in body
        assert "name or image_base64" in body["detail"].lower()

    def test_empty_strings_returns_400(self, api_client):
        r = api_client.post(ENDPOINT, json={"name": "", "image_base64": ""}, timeout=TIMEOUT)
        assert r.status_code == 400


# ---- Real LLM lookups ----
class TestPesticideLookups:
    def test_coragen_english(self, api_client):
        r = api_client.post(ENDPOINT, json={"name": "Coragen", "language": "en"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("product_name")
        assert data.get("category") == "insecticide", f"category={data.get('category')}"
        assert isinstance(data.get("active_ingredients"), list) and len(data["active_ingredients"]) >= 1
        assert isinstance(data.get("precautions"), list) and len(data["precautions"]) >= 3
        assert isinstance(data.get("ppe_required"), list) and len(data["ppe_required"]) >= 1
        assert data.get("toxicity_class")
        assert "₹" in (data.get("price_range_inr") or ""), f"price={data.get('price_range_inr')}"
        rei = data.get("re_entry_interval_hours")
        assert isinstance(rei, int) and rei > 0, f"rei={rei}"
        phi = data.get("pre_harvest_interval_days")
        assert isinstance(phi, int) and phi > 0, f"phi={phi}"
        assert data.get("disclaimer")

    def test_roundup_hindi(self, api_client):
        r = api_client.post(ENDPOINT, json={"name": "Roundup", "language": "hi"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("category") == "herbicide", f"category={data.get('category')}"
        ai_names = " ".join([a.get("name", "") for a in (data.get("active_ingredients") or [])]).lower()
        assert "glyphosate" in ai_names or "ग्लाइफ" in ai_names, f"ai={ai_names}"
        # Devanagari check in precautions
        joined = " ".join(data.get("precautions") or [])
        assert re.search(r"[\u0900-\u097F]", joined), f"no devanagari in precautions: {joined[:200]}"

    def test_mancozeb_marathi(self, api_client):
        r = api_client.post(ENDPOINT, json={"name": "Mancozeb", "language": "mr"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("category") in ("fungicide", "unknown")
        assert isinstance(data.get("precautions"), list) and len(data["precautions"]) >= 3

    def test_tiny_image_still_returns_safety(self, api_client):
        # 32x32 red JPEG (base64-encoded)
        # Create a minimal JPEG in-memory to avoid external deps
        try:
            from PIL import Image
            import io
            buf = io.BytesIO()
            Image.new("RGB", (32, 32), (200, 50, 50)).save(buf, format="JPEG", quality=70)
            b64 = base64.b64encode(buf.getvalue()).decode()
        except Exception:
            # Fallback: a known tiny valid JPEG
            b64 = ("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc"
                   "KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy"
                   "MjIyMjIyMjIyMjIyMjIyMjL/wAARCAAgACADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAA"
                   "AAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AAf/Z")
        r = api_client.post(ENDPOINT, json={"image_base64": b64, "language": "en"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data.get("precautions"), list) and len(data["precautions"]) >= 1
        assert isinstance(data.get("ppe_required"), list) and len(data["ppe_required"]) >= 1
        assert isinstance(data.get("first_aid"), list)

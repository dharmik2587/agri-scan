"""Iteration 9: Listing engagement tracking + Language auto-detect (backend only)"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback for env: read from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def auth_and_listing():
    """Register a user, create a listing, return (token, listing_id)."""
    email = f"TEST_track_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Passw0rd!", "name": "Track Tester", "language": "en"
    })
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    token = r.json()["token"]

    payload = {
        "crop": "Tomato",
        "quantity_kg": 100,
        "asking_price_per_kg": 20,
        "region": "Maharashtra",
        "contact": "+919000000000",
        "notes": "TEST_ tracking listing",
    }
    r = requests.post(f"{API}/market/listings", json=payload,
                      headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, f"create listing failed: {r.status_code} {r.text}"
    listing = r.json()
    return token, listing["listing_id"]


def _get_listing(listing_id):
    r = requests.get(f"{API}/market/listings")
    assert r.status_code == 200
    for l in r.json():
        if l["listing_id"] == listing_id:
            return l
    return None


class TestTracking:
    def test_track_contact_increments(self, auth_and_listing):
        _, lid = auth_and_listing
        r = requests.post(f"{API}/market/listings/{lid}/track", params={"kind": "contact"})
        assert r.status_code == 200
        body = r.json()
        assert body == {"ok": True, "kind": "contact"}
        # Verify persisted
        l = _get_listing(lid)
        assert l is not None
        assert l.get("contact_count") == 1

        # Repeat -> 2
        r2 = requests.post(f"{API}/market/listings/{lid}/track", params={"kind": "contact"})
        assert r2.status_code == 200
        l2 = _get_listing(lid)
        assert l2.get("contact_count") == 2

    def test_track_share_increments(self, auth_and_listing):
        _, lid = auth_and_listing
        r = requests.post(f"{API}/market/listings/{lid}/track", params={"kind": "share"})
        assert r.status_code == 200
        assert r.json() == {"ok": True, "kind": "share"}
        l = _get_listing(lid)
        assert l.get("share_count") == 1

    def test_track_view_increments(self, auth_and_listing):
        _, lid = auth_and_listing
        r = requests.post(f"{API}/market/listings/{lid}/track", params={"kind": "view"})
        assert r.status_code == 200
        assert r.json() == {"ok": True, "kind": "view"}
        l = _get_listing(lid)
        assert l.get("view_count") == 1

    def test_track_invalid_kind_returns_422(self, auth_and_listing):
        _, lid = auth_and_listing
        r = requests.post(f"{API}/market/listings/{lid}/track", params={"kind": "spam"})
        assert r.status_code == 422

    def test_track_missing_kind_returns_422(self, auth_and_listing):
        _, lid = auth_and_listing
        r = requests.post(f"{API}/market/listings/{lid}/track")
        assert r.status_code == 422

    def test_track_nonexistent_listing_returns_200_ok_false(self):
        r = requests.post(f"{API}/market/listings/nonexistent-id-xyz/track",
                          params={"kind": "contact"})
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is False
        assert body.get("kind") == "contact"

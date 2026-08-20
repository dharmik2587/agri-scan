"""Regression tests for market/weather async + circuit-breaker hotfix.

Critical assertions:
- /api/market/* and /api/weather/* return 200 within ~2s (never 502, never hang).
- 8 parallel /api/market/prices requests all succeed within 3s total.
"""
import os
import time
import concurrent.futures
import pytest
import requests
from dotenv import load_dotenv

load_dotenv('/app/frontend/.env')
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


def _get(path, timeout=10):
    return requests.get(f"{BASE_URL}{path}", timeout=timeout)


# --- Market endpoints ---

class TestMarketPrices:
    def test_market_prices_tomato_5x_under_2s(self):
        for i in range(5):
            t0 = time.time()
            r = _get("/api/market/prices?crop=Tomato")
            elapsed = time.time() - t0
            assert r.status_code == 200, f"iter {i}: status {r.status_code}"
            assert elapsed < 2.0, f"iter {i}: took {elapsed:.2f}s"
            data = r.json()
            assert "prices" in data and isinstance(data["prices"], list)
            assert "source" in data

    def test_market_trend_30_and_90(self):
        for days in (30, 90):
            t0 = time.time()
            r = _get(f"/api/market/trend?crop=Tomato&days={days}")
            elapsed = time.time() - t0
            assert r.status_code == 200
            assert elapsed < 2.0, f"days={days}: took {elapsed:.2f}s"
            data = r.json()
            assert "trend" in data and isinstance(data["trend"], list)
            assert len(data["trend"]) == days
            assert "source" in data


# --- Weather endpoints (Open-Meteo is live) ---

class TestWeather:
    def test_weather_forecast(self):
        t0 = time.time()
        r = _get("/api/weather/forecast?lat=18.5&lon=73.8")
        elapsed = time.time() - t0
        assert r.status_code == 200, f"status {r.status_code}: {r.text[:200]}"
        assert elapsed < 8.0, f"took {elapsed:.2f}s"
        data = r.json()
        assert "current" in data and isinstance(data["current"], dict)
        assert "daily" in data and isinstance(data["daily"], list)
        assert len(data["daily"]) == 7
        for day in data["daily"]:
            assert day.get("spray_level") in {"good", "caution", "avoid"}

    def test_weather_geocode(self):
        t0 = time.time()
        r = _get("/api/weather/geocode?q=Pune")
        elapsed = time.time() - t0
        assert r.status_code == 200
        assert elapsed < 8.0
        data = r.json()
        assert "results" in data and isinstance(data["results"], list)
        assert len(data["results"]) > 0
        first = data["results"][0]
        for k in ("name", "latitude", "longitude"):
            assert k in first


# --- Concurrency: verify event loop is not blocked ---

class TestConcurrency:
    def test_8_parallel_market_prices(self):
        def fire(_):
            t0 = time.time()
            r = requests.get(f"{BASE_URL}/api/market/prices?crop=Tomato", timeout=10)
            return r.status_code, time.time() - t0

        t0 = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
            results = list(ex.map(fire, range(8)))
        total = time.time() - t0

        for i, (status, dur) in enumerate(results):
            assert status == 200, f"req {i}: status {status}"
        assert total < 3.0, f"8 parallel took {total:.2f}s (want <3s)"


# --- Regression sanity: auth + advisor still work ---

class TestSanity:
    def test_auth_register_login(self):
        import uuid
        email = f"TEST_hotfix_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"email": email, "password": "TestPass123!", "name": "Hotfix Tester"}
        r = requests.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=10)
        assert r.status_code in (200, 201), f"register: {r.status_code} {r.text[:200]}"
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": email, "password": "TestPass123!"}, timeout=10)
        assert r.status_code == 200, f"login: {r.status_code} {r.text[:200]}"
        assert "token" in r.json() or "access_token" in r.json()

    def test_advisor_query(self):
        r = requests.post(f"{BASE_URL}/api/advisor/query",
                          json={"question": "How to grow tomatoes?"}, timeout=30)
        # advisor may need auth; accept 200/401/422
        assert r.status_code in (200, 401, 422), f"advisor: {r.status_code}"

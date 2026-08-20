"""Live Agmarknet (data.gov.in) mandi prices with graceful fallback to mock data.

Endpoint: https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
Fields (as returned by data.gov.in): state, district, market, commodity, variety,
grade, arrival_date (dd/mm/yyyy), min_price, max_price, modal_price.

We cache fetched records in MongoDB per (crop, region, date) so a trend chart can
be built from real historic data as it accumulates.
"""
import os
import logging
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional

from market_data import current_prices as mock_current, price_trend as mock_trend

logger = logging.getLogger(__name__)

AGMARKNET_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
AGMARKNET_KEY = os.environ.get("AGMARKNET_API_KEY", "").strip()
CACHE_TTL_MIN = 60  # minutes


def _norm_date(s: str) -> str:
    # Agmarknet returns 'dd/mm/yyyy' — convert to ISO
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except Exception:
            continue
    return datetime.now(timezone.utc).date().isoformat()


def _float(x, default=0.0):
    try:
        return float(str(x).replace(",", "").strip())
    except Exception:
        return default


def _to_record(row: dict) -> dict:
    return {
        "crop": row.get("commodity") or row.get("Commodity") or "",
        "region": row.get("state") or row.get("State") or "",
        "district": row.get("district") or row.get("District") or "",
        "market": row.get("market") or row.get("Market") or "",
        "variety": row.get("variety") or row.get("Variety") or "",
        "price_min": _float(row.get("min_price") or row.get("Min_Price") or row.get("Min Price")),
        "price_max": _float(row.get("max_price") or row.get("Max_Price") or row.get("Max Price")),
        "price_modal": _float(row.get("modal_price") or row.get("Modal_Price") or row.get("Modal Price")),
        "unit": "INR/quintal",
        "date": _norm_date(row.get("arrival_date") or row.get("Arrival_Date") or ""),
    }


async def fetch_agmarknet(
    db,
    crop: Optional[str] = None,
    region: Optional[str] = None,
    limit: int = 50,
) -> list[dict]:
    """Fetch from data.gov.in Agmarknet. Cache all rows in db.mandi_prices for trend.
    Returns a normalised list of price records; empty list on failure.
    """
    if not AGMARKNET_KEY:
        return []
    params = {"api-key": AGMARKNET_KEY, "format": "json", "limit": limit}
    if crop:
        params["filters[commodity]"] = crop
    if region:
        params["filters[state]"] = region
    try:
        r = requests.get(AGMARKNET_URL, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        rows = data.get("records") or []
    except Exception as e:
        logger.warning("Agmarknet fetch failed: %s", e)
        return []

    out = []
    now_iso = datetime.now(timezone.utc).isoformat()
    for row in rows:
        rec = _to_record(row)
        if not rec["crop"] or not rec["region"]:
            continue
        out.append(rec)
        # upsert into cache — keyed by crop+region+market+date
        try:
            await db.mandi_prices.update_one(
                {
                    "crop": rec["crop"],
                    "region": rec["region"],
                    "market": rec["market"],
                    "date": rec["date"],
                },
                {"$set": {**rec, "fetched_at": now_iso, "source": "agmarknet"}},
                upsert=True,
            )
        except Exception as e:
            logger.debug("mandi cache upsert failed: %s", e)
    return out


async def current_prices_live(db, crop: Optional[str] = None, region: Optional[str] = None) -> list[dict]:
    """Try Agmarknet first, fall back to mock. Returns records with 'source' field."""
    live = await fetch_agmarknet(db, crop=crop, region=region, limit=100)
    if live:
        # Deduplicate by (crop, market) — keep the latest
        seen = {}
        for r in live:
            key = (r["crop"], r["market"] or r["region"])
            if key not in seen or r["date"] >= seen[key]["date"]:
                seen[key] = r
        results = [{**v, "source": "agmarknet"} for v in seen.values()]
        # Newest first
        results.sort(key=lambda x: x["date"], reverse=True)
        return results[:60]

    # Fallback: mock
    return [{**r, "source": "mock"} for r in mock_current(crop, region)]


async def price_trend_live(db, crop: str, region: Optional[str], days: int) -> tuple[list[dict], str]:
    """Build trend from cached mandi_prices if enough history exists, else use mock trend anchored to latest live price."""
    days = max(1, min(days, 180))
    since = (datetime.now(timezone.utc).date() - timedelta(days=days - 1)).isoformat()
    query = {"crop": crop, "date": {"$gte": since}}
    if region:
        query["region"] = region
    try:
        docs = await db.mandi_prices.find(query, {"_id": 0}).sort("date", 1).to_list(2000)
    except Exception:
        docs = []

    if len(docs) >= max(5, days // 3):
        # Aggregate by date (avg across markets for the day)
        by_date: dict = {}
        for d in docs:
            k = d["date"]
            b = by_date.setdefault(k, {"min": [], "max": [], "modal": []})
            b["min"].append(d["price_min"])
            b["max"].append(d["price_max"])
            b["modal"].append(d["price_modal"])
        trend = []
        for k in sorted(by_date.keys()):
            b = by_date[k]
            trend.append(
                {
                    "date": k,
                    "price_min": round(sum(b["min"]) / len(b["min"]), 2),
                    "price_max": round(sum(b["max"]) / len(b["max"]), 2),
                    "price_modal": round(sum(b["modal"]) / len(b["modal"]), 2),
                }
            )
        return trend, "agmarknet"

    # Fallback: mock trend (structure-compatible)
    return mock_trend(crop, region, days), "mock"

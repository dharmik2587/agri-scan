"""Mock Indian mandi-style market data. Structure mirrors Agmarknet so a real
API can be swapped in later without frontend changes."""
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

# Realistic-ish base prices in INR/quintal (100 kg)
CROP_BASE_PRICE = {
    "Tomato": 1800,
    "Onion": 2200,
    "Potato": 1400,
    "Wheat": 2250,
    "Rice": 2800,
    "Paddy": 2100,
    "Maize": 1900,
    "Soybean": 4600,
    "Cotton": 6700,
    "Sugarcane": 340,
    "Mustard": 5400,
    "Groundnut": 6100,
    "Chilli": 12500,
    "Turmeric": 9200,
    "Ginger": 7800,
    "Banana": 1600,
    "Mango": 4200,
    "Apple": 8500,
    "Grapes": 5500,
    "Cabbage": 1200,
    "Cauliflower": 1500,
    "Brinjal": 1700,
    "Okra": 2400,
    "Green Gram": 7200,
}

REGIONS = [
    "Maharashtra",
    "Punjab",
    "Uttar Pradesh",
    "Karnataka",
    "Tamil Nadu",
    "Gujarat",
    "West Bengal",
    "Madhya Pradesh",
    "Andhra Pradesh",
    "Rajasthan",
]

REGION_MARKETS = {
    "Maharashtra": ["Pune", "Nashik", "Nagpur"],
    "Punjab": ["Ludhiana", "Amritsar", "Patiala"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi"],
    "Karnataka": ["Bengaluru", "Mysuru", "Hubli"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
    "Gujarat": ["Ahmedabad", "Rajkot", "Surat"],
    "West Bengal": ["Kolkata", "Siliguri", "Asansol"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior"],
    "Andhra Pradesh": ["Vijayawada", "Guntur", "Visakhapatnam"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Kota"],
}


def list_crops() -> list[str]:
    return sorted(CROP_BASE_PRICE.keys())


def list_regions() -> list[str]:
    return REGIONS


def _seeded_price(crop: str, region: str, market: str, date_str: str) -> tuple[float, float, float]:
    base = CROP_BASE_PRICE.get(crop, 2000)
    seed = hash((crop, region, market, date_str)) & 0xFFFFFFFF
    rng = random.Random(seed)
    variation = rng.uniform(-0.12, 0.12)
    modal = round(base * (1 + variation), 2)
    spread = round(modal * rng.uniform(0.05, 0.12), 2)
    return round(modal - spread, 2), round(modal + spread, 2), modal


def current_prices(crop: Optional[str] = None, region: Optional[str] = None) -> list[dict]:
    today = datetime.now(timezone.utc).date().isoformat()
    crops = [crop] if crop and crop in CROP_BASE_PRICE else list_crops()
    regions = [region] if region and region in REGIONS else REGIONS
    out = []
    for c in crops:
        for r in regions:
            for m in REGION_MARKETS[r][:1]:  # one market per region for list view
                pmin, pmax, modal = _seeded_price(c, r, m, today)
                out.append(
                    {
                        "crop": c,
                        "region": r,
                        "market": m,
                        "price_min": pmin,
                        "price_max": pmax,
                        "price_modal": modal,
                        "unit": "INR/quintal",
                        "date": today,
                    }
                )
    return out


def price_trend(crop: str, region: Optional[str], days: int) -> list[dict]:
    days = max(1, min(days, 180))
    region = region if region in REGIONS else REGIONS[0]
    market = REGION_MARKETS[region][0]
    today = datetime.now(timezone.utc).date()
    trend = []
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        pmin, pmax, modal = _seeded_price(crop, region, market, d)
        trend.append({"date": d, "price_modal": modal, "price_min": pmin, "price_max": pmax})
    return trend

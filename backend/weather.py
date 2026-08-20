"""7-day weather forecast + spray suitability via Open-Meteo (free, no API key)."""
import asyncio
import logging
import time
import requests
from typing import Optional

logger = logging.getLogger(__name__)

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"

# Circuit breaker so a slow / failing Open-Meteo cannot pile up requests on the
# event loop.
_BREAKER_UNTIL = 0.0
_BREAKER_COOLDOWN_SEC = 120


def _breaker_open() -> bool:
    return time.time() < _BREAKER_UNTIL


def _trip_breaker():
    global _BREAKER_UNTIL
    _BREAKER_UNTIL = time.time() + _BREAKER_COOLDOWN_SEC

# WMO weather code -> short label & icon key
WMO_MAP = {
    0: ("Clear sky", "clear"),
    1: ("Mainly clear", "clear"),
    2: ("Partly cloudy", "cloudy"),
    3: ("Overcast", "cloudy"),
    45: ("Fog", "fog"),
    48: ("Rime fog", "fog"),
    51: ("Light drizzle", "drizzle"),
    53: ("Drizzle", "drizzle"),
    55: ("Heavy drizzle", "drizzle"),
    56: ("Freezing drizzle", "drizzle"),
    57: ("Freezing drizzle", "drizzle"),
    61: ("Light rain", "rain"),
    63: ("Rain", "rain"),
    65: ("Heavy rain", "rain"),
    66: ("Freezing rain", "rain"),
    67: ("Freezing rain", "rain"),
    71: ("Light snow", "snow"),
    73: ("Snow", "snow"),
    75: ("Heavy snow", "snow"),
    77: ("Snow grains", "snow"),
    80: ("Rain showers", "showers"),
    81: ("Rain showers", "showers"),
    82: ("Violent showers", "showers"),
    85: ("Snow showers", "snow"),
    86: ("Snow showers", "snow"),
    95: ("Thunderstorm", "storm"),
    96: ("Thunderstorm w/ hail", "storm"),
    99: ("Thunderstorm w/ hail", "storm"),
}


def _spray_status(precip_prob: float, precip_mm: float, wind_kmh: float, tmax: float) -> tuple[str, str]:
    """Return (level, reason). level ∈ {'good','caution','avoid'}."""
    if precip_prob >= 60 or precip_mm >= 5:
        return "avoid", "High rain chance — spray will wash off"
    if wind_kmh >= 20:
        return "avoid", "Wind too strong — drift risk"
    if tmax >= 38:
        return "caution", "Very hot — spray at dawn or dusk"
    if precip_prob >= 30 or wind_kmh >= 12:
        return "caution", "Marginal — pick a calmer window"
    return "good", "Great window for spraying"


def _label(code: int) -> tuple[str, str]:
    return WMO_MAP.get(int(code), ("—", "cloudy"))


async def geocode(query: str) -> list[dict]:
    if _breaker_open():
        return []

    def _do():
        return requests.get(
            GEOCODE_URL,
            params={"name": query, "count": 5, "language": "en", "format": "json"},
            timeout=(3, 4),
        )

    try:
        r = await asyncio.to_thread(_do)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        _trip_breaker()
        logger.warning("Geocoding failed (breaker tripped): %s", e)
        return []
    out = []
    for row in data.get("results", []) or []:
        out.append(
            {
                "name": row.get("name"),
                "admin1": row.get("admin1"),
                "country": row.get("country"),
                "latitude": row.get("latitude"),
                "longitude": row.get("longitude"),
                "timezone": row.get("timezone"),
            }
        )
    return out


async def forecast(lat: float, lon: float, days: int = 7) -> dict:
    if _breaker_open():
        raise RuntimeError("Weather service temporarily unavailable")
    days = max(1, min(int(days), 14))
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": ",".join(
            [
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "precipitation_probability_max",
                "weather_code",
                "windspeed_10m_max",
                "sunrise",
                "sunset",
            ]
        ),
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
        "timezone": "auto",
        "forecast_days": days,
    }

    def _do():
        return requests.get(FORECAST_URL, params=params, timeout=(3, 5))

    try:
        r = await asyncio.to_thread(_do)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        _trip_breaker()
        logger.warning("Open-Meteo fetch failed (breaker tripped): %s", e)
        raise

    d = data.get("daily", {})
    times = d.get("time", [])
    tmax = d.get("temperature_2m_max", [])
    tmin = d.get("temperature_2m_min", [])
    prcp = d.get("precipitation_sum", [])
    prcp_prob = d.get("precipitation_probability_max", [])
    wcode = d.get("weather_code", [])
    wind = d.get("windspeed_10m_max", [])
    sunrise = d.get("sunrise", [])
    sunset = d.get("sunset", [])

    daily = []
    for i, t in enumerate(times):
        label, icon = _label(wcode[i] if i < len(wcode) else 0)
        level, reason = _spray_status(
            prcp_prob[i] if i < len(prcp_prob) else 0.0,
            prcp[i] if i < len(prcp) else 0.0,
            wind[i] if i < len(wind) else 0.0,
            tmax[i] if i < len(tmax) else 0.0,
        )
        daily.append(
            {
                "date": t,
                "temp_max": tmax[i] if i < len(tmax) else None,
                "temp_min": tmin[i] if i < len(tmin) else None,
                "precip_mm": prcp[i] if i < len(prcp) else 0.0,
                "precip_probability": prcp_prob[i] if i < len(prcp_prob) else 0,
                "wind_kmh": wind[i] if i < len(wind) else 0.0,
                "weather_code": int(wcode[i]) if i < len(wcode) else 0,
                "weather_label": label,
                "weather_icon": icon,
                "sunrise": sunrise[i] if i < len(sunrise) else None,
                "sunset": sunset[i] if i < len(sunset) else None,
                "spray_level": level,
                "spray_reason": reason,
            }
        )

    cur = data.get("current", {})
    return {
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "timezone": data.get("timezone"),
        "current": {
            "temperature": cur.get("temperature_2m"),
            "humidity": cur.get("relative_humidity_2m"),
            "precipitation": cur.get("precipitation"),
            "wind_kmh": cur.get("wind_speed_10m"),
            "weather_label": _label(cur.get("weather_code", 0))[0],
            "weather_icon": _label(cur.get("weather_code", 0))[1],
        },
        "daily": daily,
    }

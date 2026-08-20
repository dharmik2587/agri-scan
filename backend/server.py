from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import base64
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from models import (
    RegisterInput,
    LoginInput,
    EmergentSessionInput,
    LanguageInput,
    DiagnoseInput,
    DiagnosisReport,
    CalculatorInput,
    ProduceListingInput,
    new_id,
    utcnow_iso,
)
from auth import (
    register_user,
    login_user,
    emergent_session_exchange,
    get_current_user,
    get_optional_user,
)
from storage import init_storage, put_object, APP_NAME
from diagnosis import diagnose_image
from calculator import calculate as calc_run, list_crops as calc_crops
from market_data import current_prices, price_trend, list_crops, list_regions
from india_data import list_states, districts_for, all_crops
from advisor import advise as advisor_run

from pydantic import BaseModel as _PBase
from typing import Optional as _Opt


class AdvisorInput(_PBase):
    crop: str
    state: str
    district: str
    language: str = "en"
    question: _Opt[str] = None
    image_base64: _Opt[str] = None

logger = logging.getLogger("agriscan")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AgriScan API")
api = APIRouter(prefix="/api")


# ---------- health ----------
@api.get("/")
async def root():
    return {"message": "AgriScan API", "status": "ok"}


# ---------- Auth ----------
@api.post("/auth/register")
async def register(payload: RegisterInput):
    token, user = await register_user(db, payload)
    return {"token": token, "user": user.model_dump()}


@api.post("/auth/login")
async def login(payload: LoginInput):
    token, user = await login_user(db, payload)
    return {"token": token, "user": user.model_dump()}


@api.post("/auth/emergent-session")
async def emergent_session(payload: EmergentSessionInput):
    token, user = await emergent_session_exchange(db, payload.session_id)
    return {"token": token, "user": user.model_dump()}


@api.get("/auth/me")
async def me(authorization: Optional[str] = Header(None)):
    user = await get_current_user(db, authorization)
    return user.model_dump()


@api.post("/auth/language")
async def set_language(payload: LanguageInput, authorization: Optional[str] = Header(None)):
    user = await get_current_user(db, authorization)
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"language": payload.language}})
    return {"ok": True, "language": payload.language}


# ---------- Diagnosis ----------
@api.post("/diagnose")
async def diagnose(payload: DiagnoseInput, authorization: Optional[str] = Header(None)):
    user = await get_optional_user(db, authorization)

    # Analyse first
    result = await diagnose_image(payload.image_base64, payload.mime_type, payload.notes)

    scan_id = new_id("scan")
    created_at = utcnow_iso()
    image_url = None

    # Upload image to object storage (best effort — do not fail diagnosis if this fails)
    try:
        clean = payload.image_base64
        if clean.startswith("data:"):
            clean = clean.split(",", 1)[1]
        img_bytes = base64.b64decode(clean)
        ext = "jpg"
        mt = (payload.mime_type or "image/jpeg").lower()
        if "png" in mt:
            ext = "png"
        elif "webp" in mt:
            ext = "webp"
        owner = user.user_id if user else "guest"
        storage_path = f"{APP_NAME}/scans/{owner}/{scan_id}.{ext}"
        put_object(storage_path, img_bytes, mt or "image/jpeg")
        image_url = f"/api/files/{storage_path}"
        await db.files.insert_one(
            {
                "storage_path": storage_path,
                "owner_user_id": user.user_id if user else None,
                "size": len(img_bytes),
                "content_type": mt,
                "is_deleted": False,
                "created_at": created_at,
            }
        )
    except Exception as e:
        logger.warning("Image storage failed: %s", e)

    report = {
        "scan_id": scan_id,
        "plant_name": result.get("plant_name", "Unknown"),
        "species": result.get("species"),
        "disease_name": result.get("disease_name", "Unknown"),
        "disease_confidence": result.get("disease_confidence", 0.5),
        "severity": result.get("severity", "mild"),
        "affected_area": result.get("affected_area"),
        "fertilizer": result.get("fertilizer", {}),
        "pest_prevention": result.get("pest_prevention", {}),
        "treatment": result.get("treatment", ""),
        "summary": result.get("summary", ""),
        "image_url": image_url,
        "created_at": created_at,
    }

    # Save scan for logged-in users
    if user:
        doc = {**report, "user_id": user.user_id, "notes": payload.notes}
        await db.scans.insert_one(doc)

    return report


@api.get("/files/{path:path}")
async def get_file(path: str):
    from fastapi.responses import Response
    from storage import get_object

    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ct = get_object(path)
    except Exception as e:
        logger.warning("File fetch failed: %s", e)
        raise HTTPException(status_code=404, detail="File not accessible")
    return Response(content=data, media_type=record.get("content_type", ct))


# ---------- Scans (logged-in users) ----------
@api.get("/scans")
async def list_scans(authorization: Optional[str] = Header(None)):
    user = await get_current_user(db, authorization)
    scans = await db.scans.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return scans


@api.get("/scans/{scan_id}")
async def get_scan(scan_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(db, authorization)
    scan = await db.scans.find_one({"scan_id": scan_id, "user_id": user.user_id}, {"_id": 0})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@api.delete("/scans/{scan_id}")
async def delete_scan(scan_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(db, authorization)
    res = await db.scans.delete_one({"scan_id": scan_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"ok": True}


# ---------- Calculator ----------
@api.post("/calculator")
async def calculator_endpoint(payload: CalculatorInput):
    return calc_run(payload.model_dump())


@api.get("/calculator/crops")
async def calculator_crops():
    return {"crops": calc_crops()}


# ---------- Market ----------
@api.get("/market/crops")
async def market_crops():
    return {"crops": list_crops(), "regions": list_regions()}


@api.get("/market/prices")
async def market_prices(crop: Optional[str] = None, region: Optional[str] = None):
    return {"prices": current_prices(crop, region)}


@api.get("/market/trend")
async def market_trend(crop: str = Query(...), region: Optional[str] = None, days: int = 30):
    return {"crop": crop, "region": region, "days": days, "trend": price_trend(crop, region, days)}


@api.get("/market/listings")
async def get_listings(crop: Optional[str] = None, region: Optional[str] = None):
    q: dict = {}
    if crop:
        q["crop"] = crop
    if region:
        q["region"] = region
    listings = await db.listings.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)
    return listings


@api.post("/market/listings")
async def create_listing(payload: ProduceListingInput, authorization: Optional[str] = Header(None)):
    user = await get_current_user(db, authorization)
    doc = {
        "listing_id": new_id("lst"),
        "user_id": user.user_id,
        "farmer_name": user.name,
        **payload.model_dump(),
        "created_at": utcnow_iso(),
    }
    await db.listings.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.delete("/market/listings/{listing_id}")
async def delete_listing(listing_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(db, authorization)
    res = await db.listings.delete_one({"listing_id": listing_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"ok": True}


# ---------- Advisor ----------
@api.get("/advisor/meta")
async def advisor_meta():
    return {"crops": all_crops(), "states": list_states()}


@api.get("/advisor/districts")
async def advisor_districts(state: str):
    return {"state": state, "districts": districts_for(state)}


@api.post("/advisor/query")
async def advisor_query(payload: AdvisorInput, authorization: Optional[str] = Header(None)):
    user = await get_optional_user(db, authorization)
    result = await advisor_run(
        crop=payload.crop,
        state=payload.state,
        district=payload.district,
        language=payload.language or "en",
        question=payload.question,
        image_base64=payload.image_base64,
    )
    # Persist for logged-in users so they can revisit
    if user:
        doc = {
            "query_id": new_id("adv"),
            "user_id": user.user_id,
            "crop": payload.crop,
            "state": payload.state,
            "district": payload.district,
            "language": payload.language or "en",
            "question": payload.question,
            "result": result,
            "created_at": utcnow_iso(),
        }
        try:
            await db.advisor_queries.insert_one(doc)
        except Exception as e:
            logger.warning("advisor persist failed: %s", e)
    return result


# ---------- Startup ----------
@app.on_event("startup")
async def on_start():
    try:
        init_storage()
    except Exception as e:
        logger.warning("Object storage init failed at startup (will retry lazily): %s", e)
    try:
        await db.users.create_index("email", unique=True)
        await db.scans.create_index([("user_id", 1), ("created_at", -1)])
        await db.listings.create_index([("crop", 1), ("region", 1), ("created_at", -1)])
    except Exception as e:
        logger.warning("Index creation failed: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

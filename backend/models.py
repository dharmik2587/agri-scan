from datetime import datetime, timezone
from typing import Optional, List, Literal
from pydantic import BaseModel, EmailStr, Field
import uuid


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Users / Auth ----------
class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: Literal["email", "google"] = "email"
    language: Literal["en", "hi", "mr", "ta", "te", "bn"] = "en"
    created_at: str


class RegisterInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class EmergentSessionInput(BaseModel):
    session_id: str


class LanguageInput(BaseModel):
    language: Literal["en", "hi", "mr", "ta", "te", "bn"]


# ---------- Diagnosis ----------
class DiagnoseInput(BaseModel):
    # base64 encoded image (no data URI prefix expected but tolerated)
    image_base64: str
    mime_type: str = "image/jpeg"
    notes: Optional[str] = None


class DiagnosisReport(BaseModel):
    scan_id: str
    plant_name: str
    species: Optional[str] = None
    disease_name: str
    disease_confidence: float  # 0-1
    severity: Literal["mild", "moderate", "severe", "healthy"]
    affected_area: Optional[str] = None  # e.g. "Left lower leaf, ~30% coverage"
    fertilizer: dict  # {name, npk_ratio, organic_options[], chemical_options[]}
    pest_prevention: dict  # {cultural[], biological[], chemical[]}
    treatment: str
    summary: str
    image_url: Optional[str] = None
    created_at: str


# ---------- Calculator ----------
class CalculatorInput(BaseModel):
    crop_type: str
    area: float
    area_unit: Literal["acre", "hectare", "sqm"]
    severity: Literal["mild", "moderate", "severe"]
    growth_stage: Literal["seedling", "vegetative", "flowering", "fruiting"]
    product_type: Literal["fertilizer", "pesticide"] = "fertilizer"


class CalculatorOutput(BaseModel):
    quantity_kg_or_l: float
    unit: str  # "kg" or "L"
    water_dilution_l: float
    mix_ratio: str  # e.g. "2 L per 200 L water"
    estimated_cost_inr: float
    npk: dict  # {n, p, k}
    recommended_dosage_kg_per_ha: float
    max_safe_dosage_kg_per_ha: float
    reentry_interval_hours: int
    safety_warnings: List[str]


# ---------- Market ----------
class MarketPrice(BaseModel):
    crop: str
    region: str
    market: str
    price_min: float
    price_max: float
    price_modal: float
    unit: str  # e.g. "INR/quintal"
    date: str


class PriceTrendPoint(BaseModel):
    date: str
    price_modal: float
    price_min: float
    price_max: float


class ProduceListing(BaseModel):
    listing_id: str
    user_id: str
    farmer_name: str
    crop: str
    quantity_kg: float
    asking_price_per_kg: float
    region: str
    contact: Optional[str] = None
    notes: Optional[str] = None
    created_at: str


class ProduceListingInput(BaseModel):
    crop: str
    quantity_kg: float
    asking_price_per_kg: float
    region: str
    contact: Optional[str] = None
    notes: Optional[str] = None

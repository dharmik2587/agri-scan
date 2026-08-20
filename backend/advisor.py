"""Comprehensive crop advisor using Claude Sonnet 5 (with optional vision)."""
import os
import re
import json
import uuid
import logging
from typing import Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-5"

SYSTEM_PROMPT_TEMPLATE = """You are Krishi Mitra, a senior Indian agronomist and soil scientist. You give practical, locality-specific advice for Indian farmers.

You will be given: a crop name, an Indian state, a specific district/locality, an optional user question, and optionally a photo.

Respond in {language_name} ({language_code}). Use simple, minimal-jargon language.

Return ONLY strict JSON (no markdown, no code fences). Use this exact schema:

{{
  "crop": "string",
  "state": "string",
  "district": "string",
  "language": "{language_code}",
  "summary": "2-3 sentence overview of the crop for this locality (season, popular varieties, climate suitability)",
  "soil": {{
    "type": "typical soil type(s) for this crop in this locality",
    "ph_range": "e.g. 6.0 - 7.5",
    "key_nutrients": ["Nitrogen", "Phosphorus", "..."],
    "recommendations": ["3-5 actionable soil prep tips"]
  }},
  "fertilizers": [
    {{
      "name": "e.g. Urea",
      "npk_ratio": "e.g. 46-0-0",
      "chemical_composition": "short chemistry, e.g. CO(NH2)2",
      "ingredients": ["primary ingredient(s)"],
      "purpose": "why & when to apply for this crop",
      "dosage": "typical dose per acre or hectare",
      "price_range_inr": "e.g. ₹260-320 per 45kg bag (approx)",
      "type": "organic" | "chemical"
    }}
  ],
  "pesticides": [
    {{
      "name": "commercial or common name",
      "active_ingredient": "e.g. Mancozeb 75% WP",
      "targets": ["disease/pest names it treats"],
      "dosage": "e.g. 2 g per L of water",
      "price_range_inr": "approx price range",
      "precautions": ["3-4 handling / safety points"]
    }}
  ],
  "diseases": [
    {{
      "name": "disease common name",
      "symptoms": "1-2 sentence description",
      "prevention": ["cultural / biological steps"],
      "treatment": ["chemical / spray recommendations with dosage"]
    }}
  ],
  "pests": [
    {{
      "name": "pest name",
      "damage": "what it does",
      "prevention": ["..."],
      "control": ["..."]
    }}
  ],
  "soil_problems": [
    {{"name": "e.g. Saline soil", "cause": "...", "remedy": "..."}}
  ],
  "safety_precautions": ["general PPE and handling advice, at least 4 points"],
  "local_notes": "2-4 sentences that are SPECIFIC to the given state and district: local sowing calendar, common varieties grown there, nearest mandi, government schemes if relevant.",
  "disclaimer": "Verify chemical prices at your local dealer; regional agri-department advisories take precedence."
}}

Rules:
- Every list must have at least 2 items and at most 6.
- Prices are in Indian Rupees (₹) with approximate ranges — clearly mark them as approximate.
- If a photo is provided, prepend to `summary` a short observation of what you see (plant/disease if visible).
- If the user asks a specific question, weave the answer into `summary` and relevant sections.
- Never invent unavailable schemes. Never quote exact market prices as fact — always use ranges with "approx".
- Respond ONLY with the JSON object, no other text.
"""

LANG_MAP = {"en": "English", "hi": "Hindi"}


def _strip_data_uri(b64: str) -> tuple[str, str]:
    if b64.startswith("data:"):
        m = re.match(r"data:([^;]+);base64,(.*)", b64, re.DOTALL)
        if m:
            return m.group(2), m.group(1)
    return b64, "image/jpeg"


def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


async def advise(
    crop: str,
    state: str,
    district: str,
    language: str = "en",
    question: Optional[str] = None,
    image_base64: Optional[str] = None,
) -> dict:
    lang_code = language if language in LANG_MAP else "en"
    lang_name = LANG_MAP[lang_code]

    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"advisor-{uuid.uuid4().hex[:8]}",
            system_message=SYSTEM_PROMPT_TEMPLATE.format(language_name=lang_name, language_code=lang_code),
        )
        .with_model(MODEL_PROVIDER, MODEL_NAME)
    )

    parts = [
        f"Crop: {crop}",
        f"State: {state}",
        f"District/Locality: {district}",
        f"Language: {lang_name}",
    ]
    if question and question.strip():
        parts.append(f"Farmer's question: {question.strip()[:600]}")
    else:
        parts.append("Farmer's question: (none — provide the full crop advisory)")

    text = "\n".join(parts) + "\n\nReturn the JSON as specified."

    files = None
    if image_base64:
        clean, _mime = _strip_data_uri(image_base64)
        files = [ImageContent(image_base64=clean)]

    try:
        response = await chat.send_message(UserMessage(text=text, file_contents=files or []))
    except Exception as e:
        logger.error("Advisor LLM call failed: %s", e)
        raise

    raw = response if isinstance(response, str) else str(response)
    try:
        data = _extract_json(raw)
    except Exception as e:
        logger.error("Advisor JSON parse failed: %s | raw: %s", e, raw[:500])
        # Minimal safe fallback
        data = {
            "crop": crop,
            "state": state,
            "district": district,
            "language": lang_code,
            "summary": "We could not generate a detailed advisory. Please try again in a moment.",
            "soil": {"type": "", "ph_range": "", "key_nutrients": [], "recommendations": []},
            "fertilizers": [],
            "pesticides": [],
            "diseases": [],
            "pests": [],
            "soil_problems": [],
            "safety_precautions": [],
            "local_notes": "",
            "disclaimer": "Advisory temporarily unavailable.",
        }

    # Ensure keys exist
    data.setdefault("crop", crop)
    data.setdefault("state", state)
    data.setdefault("district", district)
    data.setdefault("language", lang_code)
    for k in ["fertilizers", "pesticides", "diseases", "pests", "soil_problems", "safety_precautions"]:
        data.setdefault(k, [])
    data.setdefault("soil", {"type": "", "ph_range": "", "key_nutrients": [], "recommendations": []})
    data.setdefault("summary", "")
    data.setdefault("local_notes", "")
    data.setdefault("disclaimer", "Prices and recommendations are approximate. Confirm with your local agri-department.")
    return data

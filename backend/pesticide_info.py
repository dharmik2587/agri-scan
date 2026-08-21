"""Pesticide lookup using Google AI Studio with a safe fallback."""
import json
import logging
import re
from typing import Optional

from google_ai import generate_content

logger = logging.getLogger(__name__)

LANG_MAP = {"en": "English", "hi": "Hindi", "mr": "Marathi", "ta": "Tamil", "te": "Telugu", "bn": "Bengali"}

SYSTEM_PROMPT_TEMPLATE = """You are a certified agrochemical expert helping Indian farmers understand pesticides safely.

You will receive either the NAME of a pesticide/fungicide/herbicide OR a PHOTO of its label/bottle. Identify the product and return a comprehensive info card.

Respond in {language_name} ({language_code}) with simple, minimal-jargon words.

Return ONLY strict JSON (no markdown, no code fences). Use this exact schema:

{{
 "product_name": "commercial or common name",
 "identified_from": "name" | "image",
 "identification_confidence": 0.0-1.0,
 "category": "insecticide" | "fungicide" | "herbicide" | "acaricide" | "nematicide" | "rodenticide" | "bio-pesticide" | "unknown",
 "active_ingredients": [{{"name": "e.g. Chlorpyrifos", "concentration": "e.g. 20% EC"}}],
 "chemical_class": "e.g. Organophosphate",
 "manufacturer_examples": ["1-3 common Indian brand examples if applicable"],
 "toxicity_class": "Red / Yellow / Blue / Green (WHO or Indian label colour) — Red highest, Green safest",
 "targets": {{
   "pests": ["specific pests it kills"],
   "diseases": ["specific diseases it treats, if fungicide"],
   "weeds": ["weeds it controls, if herbicide"],
   "crops": ["crops it's commonly used on in India"]
 }},
 "mode_of_action": "1-2 sentence explanation of how it works",
 "dosage": {{
   "rate": "e.g. 2 ml per litre of water",
   "per_acre": "typical per-acre spray volume",
   "spray_frequency": "e.g. every 10-14 days, max 3 sprays per season"
 }},
 "price_range_inr": "approx retail range, e.g. ₹450-620 per 500 ml (approximate; verify locally)",
 "precautions": [
   "at least 5 specific safety points — mixing, spraying, storing"
 ],
 "ppe_required": ["gloves", "mask", "long sleeves", "boots", "goggles"],
 "re_entry_interval_hours": integer,
 "pre_harvest_interval_days": integer,
 "environmental_warnings": [
   "e.g. Highly toxic to bees — avoid during flowering",
   "e.g. Toxic to fish — do not spray near water bodies"
 ],
 "first_aid": [
   "If swallowed: ...",
   "If inhaled: ...",
   "Skin/eye contact: ..."
 ],
 "compatibility": {{
   "compatible_with": ["products that can be tank-mixed"],
   "incompatible_with": ["do not mix with…"]
 }},
 "storage": "how to store safely (temperature, container, out of children's reach)",
 "disposal": "how to dispose of empty containers safely",
 "banned_or_restricted": "true if the product is banned/restricted in India; else false",
 "notes": "any critical caveat — legal status, seasonal advisory, resistance risk",
 "disclaimer": "Always follow the product label and consult your local agri extension officer. Prices are approximate."
}}

Rules:
- If you cannot identify the product with reasonable confidence, set identification_confidence <= 0.4, product_name = the user's input or "Unknown", category = "unknown", and STILL fill precautions, ppe_required and first_aid with generic pesticide safety guidance so the farmer gets useful info.
- Never invent a manufacturer or brand — leave manufacturer_examples empty if unsure.
- Prices in Indian Rupees (₹) with clearly-approximate ranges.
- If the label is clearly a fertilizer (not a pesticide), set category="unknown" and add a note explaining that this looks like a fertilizer, and recommend the AgriScan calculator/advisor instead.
- Keep every list at most 6 items and each item under 15 words.
- Respond ONLY with the JSON object.
"""


def _extract_json(text: str) -> dict:
   text = text.strip()
   text = re.sub(r"^```(?:json)?", "", text).strip()
   text = re.sub(r"```$", "", text).strip()
   s = text.find("{")
   e = text.rfind("}")
   if s >= 0 and e > s:
       text = text[s : e + 1]
   return json.loads(text)


async def lookup_pesticide(
   name: Optional[str] = None,
   image_base64: Optional[str] = None,
   language: str = "en",
) -> dict:
   if not name and not image_base64:
       raise ValueError("Either name or image is required")

   lang_code = language if language in LANG_MAP else "en"
   lang_name = LANG_MAP[lang_code]

   parts = []
   if name and name.strip():
       parts.append(f"Product name provided by farmer: {name.strip()[:120]}")
   if image_base64:
       parts.append("A photo of the pesticide label/bottle is attached — read it to identify the product.")
   parts.append(f"Respond in {lang_name}. Return only the JSON object.")

   try:
       raw = await generate_content(
           "\n".join(parts),
           system_prompt=SYSTEM_PROMPT_TEMPLATE.format(language_name=lang_name, language_code=lang_code),
           image_base64=image_base64,
       )
       data = _extract_json(raw)
   except Exception as e:
       logger.warning("Pesticide lookup model unavailable, using safe fallback: %s", e)
       data = {
           "product_name": name or "Unknown",
           "identified_from": "image" if image_base64 else "name",
           "identification_confidence": 0.1,
           "category": "unknown",
           "active_ingredients": [],
           "chemical_class": "",
           "manufacturer_examples": [],
           "toxicity_class": "",
           "targets": {"pests": [], "diseases": [], "weeds": [], "crops": []},
           "mode_of_action": "",
           "dosage": {"rate": "", "per_acre": "", "spray_frequency": ""},
           "price_range_inr": "",
           "precautions": [
               "Always read the product label completely before use.",
               "Wear PPE — gloves, mask, long sleeves, boots.",
               "Do not eat, drink or smoke while spraying.",
               "Keep away from children, pets and livestock.",
               "Wash thoroughly with soap after handling.",
           ],
           "ppe_required": ["gloves", "mask", "long sleeves", "boots"],
           "re_entry_interval_hours": 24,
           "pre_harvest_interval_days": 7,
           "environmental_warnings": [],
           "first_aid": [],
           "compatibility": {"compatible_with": [], "incompatible_with": []},
           "storage": "Store in the original packaging, away from children and sunlight.",
           "disposal": "Dispose according to local rules and label guidance.",
           "banned_or_restricted": False,
           "notes": "We couldn't confidently identify this product. Please retry with a clearer photo or spelling.",
           "disclaimer": "Always follow the product label and consult your local agri extension officer.",
       }

   data.setdefault("product_name", name or "Unknown")
   data.setdefault("identified_from", "image" if image_base64 else "name")
   for k in ["active_ingredients", "manufacturer_examples", "precautions", "ppe_required", "environmental_warnings", "first_aid"]:
       data.setdefault(k, [])
   data.setdefault("targets", {"pests": [], "diseases": [], "weeds": [], "crops": []})
   data.setdefault("dosage", {"rate": "", "per_acre": "", "spray_frequency": ""})
   data.setdefault("compatibility", {"compatible_with": [], "incompatible_with": []})
   data.setdefault("banned_or_restricted", False)
   data.setdefault("notes", "")
   data.setdefault("disclaimer", "Always follow the product label and consult your local agri extension officer.")
   try:
       data["identification_confidence"] = float(data.get("identification_confidence", 0.5))
   except Exception:
       data["identification_confidence"] = 0.5
   return data

"""Comprehensive crop advisor using Google AI Studio with local fallback."""
import json
import logging
import re
from typing import Optional

from google_ai import generate_content

logger = logging.getLogger(__name__)

LANG_MAP = {"en": "English", "hi": "Hindi"}

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
   system_prompt = SYSTEM_PROMPT_TEMPLATE.format(language_name=lang_name, language_code=lang_code)

   try:
       raw = await generate_content(text, system_prompt=system_prompt, image_base64=image_base64)
       data = _extract_json(raw)
   except Exception as e:
       logger.warning("Advisor model unavailable, using fallback advisory: %s", e)
       data = {
           "crop": crop,
           "state": state,
           "district": district,
           "language": lang_code,
           "summary": "We could not generate a full advisory right now. Please try again in a moment or inspect regional agronomy guidance for this crop.",
           "soil": {"type": "Loamy to medium black soil", "ph_range": "6.0 - 7.5", "key_nutrients": ["Nitrogen", "Phosphorus", "Potassium"], "recommendations": ["Add organic compost", "Test soil before fertigation", "Maintain drainage", "Use balanced fertilization"]},
           "fertilizers": [{"name": "Balanced NPK blend", "npk_ratio": "10-26-26", "chemical_composition": "NPK nutrient blend", "ingredients": ["Nitrogen", "Phosphorus", "Potassium"], "purpose": "Root development and early growth", "dosage": "Apply as per local soil test recommendation", "price_range_inr": "₹300-600 per bag (approx)", "type": "chemical"}],
           "pesticides": [{"name": "Neem-based spray", "active_ingredient": "Azadirachtin", "targets": ["Leaf chewing pests", "Early infestations"], "dosage": "Follow label instructions", "price_range_inr": "₹180-450 per litre (approx)", "precautions": ["Avoid spraying in strong sun", "Use PPE", "Test on a few leaves first"]}],
           "diseases": [{"name": "Leaf spot", "symptoms": "Discoloured patches on older foliage.", "prevention": ["Avoid overcrowding", "Good drainage"], "treatment": ["Use a recommended fungicide", "Remove infected leaves"]}],
           "pests": [{"name": "Aphids", "damage": "Suck plant sap and stunt growth.", "prevention": ["Inspect regularly", "Use tolerant varieties"], "control": ["Neem spray", "Release beneficial predators"]}],
           "soil_problems": [{"name": "Waterlogging", "cause": "Heavy rain or poor drainage.", "remedy": "Improve drainage and avoid over-irrigation."}],
           "safety_precautions": ["Wear gloves and mask while mixing sprays.", "Read local dealer labels before use.", "Keep pesticides away from children and animals.", "Avoid spraying near water bodies."],
           "local_notes": "Always cross-check with your local state agriculture office and market availability before applying recommendations.",
           "disclaimer": "Prices and recommendations are approximate; local government advisories take precedence.",
       }

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

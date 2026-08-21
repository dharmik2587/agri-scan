"""Plant/crop diagnosis using Google AI Studio when available, with local fallback."""
import json
import logging
import re
from typing import Optional

from google_ai import generate_content

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert agronomist and plant pathologist. You will be given a photo of a plant, leaf, crop, or fruit and must diagnose its health.

Return ONLY a strictly-valid JSON object (no markdown, no code fences, no commentary). Use this exact schema:

{
 "plant_name": "common name (e.g. Tomato)",
 "species": "scientific name if identifiable, else null",
 "disease_name": "specific disease/pest name, or 'Healthy' if no issue",
 "disease_confidence": 0.0-1.0,
 "severity": "healthy" | "mild" | "moderate" | "severe",
 "affected_area": "short description of which part is affected and coverage %, or null",
 "fertilizer": {
   "name": "recommended fertilizer name",
   "npk_ratio": "e.g. 10-26-26",
   "organic_options": ["...", "..."],
   "chemical_options": ["...", "..."]
 },
 "pest_prevention": {
   "cultural": ["short actionable steps..."],
   "biological": ["..."],
   "chemical": ["..."]
 },
 "treatment": "1-2 sentence actionable treatment recommendation",
 "summary": "one-line friendly summary in simple language for farmers"
}

Rules:
- If the image is not a plant/leaf/crop, still return the JSON with plant_name="Unknown", disease_name="Unknown", severity="healthy", confidence 0.1, and a helpful summary telling the user to upload a clearer plant photo.
- Never include markdown, ``` fences, or any text outside the JSON.
- Keep every list to at most 4 items and each item under 12 words.
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


async def diagnose_image(image_base64: str, mime_type: str = "image/jpeg", notes: Optional[str] = None) -> dict:
   prompt = "Diagnose this plant/crop image and return the JSON as instructed."
   if notes:
       prompt += f"\n\nUser notes: {notes[:400]}"

   try:
       text = await generate_content(prompt, system_prompt=SYSTEM_PROMPT, image_base64=image_base64, mime_type=mime_type)
       data = _extract_json(text)
   except Exception as e:
       logger.warning("Google diagnosis unavailable, using safe fallback: %s", e)
       data = {
           "plant_name": "Unknown",
           "species": None,
           "disease_name": "Unable to analyze",
           "disease_confidence": 0.1,
           "severity": "mild",
           "affected_area": None,
           "fertilizer": {"name": "General NPK", "npk_ratio": "10-10-10", "organic_options": ["Compost"], "chemical_options": ["Urea"]},
           "pest_prevention": {"cultural": ["Improve airflow"], "biological": ["Neem oil"], "chemical": ["Broad-spectrum fungicide"]},
           "treatment": "Please retake the photo with better lighting and try again.",
           "summary": "We could not clearly analyze the image. Try a clearer, close-up shot.",
       }

   try:
       data["disease_confidence"] = float(data.get("disease_confidence", 0.5))
   except Exception:
       data["disease_confidence"] = 0.5
   if data.get("severity") not in {"healthy", "mild", "moderate", "severe"}:
       data["severity"] = "mild"
   return data

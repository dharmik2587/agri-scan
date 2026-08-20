"""Plant/crop diagnosis using Claude Sonnet 5 vision via Emergent LLM key."""
import os
import json
import re
import base64
import logging
import uuid
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-5"

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


def _strip_data_uri(b64: str) -> tuple[str, str]:
    if b64.startswith("data:"):
        m = re.match(r"data:([^;]+);base64,(.*)", b64, re.DOTALL)
        if m:
            return m.group(2), m.group(1)
    return b64, "image/jpeg"


def _extract_json(text: str) -> dict:
    # Strip code fences if any
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    # Find first { ... last }
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


async def diagnose_image(image_base64: str, mime_type: str = "image/jpeg", notes: str | None = None) -> dict:
    clean_b64, detected_mime = _strip_data_uri(image_base64)
    mime = detected_mime or mime_type or "image/jpeg"

    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"diag-{uuid.uuid4().hex[:8]}",
            system_message=SYSTEM_PROMPT,
        )
        .with_model(MODEL_PROVIDER, MODEL_NAME)
    )

    prompt = "Diagnose this plant/crop image and return the JSON as instructed."
    if notes:
        prompt += f"\n\nUser notes: {notes[:400]}"

    img = ImageContent(image_base64=clean_b64)
    response = await chat.send_message(UserMessage(text=prompt, file_contents=[img]))

    text = response if isinstance(response, str) else str(response)
    try:
        data = _extract_json(text)
    except Exception as e:
        logger.error("Failed to parse diagnosis JSON: %s\nRAW: %s", e, text[:500])
        # Fallback safe payload so the UI still renders
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

    # Normalise
    try:
        data["disease_confidence"] = float(data.get("disease_confidence", 0.5))
    except Exception:
        data["disease_confidence"] = 0.5
    if data.get("severity") not in {"healthy", "mild", "moderate", "severe"}:
        data["severity"] = "mild"
    return data

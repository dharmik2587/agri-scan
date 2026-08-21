import base64
import json
import logging
import os
from typing import Optional

import requests

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = (os.environ.get("GOOGLE_API_KEY") or "").strip()
GOOGLE_MODEL = os.environ.get("GOOGLE_MODEL", "gemini-2.0-flash")
GOOGLE_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models"
GOOGLE_SPEECH_URL = "https://speech.googleapis.com/v1/speech:recognize"


def has_google_api_key() -> bool:
    return bool(GOOGLE_API_KEY)


def _strip_data_uri(value: str) -> tuple[str, str]:
    if value.startswith("data:"):
        header, _, data = value.partition(",")
        mime = header.split(":", 1)[1].split(";", 1)[0] if ":" in header else "image/jpeg"
        return data, mime
    return value, "image/jpeg"


def _safe_json_text(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    for candidate in candidates:
        content = candidate.get("content") or {}
        parts = content.get("parts") or []
        chunks = []
        for part in parts:
            if isinstance(part, dict):
                text = part.get("text")
                if text:
                    chunks.append(text)
        if chunks:
            return "".join(chunks)
    return ""


async def generate_content(
    prompt: str,
    system_prompt: Optional[str] = None,
    image_base64: Optional[str] = None,
    mime_type: str = "image/jpeg",
) -> str:
    if not has_google_api_key():
        raise RuntimeError("GOOGLE_API_KEY is not configured")

    url = f"{GOOGLE_MODELS_URL}/{GOOGLE_MODEL}:generateContent?key={GOOGLE_API_KEY}"
    final_prompt = prompt.strip()
    if system_prompt:
        final_prompt = f"{system_prompt.strip()}\n\n{final_prompt}"

    parts = [{"text": final_prompt}]
    if image_base64:
        clean_b64, detected_mime = _strip_data_uri(image_base64)
        parts.append({
            "inline_data": {
                "mime_type": (detected_mime or mime_type or "image/jpeg"),
                "data": clean_b64,
            }
        })

    payload = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"temperature": 0.2},
    }
    response = requests.post(url, json=payload, timeout=90)
    if response.status_code >= 400:
        try:
            err_body = response.json()
        except Exception:
            err_body = response.text
        raise RuntimeError(f"Google AI request failed: {json.dumps(err_body, default=str)}")

    data = response.json()
    text = _safe_json_text(data)
    if not text:
        raise RuntimeError(f"No text returned by Google AI: {json.dumps(data, default=str)[:500]}")
    return text


async def transcribe_audio(data: bytes, filename: str = "audio.webm", language: str = "hi") -> str:
    if not has_google_api_key():
        return ""

    lower_name = (filename or "audio.webm").lower()
    encoding = "WEBM_OPUS"
    if lower_name.endswith(".wav"):
        encoding = "LINEAR16"
    elif lower_name.endswith(".mp3"):
        encoding = "MP3"
    elif lower_name.endswith(".m4a"):
        encoding = "MP3"
    elif lower_name.endswith(".aac"):
        encoding = "MP3"

    language_code = {
        "en": "en-US",
        "hi": "hi-IN",
        "mr": "mr-IN",
        "ta": "ta-IN",
        "te": "te-IN",
        "bn": "bn-IN",
        "gu": "gu-IN",
        "kn": "kn-IN",
        "ml": "ml-IN",
        "pa": "pa-IN",
        "or": "or-IN",
    }.get(language, "en-US")

    payload = {
        "config": {
            "encoding": encoding,
            "sampleRateHertz": 48000,
            "languageCode": language_code,
        },
        "audio": {"content": base64.b64encode(data).decode("utf-8")},
    }
    response = requests.post(f"{GOOGLE_SPEECH_URL}?key={GOOGLE_API_KEY}", json=payload, timeout=90)
    if response.status_code >= 400:
        err = response.text
        logger.warning("Google speech transcription failed: %s", err)
        return ""

    body = response.json()
    transcripts = []
    for result in body.get("results", []):
        for alt in result.get("alternatives", []):
            transcript = alt.get("transcript")
            if transcript:
                transcripts.append(transcript)
    return " ".join(transcripts).strip()

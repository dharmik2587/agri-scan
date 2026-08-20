"""OpenAI Whisper speech-to-text via Emergent LLM key."""
import os
import io
import tempfile
import logging
from emergentintegrations.llm.openai import OpenAISpeechToText

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")


async def transcribe_audio(data: bytes, filename: str, language: str = "hi") -> str:
    """Transcribe an audio blob using Whisper. Language is ISO-639-1 (hi, en, mr, etc)."""
    if not data:
        return ""
    stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
    # Whisper needs a real file with a supported extension. Use suffix from filename.
    suffix = ".webm"
    lower = (filename or "").lower()
    for ext in (".webm", ".mp3", ".mp4", ".m4a", ".wav", ".mpga", ".mpeg"):
        if lower.endswith(ext):
            suffix = ext
            break
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(data)
        tmp.flush()
        tmp.seek(0)
        try:
            with open(tmp.name, "rb") as f:
                response = await stt.transcribe(
                    file=f,
                    model="whisper-1",
                    response_format="json",
                    language=language if language in {"en", "hi", "mr", "ta", "te", "bn", "gu", "kn", "ml", "pa", "or"} else "en",
                    temperature=0.0,
                )
        except Exception as e:
            logger.error("Whisper transcription failed: %s", e)
            raise
    text = getattr(response, "text", None) or (response.get("text") if isinstance(response, dict) else None) or ""
    return text.strip()

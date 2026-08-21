"""Speech-to-text using Google AI Studio when configured."""
import logging

from google_ai import transcribe_audio as google_transcribe_audio

logger = logging.getLogger(__name__)


async def transcribe_audio(data: bytes, filename: str, language: str = "hi") -> str:
    """Transcribe an audio blob. Returns empty string when no speech key is configured."""
    if not data:
        return ""
    try:
        text = await google_transcribe_audio(data, filename=filename, language=language)
        if text:
            return text.strip()
    except Exception as e:
        logger.warning("Google transcription failed: %s", e)
    return ""

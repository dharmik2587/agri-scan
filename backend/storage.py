"""Storage helpers that work without Emergent object storage."""
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

APP_NAME = os.environ.get("APP_NAME", "agriscan")
LOCAL_STORAGE_ROOT = Path(os.environ.get("LOCAL_STORAGE_DIR", "/tmp/agriscan_uploads")).resolve()


def _safe_path(path: str) -> Path:
    normalized = Path(path)
    if normalized.is_absolute():
        name = str(normalized).lstrip("/")
    else:
        name = str(normalized)
    storage_path = (LOCAL_STORAGE_ROOT / name).resolve()
    if LOCAL_STORAGE_ROOT not in storage_path.parents and storage_path != LOCAL_STORAGE_ROOT:
        raise ValueError("Invalid storage path")
    return storage_path


def init_storage(force: bool = False):
    LOCAL_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    logger.info("Using local file storage at %s", LOCAL_STORAGE_ROOT)
    return "local-storage"


def put_object(path: str, data: bytes, content_type: str) -> dict:
    target = _safe_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return {"ok": True, "path": str(target), "content_type": content_type, "storage": "local"}


def get_object(path: str):
    target = _safe_path(path)
    if not target.exists():
        raise FileNotFoundError(path)
    return target.read_bytes(), ("image/jpeg" if target.suffix.lower() in {".jpg", ".jpeg"} else "application/octet-stream")

"""Authentication: JWT email/password + Emergent Google session exchange."""
import os
import jwt
import bcrypt
import requests
import logging
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Header, Depends
from typing import Optional
from models import UserPublic, RegisterInput, LoginInput, new_id, utcnow_iso

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALGO = "HS256"
JWT_EXP_DAYS = 30

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int((datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_jwt(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload["sub"]
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


def _user_from_doc(doc: dict) -> UserPublic:
    return UserPublic(
        user_id=doc["user_id"],
        email=doc["email"],
        name=doc.get("name", ""),
        picture=doc.get("picture"),
        auth_provider=doc.get("auth_provider", "email"),
        language=doc.get("language", "en"),
        created_at=doc.get("created_at", utcnow_iso()),
    )


async def register_user(db, data: RegisterInput) -> tuple[str, UserPublic]:
    existing = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_id("user")
    doc = {
        "user_id": user_id,
        "email": data.email.lower(),
        "name": data.name,
        "picture": None,
        "auth_provider": "email",
        "password_hash": hash_password(data.password),
        "language": "en",
        "created_at": utcnow_iso(),
    }
    await db.users.insert_one(doc)
    token = create_jwt(user_id)
    return token, _user_from_doc(doc)


async def login_user(db, data: LoginInput) -> tuple[str, UserPublic]:
    doc = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not doc or not doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(data.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_jwt(doc["user_id"])
    return token, _user_from_doc(doc)


async def emergent_session_exchange(db, session_id: str) -> tuple[str, UserPublic]:
    resp = requests.get(
        EMERGENT_SESSION_URL,
        headers={"X-Session-ID": session_id},
        timeout=15,
    )
    if resp.status_code != 200:
        logger.warning("Emergent session exchange failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=401, detail="Google session invalid or expired")
    data = resp.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email returned from Google")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        # update picture/name lightly
        await db.users.update_one(
            {"user_id": existing["user_id"]},
            {"$set": {"picture": data.get("picture"), "name": data.get("name") or existing.get("name", "")}},
        )
        existing["picture"] = data.get("picture")
        existing["name"] = data.get("name") or existing.get("name", "")
        token = create_jwt(existing["user_id"])
        return token, _user_from_doc(existing)
    user_id = new_id("user")
    doc = {
        "user_id": user_id,
        "email": email,
        "name": data.get("name") or email.split("@")[0],
        "picture": data.get("picture"),
        "auth_provider": "google",
        "password_hash": None,
        "language": "en",
        "created_at": utcnow_iso(),
    }
    await db.users.insert_one(doc)
    token = create_jwt(user_id)
    return token, _user_from_doc(doc)


async def get_current_user(db, authorization: Optional[str]) -> UserPublic:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    user_id = decode_jwt(token)
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    return _user_from_doc(doc)


async def get_optional_user(db, authorization: Optional[str]) -> Optional[UserPublic]:
    if not authorization:
        return None
    try:
        return await get_current_user(db, authorization)
    except HTTPException:
        return None

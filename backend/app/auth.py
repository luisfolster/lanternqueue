import hashlib
import hmac
import secrets
from datetime import timedelta, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_session
from app.models import SessionToken, User, now


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"


def check_password(password: str, stored: str) -> bool:
    try:
        algorithm, salt_hex, digest_hex = stored.split("$")
        if algorithm != "scrypt":
            return False
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
        return hmac.compare_digest(digest, bytes.fromhex(digest_hex))
    except (ValueError, TypeError):
        return False


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.execute(delete(SessionToken).where(SessionToken.expires_at < now()))
    db.add(
        SessionToken(
            user_id=user.id,
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            expires_at=now() + timedelta(hours=get_settings().session_hours),
        )
    )
    db.commit()
    return token


def current_user(request: Request, db: Session = Depends(get_session)) -> User:
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login para continuar")
    token = authorization[7:]
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login para continuar")
    record = db.scalar(
        select(SessionToken).where(
            SessionToken.token_hash == hashlib.sha256(token.encode()).hexdigest()
        )
    )
    if record is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão expirada ou inválida")
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão expirada ou inválida")
    return record.user


def staff_user(user: User = Depends(current_user)) -> User:
    if user.role not in {"technician", "admin"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso restrito à equipe")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso restrito à administração")
    return user

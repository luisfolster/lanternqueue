import hashlib
import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import admin_user, check_password, create_session, current_user, hash_password
from app.core.config import get_settings
from app.core.database import get_session
from app.models import SessionToken, User

router = APIRouter(prefix="/api/v1", tags=["users"])


class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=12, max_length=128)


class LoginInput(BaseModel):
    email: str
    password: str


class RoleInput(BaseModel):
    role: str


def user_view(user: User) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


@router.post("/users", status_code=201)
def register(data: RegisterInput, db: Session = Depends(get_session)) -> dict:
    email = data.email.strip().lower()
    if len(data.name.strip()) < 2:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Name is required")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid email address")
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(name=data.name.strip(), email=email, password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered") from exc
    db.refresh(user)
    return user_view(user)


@router.post("/sessions")
def login(data: LoginInput, db: Session = Depends(get_session)) -> dict:
    user = db.scalar(select(User).where(User.email == data.email.strip().lower()))
    if user is None or not check_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return {
        "token": create_session(db, user),
        "expires_in": get_settings().session_hours * 3600,
        "user": user_view(user),
    }


@router.delete("/sessions", status_code=204)
def logout(
    request: Request, user: User = Depends(current_user), db: Session = Depends(get_session)
) -> None:
    token_hash = hashlib.sha256(request.headers["authorization"][7:].encode()).hexdigest()
    record = db.scalar(select(SessionToken).where(SessionToken.token_hash == token_hash))
    if record:
        db.delete(record)
        db.commit()


@router.get("/users/me")
def me(user: User = Depends(current_user)) -> dict:
    return user_view(user)


@router.get("/users")
def list_users(admin: User = Depends(admin_user), db: Session = Depends(get_session)) -> list[dict]:
    return [user_view(user) for user in db.scalars(select(User).order_by(User.name)).all()]


@router.patch("/users/{user_id}/role")
def change_role(
    user_id: int,
    data: RoleInput,
    admin: User = Depends(admin_user),
    db: Session = Depends(get_session),
) -> dict:
    if data.role not in {"end_user", "technician", "admin"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid role")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == admin.id and data.role != "admin":
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot remove your own admin role")
    user.role = data.role
    db.commit()
    return user_view(user)

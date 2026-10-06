from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import get_engine

router = APIRouter(prefix="/api/v1/health", tags=["health"])


@router.get("/live")
def liveness() -> dict[str, str]:
    return {"status": "up"}


@router.get("")
def readiness(engine: Engine = Depends(get_engine)) -> dict[str, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from exc
    return {"status": "up", "database": "up"}

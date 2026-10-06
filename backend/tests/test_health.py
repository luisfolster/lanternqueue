from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.core.database import get_engine
from app.main import app


def test_liveness_does_not_require_database() -> None:
    response = TestClient(app).get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "up"}


def test_readiness_checks_database() -> None:
    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def execute(self, statement):
            assert str(statement) == "SELECT 1"

    class FakeEngine:
        def connect(self):
            return FakeConnection()

    app.dependency_overrides[get_engine] = lambda: FakeEngine()
    try:
        response = TestClient(app).get("/api/v1/health")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == {"status": "up", "database": "up"}


def test_readiness_reports_database_failure() -> None:
    class FailingEngine:
        def connect(self):
            raise OperationalError("SELECT 1", None, Exception("offline"))

    app.dependency_overrides[get_engine] = lambda: FailingEngine()
    try:
        response = TestClient(app).get("/api/v1/health")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.auth import hash_password
from app.core.database import get_session
from app.main import app
from app.models import Base, Category, User


def test_ticket_lifecycle_and_visibility(monkeypatch, tmp_path):
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    monkeypatch.setenv("ATTACHMENT_DIR", str(tmp_path))
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)

    def test_session():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_session] = test_session
    try:
        with Session(engine) as db:
            db.add_all(
                [
                    Category(name="Hardware"),
                    User(
                        name="Rafael Lima",
                        email="rafael@example.test",
                        role="technician",
                        password_hash=hash_password("a-long-test-password"),
                    ),
                    User(
                        name="Aline Rocha",
                        email="aline@example.test",
                        role="admin",
                        password_hash=hash_password("a-long-test-password"),
                    ),
                ]
            )
            db.commit()

        client = TestClient(app)
        created_user = client.post(
            "/api/v1/users",
            json={
                "name": "Marina Costa",
                "email": "marina@example.test",
                "password": "a-long-test-password",
            },
        )
        assert created_user.status_code == 201
        assert created_user.json()["role"] == "end_user"

        def auth(email):
            response = client.post(
                "/api/v1/sessions", json={"email": email, "password": "a-long-test-password"}
            )
            assert response.status_code == 200
            return {"Authorization": f"Bearer {response.json()['token']}"}

        requester = auth("marina@example.test")
        technician = auth("rafael@example.test")
        admin = auth("aline@example.test")
        assert (
            client.post(
                "/api/v1/users",
                json={
                    "name": "Paulo Nunes",
                    "email": "paulo@example.test",
                    "password": "a-long-test-password",
                },
            ).status_code
            == 201
        )
        other_requester = auth("paulo@example.test")
        users = client.get("/api/v1/users", headers=admin).json()
        technician_id = next(item["id"] for item in users if item["role"] == "technician")
        requester_id = created_user.json()["id"]
        assert client.get("/api/v1/tickets").status_code == 401

        created = client.post(
            "/api/v1/tickets",
            headers=requester,
            json={
                "title": "Notebook não liga",
                "description": "O notebook parou de iniciar hoje cedo.",
                "category_id": 1,
                "priority": "high",
            },
        )
        assert created.status_code == 201
        ticket_id = created.json()["id"]
        upload = client.post(
            f"/api/v1/tickets/{ticket_id}/attachments",
            headers=requester,
            files={"file": ("diagnostico.txt", b"Falha de inicializacao observada.", "text/plain")},
        )
        assert upload.status_code == 201
        attachment_id = upload.json()["id"]
        assert (
            client.get(
                f"/api/v1/tickets/{ticket_id}/attachments/{attachment_id}", headers=requester
            ).content
            == b"Falha de inicializacao observada."
        )
        assert (
            client.post(
                f"/api/v1/tickets/{ticket_id}/attachments",
                headers=requester,
                files={"file": ("script.exe", b"MZ", "application/octet-stream")},
            ).status_code
            == 422
        )
        assert client.get("/api/v1/tickets", headers=requester).json()["total"] == 1
        assert client.get("/api/v1/tickets", headers=other_requester).json()["total"] == 0
        assert (
            client.get(f"/api/v1/tickets/{ticket_id}", headers=other_requester).status_code == 404
        )
        assert (
            client.get(
                f"/api/v1/tickets/{ticket_id}/attachments/{attachment_id}", headers=other_requester
            ).status_code
            == 404
        )
        assert (
            client.patch(
                f"/api/v1/users/{requester_id}/role", headers=requester, json={"role": "admin"}
            ).status_code
            == 403
        )
        assert (
            client.patch(
                f"/api/v1/tickets/{ticket_id}/assignment",
                headers=requester,
                json={"assignee_id": technician_id},
            ).status_code
            == 403
        )
        assert (
            client.patch(
                f"/api/v1/tickets/{ticket_id}/status",
                headers=technician,
                json={"status": "resolved", "resolution": "Reiniciado"},
            ).status_code
            == 409
        )
        assert (
            client.patch(
                f"/api/v1/tickets/{ticket_id}/assignment",
                headers=admin,
                json={"assignee_id": requester_id},
            ).status_code
            == 422
        )
        assert (
            client.patch(
                f"/api/v1/tickets/{ticket_id}/assignment",
                headers=admin,
                json={"assignee_id": technician_id},
            ).status_code
            == 200
        )
        assert (
            client.patch(
                f"/api/v1/tickets/{ticket_id}/status",
                headers=technician,
                json={"status": "in_progress"},
            ).status_code
            == 200
        )
        assert (
            client.post(
                f"/api/v1/tickets/{ticket_id}/comments",
                headers=requester,
                json={"body": "Nota privada", "internal": True},
            ).status_code
            == 403
        )
        assert (
            client.post(
                f"/api/v1/tickets/{ticket_id}/comments",
                headers=technician,
                json={"body": "Reiniciando o equipamento.", "internal": True},
            ).status_code
            == 201
        )
        detail = client.get(f"/api/v1/tickets/{ticket_id}", headers=requester).json()
        assert detail["comments"] == []
        assert len(detail["events"]) == 4
        assert detail["attachments"][0]["name"] == "diagnostico.txt"
        assert detail["sla"]["first_response_state"] == "pending"
        assert (
            len(client.get(f"/api/v1/tickets/{ticket_id}", headers=technician).json()["comments"])
            == 1
        )
        assert (
            client.post(
                f"/api/v1/tickets/{ticket_id}/comments",
                headers=technician,
                json={"body": "Estamos verificando a atualização."},
            ).status_code
            == 201
        )
        detail = client.get(f"/api/v1/tickets/{ticket_id}", headers=requester).json()
        assert len(detail["comments"]) == 1
        assert detail["sla"]["first_response_state"] == "met"
        assert (
            client.patch(
                f"/api/v1/tickets/{ticket_id}/status",
                headers=technician,
                json={"status": "resolved"},
            ).status_code
            == 422
        )
        assert (
            client.patch(
                f"/api/v1/tickets/{ticket_id}/status",
                headers=technician,
                json={
                    "status": "resolved",
                    "resolution": "Atualização revertida e inicialização confirmada.",
                },
            ).status_code
            == 200
        )
        assert (
            client.patch(
                f"/api/v1/tickets/{ticket_id}/status", headers=admin, json={"status": "closed"}
            ).status_code
            == 200
        )
        assert (
            client.get(f"/api/v1/tickets/{ticket_id}", headers=requester).json()["sla"][
                "resolution_state"
            ]
            == "met"
        )
        assert (
            client.post(
                f"/api/v1/tickets/{ticket_id}/comments",
                headers=requester,
                json={"body": "Obrigado"},
            ).status_code
            == 409
        )
        assert client.delete("/api/v1/sessions", headers=requester).status_code == 204
        assert client.get("/api/v1/users/me", headers=requester).status_code == 401
    finally:
        app.dependency_overrides.clear()
        engine.dispose()

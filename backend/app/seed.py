import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.core.database import get_engine
from app.models import Category, Ticket, TicketEvent, User


def seed() -> None:
    password = os.environ.get("DEMO_PASSWORD")
    if not password or len(password) < 12:
        raise RuntimeError("DEMO_PASSWORD must contain at least 12 characters")
    with Session(get_engine()) as db:
        categories = ["Hardware", "Software", "Rede", "Acesso"]
        for name in categories:
            if db.scalar(select(Category).where(Category.name == name)) is None:
                db.add(Category(name=name))
        people = [
            ("Marina Costa", "marina@example.test", "end_user"),
            ("Rafael Lima", "rafael@example.test", "technician"),
            ("Aline Rocha", "aline@example.test", "admin"),
        ]
        for name, email, role in people:
            if db.scalar(select(User).where(User.email == email)) is None:
                db.add(
                    User(name=name, email=email, role=role, password_hash=hash_password(password))
                )
        db.commit()
        requester = db.scalar(select(User).where(User.email == "marina@example.test"))
        category = db.scalar(select(Category).where(Category.name == "Hardware"))
        if requester and category and db.scalar(select(Ticket.id)) is None:
            ticket = Ticket(
                title="Notebook não liga após atualização",
                description=(
                    "O notebook da recepção não inicia desde a atualização de ontem. "
                    "A equipe precisa consultar os agendamentos locais."
                ),
                requester_id=requester.id,
                category_id=category.id,
                priority="high",
            )
            db.add(ticket)
            db.flush()
            db.add(TicketEvent(ticket_id=ticket.id, actor_id=requester.id, action="created"))
            db.commit()


if __name__ == "__main__":
    seed()

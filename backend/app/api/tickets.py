from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import admin_user, current_user, staff_user
from app.core.config import get_settings
from app.core.database import get_session
from app.models import Attachment, Category, Comment, Ticket, TicketEvent, User, now
from app.sla import ticket_sla

router = APIRouter(prefix="/api/v1", tags=["tickets"])
PRIORITIES = {"low", "medium", "high", "critical"}
TRANSITIONS = {
    "open": {"assigned"},
    "assigned": {"in_progress", "open"},
    "in_progress": {"waiting_user", "resolved", "assigned"},
    "waiting_user": {"in_progress", "resolved"},
    "resolved": {"closed", "in_progress"},
    "closed": set(),
}
MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
ATTACHMENT_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".txt": "text/plain",
}


class TicketInput(BaseModel):
    title: str = Field(min_length=5, max_length=160)
    description: str = Field(min_length=10, max_length=10000)
    category_id: int
    priority: str = "medium"


class AssignmentInput(BaseModel):
    assignee_id: int | None


class StatusInput(BaseModel):
    status: str
    resolution: str | None = Field(default=None, max_length=10000)


class CommentInput(BaseModel):
    body: str = Field(min_length=1, max_length=10000)
    internal: bool = False


class CategoryInput(BaseModel):
    name: str = Field(min_length=2, max_length=80)


def ticket_view(ticket: Ticket) -> dict:
    return {
        "id": ticket.id,
        "title": ticket.title,
        "description": ticket.description,
        "requester_id": ticket.requester_id,
        "requester_name": ticket.requester.name,
        "assignee_id": ticket.assignee_id,
        "assignee_name": ticket.assignee.name if ticket.assignee else None,
        "category_id": ticket.category_id,
        "category_name": ticket.category.name,
        "priority": ticket.priority,
        "status": ticket.status,
        "resolution": ticket.resolution,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "closed_at": ticket.closed_at,
        "first_responded_at": ticket.first_responded_at,
        "resolved_at": ticket.resolved_at,
        "sla": ticket_sla(ticket),
    }


def visible_ticket(ticket_id: int, user: User, db: Session) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None or (user.role == "end_user" and ticket.requester_id != user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    return ticket


def event(db: Session, ticket: Ticket, actor: User, action: str, detail: str | None = None) -> None:
    db.add(TicketEvent(ticket_id=ticket.id, actor_id=actor.id, action=action, detail=detail))


@router.get("/categories")
def categories(db: Session = Depends(get_session)) -> list[dict]:
    return [
        {"id": category.id, "name": category.name}
        for category in db.scalars(
            select(Category).where(Category.active.is_(True)).order_by(Category.name)
        )
    ]


@router.post("/categories", status_code=201)
def create_category(
    data: CategoryInput,
    admin: User = Depends(admin_user),
    db: Session = Depends(get_session),
) -> dict:
    name = data.name.strip()
    if len(name) < 2:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Category name is required")
    if db.scalar(select(Category.id).where(func.lower(Category.name) == name.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "Category already exists")
    category = Category(name=name)
    db.add(category)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Category already exists") from exc
    return {"id": category.id, "name": category.name}


@router.post("/tickets", status_code=201)
def create_ticket(
    data: TicketInput,
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
) -> dict:
    if data.priority not in PRIORITIES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid priority")
    if len(data.title.strip()) < 5 or len(data.description.strip()) < 10:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Title and description are required"
        )
    category = db.get(Category, data.category_id)
    if category is None or not category.active:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid category")
    ticket = Ticket(
        title=data.title.strip(),
        description=data.description.strip(),
        requester_id=user.id,
        category_id=category.id,
        priority=data.priority,
    )
    db.add(ticket)
    db.flush()
    event(db, ticket, user, "created")
    db.commit()
    return ticket_view(ticket)


@router.get("/tickets")
def list_tickets(
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
    status_filter: str | None = Query(default=None, alias="status"),
    priority: str | None = None,
    category_id: int | None = None,
    q: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict:
    query = select(Ticket)
    if user.role == "end_user":
        query = query.where(Ticket.requester_id == user.id)
    if status_filter:
        if status_filter not in TRANSITIONS:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid status")
        query = query.where(Ticket.status == status_filter)
    if priority:
        if priority not in PRIORITIES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid priority")
        query = query.where(Ticket.priority == priority)
    if category_id:
        query = query.where(Ticket.category_id == category_id)
    if q:
        pattern = f"%{q}%"
        query = query.where(or_(Ticket.title.ilike(pattern), Ticket.description.ilike(pattern)))
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    tickets = db.scalars(
        query.order_by(Ticket.created_at.desc(), Ticket.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": [ticket_view(ticket) for ticket in tickets],
        "page": page,
        "page_size": page_size,
        "total": total,
    }


@router.get("/tickets/{ticket_id}")
def get_ticket(
    ticket_id: int, user: User = Depends(current_user), db: Session = Depends(get_session)
) -> dict:
    ticket = visible_ticket(ticket_id, user, db)
    comments = db.scalars(
        select(Comment)
        .where(Comment.ticket_id == ticket_id)
        .order_by(Comment.created_at, Comment.id)
    ).all()
    events = db.scalars(
        select(TicketEvent)
        .where(TicketEvent.ticket_id == ticket_id)
        .order_by(TicketEvent.created_at, TicketEvent.id)
    ).all()
    attachments = db.scalars(
        select(Attachment)
        .where(Attachment.ticket_id == ticket_id)
        .order_by(Attachment.created_at, Attachment.id)
    ).all()
    return {
        **ticket_view(ticket),
        "comments": [
            {
                "id": item.id,
                "author": item.author.name,
                "body": item.body,
                "internal": item.internal,
                "created_at": item.created_at,
            }
            for item in comments
            if user.role != "end_user" or not item.internal
        ],
        "events": [
            {
                "id": item.id,
                "actor": item.actor.name,
                "action": item.action,
                "detail": item.detail,
                "created_at": item.created_at,
            }
            for item in events
            if user.role != "end_user" or item.action != "internal_note"
        ],
        "attachments": [
            {
                "id": item.id,
                "name": item.original_name,
                "size": item.size,
                "uploader": item.uploader.name,
                "created_at": item.created_at,
            }
            for item in attachments
        ],
    }


@router.patch("/tickets/{ticket_id}/assignment")
def assign_ticket(
    ticket_id: int,
    data: AssignmentInput,
    user: User = Depends(staff_user),
    db: Session = Depends(get_session),
) -> dict:
    ticket = visible_ticket(ticket_id, user, db)
    if ticket.status in {"resolved", "closed"}:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot assign a resolved ticket")
    if user.role == "technician" and (
        data.assignee_id not in {None, user.id} or ticket.assignee_id not in {None, user.id}
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Technicians can only claim their own work")
    assignee = None
    if data.assignee_id is not None:
        assignee = db.get(User, data.assignee_id)
        if assignee is None or assignee.role not in {"technician", "admin"}:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Assignee must be staff")
    ticket.assignee_id = data.assignee_id
    ticket.status = "assigned" if data.assignee_id is not None else "open"
    ticket.updated_at = now()
    event(
        db,
        ticket,
        user,
        "assigned" if assignee else "unassigned",
        assignee.name if assignee else None,
    )
    db.commit()
    return ticket_view(ticket)


@router.patch("/tickets/{ticket_id}/status")
def change_status(
    ticket_id: int,
    data: StatusInput,
    user: User = Depends(staff_user),
    db: Session = Depends(get_session),
) -> dict:
    ticket = visible_ticket(ticket_id, user, db)
    if data.status not in TRANSITIONS[ticket.status]:
        raise HTTPException(status.HTTP_409_CONFLICT, "Invalid status transition")
    if data.status == "resolved" and (not data.resolution or not data.resolution.strip()):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Resolution is required")
    if data.status == "assigned" and ticket.assignee_id is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Assign a technician first")
    ticket.status = data.status
    ticket.updated_at = now()
    if data.status == "resolved":
        ticket.resolution = data.resolution.strip()
        ticket.resolved_at = now()
    if data.status == "in_progress" and ticket.resolution:
        ticket.resolution = None
        ticket.resolved_at = None
    if data.status == "closed":
        ticket.closed_at = now()
    event(db, ticket, user, "status_changed", data.status)
    db.commit()
    return ticket_view(ticket)


@router.post("/tickets/{ticket_id}/comments", status_code=201)
def add_comment(
    ticket_id: int,
    data: CommentInput,
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
) -> dict:
    ticket = visible_ticket(ticket_id, user, db)
    if ticket.status == "closed":
        raise HTTPException(status.HTTP_409_CONFLICT, "Ticket is closed")
    if data.internal and user.role == "end_user":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Internal notes require staff access")
    if not data.body.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Message cannot be blank")
    comment = Comment(
        ticket_id=ticket.id, author_id=user.id, body=data.body.strip(), internal=data.internal
    )
    db.add(comment)
    if (
        user.role in {"technician", "admin"}
        and not data.internal
        and ticket.first_responded_at is None
    ):
        ticket.first_responded_at = now()
    ticket.updated_at = now()
    event(db, ticket, user, "internal_note" if data.internal else "commented")
    db.commit()
    return {
        "id": comment.id,
        "author": user.name,
        "body": comment.body,
        "internal": comment.internal,
        "created_at": comment.created_at,
    }


@router.get("/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_session)) -> dict:
    query = select(Ticket.status, func.count()).group_by(Ticket.status)
    if user.role == "end_user":
        query = query.where(Ticket.requester_id == user.id)
    counts = {key: value for key, value in db.execute(query)}
    return {"counts": counts, "total": sum(counts.values()), "role": user.role}


def valid_attachment(content: bytes, extension: str) -> bool:
    if extension == ".pdf":
        return content.startswith(b"%PDF-")
    if extension == ".png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if extension in {".jpg", ".jpeg"}:
        return content.startswith(b"\xff\xd8\xff")
    if extension == ".txt":
        try:
            content.decode("utf-8")
            return b"\x00" not in content
        except UnicodeDecodeError:
            return False
    return False


@router.post("/tickets/{ticket_id}/attachments", status_code=201)
def upload_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
) -> dict:
    ticket = visible_ticket(ticket_id, user, db)
    if ticket.status == "closed":
        raise HTTPException(status.HTTP_409_CONFLICT, "Ticket is closed")
    name = (file.filename or "").replace("\\", "/").split("/")[-1].strip()
    if not name or len(name) > 120 or any(ord(char) < 32 for char in name):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid filename")
    extension = Path(name).suffix.lower()
    if extension not in ATTACHMENT_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "File type not allowed")
    content = file.file.read(MAX_ATTACHMENT_BYTES + 1)
    if len(content) > MAX_ATTACHMENT_BYTES:
        raise HTTPException(413, "File exceeds 5 MB")
    if not content or not valid_attachment(content, extension):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "File content does not match type"
        )
    directory = Path(get_settings().attachment_dir)
    directory.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}{extension}"
    path = directory / stored_name
    path.write_bytes(content)
    attachment = Attachment(
        ticket_id=ticket.id,
        uploader_id=user.id,
        original_name=name,
        stored_name=stored_name,
        content_type=ATTACHMENT_TYPES[extension],
        size=len(content),
    )
    db.add(attachment)
    event(db, ticket, user, "attachment_added", name)
    ticket.updated_at = now()
    try:
        db.commit()
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return {"id": attachment.id, "name": name, "size": attachment.size}


@router.get("/tickets/{ticket_id}/attachments/{attachment_id}")
def download_attachment(
    ticket_id: int,
    attachment_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
) -> FileResponse:
    visible_ticket(ticket_id, user, db)
    attachment = db.get(Attachment, attachment_id)
    if attachment is None or attachment.ticket_id != ticket_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attachment not found")
    path = Path(get_settings().attachment_dir) / attachment.stored_name
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attachment file not found")
    return FileResponse(path, media_type=attachment.content_type, filename=attachment.original_name)

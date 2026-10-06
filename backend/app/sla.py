from datetime import datetime, timedelta, timezone

from app.models import Ticket, now

# Horas corridas. Políticas de dias úteis exigiriam calendário e feriados.
POLICY_HOURS = {
    "critical": (1, 8),
    "high": (4, 24),
    "medium": (8, 72),
    "low": (24, 120),
}


def utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def state(deadline: datetime, completed: datetime | None) -> str:
    if completed is not None:
        return "met" if utc(completed) <= deadline else "breached"
    return "breached" if now() > deadline else "pending"


def ticket_sla(ticket: Ticket) -> dict:
    response_hours, resolution_hours = POLICY_HOURS[ticket.priority]
    created_at = utc(ticket.created_at)
    response_due = created_at + timedelta(hours=response_hours)
    resolution_due = created_at + timedelta(hours=resolution_hours)
    return {
        "first_response_due_at": response_due,
        "resolution_due_at": resolution_due,
        "first_response_state": state(response_due, ticket.first_responded_at),
        "resolution_state": state(resolution_due, ticket.resolved_at),
    }

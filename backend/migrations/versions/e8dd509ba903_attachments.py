"""Store metadata for ticket attachments.

Revision ID: e8dd509ba903
Revises: cfc5984a1e75
"""

import sqlalchemy as sa
from alembic import op

revision = "e8dd509ba903"
down_revision = "cfc5984a1e75"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "attachments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "ticket_id",
            sa.Integer(),
            sa.ForeignKey("tickets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("uploader_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("original_name", sa.String(120), nullable=False),
        sa.Column("stored_name", sa.String(80), nullable=False, unique=True),
        sa.Column("content_type", sa.String(80), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_attachments_ticket_id", "attachments", ["ticket_id"])


def downgrade() -> None:
    op.drop_index("ix_attachments_ticket_id", table_name="attachments")
    op.drop_table("attachments")

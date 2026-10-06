"""Track first public staff response.

Revision ID: cfc5984a1e75
Revises: 086bfdaf57e2
"""

import sqlalchemy as sa
from alembic import op

revision = "cfc5984a1e75"
down_revision = "086bfdaf57e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets", sa.Column("first_responded_at", sa.DateTime(timezone=True)))
    op.add_column("tickets", sa.Column("resolved_at", sa.DateTime(timezone=True)))


def downgrade() -> None:
    op.drop_column("tickets", "first_responded_at")
    op.drop_column("tickets", "resolved_at")

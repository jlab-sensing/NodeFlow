"""remove local logger table

Revision ID: 42a956c7c131
Revises: 1f70c345a7f8
Create Date: 2026-09-04 21:29:20.262995

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "42a956c7c131"
down_revision: Union[str, Sequence[str], None] = "1f70c345a7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table("logger")


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table(
        "logger",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "uuid",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "logger_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "last_seen",
            sa.DateTime(),
            nullable=False,
        ),
        sa.Column(
            "update_interval",
            sa.Integer(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "logger_id",
            name="uq_logger_logger_id",
        ),
    )

    op.create_index(
        op.f("ix_logger_user_id"),
        "logger",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_logger_uuid"),
        "logger",
        ["uuid"],
        unique=False,
    )

"""add optional user phone number

Revision ID: ff411feca8b3
Revises: 42a956c7c131
Create Date: 2026-09-21 11:44:32.259456

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ff411feca8b3"
down_revision: Union[str, Sequence[str], None] = "42a956c7c131"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column("phone", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "phone")

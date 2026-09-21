"""add optional user phone validator

Revision ID: 424877d0596a
Revises: ff411feca8b3
Create Date: 2026-09-21 12:55:37.830459

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '424877d0596a'
down_revision: Union[str, Sequence[str], None] = 'ff411feca8b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

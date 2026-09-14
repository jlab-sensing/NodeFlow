"""add archived state to hardware

Revision ID: 1f70c345a7f8
Revises: d5a3bf84003b
Create Date: 2026-08-24 12:14:36.978045

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1f70c345a7f8'
down_revision: Union[str, Sequence[str], None] = 'd5a3bf84003b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "sensor",
        sa.Column(
            "archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "solenoid",
        sa.Column(
            "archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("solenoid", "archived")
    op.drop_column("sensor", "archived")
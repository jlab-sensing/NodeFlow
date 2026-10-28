"""Add a nullable physical pin to solenoids.

Revision ID: 6b91e25fd034
Revises: f2546c92640f
"""

import sqlalchemy as sa

from alembic import op

revision = "6b91e25fd034"
down_revision = "f2546c92640f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("solenoid", sa.Column("physical_pin", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("solenoid", "physical_pin")

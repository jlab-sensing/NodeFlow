"""add shared Dirtviz cell and deployment groups

Revision ID: f2546c92640f
Revises: 424877d0596a
Create Date: 2026-09-30 10:34:49.870505

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f2546c92640f"
down_revision: Union[str, Sequence[str], None] = "424877d0596a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add shared cell references and deployment groups."""

    op.add_column(
        "groups",
        sa.Column(
            "kind",
            sa.String(),
            nullable=False,
            server_default="irrigation",
        ),
    )

    op.create_check_constraint(
        "valid_group_kind",
        "groups",
        "kind IN ('irrigation', 'deployment')",
    )

    op.create_table(
        "shared_cell",
        sa.Column("uuid", sa.Uuid(), nullable=False),
        sa.Column("source_instance", sa.String(), nullable=False),
        sa.Column("cell_id", sa.Integer(), nullable=False),
        sa.Column("cached_name", sa.String(), nullable=False),
        sa.Column(
            "enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.PrimaryKeyConstraint("uuid"),
        sa.UniqueConstraint(
            "source_instance",
            "cell_id",
            name="uq_shared_cell_source_cell",
        ),
        sa.CheckConstraint(
            "cell_id > 0",
            name="ck_shared_cell_positive_id",
        ),
    )

    op.create_table(
        "group_cell_link",
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("shared_cell_uuid", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["groups.id"],
        ),
        sa.ForeignKeyConstraint(
            ["shared_cell_uuid"],
            ["shared_cell.uuid"],
        ),
        sa.PrimaryKeyConstraint(
            "group_id",
            "shared_cell_uuid",
        ),
    )


def downgrade() -> None:
    """Remove the shared-cell and deployment-group schema."""

    op.drop_table("group_cell_link")
    op.drop_table("shared_cell")

    op.drop_constraint(
        "valid_group_kind",
        "groups",
        type_="check",
    )

    op.drop_column("groups", "kind")

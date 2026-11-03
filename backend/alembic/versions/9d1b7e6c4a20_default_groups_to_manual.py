"""Default groups to Manual and repair Auto groups without a usable threshold.

Revision ID: 9d1b7e6c4a20
Revises: c1e7591d892d
"""

import sqlalchemy as sa

from alembic import op

revision = "9d1b7e6c4a20"
down_revision = "c1e7591d892d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("groups", "irrigation_mode", server_default="manual")
    op.execute(
        sa.text(
            """
            UPDATE groups AS g
            SET irrigation_mode = 'manual'
            WHERE g.kind = 'irrigation'
              AND g.irrigation_mode = 'auto'
              AND NOT EXISTS (
                  SELECT 1
                  FROM activation_prefs AS p
                  JOIN sensor AS s ON s.id = p.sensor_id
                  WHERE p.group_id = g.uuid
                    AND p.user_id = g.user_id
                    AND p.enabled = true
                    AND s.group_id = g.uuid
                    AND s.user_id = g.user_id
                    AND s.archived = false
                    AND p.measurement ~ '[^[:space:]]'
                    AND p.condition_operator IN ('<', '>')
                    AND p.condition_value > '-Infinity'::double precision
                    AND p.condition_value < 'Infinity'::double precision
                    AND (
                        (p.close_condition_operator IS NULL
                         AND p.close_condition_value IS NULL)
                        OR (
                            p.close_condition_value > '-Infinity'::double precision
                            AND p.close_condition_value < 'Infinity'::double precision
                            AND (
                                (p.condition_operator = '<'
                                 AND p.close_condition_operator = '>'
                                 AND p.close_condition_value > p.condition_value)
                                OR
                                (p.condition_operator = '>'
                                 AND p.close_condition_operator = '<'
                                 AND p.close_condition_value < p.condition_value)
                            )
                        )
                    )
              )
            """
        )
    )


def downgrade() -> None:
    # Restoring the old default must not re-enable automatic control on records.
    op.alter_column("groups", "irrigation_mode", server_default="auto")

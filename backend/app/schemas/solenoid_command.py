from uuid import UUID, uuid4
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Column, DateTime, Index
from sqlmodel import Field, SQLModel


class SolenoidCommandTable(SQLModel, table=True):
    __tablename__ = "solenoid_command"

    __table_args__= (
        CheckConstraint(
            "requested_state IN ('open', 'closed')",
            name="ck_solenoid_command_state",
        ),
        CheckConstraint(
            "status IN ('submitting', 'queued', 'failed', 'unknown')",
            name="ck_solenoid_command_status"
        ),
        Index(
            "ix_solenoid_command_logger_created",
            "logger_id",
            "created_at",
            "id",
        ),
    )
    id: int | None = Field(default=None, primary_key=True)

    logger_id: int
    user_id: UUID = Field(
        foreign_key="users.id",
        index=True,
    )
    solenoid_id: int | None = Field(
        default=None,
        foreign_key="solenoid.id",
        ondelete="SET NULL",
    )

    requested_state: str
    status: str = Field(default="submitting")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    queued_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    error: str | None = None
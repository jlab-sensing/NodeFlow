from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel


class GroupTable(SQLModel, table=True):
    __tablename__ = "groups"
    __table_args__ = (
        CheckConstraint(
            "irrigation_mode IN ('manual', 'auto')",
            name="valid_irrigation_mode",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, index=True)
    name: str
    user_id: UUID
    date_created: datetime = Field(default_factory=datetime.utcnow)
    irrigation_mode: str = Field(
        default="auto",
        sa_column_kwargs={"server_default": "auto"},
    )
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import Field, field_validator
from sqlmodel import SQLModel

SOLENOID_PHYSICAL_PINS = frozenset(
    {3, 5, 8, 10, 15, 16, 18, 19, 21, 22, 23, 24, 27, 28, 29, 31, 33, 35, 36, 37}
)


class SolenoidBase(SQLModel):
    name: str
    logger_id: int
    group_id: Optional[UUID] = None
    physical_pin: int | None = Field(default=None, strict=True)

    @field_validator("physical_pin")
    @classmethod
    def validate_physical_pin(cls, value: int | None) -> int | None:
        if value is not None and value not in SOLENOID_PHYSICAL_PINS:
            raise ValueError("Select a supported physical solenoid pin")
        return value


class SolenoidCreate(SolenoidBase):
    pass


class SolenoidUpdate(SolenoidBase):
    pass


class SolenoidRead(SQLModel):
    id: int
    uuid: UUID
    user_id: UUID
    name: str
    active_state: str
    logger_id: int
    physical_pin: int | None = None
    group_id: Optional[UUID] = None
    date_created: datetime
    archived: bool

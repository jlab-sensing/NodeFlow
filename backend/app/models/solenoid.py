from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlmodel import SQLModel


class SolenoidCreate(SQLModel):
    name: str
    logger_id: int
    group_id: Optional[UUID] = None


class SolenoidUpdate(SQLModel):
    name: str
    logger_id: int
    group_id: Optional[UUID] = None


class SolenoidRead(SQLModel):
    id: int
    uuid: UUID
    user_id: UUID
    name: str
    active_state: str
    logger_id: int
    group_id: Optional[UUID] = None
    date_created: datetime
    archived: bool

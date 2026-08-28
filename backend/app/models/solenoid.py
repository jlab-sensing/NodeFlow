from sqlmodel import SQLModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class SolenoidCreate(SQLModel):
    name: str
    logger_id: int
    group_id: Optional[UUID] = None

class SolenoidUpdate(SolenoidBase):
    name: str
    logger_id: int
    group_id: Optional[UUID] = None

class SolenoidRead(SolenoidBase):
    id: int
    uuid: UUID
    user_id: UUID
    name: str
    active_state: str
    logger_id: int
    group_id: Optional[UUID] = None
    date_created: datetime
    archived: bool
from sqlmodel import SQLModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class SolenoidBase(SQLModel):
    user_id: UUID
    name: str
    active_state: str
    logger_id: int
    group_id: Optional[UUID] = None

class SolenoidCreate(SolenoidBase):
    pass

class SolenoidRead(SolenoidBase):
    id: int
    uuid: UUID
    date_created: datetime
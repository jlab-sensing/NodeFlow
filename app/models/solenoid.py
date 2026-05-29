from sqlmodel import SQLModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class SolenoidCreate(SQLModel):
    name: str
    active_state: str
    logger_id: int
    group_id: Optional[UUID] = None

class SolenoidRead(SQLModel):
    id: int
    uuid: UUID
    name: str
    active_state: str
    logger_id: int  # Added
    group_id: Optional[UUID] = None
    date_created: datetime 
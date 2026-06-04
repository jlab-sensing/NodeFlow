from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional

class SolenoidTable(SQLModel, table=True):
    __tablename__ = "solenoid"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, index=True)
    user_id: UUID = Field(index=True)
    name: str
    active_state: str
    logger_id: int
    group_id: Optional[UUID] = None
    date_created: datetime = Field(default_factory=datetime.utcnow)
from sqlmodel import SQLModel
from uuid import UUID
from datetime import datetime

class LoggerBase(SQLModel):
    user_id: UUID
    logger_id: int
    update_interval: int

class LoggerCreate(LoggerBase):
    pass

class LoggerRead(LoggerBase):
    id: int
    uuid: UUID
    last_seen: datetime
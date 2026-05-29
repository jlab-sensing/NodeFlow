from sqlmodel import SQLModel
from uuid import UUID
from datetime import datetime

class LoggerCreate(SQLModel):
    logger_name: str
    logger_id: int
    update_interval: int

class LoggerRead(SQLModel):
    id: int
    uuid: UUID
    logger_name: str
    logger_id: int 
    last_seen: datetime
    update_interval: int 
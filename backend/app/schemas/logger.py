from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional

from sqlalchemy import UniqueConstraint

class LoggerTable(SQLModel, table=True):
    __tablename__ = "logger"
    __table_args__ = (
        UniqueConstraint(
            "logger_id",
            name="uq_logger_logger_id",
        ),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, index=True)
    user_id: UUID = Field(index=True)
    logger_id: int  
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    update_interval: int

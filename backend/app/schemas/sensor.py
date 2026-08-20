from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from typing import Optional
from sqlalchemy import Index, text

class SensorTable(SQLModel, table=True):
    __tablename__ = "sensor"
    __table_args__ = (
        Index(
            "uq_sensor_user_logger_legacy_type",
            "user_id",
            "logger_id",
            "legacy_cell_id",
            "sensor_type",
            unique=True,
            postgresql_where=text("legacy_cell_id IS NOT NULL"),
        ),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, index=True)
    user_id: UUID = Field(index=True)
    name: str
    legacy_cell_id: Optional[int] = Field(default=None, index=True)
    sensor_type: str 
    sensor_id: Optional[int] = Field(default=None, index=True)
    logger_id: int
    group_id: Optional[UUID] = None

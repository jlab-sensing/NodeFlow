from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from typing import Optional

class SensorTable(SQLModel, table=True):
    __tablename__ = "sensor"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, index=True)
    user_id: UUID = Field(index=True)
    name: str
    legacy_cell_id: Optional[int] = Field(default=None, index=True)
    sensor_type: str 
    sensor_id: int
    logger_id: int
    group_id: Optional[UUID] = None

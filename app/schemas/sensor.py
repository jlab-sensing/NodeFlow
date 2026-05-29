from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from typing import Optional

class SensorTable(SQLModel, table=True):
    __tablename__ = "sensor"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, index=True)
    sensor_name: str
    sensor_id: int
    measurement: float
    unit: str
    logger_id: int
    group_id: Optional[UUID] = None
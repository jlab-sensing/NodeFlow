from sqlmodel import SQLModel
from uuid import UUID
from typing import Optional

class SensorCreate(SQLModel):
    sensor_name: str
    sensor_id: int
    measurement: float
    unit: str
    logger_id: int
    group_id: Optional[UUID] = None

class SensorRead(SQLModel):
    id: int
    uuid: UUID
    sensor_name: str
    sensor_id: int
    measurement: float
    unit: str
    logger_id: int
    group_id: Optional[UUID] = None
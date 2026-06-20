from sqlmodel import SQLModel
from uuid import UUID
from typing import Optional

class SensorBase(SQLModel):
    user_id: UUID 
    sensor_type: str
    sensor_id: int
    logger_id: int
    group_id: Optional[UUID] = None

class SensorCreate(SensorBase):
    pass

class SensorRead(SensorBase):
    id: int
    uuid: UUID
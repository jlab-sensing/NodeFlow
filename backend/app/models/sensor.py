from sqlmodel import SQLModel
from uuid import UUID
from typing import Optional

class SensorCreate(SQLModel):
    name: str
    sensor_type: str
    sensor_id: int
    logger_id: int
    legacy_cell_id: Optional[int] = None
    group_id: Optional[UUID] = None

class SensorRead(SQLModel):
    id: int
    uuid: UUID
    user_id: UUID
    name: str
    sensor_type: str
    sensor_id: int
    logger_id: int
    legacy_cell_id: Optional[int] = None
    group_id: Optional[UUID] = None
from typing import Optional
from uuid import UUID

from sqlmodel import SQLModel


class SensorCreate(SQLModel):
    name: str
    sensor_type: str
    logger_id: int
    group_id: Optional[UUID] = None


class SensorUpdate(SQLModel):
    name: str
    sensor_type: str
    logger_id: int
    group_id: Optional[UUID] = None


class SensorRead(SQLModel):
    id: int
    uuid: UUID
    user_id: UUID
    name: str
    sensor_type: str
    sensor_id: Optional[int] = None
    logger_id: int
    legacy_cell_id: Optional[int] = None
    group_id: Optional[UUID] = None
    archived: bool

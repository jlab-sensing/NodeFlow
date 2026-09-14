from typing import Optional
from uuid import UUID

from sqlmodel import SQLModel


class ChartGroupRead(SQLModel):
    uuid: UUID
    name: str


class ChartSensorRead(SQLModel):
    uuid: UUID
    name: str
    sensor_type: str
    logger_id: int
    group_id: Optional[UUID] = None
    has_chart_data: bool
    measurements: list[str]
    panel_ids: list[str]


class ChartSourcesRead(SQLModel):
    groups: list[ChartGroupRead]
    sensors: list[ChartSensorRead]

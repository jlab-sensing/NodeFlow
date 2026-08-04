from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


class SensorReadingTable(SQLModel, table=True):
    __tablename__ = "sensor_readings"

    id: Optional[int] = Field(default=None, primary_key=True)
    sensor_uuid: UUID = Field(index=True)
    user_id: UUID = Field(index=True)
    measurement: str = Field(index=True)
    value: float
    unit: Optional[str] = None
    timestamp: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, index=True),
    )

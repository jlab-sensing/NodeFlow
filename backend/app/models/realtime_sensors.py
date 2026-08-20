from uuid import UUID
from typing import Literal
from pydantic import BaseModel, Field

class SensorSubscriptionRequest(BaseModel):
    sensorUuids: list[UUID] = Field(
        default_factory=list,
        max_length=100,
    )

class SensorMeasurementValue(BaseModel):
    type: str
    sensorUuid: UUID
    loggerId: int
    timestamp: float
    data: dict[str, float | int]
    obj_count: int
    transport: Literal["wifi", "lora", "json"]
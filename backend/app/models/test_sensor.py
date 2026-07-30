from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


SensorMode = Literal["manual", "sine"]


class TestSensorReadingUpdate(BaseModel):
    value: float


class TestSensorModeUpdate(BaseModel):
    mode: SensorMode


class TestSensorSimulationUpdate(BaseModel):
    minimum: float
    maximum: float
    period_seconds: float = Field(gt=0)

    @model_validator(mode="after")
    def validate_range(self):
        if self.minimum >= self.maximum:
            raise ValueError("minimum must be less than maximum")
        return self


class TestSensorReading(BaseModel):
    sensor_type: str
    measurement: str
    value: float
    unit: str
    timestamp: datetime
    mode: SensorMode


class TestSensorSimulation(BaseModel):
    minimum: float
    maximum: float
    period_seconds: float

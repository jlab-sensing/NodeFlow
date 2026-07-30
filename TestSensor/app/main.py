import asyncio
import math
import os
import time
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field, model_validator


SensorMode = Literal["manual", "sine"]


class ReadingUpdate(BaseModel):
    value: float


class ModeUpdate(BaseModel):
    mode: SensorMode


class SimulationUpdate(BaseModel):
    minimum: float
    maximum: float
    period_seconds: float = Field(gt=0)

    @model_validator(mode="after")
    def validate_range(self):
        if self.minimum >= self.maximum:
            raise ValueError("minimum must be less than maximum")
        return self


class ReadingResponse(BaseModel):
    sensor_type: str
    measurement: str
    value: float
    unit: str
    timestamp: datetime
    mode: SensorMode


class SimulationResponse(BaseModel):
    minimum: float
    maximum: float
    period_seconds: float


app = FastAPI(
    title="Test Sensor",
    description="Configurable numeric sensor simulator for NodeFlow",
)

sensor_type = os.getenv("SENSOR_TYPE", "soil_moisture")
measurement = os.getenv("SENSOR_MEASUREMENT", "vwc")
unit = os.getenv("SENSOR_UNIT", "m3/m3")
initial_mode = os.getenv("INITIAL_SENSOR_MODE", "manual").lower()

if initial_mode not in {"manual", "sine"}:
    raise RuntimeError("INITIAL_SENSOR_MODE must be 'manual' or 'sine'")

try:
    initial_value = float(os.getenv("INITIAL_SENSOR_VALUE", "0.40"))
    initial_minimum = float(os.getenv("SENSOR_MINIMUM", "0.10"))
    initial_maximum = float(os.getenv("SENSOR_MAXIMUM", "0.50"))
    initial_period = float(os.getenv("SENSOR_PERIOD_SECONDS", "60"))
except ValueError as error:
    raise RuntimeError("Test sensor environment values must be numeric") from error

if initial_minimum >= initial_maximum:
    raise RuntimeError("SENSOR_MINIMUM must be less than SENSOR_MAXIMUM")

if initial_period <= 0:
    raise RuntimeError("SENSOR_PERIOD_SECONDS must be greater than zero")

sensor = {
    "manual_value": initial_value,
    "mode": initial_mode,
    "minimum": initial_minimum,
    "maximum": initial_maximum,
    "period_seconds": initial_period,
    "simulation_started_at": time.monotonic(),
}

state_lock = asyncio.Lock()


def calculate_value() -> float:
    if sensor["mode"] == "manual":
        return sensor["manual_value"]

    elapsed = time.monotonic() - sensor["simulation_started_at"]
    midpoint = (sensor["minimum"] + sensor["maximum"]) / 2
    amplitude = (sensor["maximum"] - sensor["minimum"]) / 2
    angle = 2 * math.pi * elapsed / sensor["period_seconds"]
    return midpoint + amplitude * math.sin(angle)


def reading_response() -> ReadingResponse:
    return ReadingResponse(
        sensor_type=sensor_type,
        measurement=measurement,
        value=calculate_value(),
        unit=unit,
        timestamp=datetime.now(timezone.utc),
        mode=sensor["mode"],
    )


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/reading", response_model=ReadingResponse)
async def get_reading():
    async with state_lock:
        return reading_response()


@app.put("/reading", response_model=ReadingResponse)
async def update_reading(update: ReadingUpdate):
    async with state_lock:
        sensor["manual_value"] = update.value
        sensor["mode"] = "manual"
        return reading_response()


@app.put("/mode", response_model=ReadingResponse)
async def update_mode(update: ModeUpdate):
    async with state_lock:
        sensor["mode"] = update.mode
        if update.mode == "sine":
            sensor["simulation_started_at"] = time.monotonic()
        return reading_response()


@app.get("/simulation", response_model=SimulationResponse)
async def get_simulation():
    async with state_lock:
        return SimulationResponse(
            minimum=sensor["minimum"],
            maximum=sensor["maximum"],
            period_seconds=sensor["period_seconds"],
        )


@app.put("/simulation", response_model=SimulationResponse)
async def update_simulation(update: SimulationUpdate):
    async with state_lock:
        sensor["minimum"] = update.minimum
        sensor["maximum"] = update.maximum
        sensor["period_seconds"] = update.period_seconds
        sensor["simulation_started_at"] = time.monotonic()
        return SimulationResponse(
            minimum=sensor["minimum"],
            maximum=sensor["maximum"],
            period_seconds=sensor["period_seconds"],
        )

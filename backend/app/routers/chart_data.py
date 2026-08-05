from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.auth.auth import get_current_user
from app.database import get_session
from app.schemas.sensor import SensorTable
from app.schemas.sensor_reading import SensorReadingTable
from app.schemas.user_schema import UserTable
from app.services.ents_client import ents_get
from app.services.sensor_config import (
    get_native_measurement_name,
    get_sensor_query_name,
)


router = APIRouter(
    prefix="/api/chart-data",
    tags=["Chart Data"],
)


def get_owned_chart_sensor(
    sensor_uuid: UUID,
    session: Session,
    current_user: UserTable,
) -> SensorTable:
    sensor = session.exec(
        select(SensorTable).where(
            SensorTable.uuid == sensor_uuid,
            SensorTable.user_id == current_user.id,
        )
    ).first()

    if sensor is None:
        raise HTTPException(status_code=404, detail="Sensor not found")

    return sensor


def reading_bucket(timestamp: datetime, resample: str) -> datetime:
    if resample == "hour":
        return timestamp.replace(minute=0, second=0, microsecond=0)
    if resample == "day":
        return timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
    return timestamp


def serialize_native_readings(
    readings: list[SensorReadingTable],
    resample: str,
) -> dict[str, list[Any]]:
    if resample not in {"none", "hour", "day"}:
        raise HTTPException(status_code=400, detail="Unsupported resample value")

    requested_bucket = {
        "hour": timedelta(hours=1),
        "day": timedelta(days=1),
    }.get(resample)
    reading_span = (
        readings[-1].timestamp - readings[0].timestamp
        if len(readings) > 1
        else timedelta(0)
    )

    if resample == "none" or (
        requested_bucket is not None and reading_span < requested_bucket
    ):
        return {
            "timestamp": [reading.timestamp.isoformat() for reading in readings],
            "data": [reading.value for reading in readings],
        }

    buckets: dict[datetime, list[float]] = defaultdict(list)
    for reading in readings:
        buckets[reading_bucket(reading.timestamp, resample)].append(
            reading.value
        )

    return {
        "timestamp": [timestamp.isoformat() for timestamp in buckets],
        "data": [sum(values) / len(values) for values in buckets.values()],
    }


def get_native_readings(
    session: Session,
    sensor: SensorTable,
    measurement: str,
    start: datetime,
    end: datetime,
) -> list[SensorReadingTable]:
    canonical_measurement = get_native_measurement_name(
        sensor.sensor_type,
        measurement,
    )
    if canonical_measurement is None:
        raise HTTPException(
            status_code=400,
            detail="Measurement is not available for this sensor",
        )

    return list(
        session.exec(
            select(SensorReadingTable)
            .where(
                SensorReadingTable.sensor_uuid == sensor.uuid,
                SensorReadingTable.user_id == sensor.user_id,
                SensorReadingTable.measurement == canonical_measurement,
                SensorReadingTable.timestamp >= start,
                SensorReadingTable.timestamp <= end,
            )
            .order_by(SensorReadingTable.timestamp)
        ).all()
    )


@router.get("/sensors/{sensor_uuid}")
async def get_sensor_chart_data(
    sensor_uuid: UUID,
    measurement: str,
    start: datetime,
    end: datetime,
    resample: str = Query(default="hour"),
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
) -> dict[str, Any]:
    sensor = get_owned_chart_sensor(sensor_uuid, session, current_user)
    native_readings = get_native_readings(
        session,
        sensor,
        measurement,
        start,
        end,
    )
    if native_readings:
        return serialize_native_readings(native_readings, resample)

    if sensor.legacy_cell_id is None:
        return {"timestamp": [], "data": []}

    sensor_name = get_sensor_query_name(sensor.sensor_type, measurement)
    if sensor_name is None:
        raise HTTPException(
            status_code=400,
            detail="Measurement is not available for this sensor",
        )

    return await ents_get(
        "/api/sensor/",
        params={
            "name": sensor_name,
            "cellId": sensor.legacy_cell_id,
            "measurement": measurement,
            "startTime": start.isoformat(),
            "endTime": end.isoformat(),
            "resample": resample,
        },
    )


@router.get("/sensors/{sensor_uuid}/power")
async def get_sensor_power_chart_data(
    sensor_uuid: UUID,
    start: datetime,
    end: datetime,
    resample: str = Query(default="hour"),
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
) -> dict[str, Any]:
    sensor = get_owned_chart_sensor(sensor_uuid, session, current_user)

    native_series = {}
    for key, measurement in (("v", "Voltage"), ("i", "Current")):
        try:
            readings = get_native_readings(
                session,
                sensor,
                measurement,
                start,
                end,
            )
        except HTTPException:
            readings = []
        if readings:
            native_series[key] = serialize_native_readings(readings, resample)

    if native_series:
        timestamps = next(iter(native_series.values()))["timestamp"]
        voltage = native_series.get("v", {}).get("data", [])
        current = native_series.get("i", {}).get("data", [])
        power = (
            [v * i for v, i in zip(voltage, current)]
            if voltage and current
            else []
        )
        return {
            "timestamp": timestamps,
            "v": voltage,
            "i": current,
            "p": power,
        }

    if sensor.legacy_cell_id is None:
        return {"timestamp": [], "v": [], "i": [], "p": []}

    return await ents_get(
        f"/api/power/{sensor.legacy_cell_id}",
        params={
            "startTime": start.isoformat(),
            "endTime": end.isoformat(),
            "resample": resample,
        },
    )

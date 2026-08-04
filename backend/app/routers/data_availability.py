from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlmodel import Session, select

from app.auth.auth import get_current_user
from app.database import get_session
from app.schemas.sensor import SensorTable
from app.schemas.sensor_reading import SensorReadingTable
from app.schemas.user_schema import UserTable
from app.services.ents_client import ents_get


router = APIRouter(prefix="/api/data-availability", tags=["data"])

EMPTY_AVAILABILITY = {
    "earliest_timestamp": None,
    "latest_timestamp": None,
    "has_recent_data": False,
}


def parse_sensor_uuids(value: str) -> list[UUID]:
    try:
        return [UUID(item.strip()) for item in value.split(",") if item.strip()]
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="sensor_uuids contains an invalid UUID",
        ) from error


def parse_optional_timestamp(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


@router.get("/sensors")
async def get_sensor_data_availability(
    sensor_uuids: str = Query(..., min_length=1),
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
) -> dict[str, Any]:
    requested_uuids = list(dict.fromkeys(parse_sensor_uuids(sensor_uuids)))
    if not requested_uuids:
        return EMPTY_AVAILABILITY

    sensors = session.exec(
        select(SensorTable).where(
            SensorTable.uuid.in_(requested_uuids),
            SensorTable.user_id == current_user.id,
        )
    ).all()

    found_uuids = {sensor.uuid for sensor in sensors}
    if any(sensor_uuid not in found_uuids for sensor_uuid in requested_uuids):
        raise HTTPException(status_code=404, detail="Sensor not found")

    native_bounds = session.exec(
        select(
            func.min(SensorReadingTable.timestamp),
            func.max(SensorReadingTable.timestamp),
        ).where(
            SensorReadingTable.sensor_uuid.in_(requested_uuids),
            SensorReadingTable.user_id == current_user.id,
        )
    ).one()
    native_earliest = parse_optional_timestamp(native_bounds[0])
    native_latest = parse_optional_timestamp(native_bounds[1])

    legacy_cell_ids = list(
        dict.fromkeys(
            sensor.legacy_cell_id
            for sensor in sensors
            if sensor.legacy_cell_id is not None
        )
    )
    legacy_availability = {}
    if legacy_cell_ids:
        legacy_availability = await ents_get(
            "/api/data-availability",
            params={"cell_ids": ",".join(map(str, legacy_cell_ids))},
        )

    legacy_earliest = parse_optional_timestamp(
        legacy_availability.get("earliest_timestamp")
    )
    legacy_latest = parse_optional_timestamp(
        legacy_availability.get("latest_timestamp")
    )
    earliest_candidates = [
        value for value in (native_earliest, legacy_earliest) if value is not None
    ]
    latest_candidates = [
        value for value in (native_latest, legacy_latest) if value is not None
    ]
    if not earliest_candidates or not latest_candidates:
        return EMPTY_AVAILABILITY

    earliest = min(earliest_candidates)
    latest = max(latest_candidates)
    return {
        "earliest_timestamp": earliest.isoformat(),
        "latest_timestamp": latest.isoformat(),
        "has_recent_data": latest >= datetime.now(timezone.utc) - timedelta(days=14),
    }

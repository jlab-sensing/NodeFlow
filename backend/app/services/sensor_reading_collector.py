import asyncio
import logging
import os
from datetime import datetime

from sqlmodel import Session, select

from app.database import engine
from app.schemas.sensor import SensorTable
from app.schemas.sensor_reading import SensorReadingTable
from app.services.sensor_config import get_native_measurement_name
from app.services.sensor_readings import (
    TEST_SENSOR_ID,
    TEST_SENSOR_LOGGER_ID,
    request_test_sensor,
)


logger = logging.getLogger(__name__)
COLLECTION_INTERVAL_SECONDS = float(
    os.getenv("SENSOR_READING_INTERVAL_SECONDS", "2"),
)


def parse_reading_timestamp(value) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


async def collect_test_sensor_readings() -> None:
    with Session(engine) as session:
        sensors = session.exec(
            select(SensorTable).where(
                SensorTable.sensor_id == TEST_SENSOR_ID,
                SensorTable.logger_id == TEST_SENSOR_LOGGER_ID,
            )
        ).all()

    if not sensors:
        return

    reading = await request_test_sensor("GET", "/reading")
    timestamp = parse_reading_timestamp(reading["timestamp"])

    with Session(engine) as session:
        for sensor in sensors:
            measurement = get_native_measurement_name(
                sensor.sensor_type,
                reading["measurement"],
            )
            if measurement is None:
                logger.warning(
                    "Ignoring unsupported measurement %s for sensor %s",
                    reading["measurement"],
                    sensor.uuid,
                )
                continue

            session.add(
                SensorReadingTable(
                    sensor_uuid=sensor.uuid,
                    user_id=sensor.user_id,
                    measurement=measurement,
                    value=float(reading["value"]),
                    unit=reading.get("unit"),
                    timestamp=timestamp,
                )
            )
        session.commit()


async def run_sensor_reading_collection_loop() -> None:
    while True:
        try:
            await collect_test_sensor_readings()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Native sensor reading collection failed")

        await asyncio.sleep(COLLECTION_INTERVAL_SECONDS)

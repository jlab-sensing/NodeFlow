"""Sensor measurement decoding, persistence, and realtime emission.

This module is adapted from the ENTS backend's api/resources/util.py.

The ENTS protobuf wire format is preserved. Incoming ``cellId`` values are
treated only as legacy identifiers used to resolve a NodeFlow SensorTable row.
After resolution, NodeFlow uses the sensor UUID for persistence, authorization,
historical queries, and Socket.IO rooms.
"""

import logging
import math
import os
from datetime import datetime, timezone
from typing import Any

from ents.proto import decode_measurement, encode_response
from ents.proto.sensor import parse_sensor_measurement
from fastapi import Response, status
from sqlmodel import Session, select

from app.realtime_sensors import sio
from app.schemas.logger import LoggerTable
from app.schemas.sensor import SensorTable
from app.schemas.sensor_reading import SensorReadingTable


logger = logging.getLogger(__name__)

DEBUG_SOCKETIO = (
    os.getenv("DEBUG_SOCKETIO", "False").lower()
    == "true"
)


# Each entry is:
#
#     raw payload field
#     NodeFlow database measurement name
#     stored unit
#
# The raw payload names are preserved in Socket.IO events so the existing
# ENTS live-chart extraction logic can be reused.
LEGACY_READING_SPECS: dict[
    str,
    tuple[tuple[str, str, str | None], ...],
] = {
    "power": (
        ("voltage", "Voltage", "V"),
        ("current", "Current", "A"),
    ),
    "teros12": (
        (
            "vwcAdj",
            "Volumetric Water Content",
            "%",
        ),
        (
            "vwcRaw",
            "Volumetric Water Content (Raw)",
            "raw",
        ),
        (
            "temp",
            "Temperature",
            "C",
        ),
        (
            "ec",
            "Electrical Conductivity",
            "uS/cm",
        ),
    ),
    "phytos31": (
        ("voltage", "voltage", "V"),
        ("leafWetness", "leafWetness", None),
    ),
    "bme280": (
        ("pressure", "pressure", "hPa"),
        ("temperature", "temperature", "C"),
        ("humidity", "humidity", "%"),
    ),
    "teros21": (
        (
            "matricPot",
            "soil_water_potential",
            "kPa",
        ),
        ("temp", "temp", "C"),
    ),
    "co2": (
        ("CO2", "co2", "PPM"),
        ("state", "state", "Boolean"),
        (
            "Photoresistivity",
            "Photoresistivity",
            "Ohms",
        ),
    ),
    "pcap02": (
        ("Capacitance", "Capacitance", "Farads"),
    ),
    "sen0257": (
        ("pressure", "pressure", "kPa"),
        ("voltage", "voltage", "V"),
    ),
    "sen0308": (
        ("voltage", "voltage", "V"),
        ("humidity", "humidity", "%"),
    ),
    "yfs210c": (
        ("flow", "flow", "L/Min"),
    ),
    "D10": (
        ("flow", "flow", "G/Min"),
    ),
}


# Generic/version-2 measurements already contain their measurement name and
# unit. These overrides align known wire names with NodeFlow's historical chart
# names without changing the Socket.IO event's raw data keys.
GENERIC_STORAGE_NAME_OVERRIDES: dict[
    tuple[str, str],
    str,
] = {
    ("power", "voltage"): "Voltage",
    ("power", "current"): "Current",
    (
        "teros12",
        "vwcAdj",
    ): "Volumetric Water Content",
    (
        "teros12",
        "vwcRaw",
    ): "Volumetric Water Content (Raw)",
    ("teros12", "temp"): "Temperature",
    (
        "teros12",
        "ec",
    ): "Electrical Conductivity",
    ("teros21", "matricPot"): (
        "soil_water_potential"
    ),
    ("co2", "CO2"): "co2",
}


class MeasurementProcessingError(Exception):
    """Raised when a decoded measurement cannot be stored."""


def legacy_response(
    success: bool,
    status_code: int,
) -> Response:
    """Create the protobuf response expected by protocol-v1 boards."""

    return Response(
        content=encode_response(success),
        status_code=status_code,
        media_type="application/octet-stream",
    )


def parse_device_timestamp(value: Any) -> datetime:
    """Convert an ENTS Unix timestamp to timezone-aware UTC."""

    try:
        timestamp = float(value)
    except (TypeError, ValueError) as exc:
        raise MeasurementProcessingError(
            "Measurement timestamp is invalid"
        ) from exc

    if not math.isfinite(timestamp):
        raise MeasurementProcessingError(
            "Measurement timestamp is not finite"
        )

    return datetime.fromtimestamp(
        timestamp,
        tz=timezone.utc,
    )


def numeric_value(value: Any) -> float:
    """Convert a supported measurement value to a finite float."""

    try:
        converted = float(value)
    except (TypeError, ValueError) as exc:
        raise MeasurementProcessingError(
            f"Measurement value {value!r} is not numeric"
        ) from exc

    if not math.isfinite(converted):
        raise MeasurementProcessingError(
            "Measurement value is not finite"
        )

    return converted


def generic_storage_name(
    sensor_type: str,
    measurement_name: str,
) -> str:
    """Return the NodeFlow database name for a generic measurement."""

    return GENERIC_STORAGE_NAME_OVERRIDES.get(
        (sensor_type, measurement_name),
        measurement_name,
    )


def resolve_logger(
    logger_id: Any,
    session: Session,
) -> LoggerTable:
    """Resolve the logger embedded in the ENTS protobuf payload.

    Logger IDs are globally unique in NodeFlow, so the payload ID resolves to
    at most one owner. The defensive ambiguity check also protects deployments
    that have not applied the uniqueness migration yet.
    """

    try:
        parsed_logger_id = int(logger_id)
    except (TypeError, ValueError) as exc:
        raise MeasurementProcessingError(
            "Payload loggerId is invalid"
        ) from exc

    matching_loggers = list(
        session.exec(
            select(LoggerTable).where(
                LoggerTable.logger_id
                == parsed_logger_id,
            )
        ).all()
    )

    if not matching_loggers:
        raise MeasurementProcessingError(
            f"Logger {parsed_logger_id} is not registered"
        )

    if len(matching_loggers) > 1:
        raise MeasurementProcessingError(
            f"Logger ID {parsed_logger_id} is ambiguous"
        )

    return matching_loggers[0]


def resolve_or_create_sensor(
    measurement: dict[str, Any],
    session: Session,
) -> tuple[LoggerTable, SensorTable, bool]:
    """Resolve an ENTS identity to one NodeFlow sensor.

    The incoming cellId is retained only as SensorTable.legacy_cell_id.
    NodeFlow generates and uses SensorTable.uuid as the canonical identity.
    """

    logger_record = resolve_logger(
        measurement.get("loggerId"),
        session,
    )

    legacy_cell_id = measurement.get("cellId")
    sensor_type = measurement.get("type")

    if legacy_cell_id is None:
        raise MeasurementProcessingError(
            "Payload is missing cellId"
        )

    try:
        parsed_cell_id = int(legacy_cell_id)
    except (TypeError, ValueError) as exc:
        raise MeasurementProcessingError(
            "Payload cellId is invalid"
        ) from exc

    if not isinstance(sensor_type, str) or not sensor_type:
        raise MeasurementProcessingError(
            "Payload sensor type is missing"
        )

    sensor = session.exec(
        select(SensorTable).where(
            SensorTable.user_id
            == logger_record.user_id,
            SensorTable.logger_id
            == logger_record.logger_id,
            SensorTable.legacy_cell_id
            == parsed_cell_id,
            SensorTable.sensor_type
            == sensor_type,
        )
    ).first()

    if sensor is not None:
        return logger_record, sensor, False

    sensor = SensorTable(
        user_id=logger_record.user_id,
        name=(
            f"{sensor_type} "
            f"{parsed_cell_id}"
        ),
        legacy_cell_id=parsed_cell_id,
        sensor_type=sensor_type,
        sensor_id=None,
        logger_id=logger_record.logger_id,
        group_id=None,
    )

    session.add(sensor)

    # Assign database-generated values without committing. The sensor and all
    # of its readings remain part of the same transaction.
    session.flush()

    return logger_record, sensor, True


def create_reading(
    *,
    session: Session,
    sensor: SensorTable,
    measurement_name: str,
    value: Any,
    unit: str | None,
    timestamp: datetime,
) -> SensorReadingTable:
    """Stage one NodeFlow sensor reading in the current transaction."""

    reading = SensorReadingTable(
        sensor_uuid=sensor.uuid,
        user_id=sensor.user_id,
        measurement=measurement_name,
        value=numeric_value(value),
        unit=unit,
        timestamp=timestamp,
    )

    session.add(reading)
    return reading


def touch_logger(
    logger_record: LoggerTable,
    session: Session,
) -> None:
    """Record when NodeFlow last received data from this logger."""

    # LoggerTable currently uses a timezone-naive datetime column/default.
    logger_record.last_seen = (
        datetime.now(timezone.utc)
        .replace(tzinfo=None)
    )
    session.add(logger_record)


async def emit_sensor_created(
    sensor: SensorTable,
) -> None:
    """Notify the owning user after a new sensor has been committed."""

    try:
        await sio.emit(
            "sensor_created",
            {
                "uuid": str(sensor.uuid),
                "name": sensor.name,
                "sensorType": sensor.sensor_type,
                "loggerId": sensor.logger_id,
                "legacyCellId": sensor.legacy_cell_id,
            },
            room=f"user_{sensor.user_id}",
        )

        if DEBUG_SOCKETIO:
            logger.info(
                "[socketio] emitted sensor_created for sensor %s",
                sensor.uuid,
            )
    except Exception:
        # Persistence has already committed. Realtime notification failures
        # must not turn a successful device upload into a failed upload.
        logger.exception(
            "[socketio] failed to emit sensor_created "
            "for sensor %s",
            sensor.uuid,
        )


async def emit_measurement_received(
    *,
    sensor: SensorTable,
    measurement: dict[str, Any],
    object_count: int,
    transport: str,
) -> None:
    """Emit an ENTS-shaped event to a NodeFlow sensor room."""

    event = {
        "type": measurement.get(
            "type",
            "unknown",
        ),
        "sensorUuid": str(sensor.uuid),
        "loggerId": measurement.get(
            "loggerId"
        ),
        "timestamp": measurement.get("ts"),
        "data": measurement.get(
            "data",
            {},
        ),
        "obj_count": object_count,
        "transport": transport,
    }

    room_name = f"sensor_{sensor.uuid}"

    try:
        await sio.emit(
            "measurement_received",
            event,
            room=room_name,
        )

        if DEBUG_SOCKETIO:
            logger.info(
                "[socketio] emitted measurement "
                "to %s",
                room_name,
            )
    except Exception:
        # Persistence has already committed. Socket.IO failure must not erase
        # saved data or change a successful device acknowledgement.
        logger.exception(
            "[socketio] failed to emit "
            "measurement for sensor %s",
            sensor.uuid,
        )


async def process_generic_measurement_json(
    measurements: list[dict[str, Any]],
    session: Session,
    transport: str,
) -> Response:
    """Store generic/version-2 decoded measurements.

    ENTS emits one Socket.IO event for each generic measurement. NodeFlow keeps
    that event cadence while committing the complete batch atomically.
    """

    pending_events: list[
        tuple[
            SensorTable,
            dict[str, Any],
            SensorReadingTable,
        ]
    ] = []
    created_sensors: dict[str, SensorTable] = {}

    try:
        for measurement in measurements:
            if "unsignedInt" in measurement:
                value = measurement[
                    "unsignedInt"
                ]
            elif "signedInt" in measurement:
                value = measurement[
                    "signedInt"
                ]
            elif "decimal" in measurement:
                value = measurement["decimal"]
            else:
                raise MeasurementProcessingError(
                    "No valid measurement value found"
                )

            metadata = measurement.get("meta")

            if not isinstance(metadata, dict):
                raise MeasurementProcessingError(
                    "Generic measurement is "
                    "missing meta"
                )

            measurement_name = measurement.get(
                "name"
            )
            sensor_type = measurement.get("type")

            if (
                not isinstance(
                    measurement_name,
                    str,
                )
                or not measurement_name
            ):
                raise MeasurementProcessingError(
                    "Generic measurement name "
                    "is missing"
                )

            if (
                not isinstance(sensor_type, str)
                or not sensor_type
            ):
                raise MeasurementProcessingError(
                    "Generic sensor type is missing"
                )

            measurement_dict = {
                "type": sensor_type,
                "loggerId": metadata.get(
                    "loggerId"
                ),
                "cellId": metadata.get(
                    "cellId"
                ),
                "ts": metadata.get("ts"),
                "data": {
                    measurement_name: value,
                },
                "data_type": {
                    measurement_name: type(value),
                },
            }

            (
                logger_record,
                sensor,
                sensor_created,
            ) = resolve_or_create_sensor(
                measurement_dict,
                session,
            )

            if sensor_created:
                created_sensors[str(sensor.uuid)] = sensor

            timestamp = parse_device_timestamp(
                measurement_dict["ts"]
            )

            reading = create_reading(
                session=session,
                sensor=sensor,
                measurement_name=(
                    generic_storage_name(
                        sensor_type,
                        measurement_name,
                    )
                ),
                value=value,
                unit=measurement.get("unit"),
                timestamp=timestamp,
            )

            touch_logger(
                logger_record,
                session,
            )

            pending_events.append(
                (
                    sensor,
                    measurement_dict,
                    reading,
                )
            )

        session.commit()

        for _, _, reading in pending_events:
            session.refresh(reading)

        for created_sensor in created_sensors.values():
            session.refresh(created_sensor)

    except Exception as exc:
        session.rollback()

        logger.exception(
            "Failed to process generic "
            "sensor measurements"
        )

        return Response(
            content=(
                "Error adding generic sensor "
                f"measurements: {exc}"
            ),
            status_code=status.HTTP_400_BAD_REQUEST,
            media_type="text/plain",
        )

    for created_sensor in created_sensors.values():
        await emit_sensor_created(created_sensor)

    # ENTS emits one event per individual generic measurement.
    for (
        sensor,
        measurement_dict,
        _reading,
    ) in pending_events:
        await emit_measurement_received(
            sensor=sensor,
            measurement=measurement_dict,
            object_count=1,
            transport=transport,
        )

    # ENTS returns an empty 200 response for a successful generic batch.
    return Response(
        status_code=status.HTTP_200_OK,
    )


async def process_generic_measurement(
    data: bytes,
    session: Session,
    transport: str,
) -> Response:
    """Decode and store generic/version-2 protobuf measurements."""

    try:
        decoded = parse_sensor_measurement(data)
        measurements = decoded["measurements"]

        if not isinstance(measurements, list):
            raise MeasurementProcessingError(
                "Decoded generic payload does "
                "not contain a measurement list"
            )
    except Exception as exc:
        logger.exception(
            "Failed to decode generic "
            "sensor payload"
        )

        return Response(
            content=(
                "Error parsing sensor "
                f"measurements: {exc}"
            ),
            status_code=status.HTTP_400_BAD_REQUEST,
            media_type="text/plain",
        )

    return await process_generic_measurement_json(
        measurements=measurements,
        session=session,
        transport=transport,
    )


async def process_measurement(
    data: bytes,
    session: Session,
    transport: str,
) -> Response:
    """Decode and store a legacy/version-1 protobuf measurement."""

    try:
        measurement = decode_measurement(
            data,
            raw=False,
        )
    except Exception:
        logger.exception(
            "Failed to decode legacy "
            "sensor payload"
        )

        return legacy_response(
            success=False,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    return await process_measurement_dict(
        measurement=measurement,
        session=session,
        transport=transport,
    )


async def process_measurement_json(
    data: dict[str, Any],
    session: Session,
    transport: str = "json",
) -> Response:
    """Store an already decoded legacy measurement dictionary."""

    return await process_measurement_dict(
        measurement=data,
        session=session,
        transport=transport,
    )


async def process_measurement_dict(
    measurement: dict[str, Any],
    session: Session,
    transport: str,
) -> Response:
    """Store a decoded legacy/version-1 measurement.

    One legacy message produces one Socket.IO event containing all fields in
    measurement["data"].
    """

    sensor_type = measurement.get("type")
    reading_specs = LEGACY_READING_SPECS.get(
        sensor_type
    )

    if reading_specs is None:
        logger.error(
            "Unsupported legacy sensor type: %r",
            sensor_type,
        )

        return legacy_response(
            success=False,
            status_code=(
                status.HTTP_501_NOT_IMPLEMENTED
            ),
        )

    try:
        payload_data = measurement.get("data")

        if not isinstance(payload_data, dict):
            raise MeasurementProcessingError(
                "Measurement payload is "
                "missing data"
            )

        (
            logger_record,
            sensor,
            sensor_created,
        ) = resolve_or_create_sensor(
            measurement,
            session,
        )

        timestamp = parse_device_timestamp(
            measurement.get("ts")
        )

        readings: list[
            SensorReadingTable
        ] = []

        for (
            payload_name,
            storage_name,
            unit,
        ) in reading_specs:
            if payload_name not in payload_data:
                raise MeasurementProcessingError(
                    "Measurement payload is "
                    f"missing {payload_name}"
                )

            reading = create_reading(
                session=session,
                sensor=sensor,
                measurement_name=storage_name,
                value=payload_data[payload_name],
                unit=unit,
                timestamp=timestamp,
            )

            readings.append(reading)

        touch_logger(
            logger_record,
            session,
        )

        # Commit the sensor, all readings, and logger update together.
        session.commit()

        for reading in readings:
            session.refresh(reading)

        if sensor_created:
            session.refresh(sensor)

    except Exception:
        session.rollback()

        logger.exception(
            "Failed to process legacy "
            "sensor measurement"
        )

        return legacy_response(
            success=False,
            status_code=(
                status.HTTP_501_NOT_IMPLEMENTED
            ),
        )

    if sensor_created:
        await emit_sensor_created(sensor)

    await emit_measurement_received(
        sensor=sensor,
        measurement=measurement,
        object_count=len(readings),
        transport=transport,
    )

    return legacy_response(
        success=True,
        status_code=status.HTTP_200_OK,
    )

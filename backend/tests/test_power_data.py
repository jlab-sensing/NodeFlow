from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4
import pytest
from fastapi import HTTPException
from sqlmodel import select

from app.routers.chart_data import serialize_native_readings
from app.routers.sensor_data_util import process_measurement_json
from app.schemas.logger import LoggerTable
from app.schemas.sensor import SensorTable
from app.schemas.sensor_reading import SensorReadingTable

def create_logger(
    db_session,
    user_id,
    logger_id=123,
):
    logger = LoggerTable(
        user_id=user_id,
        logger_id=logger_id,
        update_interval=60,
    )

    db_session.add(logger)
    db_session.commit()
    db_session.refresh(logger)
    return logger

def power_measurement(
    logger_id=123,
    cell_id=10,
    timestamp=1705176162,
    voltage=3.3,
    current=0.5,
):
    return {
        "type": "power",
        "loggerId": logger_id,
        "cellId": cell_id,
        "ts": timestamp,
        "data": {
            "voltage": voltage,
            "current": current,
        },
    }

def get_sensors(db_session):
    return db_session.exec(
        select(SensorTable)
    ).all()

def get_sensor_readings(db_session):
    return db_session.exec(
        select(SensorReadingTable)
    ).all()

def make_reading(
    timestamp,
    value,
):
    return SensorReadingTable(
        sensor_uuid=uuid4(),
        user_id=uuid4(),
        measurement="Voltage",
        value=value,
        unit="V",
        timestamp=timestamp,
    )

@pytest.mark.anyio 
async def test_power_measurement_creates_sensor_and_readings(
    db_session,
    test_user,
    monkeypatch,
):
    create_logger(
        db_session,
        test_user.id,
    )
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        AsyncMock(),
    )
    response = await process_measurement_json(
        data=power_measurement(),
        session=db_session,
        transport="wifi",
    )
    sensors = get_sensors(db_session)
    readings = get_sensor_readings(db_session)

    assert response.status_code == 200
    assert len(sensors) == 1
    assert sensors[0].user_id == test_user.id
    assert sensors[0].sensor_type == "power"
    assert sensors[0].logger_id == 123
    assert len(readings) == 2

    readings_by_name = {
        reading.measurement: reading
        for reading in readings
    }

    assert set(readings_by_name) == {
        "Voltage",
        "Current",
    }
    assert readings_by_name["Voltage"].value == (
        pytest.approx(3.3)
    )
    assert readings_by_name["Voltage"].unit == "V"
    assert readings_by_name["Current"].value == (
        pytest.approx(0.5)
    )
    assert readings_by_name["Current"].unit == "A"
    assert all(
        reading.sensor_uuid == sensors[0].uuid
        for reading in readings
    )

@pytest.mark.anyio
async def test_power_measurement_requires_registered_logger(
    db_session,
    monkeypatch,
):
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        AsyncMock(),
    )
    response = await process_measurement_json(
        data=power_measurement(
            logger_id=999,
        ),
        session=db_session,
        transport="wifi",
    )
    assert response.status_code == 501
    assert get_sensors(db_session) == []
    assert get_sensor_readings(db_session) == []

@pytest.mark.anyio
async def test_power_measurement_preserves_timestamp(
    db_session,
    test_user,
    monkeypatch,
):
    create_logger(
        db_session,
        test_user.id,
    )

    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        AsyncMock(),
    )

    timestamp = 1705176162

    response = await process_measurement_json(
        data=power_measurement(
            timestamp=timestamp,
        ),
        session=db_session,
        transport="wifi",
    )
    assert response.status_code == 200
    expected_timestamp = datetime.fromtimestamp(
        timestamp,
        tz=timezone.utc,
    )
    readings = get_sensor_readings(db_session)
    assert len(readings) == 2
    assert all(
        reading.timestamp == expected_timestamp
        for reading in readings
    )

@pytest.mark.anyio
async def test_power_measurement_emits_socket_event(
    db_session,
    test_user,
    monkeypatch
):
    create_logger(
        db_session,
        test_user.id,
    )
    emit = AsyncMock()
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        emit,
    )

    response = await process_measurement_json(
        data=power_measurement(
            voltage=4.2,
            current=0.75,
        ),
        session=db_session,
        transport="wifi",
    )
    assert response.status_code == 200

    sensors = get_sensors(db_session)

    measurement_call = next(
        call
        for call in emit.await_args_list
        if call.args[0] == "measurement_received"
    )
    event = measurement_call.args[1]

    assert event["sensorUuid"] == str(
        sensors[0].uuid
    )
    assert event["loggerId"] == 123
    assert event["data"] == {
        "voltage": 4.2,
        "current": 0.75,
    }
    assert event["transport"] == "wifi"
    assert measurement_call.kwargs["room"] == (
        f"sensor_{sensors[0].uuid}"
    )

def test_serialize_power_readings_without_resampling():
    first_timestamp = datetime(
        2026,
        8,
        20,
        10,
        0,
        tzinfo=timezone.utc,
    )
    second_timestamp = (
        first_timestamp
        + timedelta(minutes=30)
    )
    readings = [
        make_reading(
            first_timestamp,
            2.0,
        ),
        make_reading(
            second_timestamp,
            4.0,
        ),
    ]

    result = serialize_native_readings(
        readings,
        resample="none",
    )

    assert result == {
        "timestamp": [
            first_timestamp.isoformat(),
            second_timestamp.isoformat(),
        ],
        "data": [
            2.0,
            4.0,
        ],
    }

def test_serialize_power_readings_hourly():
    first_timestamp = datetime(
        2026,
        8,
        20,
        10,
        10,
        tzinfo=timezone.utc,
    )
    second_timestamp = datetime(
        2026,
        8,
        20,
        10,
        40,
        tzinfo=timezone.utc,
    )
    third_timestamp = datetime(
        2026,
        8,
        20,
        11,
        10,
        tzinfo=timezone.utc,
    )

    readings = [
        make_reading(
            first_timestamp,
            2.0,
        ),
        make_reading(
            second_timestamp,
            4.0,
        ),
        make_reading(
            third_timestamp,
            8.0,
        ),
    ]

    result = serialize_native_readings(
        readings,
        resample="hour",
    )

    first_bucket = first_timestamp.replace(
        minute=0,
        second=0,
        microsecond=0,
    )
    second_bucket = third_timestamp.replace(
        minute=0,
        second=0,
        microsecond=0,
    )
    assert result == {
        "timestamp": [
            first_bucket.isoformat(),
            second_bucket.isoformat(),
        ],
        "data": [
            3.0,
            8.0,
        ],
    }

def test_serialize_power_readings_rejects_invalid_resample():
    reading = make_reading(
        datetime.now(timezone.utc),
        2.0,
    )
    with pytest.raises(HTTPException) as error:
        serialize_native_readings(
            [reading],
            resample="minute",
        )
    
    assert error.value.status_code == 400
    assert error.value.detail == (
        "Unsupported resample value"
    )
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

def teros_measurement(
    logger_id=123,
    timestamp=1705176162,
    adjusted_vwc=42.0,
    raw_vwc=2.0,
    temperature=20.0,
    conductivity=4.0,
):
    return {
        "type": "teros12",
        "loggerId": logger_id,
        "cellId": 10,
        "ts": timestamp,
        "data": {
            "vwcAdj": adjusted_vwc,
            "vwcRaw": raw_vwc,
            "temp": temperature,
            "ec": conductivity,
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
        measurement="Volumetric Water Content",
        value=value,
        unit="%",
        timestamp=timestamp,
    )

@pytest.mark.anyio
async def test_teros_measurement_creates_sensor_and_readings(
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
        data=teros_measurement(),
        session=db_session,
        transport="wifi",
    )

    sensors = get_sensors(db_session)
    readings = get_sensor_readings(db_session)

    assert response.status_code == 200

    assert len(sensors) == 1
    assert sensors[0].user_id == test_user.id
    assert sensors[0].sensor_type == "teros12"
    assert sensors[0].logger_id == 123
    assert len(readings) == 4
    
    readings_by_name = {
        reading.measurement: reading
        for reading in readings
    }

    assert set(readings_by_name) == {
        "Volumetric Water Content",
        "Volumetric Water Content (Raw)",
        "Temperature",
        "Electrical Conductivity",
    }

    adjusted = readings_by_name[
        "Volumetric Water Content"
    ]
    raw = readings_by_name[
        "Volumetric Water Content (Raw)"
    ]
    temperature = readings_by_name["Temperature"]
    conductivity = readings_by_name["Electrical Conductivity"]

    assert adjusted.value == pytest.approx(42.0)
    assert adjusted.unit == "%"
    assert raw.value == pytest.approx(2.0)
    assert raw.unit == "raw"
    assert temperature.value == pytest.approx(20.0)
    assert temperature.unit == "C"
    assert conductivity.value == pytest.approx(4.0)
    assert conductivity.unit == "uS/cm"
    assert all(
        reading.sensor_uuid == sensors[0].uuid
        for reading in readings
    )

@pytest.mark.anyio
async def test_teros_measurement_preserves_timestamp(
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
        data=teros_measurement(
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
    assert len(readings) == 4
    assert all(
        reading.timestamp == expected_timestamp
        for reading in readings
    )

@pytest.mark.anyio
async def test_teros_measurement_requires_registered_logger(
    db_session,
    monkeypatch
):
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        AsyncMock(),
    )
    response = await process_measurement_json(
        data=teros_measurement(
            logger_id=999,
        ),
        session=db_session,
        transport="wifi"
    )
    assert response.status_code == 501
    assert get_sensor_readings(db_session) == []
    assert get_sensors(db_session) == []

@pytest.mark.anyio
async def test_teros_measurement_rejects_missing_field(
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
    measurement = teros_measurement()
    del measurement["data"]["ec"]
    response = await process_measurement_json(
        data=measurement,
        session=db_session,
        transport="wifi",
    )

    assert response.status_code == 501
    assert get_sensor_readings(db_session) == []
    assert get_sensors(db_session) == []

@pytest.mark.anyio
async def test_teros_measurement_rejects_invalid_number(
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
        data=teros_measurement(
            temperature="not-a-number",
        ),
        session=db_session,
        transport="wifi"
    )

    assert response.status_code == 501
    assert get_sensor_readings(db_session) == []
    assert get_sensors(db_session) == []

@pytest.mark.anyio
async def test_teros_measurement_rejects_none_conductivity(
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
        data=teros_measurement(
            conductivity=None,
        ),
        session=db_session,
        transport="wifi",
    )
    assert response.status_code == 501
    assert get_sensor_readings(db_session) == []
    assert get_sensors(db_session) == []

@pytest.mark.parametrize(
    ("input_value", "stored_value"),
    [
        (0.42, 0.42),
        (42.0, 42.0),
        (1.0, 1.0),
    ],
)
@pytest.mark.anyio
async def test_teros_vwc_preserves_input_value(
    input_value,
    stored_value,
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
        data=teros_measurement(
            adjusted_vwc=input_value,
        ),
        session=db_session,
        transport="wifi",
    )
    assert response.status_code == 200
    readings = get_sensor_readings(db_session)
    adjusted_reading = next(
        reading
        for reading in readings
        if reading.measurement == "Volumetric Water Content"
    )
    assert adjusted_reading.value == pytest.approx(
        stored_value
    )

@pytest.mark.anyio
async def test_teros_measurement_emits_socket_event(
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
        data=teros_measurement(
            adjusted_vwc=45.0,
            raw_vwc=3.0,
            temperature=21.0,
            conductivity=5.0,
        ),
        session=db_session,
        transport="wifi",
    )

    assert response.status_code == 200
    sensors = get_sensors(db_session)

    measurement_call = next(
        call for call in emit.await_args_list
        if call.args[0] == "measurement_received"
    )
    event = measurement_call.args[1]
    assert event["type"] == "teros12"
    assert event["sensorUuid"] == str(
        sensors[0].uuid
    )
    assert event["loggerId"] == 123
    assert event["data"] == {
        "vwcAdj": 45.0,
        "vwcRaw": 3.0,
        "temp": 21.0,
        "ec": 5.0,
    }
    assert event["obj_count"] == 4
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
            40.0,
        ),
        make_reading(
            second_timestamp,
            44.0,
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
            40.0,
            44.0,
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
            40.0,
        ),
        make_reading(
            second_timestamp,
            44.0,
        ),
        make_reading(
            third_timestamp,
            50.0,
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
            42.0,
            50.0,
        ],
    }

def test_serialize_power_readings_rejects_invalid_resample():
    reading = make_reading(
        datetime.now(timezone.utc),
        42.0,
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
from unittest.mock import AsyncMock

import pytest
from sqlmodel import select

from app.routers.sensor_data_util import process_generic_measurement_json
from app.schemas.sensor import SensorTable
from app.schemas.sensor_reading import SensorReadingTable


def create_configured_sensor(
    db_session,
    user_id,
    *,
    logger_id: int = 123,
    sensor_id: int = 10,
    sensor_type: str,
    archived: bool = False,
) -> SensorTable:
    sensor = SensorTable(
        user_id=user_id,
        name=f"Configured {sensor_type} sensor",
        legacy_cell_id=None,
        sensor_type=sensor_type,
        sensor_id=sensor_id,
        logger_id=logger_id,
        group_id=None,
        archived=archived,
    )
    db_session.add(sensor)
    db_session.commit()
    db_session.refresh(sensor)
    return sensor


def generic_measurement(
    value_field,
    value,
    logger_id=123,
    cell_id=10,
):
    return {
        "meta": {
            "cellId": cell_id,
            "loggerId": logger_id,
            "ts": 1705176162,
        },
        "type": "power",
        "name": "voltage",
        value_field: value,
        "unit": "V",
    }


def get_sensors(db_session):
    return db_session.exec(select(SensorTable)).all()


def get_sensor_readings(db_session):
    return db_session.exec(select(SensorReadingTable)).all()


@pytest.mark.anyio
async def test_generic_unsigned_integer(
    db_session,
    test_user,
    monkeypatch,
):
    sensor = create_configured_sensor(
        db_session,
        test_user.id,
        sensor_type="power",
    )
    emit = AsyncMock()
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        emit,
    )
    measurement = generic_measurement(
        value_field="unsignedInt",
        value=100,
    )
    response = await process_generic_measurement_json(
        measurements=[measurement],
        session=db_session,
        transport="wifi",
    )

    sensors = get_sensors(db_session)
    readings = get_sensor_readings(db_session)

    assert response.status_code == 200

    assert len(sensors) == 1
    assert sensors[0].id == sensor.id
    assert sensors[0].uuid == sensor.uuid
    assert sensors[0].user_id == test_user.id

    assert sensors[0].sensor_id == 10
    assert sensors[0].legacy_cell_id is None
    assert sensors[0].sensor_type == "power"
    assert sensors[0].logger_id == 123

    assert len(readings) == 1
    assert readings[0].sensor_uuid == sensors[0].uuid
    assert readings[0].user_id == test_user.id
    assert readings[0].measurement == "Voltage"
    assert readings[0].value == 100.0
    assert readings[0].unit == "V"


@pytest.mark.anyio
async def test_generic_signed_integer(
    db_session,
    test_user,
    monkeypatch,
):
    sensor = create_configured_sensor(
        db_session,
        test_user.id,
        sensor_type="power",
    )

    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        AsyncMock(),
    )
    measurement = generic_measurement(
        value_field="signedInt",
        value=-100,
    )
    response = await process_generic_measurement_json(
        measurements=[measurement],
        session=db_session,
        transport="wifi",
    )

    readings = get_sensor_readings(db_session)
    assert response.status_code == 200
    assert len(readings) == 1
    assert readings[0].sensor_uuid == sensor.uuid
    assert readings[0].measurement == "Voltage"
    assert readings[0].value == -100.0


@pytest.mark.anyio
async def test_generic_decimal(
    db_session,
    test_user,
    monkeypatch,
):
    sensor = create_configured_sensor(
        db_session,
        test_user.id,
        sensor_type="power",
    )
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        AsyncMock(),
    )
    measurement = generic_measurement(
        value_field="decimal",
        value=50.2123,
    )
    response = await process_generic_measurement_json(
        measurements=[measurement],
        session=db_session,
        transport="wifi",
    )
    readings = get_sensor_readings(db_session)

    assert response.status_code == 200
    assert len(readings) == 1
    assert readings[0].sensor_uuid == sensor.uuid
    assert readings[0].measurement == "Voltage"
    assert readings[0].value == pytest.approx(50.2123)


@pytest.mark.anyio
async def test_generic_rejects_unconfigured_sensor(
    db_session,
    monkeypatch,
):
    emit = AsyncMock()
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        emit,
    )
    measurement = generic_measurement(
        value_field="decimal",
        value=50.0,
        logger_id=999,
    )
    response = await process_generic_measurement_json(
        measurements=[measurement],
        session=db_session,
        transport="wifi",
    )
    assert response.status_code == 400
    assert get_sensors(db_session) == []
    assert get_sensor_readings(db_session) == []
    emit.assert_not_awaited()


@pytest.mark.anyio
async def test_generic_missing_values(
    db_session,
    test_user,
    monkeypatch,
):
    sensor = create_configured_sensor(
        db_session,
        test_user.id,
        sensor_type="power",
    )

    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        AsyncMock(),
    )

    measurement = {
        "meta": {
            "cellId": 10,
            "loggerId": 123,
            "ts": 1705176162,
        },
        "type": "power",
        "name": "voltage",
        "unit": "V",
    }
    response = await process_generic_measurement_json(
        measurements=[measurement],
        session=db_session,
        transport="wifi",
    )
    assert response.status_code == 400
    assert get_sensor_readings(db_session) == []
    sensors = get_sensors(db_session)

    assert len(sensors) == 1
    assert sensors[0].id == sensor.id


@pytest.mark.anyio
async def test_generic_measurements_reuse_sensor(
    db_session,
    test_user,
    monkeypatch,
):
    sensor = create_configured_sensor(
        db_session,
        test_user.id,
        sensor_type="power",
    )
    emit = AsyncMock()
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        emit,
    )
    first_measurement = generic_measurement(
        value_field="decimal",
        value=10.0,
    )
    second_measurement = generic_measurement(
        value_field="decimal",
        value=20.0,
    )

    response = await process_generic_measurement_json(
        measurements=[
            first_measurement,
            second_measurement,
        ],
        session=db_session,
        transport="wifi",
    )
    sensors = get_sensors(db_session)
    readings = get_sensor_readings(db_session)

    assert response.status_code == 200
    assert len(sensors) == 1
    assert len(readings) == 2

    assert sorted(reading.value for reading in readings) == [10.0, 20.0]

    emitted_event_names = [call.args[0] for call in emit.await_args_list]

    assert sensors[0].id == sensor.id
    assert emitted_event_names == [
        "measurement_received",
        "measurement_received",
    ]

    assert emitted_event_names.count("measurement_received") == 2


@pytest.mark.anyio
async def test_generic_measurement_emits_socket_events(
    db_session, test_user, monkeypatch
):
    sensor = create_configured_sensor(
        db_session,
        test_user.id,
        sensor_type="power",
    )
    emit = AsyncMock()
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        emit,
    )
    measurement = generic_measurement(
        value_field="decimal",
        value=42.0,
    )

    response = await process_generic_measurement_json(
        measurements=[measurement],
        session=db_session,
        transport="wifi",
    )

    sensors = get_sensors(db_session)

    assert response.status_code == 200
    assert len(sensors) == 1
    assert emit.await_count == 1
    measurement_call = emit.await_args_list[0]
    assert measurement_call.args[0] == "measurement_received"
    assert measurement_call.kwargs["room"] == f"sensor_{sensor.uuid}"

    measurement_event = measurement_call.args[1]

    assert measurement_event["sensorUuid"] == str(sensor.uuid)
    assert measurement_event["loggerId"] == 123
    assert measurement_event["data"] == {"voltage": 42.0}
    assert measurement_event["transport"] == "wifi"


@pytest.mark.anyio
async def test_socket_failure_does_not_discard_readings(
    db_session,
    test_user,
    monkeypatch,
):
    sensor = create_configured_sensor(
        db_session,
        test_user.id,
        sensor_type="power",
    )

    emit = AsyncMock(side_effect=Exception("WebSocket error"))
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        emit,
    )
    measurement = generic_measurement(
        value_field="decimal",
        value=42.0,
    )
    response = await process_generic_measurement_json(
        measurements=[measurement],
        session=db_session,
        transport="wifi",
    )

    sensors = get_sensors(db_session)
    readings = get_sensor_readings(db_session)

    assert response.status_code == 200
    assert len(sensors) == 1
    assert len(readings) == 1
    assert readings[0].value == 42.0
    assert sensors[0].id == sensor.id
    assert readings[0].sensor_uuid == sensor.uuid


@pytest.mark.anyio
async def test_generic_rejects_wrong_sensor_id(
    db_session,
    test_user,
    monkeypatch,
):
    sensor = create_configured_sensor(
        db_session,
        test_user.id,
        sensor_id=10,
        sensor_type="power",
    )
    emit = AsyncMock()
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        emit,
    )
    measurement = generic_measurement(
        value_field="decimal",
        value=50.0,
        cell_id=999,
    )
    response = await process_generic_measurement_json(
        measurements=[measurement],
        session=db_session,
        transport="wifi",
    )

    assert response.status_code == 400
    assert get_sensor_readings(db_session) == []
    sensors = get_sensors(db_session)

    assert len(sensors) == 1
    assert sensors[0].id == sensor.id
    emit.assert_not_awaited()


@pytest.mark.anyio
async def test_generic_rejects_wrong_sensor_type(
    db_session,
    test_user,
    monkeypatch,
):
    sensor = create_configured_sensor(
        db_session,
        test_user.id,
        sensor_type="teros12",
    )
    emit = AsyncMock()
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        emit,
    )
    measurement = generic_measurement(
        value_field="decimal",
        value=5.0,
    )
    response = await process_generic_measurement_json(
        measurements=[measurement],
        session=db_session,
        transport="wifi",
    )

    assert response.status_code == 400
    assert get_sensor_readings(db_session) == []

    sensors = get_sensors(db_session)

    assert len(sensors) == 1
    assert sensors[0].id == sensor.id
    emit.assert_not_awaited()


@pytest.mark.anyio
async def test_generic_rejects_archived_sensor(
    db_session,
    test_user,
    monkeypatch,
):
    sensor = create_configured_sensor(
        db_session,
        test_user.id,
        sensor_type="power",
        archived=True,
    )
    emit = AsyncMock()
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        emit,
    )

    measurement = generic_measurement(
        value_field="decimal",
        value=50.0,
    )

    response = await process_generic_measurement_json(
        measurements=[measurement],
        session=db_session,
        transport="wifi",
    )

    assert response.status_code == 400
    assert get_sensor_readings(db_session) == []

    sensors = get_sensors(db_session)

    assert len(sensors) == 1
    assert sensors[0].id == sensor.id
    emit.assert_not_awaited()

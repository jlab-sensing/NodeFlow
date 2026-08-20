import importlib
import logging
import os
from unittest.mock import AsyncMock, patch
from uuid import uuid4
import pytest
import socketio
from app import realtime_sensors
from app.routers.sensor_data_util import emit_measurement_received
from app.schemas.sensor import SensorTable

def create_sensor(
    db_session,
    user_id,
    name="Soil Sensor",
    sensor_type="soil_moisture",
    logger_id=1,
):
    sensor = SensorTable(
        user_id=user_id,
        name=name,
        sensor_type=sensor_type,
        logger_id=logger_id,
    )

    db_session.add(sensor)
    db_session.commit()
    db_session.refresh(sensor)
    return sensor

@pytest.mark.anyio
async def test_room_based_emission(monkeypatch, test_user):
    sensor = SensorTable(
        user_id=test_user.id,
        name = "Power Sensor",
        sensor_type = "power",
        logger_id=1,
    )
    measurement = {
        "type": "power",
        "loggerId": 1,
        "ts": 1234567890.0,
        "data": {
            "voltage": 3.3,
            "current": 0.5,
        },
    }
    mock_emit = AsyncMock()
    monkeypatch.setattr(
        "app.routers.sensor_data_util.sio.emit",
        mock_emit,
    )

    await emit_measurement_received(
        sensor=sensor,
        measurement=measurement,
        object_count=2,
        transport="wifi",
    )
    mock_emit.assert_awaited_once_with(
        "measurement_received",
        {
            "type": "power",
            "sensorUuid": str(sensor.uuid),
            "loggerId": 1,
            "timestamp": 1234567890.0,
            "data": {
                "voltage": 3.3,
                "current": 0.5,
            },
            "obj_count": 2,
            "transport": "wifi",
        },
        room=f"sensor_{sensor.uuid}"
    )

@pytest.mark.anyio
async def test_subscription_logic(
    db_session,
    test_engine,
    test_user,
    monkeypatch
):
    sensor = create_sensor(
        db_session,
        test_user.id,
    )
    mock_get_session = AsyncMock(
        return_value={
            "user_id": str(test_user.id),
        }
    )
    mock_enter_room = AsyncMock()
    monkeypatch.setattr(
        realtime_sensors,
        "engine",
        test_engine,
    )
    monkeypatch.setattr(
        realtime_sensors.sio,
        "get_session",
        mock_get_session,
    )
    monkeypatch.setattr(
        realtime_sensors.sio,
        "enter_room",
        mock_enter_room,
    )

    result = await realtime_sensors.handle_subscribe_sensors(
        "socket_id",
        {
            "sensorUuids": [
                str(sensor.uuid),
            ],
        },
    )

    assert result == {
        "ok": True,
        "subscribed": [
            str(sensor.uuid),
        ],
        "rejectedCount": 0,
    }

    mock_get_session.assert_awaited_once_with(
        "socket_id",
    )
    mock_enter_room.assert_awaited_once_with(
        "socket_id",
        f"sensor_{sensor.uuid}",
    )

@pytest.mark.anyio
async def test_subscription_rejects_unowned_sensor(
    db_session,
    test_engine,
    test_user,
    monkeypatch,
):
    owned_sensor = create_sensor(
        db_session,
        user_id=test_user.id,
        name="Owned Sensor",
    )
    unowned_sensor = create_sensor(
        db_session,
        user_id=uuid4(),
        name="Unowned Sensor",
        logger_id=2,
    )
    mock_get_session = AsyncMock(
        return_value={
            "user_id": str(test_user.id),
        }
    )
    mock_enter_room = AsyncMock()

    monkeypatch.setattr(
        realtime_sensors,
        "engine",
        test_engine,
    )
    monkeypatch.setattr(
        realtime_sensors.sio,
        "get_session",
        mock_get_session,
    )
    monkeypatch.setattr(
        realtime_sensors.sio,
        "enter_room",
        mock_enter_room,
    )

    result = await realtime_sensors.handle_subscribe_sensors(
        "socket-id",
        {
            "sensorUuids": [
                str(owned_sensor.uuid),
                str(unowned_sensor.uuid),
            ],
        },
    )

    assert result["ok"] is True
    assert set(result["subscribed"]) == {
        str(owned_sensor.uuid),
    }
    assert result["rejectedCount"] == 1

    mock_enter_room.assert_awaited_once_with(
        "socket-id",
        f"sensor_{owned_sensor.uuid}",
    )

@pytest.mark.anyio
async def test_subscription_rejects_invalid_payload():
    result = await realtime_sensors.handle_subscribe_sensors(
        "socket-id",
        {
            "sensorUuids": "not-a-list",
        },
    )

    assert result == {
        "ok": False,
        "error": "invalid subscription request",
    }


@pytest.mark.anyio
async def test_unsubscription_logic(monkeypatch):
    sensor_uuid = uuid4()
    mock_leave_room = AsyncMock()

    monkeypatch.setattr(
        realtime_sensors.sio,
        "leave_room",
        mock_leave_room,
    )

    result = await realtime_sensors.handle_unsubscribe_sensors(
        "socket-id",
        {
            "sensorUuids": [
                str(sensor_uuid),
            ],
        },
    )

    assert result == {
        "ok": True,
        "unsubscribed": [
            str(sensor_uuid),
        ],
    }

    mock_leave_room.assert_awaited_once_with(
        "socket-id",
        f"sensor_{sensor_uuid}",
    )


@pytest.mark.anyio
async def test_unsubscription_rejects_invalid_payload():
    result = await realtime_sensors.handle_unsubscribe_sensors(
        "socket-id",
        {
            "sensorUuids": "not-a-list",
        },
    )

    assert result == {
        "ok": False,
        "error": "invalid unsubscription request",
    }


def test_debug_socketio_disabled_by_default():
    with patch.dict(os.environ, {}, clear=True):
        importlib.reload(realtime_sensors)

        assert realtime_sensors.DEBUG_SOCKETIO is False

    importlib.reload(realtime_sensors)


def test_debug_socketio_enabled():
    with patch.dict(
        os.environ,
        {
            "DEBUG_SOCKETIO": "true",
        },
    ):
        importlib.reload(realtime_sensors)

        assert realtime_sensors.DEBUG_SOCKETIO is True

    importlib.reload(realtime_sensors)


@pytest.mark.anyio
async def test_socketio_connection_no_debug_logging(
    test_engine,
    test_user,
    monkeypatch,
    caplog,
):
    mock_save_session = AsyncMock()
    mock_enter_room = AsyncMock()

    monkeypatch.setattr(
        realtime_sensors,
        "engine",
        test_engine,
    )
    monkeypatch.setattr(
        realtime_sensors,
        "decode_access_token",
        lambda token: test_user.id,
    )
    monkeypatch.setattr(
        realtime_sensors,
        "DEBUG_SOCKETIO",
        False,
    )
    monkeypatch.setattr(
        realtime_sensors.sio,
        "save_session",
        mock_save_session,
    )
    monkeypatch.setattr(
        realtime_sensors.sio,
        "enter_room",
        mock_enter_room,
    )

    caplog.set_level(
        logging.INFO,
        logger="app.realtime_sensors",
    )

    await realtime_sensors.connect(
        "socket-id",
        {},
        {
            "token": "valid-token",
        },
    )

    mock_save_session.assert_awaited_once_with(
        "socket-id",
        {
            "user_id": str(test_user.id),
        },
    )
    mock_enter_room.assert_awaited_once_with(
        "socket-id",
        f"user_{test_user.id}",
    )

    assert "[socketio]" not in caplog.text.lower()


@pytest.mark.anyio
async def test_socketio_connection_requires_token():
    with pytest.raises(
        socketio.exceptions.ConnectionRefusedError,
        match="auth required",
    ):
        await realtime_sensors.connect(
            "socket-id",
            {},
            {},
        )


@pytest.mark.anyio
async def test_socketio_connection_rejects_invalid_token(
    monkeypatch,
):
    def reject_token(token):
        raise ValueError("Invalid token")

    monkeypatch.setattr(
        realtime_sensors,
        "decode_access_token",
        reject_token,
    )

    with pytest.raises(
        socketio.exceptions.ConnectionRefusedError,
        match="invalid access token",
    ):
        await realtime_sensors.connect(
            "socket-id",
            {},
            {
                "token": "invalid-token",
            },
        )

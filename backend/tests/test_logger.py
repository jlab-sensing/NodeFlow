from unittest.mock import AsyncMock
from fastapi import HTTPException
from app.schemas.sensor import SensorTable
from app.schemas.solenoid import SolenoidTable

def shared_logger(
    logger_id: int = 123,
    name: str = "Greenhouse Logger",
) -> dict:
    return {
        "id": logger_id,
        "logger_id": logger_id,
        "name": name,
        "type": "ents",
        "device_eui": "0080E1150546D093",
        "description": "Greenhouse Logger",
        "date_created": None,
    }

def logger_payload() -> dict:
    return {
        "name": "Greenhouse Logger",
        "type": "ents",
        "device_eui": "0080E1150546D093",
        "description": "Greenhouse Logger",
    }

def test_logger_routes_reques_authenication(client):
    response = client.get("/api/logger/")
    assert response.status_code == 401

def test_list_loggers_returns_shared_loggers(
    authenticated_client,
    monkeypatch,
):
    list_mock = AsyncMock(
        return_value=[
            shared_logger(123),
            shared_logger(456, name = "Field Logger"),
        ]
    )
    monkeypatch.setattr(
        "app.routers.logger.list_shared_loggers",
        list_mock,
    )
    response = authenticated_client.get("/api/logger/")
    assert response.status_code == 200
    returned_ids = {
        logger["logger_id"]
        for logger in response.json()
    }
    assert returned_ids == {123, 456}
    list_mock.assert_awaited_once_with()

def test_create_logger_uses_shared_logger_service(
    authenticated_client,
    monkeypatch,
):
    create_mock = AsyncMock(
        return_value=shared_logger()
    )
    monkeypatch.setattr(
        "app.routers.logger.create_shared_logger",
        create_mock,
    )
    response = authenticated_client.post(
        "/api/logger/",
        json=logger_payload(),
    )
    assert response.status_code == 201

    payload = response.json()
    assert payload["id"] == 123
    assert payload["logger_id"] == 123
    assert payload["name"] == "Greenhouse Logger"
    assert payload["device_eui"] == "0080E1150546D093"

    create_mock.assert_awaited_once()

    submitted = create_mock.await_args.args[0]
    assert submitted.name == "Greenhouse Logger"
    assert submitted.type == "ents"
    assert submitted.device_eui == "0080E1150546D093"
    assert submitted.description == "Greenhouse Logger"

def test_create_logger_preserves_dirtviz_conflict(
    authenticated_client,
    monkeypatch,
):
    create_mock = AsyncMock(
        side_effect=HTTPException(
            status_code=409,
            detail="Logger already exists",
        )
    )
    monkeypatch.setattr(
        "app.routers.logger.create_shared_logger",
        create_mock,
    )

    response = authenticated_client.post(
        "/api/logger/",
        json=logger_payload(),
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Logger already exists",
    }

def test_get_specific_shared_logger(
    authenticated_client,
    monkeypatch,
):
    get_mock = AsyncMock(
        return_value=shared_logger()
    )
    monkeypatch.setattr(
        "app.routers.logger.get_shared_logger",
        get_mock,
    )

    response = authenticated_client.get("/api/logger/123")

    assert response.status_code == 200
    assert response.json()["logger_id"] == 123
    get_mock.assert_awaited_once_with(123)

def test_get_missing_shared_logger_returns_not_found(
    authenticated_client,
    monkeypatch,
):
    get_mock = AsyncMock(
        side_effect=HTTPException(
            status_code=404,
            detail="Logger not found",
        )
    )
    monkeypatch.setattr(
        "app.routers.logger.get_shared_logger",
        get_mock,
    )

    response = authenticated_client.get("/api/logger/999")

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Logger not found",
    }

def test_update_shared_logger(
    authenticated_client,
    monkeypatch,
):
    update_mock = AsyncMock(
        return_value={
            **shared_logger(),
            "name": "Updated Logger",
            "description": "Updated description",
        }
    )
    monkeypatch.setattr(
        "app.routers.logger.update_shared_logger",
        update_mock,
    )
    response = authenticated_client.put(
        "/api/logger/123",
        json={
            "name": "Updated Logger",
            "description": "Updated description",
        },
    )
    
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Logger"
    assert response.json()["description"] == "Updated description"

    update_mock.assert_awaited_once()

    logger_id, submitted = update_mock.await_args.args

    assert logger_id == 123
    assert submitted.name == "Updated Logger"
    assert submitted.description == "Updated description"

def test_delete_shared_logger(
    authenticated_client,
    monkeypatch,
):
    get_mock = AsyncMock(
        return_value=shared_logger(),
    )
    delete_mock = AsyncMock(
        return_value={
            "ok": True,
            "logger_id": 123,
            "upstream": {},
        }
    )
    monkeypatch.setattr(
        "app.routers.logger.get_shared_logger",
        get_mock,
    )
    monkeypatch.setattr(
        "app.routers.logger.delete_shared_logger",
        delete_mock,
    )

    response = authenticated_client.delete("/api/logger/123")
    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["logger_id"] == 123

    get_mock.assert_awaited_once_with(123)
    delete_mock.assert_awaited_once_with(123)

def test_delete_missing_shared_logger_returns_not_found(
    authenticated_client,
    monkeypatch,
):
    get_mock = AsyncMock(
        side_effect=HTTPException(
            status_code=404,
            detail="Logger not found",
        )
    )
    delete_mock = AsyncMock()

    monkeypatch.setattr(
        "app.routers.logger.get_shared_logger",
        get_mock,
    )
    monkeypatch.setattr(
        "app.routers.logger.delete_shared_logger",
        delete_mock,
    )

    response = authenticated_client.delete("/api/logger/999")
    assert response.status_code == 404
    assert response.json() == {
        "detail": "Logger not found",
    }
    delete_mock.assert_not_awaited()

def test_delete_logger_used_by_sensor_returns_conflict(
    authenticated_client,
    db_session,
    test_user,
    monkeypatch,
):
    sensor = SensorTable(
        user_id=test_user.id,
        name="Soil Sensor",
        sensor_type="soil_moisture",
        sensor_id=1,
        logger_id=123,
        group_id=None,
    )
    db_session.add(sensor)
    db_session.commit()

    get_mock = AsyncMock(
        return_value=shared_logger()
    )
    delete_mock = AsyncMock()

    monkeypatch.setattr(
        "app.routers.logger.get_shared_logger",
        get_mock,
    )
    monkeypatch.setattr(
        "app.routers.logger.delete_shared_logger",
        delete_mock,
    )

    response = authenticated_client.delete("/api/logger/123")

    assert response.status_code == 409
    assert response.json() == {
        "detail": (
            "This logger is assigned to NodeFlow hardware. "
            "Reassign or remove that hardware before deleting the logger"
        )
    }

def test_delete_logger_used_by_solenoid_returns_conflict(
    authenticated_client,
    db_session,
    test_user,
    monkeypatch,
):
    solenoid = SolenoidTable(
        user_id=test_user.id,
        name="Greenhouse Valve",
        active_state="closed",
        logger_id=123,
        group_id=None,
    )

    db_session.add(solenoid)
    db_session.commit()

    get_mock = AsyncMock(
        return_value=shared_logger(),
    )
    delete_mock = AsyncMock()
    monkeypatch.setattr(
        "app.routers.logger.get_shared_logger",
        get_mock,
    )
    monkeypatch.setattr(
        "app.routers.logger.delete_shared_logger",
        delete_mock,
    )
    response = authenticated_client.delete("/api/logger/123")

    assert response.status_code == 409
    delete_mock.assert_not_awaited()
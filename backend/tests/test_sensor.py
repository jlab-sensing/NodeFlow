from datetime import datetime, timezone

from sqlmodel import select

from app.schemas.logger import LoggerTable
from app.schemas.sensor import SensorTable
from app.schemas.sensor_reading import SensorReadingTable
from app.schemas.user_schema import UserTable

def create_logger(db_session, user_id, logger_id=123):
    logger = LoggerTable(
        user_id=user_id,
        logger_id=logger_id,
        update_interval=60,
    )

    db_session.add(logger)
    db_session.commit()
    db_session.refresh(logger)

def sensor_payload(
    logger_id=123,
    name="Soil Sensor",
):
    return {
        "name": name,
        "sensor_type": "soil_moisture",
        "sensor_id": 1,
        "logger_id": logger_id,
        "legacy_cell_id": None,
        "group_id": None,
    }

def test_create_sensor(authenticated_client, db_session, test_user):
    create_logger(db_session, test_user.id)
    response = authenticated_client.post(
        "/api/sensor/",
        json=sensor_payload(),
    )
    assert response.status_code == 201

    payload = response.json()

    assert payload["user_id"] == str(test_user.id)
    assert payload["name"] == "Soil Sensor"
    assert payload["sensor_type"] == "soil_moisture"
    assert payload["sensor_id"] == 1
    assert payload["logger_id"] == 123
    assert payload["legacy_cell_id"] is None
    assert payload["group_id"] is None
    assert "id" in payload
    assert "uuid" in payload

def test_create_sensor_requires_owned_logger(authenticated_client):
    response = authenticated_client.post(
        "/api/sensor/",
        json=sensor_payload(logger_id=999),
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Logger not found",
    }

def test_list_sensors_returns_only_current_users_sensors(
    authenticated_client,
    db_session,
    test_user,
):
    create_logger(db_session, test_user.id, logger_id=123)
    create_response = authenticated_client.post(
        "/api/sensor/",
        json=sensor_payload(logger_id=123),
    )
    assert create_response.status_code == 201
    owned_sensor_uuid = create_response.json()["uuid"]

    other_user = UserTable(
        first_name="Other",
        last_name="User",
        email="other@example.com",
        password="",
    )
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)

    other_sensor = SensorTable(
        user_id=other_user.id,
        name="Other Sensor",
        sensor_type="temperature",
        sensor_id=2,
        logger_id=456,
        legacy_cell_id=None,
        group_id=None,
    )
    db_session.add(other_sensor)
    db_session.commit()

    response = authenticated_client.get("/api/sensor/")
    assert response.status_code == 200
    payload = response.json()
    return_uuid = {
        sensor["uuid"] for sensor in payload
    }

    assert return_uuid == {owned_sensor_uuid}

def test_update_sensor(authenticated_client, db_session, test_user):
    create_logger(
        db_session,
        test_user.id,
        logger_id=123,
    )
    create_logger(
        db_session,
        test_user.id,
        logger_id=456,
    )

    create_response = authenticated_client.post(
        "/api/sensor/",
        json=sensor_payload(logger_id=123),
    )

    assert create_response.status_code == 201

    sensor_id = create_response.json()["id"]
    update_response = authenticated_client.put(
        f"/api/sensor/{sensor_id}",
        json={
            "name": "Updated Sensor",
            "sensor_type": "temperature",
            "sensor_id": 2,
            "logger_id": 456,
            "legacy_cell_id": 10,
            "group_id": None,
        },
    )

    assert update_response.status_code == 200

    payload = update_response.json()

    assert payload["id"] == sensor_id
    assert payload["name"] == "Updated Sensor"
    assert payload["sensor_type"] == "temperature"
    assert payload["sensor_id"] == 2
    assert payload["logger_id"] == 456
    assert payload["legacy_cell_id"] == 10

def test_update_missing_sensor_returns_not_found(
    authenticated_client, 
    db_session,
    test_user,
):
    create_logger(
        db_session,
        test_user.id,
    )
    response = authenticated_client.put(
        "/api/sensor/999",
        json=sensor_payload(),
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Sensor not found",
    }

def test_delete_sensor_also_deletes_readings(
    authenticated_client,
    db_session,
    test_user,
):
    create_logger(
        db_session,
        test_user.id
    )

    create_response = authenticated_client.post(
        "/api/sensor/",
        json=sensor_payload(),
    )
    assert create_response.status_code == 201
    sensor_id = create_response.json()["id"]

    sensor = db_session.exec(
        select(SensorTable).where(
            SensorTable.id == sensor_id
        )
    ).one()

    reading = SensorReadingTable(
        sensor_uuid=sensor.uuid,
        user_id=test_user.id,
        measurement="Volumetric Water Content",
        value=42.0,
        unit="%",
        timestamp=datetime.now(timezone.utc)
    )
    db_session.add(reading)
    db_session.commit()

    response = authenticated_client.delete(
        f"/api/sensor/{sensor_id}"
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True}

    deleted_sensor = db_session.get(
        SensorTable,
        sensor_id,
    )
    remaining_readings = db_session.exec(
        select(SensorReadingTable).where(
            SensorReadingTable.sensor_uuid == sensor.uuid
        )
    ).all()

    assert deleted_sensor is None
    assert remaining_readings == []

def test_delete_missing_sensor_returns_not_found(
    authenticated_client,
):
    response = authenticated_client.delete(
        "/api/sensor/999"
    )
    assert response.status_code == 404
    assert response.json() == {
        "detail": "Sensor not found",
    }
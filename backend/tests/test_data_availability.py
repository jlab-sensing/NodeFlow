from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock

from app.schemas.sensor import SensorTable
from app.schemas.sensor_reading import SensorReadingTable
from app.schemas.user_schema import UserTable

def create_sensor(
    db_session,
    user_id,
    legacy_cell_id=None,
):
    sensor = SensorTable(
        user_id=user_id,
        name="Availability Sensor",
        sensor_type="soil_moisture",
        sensor_id=1,
        logger_id=123,
        legacy_cell_id=legacy_cell_id,
        group_id=None,
    )
    db_session.add(sensor)
    db_session.commit()
    db_session.refresh(sensor)
    return sensor

def create_reading(
    db_session,
    sensor,
    timestamp,
    value=42.0,
):
    reading = SensorReadingTable(
        sensor_uuid=sensor.uuid,
        user_id=sensor.user_id,
        measurement="volumetric Water Content",
        value=value,
        unit="%",
        timestamp=timestamp,
    )
    db_session.add(reading)
    db_session.commit()
    db_session.refresh(reading)
    return reading

def test_data_availability_requires_authentication(client):
    response = client.get(
        "/api/data-availability/sensors",
        params={
            "sensor_uuids": (
                "00000000-0000-0000-0000-000000000001"
            ),
        },
    )
    assert response.status_code == 401
    assert response.json() == {
        "detail": "No token provided",
    }

def test_data_availability_requires_sensor_uuids(
    authenticated_client,
):
    response = authenticated_client.get(
        "/api/data-availability/sensors",
    )
    assert response.status_code == 422
    details = response.json()["detail"]
    assert any(
        error["loc"][-1] == "sensor_uuids"
        for error in details
    )

def test_data_availability_rejects_empty_sensor_uuids(
    authenticated_client
):
    response = authenticated_client.get(
        "/api/data-availability/sensors",
        params={
            "sensor_uuids": "",
        },
    )
    assert response.status_code == 422

def test_data_availability_rejects_invalid_uuid(
    authenticated_client
):
    response = authenticated_client.get(
        "/api/data-availability/sensors",
        params={
            "sensor_uuids": "not-a-uuid",
        },
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": (
            "sensor_uuids contains an invalid UUID"
        ),
    }

def test_data_availability_rejects_unknown_sensor(
    authenticated_client
):
    response = authenticated_client.get(
        "/api/data-availability/sensors",
        params={
            "sensor_uuids": (
                "00000000-0000-0000-0000-000000000001"
            ),
        },
    )
    assert response.status_code == 404
    assert response.json() == {
        "detail": "Sensor not found",
    }

def test_data_availability_returns_empty_result(
    authenticated_client,
    db_session,
    test_user,
):
    sensor = create_sensor(
        db_session,
        test_user.id,
    )

    response = authenticated_client.get(
        "/api/data-availability/sensors",
        params={
            "sensor_uuids": str(sensor.uuid),
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "earliest_timestamp": None,
        "latest_timestamp": None,
        "has_recent_data": False,
    }

def test_data_availability_reports_recent_data(
    authenticated_client,
    db_session,
    test_user,
):
    sensor = create_sensor(
        db_session,
        test_user.id,
    )

    recent_timestamp = (
        datetime.now(timezone.utc)
        - timedelta(days=7)
    )

    create_reading(
        db_session,
        sensor,
        recent_timestamp,
    )

    response = authenticated_client.get(
        "/api/data-availability/sensors",
        params={
            "sensor_uuids": str(sensor.uuid),
        },
    )

    assert response.status_code == 200

    payload = response.json()

    assert payload["has_recent_data"] is True
    assert datetime.fromisoformat(
        payload["earliest_timestamp"]
    ) == recent_timestamp
    assert datetime.fromisoformat(
        payload["latest_timestamp"]
    ) == recent_timestamp


def test_data_availability_reports_old_data(
    authenticated_client,
    db_session,
    test_user,
):
    sensor = create_sensor(
        db_session,
        test_user.id,
    )

    old_timestamp = (
        datetime.now(timezone.utc)
        - timedelta(days=30)
    )

    create_reading(
        db_session,
        sensor,
        old_timestamp,
    )

    response = authenticated_client.get(
        "/api/data-availability/sensors",
        params={
            "sensor_uuids": str(sensor.uuid),
        },
    )

    assert response.status_code == 200

    payload = response.json()

    assert payload["has_recent_data"] is False
    assert datetime.fromisoformat(
        payload["earliest_timestamp"]
    ) == old_timestamp
    assert datetime.fromisoformat(
        payload["latest_timestamp"]
    ) == old_timestamp


def test_data_availability_returns_timestamp_bounds(
    authenticated_client,
    db_session,
    test_user,
):
    sensor = create_sensor(
        db_session,
        test_user.id,
    )

    earliest = (
        datetime.now(timezone.utc)
        - timedelta(days=10)
    )
    latest = (
        datetime.now(timezone.utc)
        - timedelta(days=2)
    )

    create_reading(
        db_session,
        sensor,
        latest,
        value=50.0,
    )
    create_reading(
        db_session,
        sensor,
        earliest,
        value=40.0,
    )

    response = authenticated_client.get(
        "/api/data-availability/sensors",
        params={
            "sensor_uuids": str(sensor.uuid),
        },
    )

    assert response.status_code == 200

    payload = response.json()

    assert datetime.fromisoformat(
        payload["earliest_timestamp"]
    ) == earliest
    assert datetime.fromisoformat(
        payload["latest_timestamp"]
    ) == latest
    assert payload["has_recent_data"] is True


def test_data_availability_hides_other_users_sensors(
    authenticated_client,
    db_session,
):
    other_user = UserTable(
        first_name="Other",
        last_name="User",
        email="other-availability@example.com",
        password="",
    )

    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)

    other_sensor = create_sensor(
        db_session,
        other_user.id,
    )

    response = authenticated_client.get(
        "/api/data-availability/sensors",
        params={
            "sensor_uuids": str(other_sensor.uuid),
        },
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Sensor not found",
    }


def test_data_availability_uses_legacy_data(
    authenticated_client,
    db_session,
    test_user,
    monkeypatch,
):
    sensor = create_sensor(
        db_session,
        test_user.id,
        legacy_cell_id=42,
    )

    legacy_earliest = (
        datetime.now(timezone.utc)
        - timedelta(days=20)
    )
    legacy_latest = (
        datetime.now(timezone.utc)
        - timedelta(days=1)
    )

    ents_get = AsyncMock(
        return_value={
            "earliest_timestamp": (
                legacy_earliest.isoformat()
            ),
            "latest_timestamp": (
                legacy_latest.isoformat()
            ),
        }
    )

    monkeypatch.setattr(
        "app.routers.data_availability.ents_get",
        ents_get,
    )

    response = authenticated_client.get(
        "/api/data-availability/sensors",
        params={
            "sensor_uuids": str(sensor.uuid),
        },
    )

    assert response.status_code == 200

    payload = response.json()

    assert datetime.fromisoformat(
        payload["earliest_timestamp"]
    ) == legacy_earliest
    assert datetime.fromisoformat(
        payload["latest_timestamp"]
    ) == legacy_latest
    assert payload["has_recent_data"] is True

    ents_get.assert_awaited_once_with(
        "/api/data-availability",
        params={
            "cell_ids": "42",
        },
    )


def test_data_availability_combines_native_and_legacy_data(
    authenticated_client,
    db_session,
    test_user,
    monkeypatch,
):
    sensor = create_sensor(
        db_session,
        test_user.id,
        legacy_cell_id=42,
    )

    native_timestamp = (
        datetime.now(timezone.utc)
        - timedelta(days=7)
    )
    legacy_earliest = (
        datetime.now(timezone.utc)
        - timedelta(days=30)
    )
    legacy_latest = (
        datetime.now(timezone.utc)
        - timedelta(days=1)
    )

    create_reading(
        db_session,
        sensor,
        native_timestamp,
    )

    ents_get = AsyncMock(
        return_value={
            "earliest_timestamp": (
                legacy_earliest.isoformat()
            ),
            "latest_timestamp": (
                legacy_latest.isoformat()
            ),
        }
    )

    monkeypatch.setattr(
        "app.routers.data_availability.ents_get",
        ents_get,
    )

    response = authenticated_client.get(
        "/api/data-availability/sensors",
        params={
            "sensor_uuids": str(sensor.uuid),
        },
    )

    assert response.status_code == 200

    payload = response.json()

    assert datetime.fromisoformat(
        payload["earliest_timestamp"]
    ) == legacy_earliest
    assert datetime.fromisoformat(
        payload["latest_timestamp"]
    ) == legacy_latest
    assert payload["has_recent_data"] is True
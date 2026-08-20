from app.schemas.groups import GroupTable
from app.schemas.sensor import SensorTable
from app.schemas.sensor_reading import SensorReadingTable
from app.schemas.user_schema import UserTable
from datetime import datetime, timezone

def create_sensor(
    db_session,
    user_id,
    name="Soil Sensor",
    sensor_type="soil_moisture",
    sensor_id=1,
    logger_id=123,
    legacy_cell_id=None,
    group_id=None,
):
    sensor = SensorTable(
        user_id=user_id,
        name=name,
        sensor_type=sensor_type,
        sensor_id=sensor_id,
        logger_id=logger_id,
        legacy_cell_id=legacy_cell_id,
        group_id=group_id
    )

    db_session.add(sensor)
    db_session.commit()
    db_session.refresh(sensor)
    return sensor

def create_other_user(db_session):
    user = UserTable(
        first_name="Other",
        last_name="User",
        email="other-user@example.com",
        password="",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def test_chart_sources_requires_authentication(client):
    response = client.get("/api/chart-sources/")
    assert response.status_code == 401
    assert response.json() == {
        "detail": "No token provided",
    }

def test_chart_sources_empty_for_user(authenticated_client):
    response = authenticated_client.get("/api/chart-sources/")
    assert response.status_code == 200
    assert response.json() == {
        "groups": [],
        "sensors": [],
    }

def test_chart_sources_returns_on_current_users_group(
    authenticated_client,
    db_session,
    test_user,
):
    owned_group = GroupTable(
        name="Owned Group",
        user_id=test_user.id,
    )
    db_session.add(owned_group)

    other_user = create_other_user(db_session)
    other_group = GroupTable(
        name="Other Group",
        user_id=other_user.id,
    )
    db_session.add(other_group)
    db_session.commit()
    db_session.refresh(owned_group)

    response = authenticated_client.get("/api/chart-sources/")
    assert response.status_code == 200

    groups = response.json()["groups"]
    assert groups == [
        {
            "uuid": str(owned_group.uuid),
            "name": "Owned Group",
        }
    ]

def  test_chart_sources_returns_only_current_users_sensors(
    authenticated_client,
    db_session,
    test_user
):
    owned_sensor = create_sensor(
        db_session,
        test_user.id,
        name="Owned Sensor",
        logger_id=123,
    )
    other_user = create_other_user(db_session)
    create_sensor(
        db_session,
        other_user.id,
        name="Other Sensor",
        logger_id=456,
    )

    response = authenticated_client.get("/api/chart-sources/")

    assert response.status_code == 200
    sensors = response.json()["sensors"]
    assert len(sensors) == 1
    assert sensors[0]["uuid"] == str(owned_sensor.uuid)
    assert sensors[0]["name"] == "Owned Sensor"

def test_sensor_with_native_readings_has_chart_data(
    authenticated_client,
    db_session,
    test_user,
):
    sensor = create_sensor(
        db_session,
        test_user.id,
    )
    reading = SensorReadingTable(
        sensor_uuid = sensor.uuid,
        user_id=test_user.id,
        measurement="Volumetric Water Content",
        value=42.0,
        unit="%",
        timestamp=datetime.now(timezone.utc),
    )
    db_session.add(reading)
    db_session.commit()
    response = authenticated_client.get("/api/chart-sources")
    assert response.status_code == 200
    returned_sensor = response.json()["sensors"][0]

    assert returned_sensor["uuid"] == str(sensor.uuid)
    assert returned_sensor["has_chart_data"] is True

def test_sensor_without_readings_has_no_chart_data(
    authenticated_client,
    db_session,
    test_user,
):
    sensor = create_sensor(
        db_session,
        test_user.id,
    )
    response = authenticated_client.get("/api/chart-sources/")
    assert response.status_code == 200

    returned_sensor = response.json()["sensors"][0]

    assert returned_sensor["uuid"] == str(sensor.uuid)
    assert returned_sensor["has_chart_data"] is False

def test_legacy_sensor_has_chart_data(
    authenticated_client,
    db_session,
    test_user,
):
    sensor = create_sensor(
        db_session,
        test_user.id,
        legacy_cell_id=42,
    )
    response = authenticated_client.get("/api/chart-sources/")
    assert response.status_code == 200
    returned_sensor = response.json()["sensors"][0]
    assert returned_sensor["uuid"] == str(sensor.uuid)
    assert returned_sensor["has_chart_data"] is True

def test_chart_sources_include_sensor_capabilities(
    authenticated_client,
    db_session,
    test_user,
):
    sensor = create_sensor(
        db_session,
        test_user.id,
        sensor_type="soil_moisture",
    )
    response = authenticated_client.get("/api/chart-sources/")
    assert response.status_code == 200
    returned_sensor = response.json()["sensors"][0]
    assert returned_sensor["uuid"] == str(sensor.uuid)
    assert returned_sensor["sensor_type"] == "soil_moisture"
    assert returned_sensor["measurements"] == [
        "Volumetric Water Content",
    ]
    assert returned_sensor["panel_ids"] == [
        "teros",
    ]
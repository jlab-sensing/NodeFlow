from unittest.mock import AsyncMock

import pytest

from app.schemas.groups import GroupTable
from app.schemas.preferences import ActivationPrefTable
from app.schemas.sensor import SensorTable
from app.schemas.user_schema import UserTable


@pytest.fixture
def activation_setup(db_session, test_user, monkeypatch):
    monkeypatch.setattr(
        "app.routers.sensor.get_shared_logger",
        AsyncMock(return_value={"id": 123, "type": "ents"}),
    )

    def create(owner=None):
        owner = owner or test_user
        group = GroupTable(
            name="Automatic irrigation",
            user_id=owner.id,
            irrigation_mode="auto",
        )
        db_session.add(group)
        db_session.flush()
        sensor = SensorTable(
            name="Threshold source",
            user_id=owner.id,
            sensor_type="soil_moisture",
            logger_id=123,
            group_id=group.uuid,
        )
        db_session.add(sensor)
        db_session.flush()
        preference = ActivationPrefTable(
            user_id=owner.id,
            group_id=group.uuid,
            sensor_id=sensor.id,
            measurement="Volumetric Water Content",
            condition_operator="<",
            condition_value=30,
            enabled=True,
        )
        db_session.add(preference)
        db_session.commit()
        return group, sensor, preference

    return create


def update_membership(client, sensor, group_id, endpoint):
    payload = {"group_id": str(group_id) if group_id else None}
    if endpoint == "sensor":
        payload.update(
            name="Renamed source",
            sensor_type=sensor.sensor_type,
            logger_id=sensor.logger_id,
        )
    suffix = "/group" if endpoint == "group" else ""
    return client.put(f"/api/sensor/{sensor.id}{suffix}", json=payload)


def assert_activation(db_session, group, preference, *, enabled):
    db_session.refresh(group)
    db_session.refresh(preference)
    assert preference.enabled is enabled
    assert group.irrigation_mode == ("auto" if enabled else "manual")


@pytest.mark.parametrize("endpoint", ["sensor", "group"])
@pytest.mark.parametrize("move", [False, True], ids=["unassign", "move"])
def test_moving_threshold_source_disables_old_group_activation(
    authenticated_client,
    db_session,
    activation_setup,
    endpoint,
    move,
):
    group, sensor, preference = activation_setup()
    destination, _, destination_pref = activation_setup()

    response = update_membership(
        authenticated_client,
        sensor,
        destination.uuid if move else None,
        endpoint,
    )

    assert response.status_code == 200
    assert response.json()["group_id"] == (str(destination.uuid) if move else None)
    assert_activation(db_session, group, preference, enabled=False)
    assert_activation(db_session, destination, destination_pref, enabled=True)


@pytest.mark.parametrize("operation", ["archive", "delete"])
def test_removing_threshold_source_disables_group_activation(
    authenticated_client,
    db_session,
    activation_setup,
    operation,
):
    group, sensor, preference = activation_setup()
    sensor_id = sensor.id

    if operation == "archive":
        response = authenticated_client.patch(
            f"/api/sensor/{sensor_id}/archive", json={"archived": True}
        )
        assert response.json()["group_id"] is None
        assert response.json()["archived"] is True
    else:
        response = authenticated_client.delete(f"/api/sensor/{sensor_id}")
        assert db_session.get(SensorTable, sensor_id) is None

    assert response.status_code == 200
    assert_activation(db_session, group, preference, enabled=False)


@pytest.mark.parametrize("endpoint", ["sensor", "group"])
def test_same_group_update_preserves_activation(
    authenticated_client, db_session, activation_setup, endpoint
):
    group, sensor, preference = activation_setup()

    response = update_membership(authenticated_client, sensor, group.uuid, endpoint)

    assert response.status_code == 200
    assert_activation(db_session, group, preference, enabled=True)


def test_unarchiving_does_not_disable_activation(
    authenticated_client, db_session, activation_setup
):
    group, sensor, preference = activation_setup()

    response = authenticated_client.patch(
        f"/api/sensor/{sensor.id}/archive", json={"archived": False}
    )

    assert response.status_code == 200
    assert_activation(db_session, group, preference, enabled=True)


def test_removing_another_sensor_preserves_threshold_source(
    authenticated_client, db_session, test_user, activation_setup
):
    group, _, preference = activation_setup()
    sensor = SensorTable(
        name="Additional sensor",
        user_id=test_user.id,
        sensor_type="temperature",
        logger_id=123,
        group_id=group.uuid,
    )
    db_session.add(sensor)
    db_session.commit()

    response = authenticated_client.delete(f"/api/sensor/{sensor.id}")

    assert response.status_code == 200
    assert_activation(db_session, group, preference, enabled=True)


@pytest.fixture
def other_user(db_session):
    user = UserTable(
        first_name="Other",
        last_name="User",
        email="other-sensor-owner@example.com",
        password="",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.mark.parametrize("operation", ["sensor", "group", "archive", "delete"])
def test_mutating_another_users_sensor_preserves_activation(
    authenticated_client, db_session, activation_setup, other_user, operation
):
    group, sensor, preference = activation_setup(other_user)

    if operation in ("sensor", "group"):
        response = update_membership(authenticated_client, sensor, None, operation)
    elif operation == "archive":
        response = authenticated_client.patch(
            f"/api/sensor/{sensor.id}/archive", json={"archived": True}
        )
    else:
        response = authenticated_client.delete(f"/api/sensor/{sensor.id}")

    assert response.status_code == 404
    db_session.refresh(sensor)
    assert sensor.group_id == group.uuid
    assert sensor.archived is False
    assert_activation(db_session, group, preference, enabled=True)


@pytest.mark.parametrize("endpoint", ["sensor", "group"])
def test_invalid_destination_does_not_disable_source_activation(
    authenticated_client, db_session, activation_setup, other_user, endpoint
):
    group, sensor, preference = activation_setup()
    other_group, _, other_preference = activation_setup(other_user)

    response = update_membership(
        authenticated_client, sensor, other_group.uuid, endpoint
    )

    assert response.status_code == 404
    assert_activation(db_session, group, preference, enabled=True)
    assert_activation(db_session, other_group, other_preference, enabled=True)


def test_invalidation_does_not_change_another_users_preferences(
    authenticated_client, db_session, activation_setup, other_user
):
    group, sensor, preference = activation_setup()
    other_group, _, other_preference = activation_setup(other_user)
    # Legacy inconsistent references must not grant cross-user writes.
    other_preference.sensor_id = sensor.id
    db_session.add(other_preference)
    db_session.commit()

    response = authenticated_client.delete(f"/api/sensor/{sensor.id}")

    assert response.status_code == 200
    assert_activation(db_session, group, preference, enabled=False)
    assert_activation(db_session, other_group, other_preference, enabled=True)

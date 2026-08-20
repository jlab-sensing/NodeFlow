"""Tests for NodeFlow activation-preference validation."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.actions import ActivationPref
from app.schemas.groups import GroupTable
from app.schemas.preferences import ActivationPrefTable
from app.schemas.sensor import SensorTable


def activation_pref(**overrides):
    payload = {
        "sensor_id": 1,
        "measurement": "Volumetric Water Content",
        "condition_operator": "<",
        "condition_value": 25.0,
        "enabled": True,
    }
    payload.update(overrides)
    return ActivationPref(**payload)


def create_group_and_sensor(db_session, user_id):
    group = GroupTable(
        name="Greenhouse",
        user_id=user_id,
    )
    db_session.add(group)
    db_session.flush()

    sensor = SensorTable(
        user_id=user_id,
        group_id=group.uuid,
        name="Greenhouse Soil Sensor",
        sensor_type="soil_moisture",
        logger_id=1,
    )
    db_session.add(sensor)
    db_session.commit()
    db_session.refresh(group)
    db_session.refresh(sensor)
    return group, sensor


def test_activation_pref_accepts_activation_condition_without_close_condition():
    preference = activation_pref()

    assert preference.condition_operator == "<"
    assert preference.condition_value == 25.0
    assert preference.close_condition_operator is None
    assert preference.close_condition_value is None


def test_activation_pref_accepts_valid_hysteresis():
    preference = activation_pref(
        close_condition_operator=">",
        close_condition_value=30.0,
    )

    assert preference.close_condition_operator == ">"
    assert preference.close_condition_value == 30.0


@pytest.mark.parametrize(
    ("close_operator", "close_value"),
    [
        (">", None),
        (None, 30.0),
    ],
)
def test_activation_pref_requires_complete_close_condition(
    close_operator,
    close_value,
):
    with pytest.raises(
        ValidationError,
        match="Close operator and threshold must both be provided",
    ):
        activation_pref(
            close_condition_operator=close_operator,
            close_condition_value=close_value,
        )


def test_activation_pref_requires_opposite_close_operator():
    with pytest.raises(
        ValidationError,
        match="close operator must be opposite",
    ):
        activation_pref(
            close_condition_operator="<",
            close_condition_value=30.0,
        )


@pytest.mark.parametrize(
    ("condition_operator", "condition_value", "close_operator", "close_value"),
    [
        ("<", 25.0, ">", 20.0),
        (">", 30.0, "<", 35.0),
    ],
)
def test_activation_pref_requires_hysteresis_between_thresholds(
    condition_operator,
    condition_value,
    close_operator,
    close_value,
):
    with pytest.raises(ValidationError, match="Close threshold must be"):
        activation_pref(
            condition_operator=condition_operator,
            condition_value=condition_value,
            close_condition_operator=close_operator,
            close_condition_value=close_value,
        )


def test_create_activation_pref_persists_nodeflow_threshold(
    authenticated_client,
    db_session,
    test_user,
):
    group, sensor = create_group_and_sensor(
        db_session,
        test_user.id,
    )

    response = authenticated_client.post(
        f"/api/groups/{group.uuid}/activationPref/",
        json={
            "sensor_id": sensor.id,
            "measurement": "Volumetric Water Content",
            "condition_operator": "<",
            "condition_value": 25.0,
            "close_condition_operator": ">",
            "close_condition_value": 30.0,
            "enabled": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["group_id"] == str(group.uuid)
    assert payload["sensor_id"] == sensor.id
    assert payload["measurement"] == "Volumetric Water Content"
    assert payload["condition_operator"] == "<"
    assert payload["condition_value"] == 25.0
    assert payload["close_condition_operator"] == ">"
    assert payload["close_condition_value"] == 30.0

    stored = db_session.get(ActivationPrefTable, payload["id"])
    assert stored is not None
    assert stored.user_id == test_user.id
    assert stored.group_id == group.uuid


def test_create_activation_pref_rejects_invalid_close_condition(
    authenticated_client,
):
    response = authenticated_client.post(
        f"/api/groups/{uuid4()}/activationPref/",
        json={
            "sensor_id": 1,
            "measurement": "Volumetric Water Content",
            "condition_operator": "<",
            "condition_value": 25.0,
            "close_condition_operator": "<",
            "close_condition_value": 30.0,
            "enabled": True,
        },
    )

    assert response.status_code == 422
    assert "close operator must be opposite" in response.text


def test_create_activation_pref_rejects_sensor_outside_group(
    authenticated_client,
    db_session,
    test_user,
):
    group, _ = create_group_and_sensor(
        db_session,
        test_user.id,
    )
    outside_sensor = SensorTable(
        user_id=test_user.id,
        name="Outside Temperature Sensor",
        sensor_type="temperature",
        logger_id=2,
    )
    db_session.add(outside_sensor)
    db_session.commit()
    db_session.refresh(outside_sensor)

    response = authenticated_client.post(
        f"/api/groups/{group.uuid}/activationPref/",
        json={
            "sensor_id": outside_sensor.id,
            "measurement": "Temperature",
            "condition_operator": ">",
            "condition_value": 30.0,
            "enabled": True,
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Selected sensor does not belong to this group",
    }

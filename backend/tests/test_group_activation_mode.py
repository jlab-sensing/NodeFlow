from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest
from sqlmodel import select

from app.schemas.groups import GroupTable
from app.schemas.preferences import ActivationPrefTable
from app.schemas.sensor import SensorTable
from app.schemas.solenoid import SolenoidTable
from app.schemas.user_schema import UserTable


def save(db_session, record):
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


def create_group_and_sensor(db_session, owner_id, mode="manual"):
    group = save(
        db_session,
        GroupTable(name="Threshold group", user_id=owner_id, irrigation_mode=mode),
    )
    sensor = save(
        db_session,
        SensorTable(
            name="Threshold sensor",
            user_id=owner_id,
            group_id=group.uuid,
            sensor_type="teros12",
            sensor_id=-1,
            logger_id=-2,
        ),
    )
    return group, sensor


def preference_body(sensor):
    return {
        "sensor_id": sensor.id,
        "measurement": "soil_moisture",
        "condition_operator": "<",
        "condition_value": 30,
        "enabled": True,
    }


def save_preference(db_session, group, sensor, **overrides):
    fields = {
        **preference_body(sensor),
        "group_id": group.uuid,
        "user_id": group.user_id,
        **overrides,
    }
    return save(db_session, ActivationPrefTable(**fields))


def test_new_group_without_threshold_is_manual_and_accepts_real_solenoid(
    authenticated_client, db_session, test_user
):
    created = authenticated_client.post("/api/groups/", json={"name": "New group"})

    assert created.status_code == 201
    assert created.json()["irrigation_mode"] == "manual"
    group = db_session.get(GroupTable, created.json()["id"])
    assert group.irrigation_mode == "manual"
    assert (
        db_session.exec(
            select(ActivationPrefTable).where(
                ActivationPrefTable.group_id == group.uuid
            )
        ).first()
        is None
    )
    solenoid = save(
        db_session,
        SolenoidTable(
            name="Real valve",
            user_id=test_user.id,
            logger_id=1951,
            active_state="closed",
        ),
    )

    assigned = authenticated_client.put(
        f"/api/solenoid/{solenoid.id}/group",
        json={"group_id": str(group.uuid)},
    )

    assert assigned.status_code == 200
    assert assigned.json()["group_id"] == str(group.uuid)


@pytest.mark.parametrize(
    "invalid_preference",
    [
        "missing",
        "disabled",
        "other_owner",
        "other_group",
        "blank_measurement",
        "invalid_operator",
        "infinite_threshold",
        "nan_threshold",
        "incomplete_close_condition",
        "overlapping_close_condition",
    ],
)
def test_auto_requires_valid_enabled_owned_threshold(
    authenticated_client, db_session, test_user, invalid_preference
):
    group, sensor = create_group_and_sensor(db_session, test_user.id)
    if invalid_preference != "missing":
        changes = {
            "disabled": {"enabled": False},
            "other_group": {"group_id": uuid4()},
            "blank_measurement": {"measurement": "   "},
            "invalid_operator": {"condition_operator": "="},
            "infinite_threshold": {"condition_value": float("inf")},
            "nan_threshold": {"condition_value": float("nan")},
            "incomplete_close_condition": {"close_condition_operator": ">"},
            "overlapping_close_condition": {
                "close_condition_operator": ">",
                "close_condition_value": 20,
            },
        }.get(invalid_preference, {})
        if invalid_preference == "other_owner":
            other = save(db_session, UserTable(email="other-pref-owner@example.com"))
            changes["user_id"] = other.id
        save_preference(db_session, group, sensor, **changes)

    response = authenticated_client.patch(
        f"/api/groups/{group.uuid}/mode", json={"mode": "auto"}
    )

    assert response.status_code == 409
    db_session.refresh(group)
    assert group.irrigation_mode == "manual"


@pytest.mark.parametrize(
    "invalid_source", ["missing", "moved", "other_owner", "archived"]
)
def test_auto_requires_current_owned_unarchived_sensor(
    authenticated_client, db_session, test_user, invalid_source
):
    group, sensor = create_group_and_sensor(db_session, test_user.id)
    save_preference(db_session, group, sensor)
    if invalid_source == "missing":
        db_session.delete(sensor)
    elif invalid_source == "moved":
        sensor.group_id = uuid4()
        db_session.add(sensor)
    elif invalid_source == "other_owner":
        other = save(db_session, UserTable(email="other-sensor-owner@example.com"))
        sensor.user_id = other.id
        db_session.add(sensor)
    else:
        sensor.archived = True
        db_session.add(sensor)
    db_session.commit()

    response = authenticated_client.patch(
        f"/api/groups/{group.uuid}/mode", json={"mode": "auto"}
    )

    assert response.status_code == 409
    db_session.refresh(group)
    assert group.irrigation_mode == "manual"


def test_saving_threshold_keeps_manual_until_explicit_auto_selection(
    authenticated_client, db_session, test_user
):
    group, sensor = create_group_and_sensor(db_session, test_user.id)

    saved = authenticated_client.post(
        f"/api/groups/{group.uuid}/activationPref/", json=preference_body(sensor)
    )

    assert saved.status_code == 200
    db_session.refresh(group)
    assert group.irrigation_mode == "manual"
    enabled = authenticated_client.patch(
        f"/api/groups/{group.uuid}/mode", json={"mode": "auto"}
    )
    assert enabled.status_code == 200
    assert enabled.json() == {"mode": "auto"}


def test_disabling_threshold_reverts_auto_group_to_manual(
    authenticated_client, db_session, test_user
):
    group, sensor = create_group_and_sensor(db_session, test_user.id, mode="auto")
    preference = save_preference(db_session, group, sensor)

    response = authenticated_client.post(
        f"/api/groups/{group.uuid}/activationPref/",
        json={**preference_body(sensor), "enabled": False},
    )

    assert response.status_code == 200
    db_session.refresh(preference)
    db_session.refresh(group)
    assert preference.enabled is False
    assert group.irrigation_mode == "manual"


@pytest.mark.parametrize("has_preference", [False, True])
def test_removing_threshold_reverts_auto_group_to_manual(
    authenticated_client, db_session, test_user, has_preference
):
    group, sensor = create_group_and_sensor(db_session, test_user.id, mode="auto")
    if has_preference:
        save_preference(db_session, group, sensor)

    response = authenticated_client.delete(f"/api/groups/{group.uuid}/activationPref/")

    assert response.status_code == 200
    db_session.refresh(group)
    assert group.irrigation_mode == "manual"
    assert (
        db_session.exec(
            select(ActivationPrefTable).where(
                ActivationPrefTable.group_id == group.uuid
            )
        ).first()
        is None
    )


def test_cannot_remove_another_users_threshold_or_change_their_mode(
    authenticated_client, db_session
):
    other = save(db_session, UserTable(email="other-group-owner@example.com"))
    group, sensor = create_group_and_sensor(db_session, other.id, mode="auto")
    preference = save_preference(db_session, group, sensor)

    response = authenticated_client.delete(f"/api/groups/{group.uuid}/activationPref/")

    assert response.status_code == 404
    db_session.refresh(group)
    db_session.refresh(preference)
    assert group.irrigation_mode == "auto"
    assert preference.enabled is True


def test_failed_group_deletion_keeps_surviving_group_manual_with_disabled_threshold(
    authenticated_client, db_session, test_user, monkeypatch
):
    group, sensor = create_group_and_sensor(db_session, test_user.id, mode="auto")
    preference = save_preference(db_session, group, sensor)
    solenoid = save(
        db_session,
        SolenoidTable(
            name="Unavailable mock valve",
            user_id=test_user.id,
            logger_id=-1,
            group_id=group.uuid,
            active_state="open",
        ),
    )
    close_mock = AsyncMock(side_effect=httpx.ConnectError("Simulator unavailable"))
    monkeypatch.setattr("app.routers.groups.close_solenoid", close_mock)

    response = authenticated_client.delete(f"/api/groups/{group.uuid}")

    assert response.status_code == 503
    close_mock.assert_awaited_once()
    db_session.refresh(group)
    db_session.refresh(preference)
    db_session.refresh(solenoid)
    assert group.irrigation_mode == "manual"
    assert preference.enabled is False
    assert solenoid.group_id == group.uuid
    assert solenoid.active_state == "open"


@pytest.mark.parametrize(
    "invalid_fields",
    [
        {"measurement": "   "},
        {"condition_value": "Infinity"},
        {"condition_value": "NaN"},
        {"close_condition_operator": ">", "close_condition_value": "Infinity"},
    ],
)
def test_threshold_api_rejects_blank_measurement_and_nonfinite_values(
    authenticated_client, db_session, test_user, invalid_fields
):
    group, sensor = create_group_and_sensor(db_session, test_user.id)

    response = authenticated_client.post(
        f"/api/groups/{group.uuid}/activationPref/",
        json={**preference_body(sensor), **invalid_fields},
    )

    assert response.status_code == 422
    assert db_session.exec(select(ActivationPrefTable)).first() is None

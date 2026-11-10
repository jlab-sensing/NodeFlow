from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from app.schemas.groups import GroupTable
from app.schemas.preferences import ActivationPrefTable
from app.schemas.sensor import SensorTable
from app.schemas.solenoid import SolenoidTable
from app.schemas.solenoid_command import SolenoidCommandTable
from app.schemas.user_schema import UserTable


def save(db_session, record):
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


@pytest.mark.parametrize("initial_mode", ["manual", "auto"])
def test_group_devices_returns_owned_devices_and_latest_command_without_changing_mode(
    authenticated_client, db_session, test_user, initial_mode
):
    group = save(
        db_session,
        GroupTable(
            name="Irrigation group",
            user_id=test_user.id,
            irrigation_mode=initial_mode,
        ),
    )
    other_user = save(db_session, UserTable(email="other-device-owner@example.com"))
    sensor = save(
        db_session,
        SensorTable(
            name="Soil sensor",
            user_id=test_user.id,
            sensor_type="teros12",
            logger_id=1951,
            group_id=group.uuid,
        ),
    )
    solenoid = save(
        db_session,
        SolenoidTable(
            name="Real valve",
            user_id=test_user.id,
            active_state="closed",
            logger_id=1951,
            group_id=group.uuid,
            physical_pin=18,
        ),
    )
    for owner_id, group_id in (
        (other_user.id, group.uuid),
        (test_user.id, uuid4()),
    ):
        save(
            db_session,
            SensorTable(
                name="Excluded sensor",
                user_id=owner_id,
                sensor_type="teros12",
                logger_id=1952,
                group_id=group_id,
            ),
        )
        save(
            db_session,
            SolenoidTable(
                name="Excluded valve",
                user_id=owner_id,
                active_state="closed",
                logger_id=1952,
                group_id=group_id,
            ),
        )

    queued_at = datetime(2026, 11, 3, 12, tzinfo=timezone.utc)
    save(
        db_session,
        SolenoidCommandTable(
            user_id=test_user.id,
            solenoid_id=solenoid.id,
            logger_id=1951,
            requested_state="closed",
            status="queued",
            created_at=queued_at - timedelta(minutes=1),
        ),
    )
    latest = save(
        db_session,
        SolenoidCommandTable(
            user_id=test_user.id,
            solenoid_id=solenoid.id,
            logger_id=1951,
            requested_state="open",
            status="queued",
            created_at=queued_at,
            queued_at=queued_at,
        ),
    )
    save(
        db_session,
        SolenoidCommandTable(
            user_id=other_user.id,
            logger_id=1951,
            requested_state="closed",
            status="failed",
            error="Private command error",
            created_at=queued_at + timedelta(minutes=1),
        ),
    )

    response = authenticated_client.get(f"/api/groups/{group.uuid}/devices")

    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"sensors", "solenoids"}
    assert [item["id"] for item in payload["sensors"]] == [sensor.id]
    assert payload["sensors"][0]["name"] == "Soil sensor"
    assert [item["id"] for item in payload["solenoids"]] == [solenoid.id]
    returned_solenoid = payload["solenoids"][0]
    assert returned_solenoid["physical_pin"] == 18
    assert returned_solenoid["active_state"] == "closed"
    command = returned_solenoid["last_command"]
    assert command["id"] == latest.id
    assert command["logger_id"] == 1951
    assert command["requested_state"] == "open"
    assert command["status"] == "queued"
    assert command["error"] is None
    assert datetime.fromisoformat(command["queued_at"]) == queued_at
    db_session.refresh(group)
    assert group.irrigation_mode == initial_mode


def test_empty_group_devices_returns_empty_lists(
    authenticated_client, db_session, test_user
):
    group = save(db_session, GroupTable(name="Empty group", user_id=test_user.id))

    response = authenticated_client.get(f"/api/groups/{group.uuid}/devices")

    assert response.status_code == 200
    assert response.json() == {"sensors": [], "solenoids": []}


@pytest.mark.parametrize("group_exists", [False, True])
@pytest.mark.parametrize("endpoint", ["devices", "mode"])
def test_group_device_and_mode_routes_reject_missing_or_other_users_group(
    authenticated_client, db_session, group_exists, endpoint
):
    group_id = uuid4()
    if group_exists:
        other_user = save(db_session, UserTable(email="other-group-owner@example.com"))
        save(
            db_session,
            GroupTable(
                uuid=group_id,
                name="Other user's group",
                user_id=other_user.id,
                irrigation_mode="manual",
            ),
        )

    path = f"/api/groups/{group_id}/{endpoint}"
    response = (
        authenticated_client.get(path)
        if endpoint == "devices"
        else authenticated_client.patch(path, json={"mode": "auto"})
    )

    assert response.status_code == 404


@pytest.mark.parametrize(
    "logger_id, initial_mode, requested_mode, expected_status",
    [
        (1951, "manual", "auto", 409),
        (1951, "auto", "manual", 200),
        (-1, "manual", "auto", 200),
    ],
)
def test_group_mode_restricts_automatic_control_to_mock_solenoids(
    authenticated_client,
    db_session,
    test_user,
    logger_id,
    initial_mode,
    requested_mode,
    expected_status,
):
    group = save(
        db_session,
        GroupTable(
            name="Mode test group",
            user_id=test_user.id,
            irrigation_mode=initial_mode,
        ),
    )
    save(
        db_session,
        SolenoidTable(
            name="Mode test valve",
            user_id=test_user.id,
            active_state="closed",
            logger_id=logger_id,
            group_id=group.uuid,
        ),
    )

    if requested_mode == "auto":
        sensor = save(
            db_session,
            SensorTable(
                name="Threshold sensor",
                user_id=test_user.id,
                sensor_type="teros12",
                sensor_id=-1,
                logger_id=-2,
                group_id=group.uuid,
            ),
        )
        save(
            db_session,
            ActivationPrefTable(
                user_id=test_user.id,
                group_id=group.uuid,
                sensor_id=sensor.id,
                measurement="soil_moisture",
                condition_operator="<",
                condition_value=30,
            ),
        )

    response = authenticated_client.patch(
        f"/api/groups/{group.uuid}/mode", json={"mode": requested_mode}
    )

    assert response.status_code == expected_status
    db_session.refresh(group)
    if expected_status == 200:
        assert response.json() == {"mode": requested_mode}
        assert group.irrigation_mode == requested_mode
    else:
        assert group.irrigation_mode == initial_mode

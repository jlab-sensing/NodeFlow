import importlib.util
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text

from app.schemas.groups import GroupTable
from app.schemas.preferences import ActivationPrefTable
from app.schemas.sensor import SensorTable
from app.schemas.user_schema import UserTable


def test_manual_default_migration_repairs_invalid_auto_and_preserves_valid_rules(
    db_session, test_user
):
    other_user = UserTable(email="other-migration-owner@example.com")
    db_session.add(other_user)
    db_session.flush()
    cases = {
        "valid": ({}, {}),
        "valid_close": (
            {"close_condition_operator": ">", "close_condition_value": 50},
            {},
        ),
        "valid_inverse_close": (
            {
                "condition_operator": ">",
                "condition_value": 50,
                "close_condition_operator": "<",
                "close_condition_value": 30,
            },
            {},
        ),
        "missing_preference": (None, {}),
        "disabled": ({"enabled": False}, {}),
        "other_preference_owner": ({"user_id": other_user.id}, {}),
        "other_sensor_owner": ({}, {"user_id": other_user.id}),
        "archived_sensor": ({}, {"archived": True}),
        "moved_sensor": ({}, {"group_id": uuid4()}),
        "missing_sensor": ({"sensor_id": 999999}, {}),
        "blank_measurement": ({"measurement": "   "}, {}),
        "whitespace_measurement": ({"measurement": "\t\n"}, {}),
        "invalid_operator": ({"condition_operator": "="}, {}),
        "infinite_threshold": ({"condition_value": float("inf")}, {}),
        "nan_threshold": ({"condition_value": float("nan")}, {}),
        "incomplete_close": ({"close_condition_operator": ">"}, {}),
        "overlapping_close": (
            {"close_condition_operator": ">", "close_condition_value": 20},
            {},
        ),
        "infinite_close": (
            {"close_condition_operator": ">", "close_condition_value": float("inf")},
            {},
        ),
        "manual_valid": ({}, {}),
        "deployment": (None, {}),
    }
    for name, (preference_overrides, sensor_overrides) in cases.items():
        group = GroupTable(
            name=name,
            user_id=test_user.id,
            irrigation_mode="manual" if name == "manual_valid" else "auto",
            kind="deployment" if name == "deployment" else "irrigation",
        )
        db_session.add(group)
        sensor = SensorTable(
            **{
                "name": f"{name} sensor",
                "user_id": test_user.id,
                "group_id": group.uuid,
                "sensor_type": "teros12",
                "sensor_id": -1,
                "logger_id": -2,
                **sensor_overrides,
            }
        )
        db_session.add(sensor)
        db_session.flush()
        if preference_overrides is not None:
            db_session.add(
                ActivationPrefTable(
                    **{
                        "group_id": group.uuid,
                        "user_id": test_user.id,
                        "sensor_id": sensor.id,
                        "measurement": "soil_moisture",
                        "condition_operator": "<",
                        "condition_value": 30,
                        **preference_overrides,
                    }
                )
            )
    db_session.flush()
    db_session.execute(
        text("ALTER TABLE groups ALTER COLUMN irrigation_mode SET DEFAULT 'auto'")
    )
    migration_path = (
        Path(__file__).parents[1]
        / "alembic/versions/9d1b7e6c4a20_default_groups_to_manual.py"
    )
    spec = importlib.util.spec_from_file_location(
        "manual_group_migration", migration_path
    )
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    context = MigrationContext.configure(db_session.connection())

    with Operations.context(context):
        migration.upgrade()

    modes = dict(
        db_session.execute(text("SELECT name, irrigation_mode FROM groups")).all()
    )
    preserved_auto = {"valid", "valid_close", "valid_inverse_close", "deployment"}
    assert modes == {
        name: "auto" if name in preserved_auto else "manual" for name in cases
    }
    insert_without_mode = text(
        "INSERT INTO groups (uuid, name, user_id, date_created) "
        "VALUES (:uuid, :name, :user_id, :date_created) RETURNING irrigation_mode"
    )
    defaults = {
        "uuid": uuid4(),
        "name": "Database default after upgrade",
        "user_id": test_user.id,
        "date_created": datetime.now(timezone.utc),
    }
    assert db_session.execute(insert_without_mode, defaults).scalar_one() == "manual"

    with Operations.context(context):
        migration.downgrade()

    assert dict(
        db_session.execute(text("SELECT name, irrigation_mode FROM groups")).all()
    ) == {**modes, defaults["name"]: "manual"}
    defaults.update(uuid=uuid4(), name="Database default after downgrade")
    assert db_session.execute(insert_without_mode, defaults).scalar_one() == "auto"

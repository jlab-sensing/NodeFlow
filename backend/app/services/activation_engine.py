from sqlmodel import Session, select
import logging
import asyncio
from app.schemas.groups import GroupTable
from app.database import engine
from app.schemas.sensor import SensorTable
from app.schemas.solenoid import SolenoidTable
from app.schemas.preferences import ActivationPrefTable
from app.services.sensor_readings import get_sensor_reading
from app.services.solenoid_control import (
    close_solenoid,
    open_solenoid,
)

logger = logging.getLogger(__name__)

def condition_is_met(
    reading: float,
    operator: str,
    threshold: float,
) -> bool:
    if operator == "<":
        return reading < threshold
    
    if operator == ">":
        return reading > threshold
    
    raise ValueError(f"Unsupported operator: {operator}")

async def evaluate_preference(pref, session: Session):
    group_statement = select(GroupTable).where(
        GroupTable.uuid == pref.group_id,
        GroupTable.user_id == pref.user_id,
    )
    group = session.exec(group_statement).first()
    if not group or group.irrigation_mode != "auto":
        return

    sensor = session.get(SensorTable, pref.sensor_id)
    if not sensor or sensor.group_id != pref.group_id:
        return
    
    reading = await get_sensor_reading(sensor)

    if reading["measurement"] != pref.measurement:
        return
    
    should_open = condition_is_met(
        reading=float(reading["value"]),
        operator=pref.condition_operator,
        threshold=pref.condition_value,
    )

    has_close_condition = (
        pref.close_condition_operator is not None
        and pref.close_condition_value is not None
    )

    if has_close_condition:
        should_close = condition_is_met(
            reading=float(reading["value"]),
            operator=pref.close_condition_operator,
            threshold=pref.close_condition_value,
        )
    else:
        should_close = not should_open

    statement = select(SolenoidTable).where(
        SolenoidTable.group_id == pref.group_id,
        SolenoidTable.user_id == pref.user_id,
    )
    solenoids = session.exec(statement).all()

    for solenoid in solenoids:
        if should_open and solenoid.active_state != "open":
            await open_solenoid(solenoid, session)
        elif should_close and solenoid.active_state != "closed":
            await close_solenoid(solenoid, session)

async def evaluate_all_preferences(session: Session):
    statement = select(ActivationPrefTable).where(
        ActivationPrefTable.enabled.is_(True)
    )
    preferences = session.exec(statement).all()
    for preference in preferences:
        try:
            await evaluate_preference(preference, session)
        except Exception:
            logger.exception(
                "Failed to evaluate activation preference %s",
                preference.id,
            )

async def run_activation_loop():
    while True:
        try:
            with Session(engine) as session:
                await evaluate_all_preferences(session)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Activation control loop failed")

        await asyncio.sleep(2)

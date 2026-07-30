from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from app.database import get_session
from app.schemas.sensor import SensorTable
from app.models.sensor import SensorRead, SensorCreate
from app.models.groups import DeviceGroupUpdate
from app.models.test_sensor import (
    TestSensorModeUpdate,
    TestSensorReading,
    TestSensorReadingUpdate,
    TestSensorSimulation,
    TestSensorSimulationUpdate,
)
from app.auth.auth import get_current_user
from app.schemas.user_schema import UserTable
from app.services.sensor_readings import (
    TEST_SENSOR_ID,
    TEST_SENSOR_LOGGER_ID,
    request_test_sensor,
)

router = APIRouter(prefix="/api/sensor", tags=["Sensors"])

def get_owned_test_sensor(
    sensor_id: int,
    session: Session,
    current_user: UserTable,
):
    statement = select(SensorTable).where(
        SensorTable.id == sensor_id,
        SensorTable.user_id == current_user.id,
        SensorTable.sensor_id == TEST_SENSOR_ID,
        SensorTable.logger_id == TEST_SENSOR_LOGGER_ID,
    )
    sensor = session.exec(statement).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Test sensor not found")
    return sensor


@router.post("/test/register", response_model=SensorRead)
async def register_test_sensor(
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    existing_statement = select(SensorTable).where(
        SensorTable.user_id == current_user.id,
        SensorTable.sensor_id == TEST_SENSOR_ID,
        SensorTable.logger_id == TEST_SENSOR_LOGGER_ID,
    )
    existing = session.exec(existing_statement).first()
    if existing:
        return existing

    tester_reading = await request_test_sensor("GET", "/reading")
    sensor = SensorTable(
        user_id=current_user.id,
        sensor_type=tester_reading["sensor_type"],
        sensor_id=TEST_SENSOR_ID,
        logger_id=TEST_SENSOR_LOGGER_ID,
        group_id=None,
    )
    session.add(sensor)
    session.commit()
    session.refresh(sensor)
    return sensor

@router.get("/test/reading", response_model=TestSensorReading)
async def get_current_test_sensor_reading(
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    statement = select(SensorTable).where(
        SensorTable.user_id == current_user.id,
        SensorTable.sensor_id == TEST_SENSOR_ID,
        SensorTable.logger_id == TEST_SENSOR_LOGGER_ID,
    )

    sensor = session.exec(statement).first()

    if not sensor:
        raise HTTPException(
            status_code=404,
            detail="Test sensor is not registered",
        )
    return await request_test_sensor("GET", "/reading")


@router.get("/{sensor_id}/reading", response_model=TestSensorReading)
async def get_test_sensor_reading(
    sensor_id: int,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    get_owned_test_sensor(sensor_id, session, current_user)
    return await request_test_sensor("GET", "/reading")


@router.put("/{sensor_id}/reading", response_model=TestSensorReading)
async def update_test_sensor_reading(
    sensor_id: int,
    update: TestSensorReadingUpdate,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    get_owned_test_sensor(sensor_id, session, current_user)
    return await request_test_sensor("PUT", "/reading", update.model_dump())


@router.put("/{sensor_id}/mode", response_model=TestSensorReading)
async def update_test_sensor_mode(
    sensor_id: int,
    update: TestSensorModeUpdate,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    get_owned_test_sensor(sensor_id, session, current_user)
    return await request_test_sensor("PUT", "/mode", update.model_dump())


@router.get("/{sensor_id}/simulation", response_model=TestSensorSimulation)
async def get_test_sensor_simulation(
    sensor_id: int,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    get_owned_test_sensor(sensor_id, session, current_user)
    return await request_test_sensor("GET", "/simulation")


@router.put("/{sensor_id}/simulation", response_model=TestSensorSimulation)
async def update_test_sensor_simulation(
    sensor_id: int,
    update: TestSensorSimulationUpdate,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    get_owned_test_sensor(sensor_id, session, current_user)
    return await request_test_sensor(
        "PUT",
        "/simulation",
        update.model_dump(),
    )

@router.get("/", response_model=List[SensorRead])
def list_sensors(available: bool = Query(None), session: Session = Depends(get_session)):
    return session.exec(select(SensorTable)).all()

@router.post("/", status_code=status.HTTP_201_CREATED)
def add_new_sensor(sensor: SensorCreate, session: Session = Depends(get_session)):
    db_sensor = SensorTable.model_validate(sensor)
    session.add(db_sensor)
    session.commit()
    session.refresh(db_sensor)
    return {"message": "Sensor registered successfully"}

@router.put("/{sensor_id}")
async def update_sensor(sensor_id: int, sensor_update: SensorCreate, session: Session = Depends(get_session)):
    statement = select(SensorTable).where(SensorTable.sensor_id == sensor_id)
    db_sensor = session.exec(statement).first()
    if not db_sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    sensor_data = sensor_update.model_dump(exclude_unset=True)
    for key, value in sensor_data.items():
        setattr(db_sensor, key, value)
        
    session.add(db_sensor)
    session.commit()
    session.refresh(db_sensor)
    return {"message": "Sensor updated successfully"}

@router.put("/{sensor_id}/group")
def update_sensor_group( sensor_id: int, update: DeviceGroupUpdate, session: Session = Depends(get_session)):
    sensor = session.get(SensorTable, sensor_id)
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    sensor.group_id = update.group_id
    session.add(sensor)
    session.commit()
    session.refresh(sensor)
    return sensor

@router.get("/data/")
async def get_sensor_plot_data(sensor_id: int, start: Optional[datetime] = Query(None), end: Optional[datetime] = Query(None)):
    """Graphing sensor data (Placeholder for DirtViz dynamic integration)."""
    return {"sensor_id": sensor_id, "timestamps": [], "values": []}

@router.delete("/{sensor_id}")
async def delete_sensor(sensor_id: int, session: Session = Depends(get_session)):
    statement = select(SensorTable).where(SensorTable.sensor_id == sensor_id)
    sensor = session.exec(statement).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    session.delete(sensor)
    session.commit()
    return {"ok": True}

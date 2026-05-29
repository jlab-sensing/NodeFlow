from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from app.database import get_session
from app.schemas.sensor import SensorTable
from app.models.sensor import SensorRead, SensorCreate

router = APIRouter(prefix="/api/sensor", tags=["Sensors"])

@router.get("/", response_model=List[SensorRead])
def list_sensors(available: bool = Query(None), session: Session = Depends(get_session)):
    """Gets list of all sensors or available sensors"""
    return session.exec(select(SensorTable)).all()

@router.post("/", status_code=status.HTTP_201_CREATED)
def add_new_sensor(sensor: SensorCreate, session: Session = Depends(get_session)):
    """Adding new sensor"""
    db_sensor = SensorTable.model_validate(sensor)
    session.add(db_sensor)
    session.commit()
    session.refresh(db_sensor)
    return {"message": "Sensor registered successfully"}

@router.put("/{sensor_id}")
async def update_sensor(sensor_id: int, sensor_update: SensorCreate, session: Session = Depends(get_session)):
    """Updating sensor"""
    db_sensor = session.get(SensorTable, sensor_id)
    if not db_sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    sensor_data = sensor_update.model_dump(exclude_unset=True)
    for key, value in sensor_data.items():
        setattr(db_sensor, key, value)
        
    session.add(db_sensor)
    session.commit()
    session.refresh(db_sensor)
    return {"message": "Sensor updated successfully"}

@router.get("/data/")
async def get_sensor_plot_data(sensor_id: int, start: Optional[datetime] = Query(None), end: Optional[datetime] = Query(None)):
    """Graphing sensor data"""
    return {"sensor_id": sensor_id, "timestamps": [], "values": []}

@router.delete("/{sensor_id}")
async def delete_sensor(sensor_id: int, session: Session = Depends(get_session)):
    """Deleting sensor"""
    db_sensor = session.get(SensorTable, sensor_id)
    if not db_sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    session.delete(db_sensor)
    session.commit()
    return {"message": "Sensor deleted successfully"}
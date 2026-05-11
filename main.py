from fastapi import FastAPI, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID
import schemas

app = FastAPI(title="NodeFlow API")

@app.get("/")
async def root():
    return {"message": "It's Working!!!"}

#User and Dashboard
@app.get("/api/user", response_model=dict)
async def get_user_info():
    """Getting user details"""
    return {}

@app.get("/api/data-availability/")
async def check_data_availability():
    """Getting status of hardware"""
    return {}

#Groups 
@app.get("/api/groups/", response_model=List[schemas.Group])
async def get_user_group_list():
    """Getting list of groups for dashboard"""
    return []

@app.get("/api/groups/{group_id}", response_model=schemas.Group)
async def get_specific_group_info(group_id: UUID):
    """Gets specific group information"""
    return {}

@app.post("/api/groups/", status_code=status.HTTP_201_CREATED)
async def create_new_group(group: schemas.GroupBase):
    """Adding new group"""
    return {"message": "Group created successfully"}

@app.put("/api/groups/{group_id}")
async def update_group(group_id: UUID, group: schemas.GroupBase):
    """Updating group if something changes"""
    return {"message": "Group updated successfully"}

@app.delete("/api/groups/{group_id}")
async def delete_group(group_id: UUID):
    """Deleting group"""
    return {"message": "Group deleted successfully"}

#Hardware (solenoids, sensors and loggers)
@app.get("/api/logger/", response_model=List[schemas.Logger])
async def list_loggers():
    """Gets list of all loggers"""
    return []

@app.get("/api/logger/{logger_id}", response_model=schemas.Logger)
async def get_specific_logger(logger_id: int):
    """Gets information about a specific logger"""
    return {}

@app.post("/api/logger/", status_code=status.HTTP_201_CREATED)
async def add_new_logger(logger: schemas.Logger):
    """Adds a new logger"""
    return {"message": "Logger registered successfully"}

@app.delete("/api/logger/{logger_id}")
async def delete_logger(logger_id: int):
    """Deletes a specific logger"""
    return {"message": "Logger deleted successfully"}

@app.get("/api/solenoid/", response_model=List[schemas.Solenoid])
async def list_solenoids(available: bool = Query(None)):
    """Getting list of all solenoids or available solenoids"""
    return []

@app.get("/api/solenoid/{solenoid_id}", response_model=schemas.Solenoid)
async def get_specific_solenoid(solenoid_id: int):
    """Gets specific solenoids information"""
    return {}

@app.post("/api/solenoid/", status_code=status.HTTP_201_CREATED)
async def add_new_solenoid(solenoid: schemas.SolenoidBase):
    """Adding new solenoid"""
    return {"message": "Solenoid registered successfully"}

@app.delete("/api/solenoid/{solenoid_id}")
async def delete_solenoid(solenoid_id: int):
    """Deleting solenoid"""
    return {"message": f"Solenoid {solenoid_id} deleted"}

@app.get("/api/sensor/", response_model=List[schemas.Sensor])
async def list_sensors(available: bool = Query(None)):
    """Gets list of all sensors or available sensors"""
    return []

@app.post("/api/sensor/", status_code=status.HTTP_201_CREATED)
async def add_new_sensor(sensor: schemas.Sensor):
    """Adding new sensor"""
    return {"message": "Sensor registered successfully"}

@app.put("/api/sensor/{sensor_id}")
async def update_sensor(sensor_id: int, sensor: schemas.Sensor):
    """Updating sensor"""
    return {"message": "Sensor updated successfully"}

@app.delete("/api/sensor/{sensor_id}")
async def delete_sensor(sensor_id: int):
    """Deleting sensor"""
    return {"message": "Sensor deleted successfully"}

#Preferences and activation
@app.post("/api/groups/{group_id}/solenoid/{solenoid_id}/action/")
async def post_solenoid_action(group_id: UUID, solenoid_id: int, action: schemas.SolenoidAction):
    """Activating a specific solenoid"""
    return {"status": "received", "action": action.action}

@app.post("/api/solenoid/action/")
async def post_action_all_solenoids(action: schemas.SolenoidAction):
    """Activation all solenoids"""
    return {"status": "broadcast_sent"}

@app.post("/api/groups/{group_id}/notificationPref/")
async def set_notification_pref(group_id: UUID, pref: schemas.NotificationPref):
    """Setting up notification preferences"""
    return {}

@app.post("/api/groups/{group_id}/activationPref/")
async def set_activation_pref(group_id: UUID, pref: schemas.ActivationPref):
    """Setting up activation preference for groups"""
    return {}

#Graphing
@app.get("/api/sensor/data/")
async def get_sensor_plot_data( sensor_id: int, start: Optional[datetime] = Query(None),end: Optional[datetime] = Query(None)):
    """Graphing sensor data"""
    return {"sensor_id": sensor_id, "timestamps": [], "values": []}

@app.get("/api/groups/{group_id}/solenoidData")
async def get_solenoid_plot_data(group_id: UUID):
    """Graphing activation of a specific group"""
    return {"group_id": group_id, "events": []}
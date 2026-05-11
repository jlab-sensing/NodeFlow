from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import List, Optional

#Hardware schema (Solenoid/Sensor/Logger) - derived from latest stuff talked about last meeting

class SolenoidBase(BaseModel):
    name: str
    active_state: str
    logger_id: int
    group_id: Optional[UUID] = None

class Solenoid(SolenoidBase):
    id: int
    uuid: UUID
    date_created: datetime

    class Config:
        from_attributes = True

class Sensor(BaseModel):
    sensor_name: str
    sensor_id: int
    uuid: UUID
    measurement: float
    unit: str
    logger_id: int
    group_id: Optional[UUID] = None

class Logger(BaseModel):
    logger_name: str
    logger_id: int
    uuid: UUID
    last_seen: datetime
    update_interval: int

#Groups - Not sure if we are still using groups or not but added anyway

class GroupBase(BaseModel):
    name: str

class Group(GroupBase):
    id: int
    uuid: UUID
    user_id: UUID
    date_created: datetime

class ActivationPref(BaseModel):
    id: int
    uuid: UUID
    tag_id: int
    sensor: str
    measurement: Optional[str]
    condition_operator: str
    condition_value: float
    activated: bool

class NotificationPref(BaseModel):
    id: int
    uuid: UUID
    tag_id: int
    condition: str
    notification_frequency_seconds: float 
    enabled: bool

#Activation of actual solenoid

class SolenoidAction(BaseModel):
    action: str # e.g., "open" or "close"
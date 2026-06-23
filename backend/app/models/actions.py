from sqlmodel import SQLModel
from uuid import UUID
from typing import Optional

class SolenoidAction(SQLModel):
    action: str 

class NotificationPref(SQLModel):
    tag_id: int
    condition: str
    notification_frequency_seconds: float 
    enabled: bool

class ActivationPref(SQLModel):
    tag_id: int
    sensor: str
    measurement: Optional[str] = None
    condition_operator: str
    condition_value: float
    activated: bool
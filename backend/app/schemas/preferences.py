from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from typing import Optional

class ActivationPrefTable(SQLModel, table=True):
    __tablename__ = "activation_prefs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, index=True)
    user_id: UUID = Field(index=True)
    group_id: UUID = Field(index=True)
    sensor_id: int
    measurement: str
    condition_operator: str
    condition_value: float
    close_condition_operator: Optional[str] = None
    close_condition_value: Optional[float] = None
    enabled: bool = True

class NotificationPrefTable(SQLModel, table=True):
    __tablename__ = "notification_prefs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: UUID = Field(index=True)
    tag_id: int              
    condition: str           
    notification_frequency_seconds: float 
    enabled: bool = True

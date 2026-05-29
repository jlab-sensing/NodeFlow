from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from typing import Optional

class ActivationPrefTable(SQLModel, table=True):
    __tablename__ = "activation_prefs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4)
    tag_id: int
    sensor: str
    measurement: Optional[str] = None
    condition_operator: str  
    condition_value: float   
    activated: bool          
class NotificationPrefTable(SQLModel, table=True):
    __tablename__ = "notification_prefs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tag_id: int              
    condition: str           
    notification_frequency_seconds: float 
    enabled: bool = True
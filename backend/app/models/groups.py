from sqlmodel import SQLModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal

IrrigationMode = Literal["manual", "auto"]

class GroupCreate(SQLModel):
    name: str

class GroupModeUpdate(SQLModel):
    mode: IrrigationMode

class GroupRead(SQLModel):
    id: int
    uuid: UUID
    user_id: UUID 
    name: str
    irrigation_mode: IrrigationMode
    date_created: datetime

class DeviceGroupUpdate(SQLModel):
    group_id: Optional[UUID] = None



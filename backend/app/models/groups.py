from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from sqlmodel import SQLModel

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

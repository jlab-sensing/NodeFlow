from sqlmodel import SQLModel
from uuid import UUID
from datetime import datetime

class GroupCreate(SQLModel):
    name: str

class GroupRead(SQLModel):
    id: int
    uuid: UUID
    user_id: UUID 
    name: str
    date_created: datetime
from datetime import datetime
from uuid import UUID

from sqlmodel import SQLModel


class UserRead(SQLModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    date_created: datetime
    api_key: str


class UserUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None

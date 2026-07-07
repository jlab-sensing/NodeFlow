from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, String
from sqlmodel import Field, SQLModel


class UserTable(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(sa_column=Column(String, unique=True, index=True, nullable=False))
    first_name: str = ""
    last_name: str = ""
    password: str = ""
    date_created: datetime = Field(default_factory=datetime.utcnow)


class OAuthTokenTable(SQLModel, table=True):
    __tablename__ = "oauth_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    access_token: str = Field(default="")
    refresh_token: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

from datetime import datetime

from pydantic import Field, field_validator
from sqlmodel import SQLModel


class LoggerCreate(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = "ents"
    device_eui: str | None = None
    description: str = ""

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Logger name cannot be blank")

        return cleaned


class LoggerUpdate(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Logger name cannot be blank")

        return cleaned


class LoggerRead(SQLModel):
    id: int
    logger_id: int
    name: str
    type: str | None = None
    device_eui: str | None = None
    description: str | None = None
    date_created: datetime | None = None

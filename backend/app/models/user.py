import re
from datetime import datetime
from uuid import UUID

from pydantic import field_validator
from sqlmodel import SQLModel


class UserRead(SQLModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    date_created: datetime
    api_key: str | None = None
    phone: str | None = None


class UserUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    api_key: str | None = None
    phone: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            return None

        # Remove formatting characters
        value = re.sub(r"[\s().-]", "", value)

        # if 10 digits, country code = +1
        if re.fullmatch(r"[0-9]{10}", value):
            value = f"+1{value}"

        # if 11 digitis, assume they entered 1 + {phone number}
        elif re.fullmatch(r"1[0-9]{10}", value):
            value = f"+{value}"

        # if country code is defined, use that one
        if not re.fullmatch(r"\+[1-9][0-9]{1,14}", value):
            raise ValueError(
                "Phone number must include a country code and digits only, "
                "for example, +1 800 111 2233"
            )

        return value

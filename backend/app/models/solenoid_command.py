from datetime import datetime
from typing import Literal

from sqlmodel import SQLModel

class SolenoidCommandRead(SQLModel):
    id: int
    logger_id: int
    requested_state: Literal["open", "closed"]
    status: Literal[
        "submitting", "queued", "failed", "unknown"
    ]
    created_at: datetime
    queued_at: datetime | None = None
    error: str | None = None
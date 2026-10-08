from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

Resample = Literal[
    "none",
    "second",
    "minute",
    "hour",
    "day",
    "week",
    "month",
    "quarter",
    "year",
]


class SharedRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


class SelectCell(SharedRequest):
    cell_id: int = Field(gt=0, strict=True)


class ToggleCell(SharedRequest):
    enabled: bool


class CellMetadata(SharedRequest):
    name: str = Field(min_length=1, max_length=200)
    location: str = ""
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    archive: bool = False


class DeploymentWrite(SharedRequest):
    name: str = Field(min_length=1, max_length=200)
    shared_cell_uuids: list[UUID] = Field(min_length=1)

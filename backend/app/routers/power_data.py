from fastapi import APIRouter
from typing import Any
from app.services.ents_client import ents_get

router = APIRouter(prefix="/api/power/", tags=["power_data"])

@router.get("/")
async def get_power_data() -> dict[str, Any]:
    return await ents_get("/api/power")


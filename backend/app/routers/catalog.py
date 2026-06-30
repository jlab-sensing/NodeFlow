from typing import Any
from fastapi import APIRouter, Request
from app.services.ents_client import ents_get

router = APIRouter(prefix="/api/catalog", tags=["Catalog"])

@router.get("/sensors")
async def get_sensor_catalog(request: Request) -> dict[str, Any]:
    return await ents_get(
        "/api/catalog/sensors",
        params=dict(request.query_params),
    )

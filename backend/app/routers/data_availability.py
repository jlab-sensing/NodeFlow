from fastapi import APIRouter, Request
from typing import Any
from app.services.ents_client import ents_get

router = APIRouter(prefix="/api/data-availability", tags=["data"])

@router.get("/")
async def get_data_availability(request: Request) -> dict[str, Any]:
    return await ents_get(
        "/api/data-availability",
        params=dict(request.query_params),
    )

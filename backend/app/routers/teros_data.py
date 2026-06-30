from fastapi import APIRouter, Request
from typing import Any
from app.services.ents_client import ents_get

router = APIRouter(prefix="/api/teros", tags=["teros_data"])

@router.get("/{cell_id}")
async def get_teros_data(cell_id: int, request: Request) -> dict[str, Any]:
    return await ents_get(
        f"/api/teros/{cell_id}",
        params=dict(request.query_params),
    )

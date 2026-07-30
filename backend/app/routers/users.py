from fastapi import APIRouter, Request
from typing import Any
from app.services.ents_client import ents_get

router = APIRouter(tags=["User"])

@router.get("/user")
async def get_user_data(request: Request) -> dict[str, Any]:
    return await ents_get(
        "/api/user",
        params=dict(request.query_params),
    )

@router.get("/users/{user_id}/cells")
async def get_cells_by_user(user_id: int, request: Request) -> list[dict[str, Any]]:
    return await ents_get(
        f"/api/users/{user_id}/cells",
        params=dict(request.query_params),
    )

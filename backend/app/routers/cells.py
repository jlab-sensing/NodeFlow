from fastapi import APIRouter
from typing import Any
from app.services.ents_client import ents_get

router = APIRouter()

@router.get("/cell")
async def get_cells() -> list[dict[str, Any]]:
# get all cells
    return await ents_get("/cell")

@router.get("/cell/{cell_id}")
async def get_cell(cell_id: int) -> dict[str, Any]:
# get specific cell
    return await ents_get(f"/cell/{cell_id}")

@router.get("/cell/{cell_id}/sensors")
async def get_cell_sensors(cell_id: int) -> list[dict[str, Any]]:
# get sensors associated with specific cell
    return await ents_get(f"/cell/{cell_id}/sensors")

@router.get("/cell/{cell_id}/users")
@router.get("/cell/{cell_id}/users/{user_id}")
@router.get("/cell/{cell_id}/share")
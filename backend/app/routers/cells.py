from fastapi import APIRouter
from typing import Any
from app.services.ents_client import ents_get

router = APIRouter(prefix="/api/cell", tags=["Cells"])

@router.get("/")
async def get_cells() -> list[dict[str, Any]]:
# get all cells
    return await ents_get("/api/cell")

@router.get("/id")
async def get_cell_id() -> list[dict[str, Any]]:
    return await ents_get("/api/cell/id")

@router.put("/id")
async def put_cell_id() -> list[dict[str, Any]]:
    return await ents_put("/api/cell/id")

@router.get("/{cell_id}")
async def get_cell(cell_id: int) -> dict[str, Any]:
# get specific cell
    return await ents_get(f"/api/cell/{cell_id}")

@router.get("/{cell_id}/sensors")
async def get_cell_sensors(cell_id: int) -> list[dict[str, Any]]:
# get sensors associated with specific cell
    return await ents_get(f"/api/cell/{cell_id}/sensors")

@router.get("/{cell_id}/users")
async def get_cell_users(cell_id: int) -> list[dict[str, Any]]:
    return await ents_get(f"/api/cell/{cell_id}/users")

@router.get("/{cell_id}/users/{user_id}")
async def get_cell_user_details(cell_id: int, user_id: int):
    return await ents_get(f"/api/cell/{cell_id}/users/{user_id}")

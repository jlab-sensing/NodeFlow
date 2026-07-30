from fastapi import APIRouter, Request
from typing import Any
from app.services.ents_client import ents_delete, ents_get, ents_post, ents_put

router = APIRouter(tags=["Tags"])

async def get_json_body(request: Request) -> Any:
    return await request.json()

@router.get("/api/tag/")
async def get_tags(request: Request) -> list[dict[str, Any]]:
    return await ents_get(
        "/api/tag",
        params=dict(request.query_params),
    )

@router.post("/api/tag/")
async def create_tag(request: Request) -> dict[str, Any]:
    return await ents_post(
        "/api/tag",
        json=await get_json_body(request),
        params=dict(request.query_params),
    )

@router.get("/api/tag/{tag_id}")
async def get_tag(tag_id: int, request: Request) -> dict[str, Any]:
    return await ents_get(
        f"/api/tag/{tag_id}",
        params=dict(request.query_params),
    )


@router.put("/api/tag/{tag_id}")
async def update_tag(tag_id: int, request: Request) -> dict[str, Any]:
    return await ents_put(
        f"/api/tag/{tag_id}",
        json=await get_json_body(request),
        params=dict(request.query_params),
    )


@router.delete("/api/tag/{tag_id}")
async def delete_tag(tag_id: int, request: Request) -> dict[str, Any]:
    return await ents_delete(
        f"/api/tag/{tag_id}",
        params=dict(request.query_params),
    )


@router.get("/api/cell/{cell_id}/tags")
async def get_cell_tags(cell_id: int, request: Request) -> list[dict[str, Any]]:
    return await ents_get(
        f"/api/cell/{cell_id}/tags",
        params=dict(request.query_params),
    )


@router.post("/api/cell/{cell_id}/tags")
async def assign_cell_tags(cell_id: int, request: Request) -> dict[str, Any]:
    return await ents_post(
        f"/api/cell/{cell_id}/tags",
        json=await get_json_body(request),
        params=dict(request.query_params),
    )


@router.put("/api/cell/{cell_id}/tags/{tag_id}")
async def add_tag_to_cell(cell_id: int, tag_id: int, request: Request) -> dict[str, Any]:
    return await ents_put(
        f"/api/cell/{cell_id}/tags/{tag_id}",
        params=dict(request.query_params),
    )


@router.delete("/api/cell/{cell_id}/tags/{tag_id}")
async def remove_tag_from_cell(cell_id: int, tag_id: int, request: Request) -> dict[str, Any]:
    return await ents_delete(
        f"/api/cell/{cell_id}/tags/{tag_id}",
        params=dict(request.query_params),
    )


@router.get("/api/tags/{tag_id}/cells")
async def get_cells_by_tag(tag_id: int, request: Request) -> dict[str, Any]:
    return await ents_get(
        f"/api/tags/{tag_id}/cells",
        params=dict(request.query_params),
    )

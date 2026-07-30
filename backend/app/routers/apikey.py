from typing import Any
from fastapi import APIRouter, Request
from app.services.ents_client import ents_get, ents_put, ents_delete, ents_post

router = APIRouter(prefix="/api", tags=["Catalog"])

@router.get("/apikey")
async def get_api_key(request: Request) -> dict[str, Any]:
    return await ents_get(
        "/api/apikey",
        params=dict(request.query_params),
    )

@router.post("/apikey")
async def post_api_key(request: Request) -> dict[str, Any]:
    return await ents_post(
        "/api/apikey",
        params=dict(request.query_params),
    )

@router.delete("/apikey")
async def delete_api_key(request: Request) -> dict[str, Any]:
    return await ents_delete(
        "/api/apikey",
        params=dict(request.query_params),
    )
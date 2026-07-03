from fastapi import APIRouter, Request
from app.services.ents_client import ents_auth_request

router = APIRouter(prefix="/api", tags=["Catalog"])

@router.get("/oauth/url")
async def get_oauth_url(request: Request):
    return await ents_auth_request(
        request,
        "/api/oauth/url",
    )

@router.get("/auth/token")
async def get_auth_token(request: Request):
    return await ents_auth_request(
        request,
        "/api/auth/token",
    )

@router.get("/auth/refresh")
async def get_auth_refresh(request: Request):
    return await ents_auth_request(
        request,
        "/api/auth/refresh",
    )
    
@router.get("/auth/logout")
async def get_auth_logout(request: Request):
    return await ents_auth_request(
        request,
        "/api/auth/logout",
    )

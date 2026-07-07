import os
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request
from app.services.ents_client import ents_auth_request

router = APIRouter(prefix="/api", tags=["Auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"


def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise HTTPException(status_code=500, detail=f"{name} is not configured")
    return value

@router.get("/oauth/url")
async def get_oauth_url():
    params = {
        "client_id": get_required_env("GOOGLE_CLIENT_ID"),
        "redirect_uri": get_required_env("OAUTH_REDIRECT_URI"),
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "state": "nodeflow_oauth",
        "prompt": "consent",
    }
    return {"url": f"{GOOGLE_AUTH_URL}?{urlencode(params)}"}

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

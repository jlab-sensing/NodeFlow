from urllib.parse import urlencode

import httpx
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlmodel import Session, select

from app.auth.auth import (
    get_current_user,
    get_required_env,
    issue_login_response,
    logout_user,
    refresh_access_token,
)
from app.database import get_session
from app.models.user import UserRead
from app.schemas.user_schema import UserTable

router = APIRouter(prefix="/api", tags=["Auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


@router.get("/oauth/url")
async def get_oauth_url() -> dict[str, str]:
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


@router.get("/auth/token", status_code=201)
async def get_token(
    response: Response,
    code: str = Query(...),
    session: Session = Depends(get_session),
) -> str:
    async with httpx.AsyncClient(timeout=20.0) as client:
        google_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": get_required_env("GOOGLE_CLIENT_ID"),
                "client_secret": get_required_env("GOOGLE_CLIENT_SECRET"),
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": get_required_env("OAUTH_REDIRECT_URI"),
            },
        )

    if google_response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Google token exchange failed")

    google_payload = google_response.json()
    google_id_token = google_payload.get("id_token")
    if not google_id_token:
        raise HTTPException(status_code=401, detail="Google id_token missing")

    try:
        idinfo = id_token.verify_oauth2_token(
            google_id_token,
            google_requests.Request(),
            get_required_env("GOOGLE_CLIENT_ID"),
            clock_skew_in_seconds=10,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Google token verification failed") from exc

    email = idinfo["email"]
    user = session.exec(select(UserTable).where(UserTable.email == email)).first()
    if user is None:
        user = UserTable(
            email=email,
            first_name=idinfo.get("given_name", ""),
            last_name=idinfo.get("family_name", ""),
            password="",
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    return issue_login_response(user, session, response)


@router.get("/auth/refresh")
async def refresh_token(access_token: str = Depends(refresh_access_token)) -> str:
    return access_token


@router.get("/auth/logout", status_code=204)
async def logout(response: Response = Depends(logout_user)) -> Response:
    return response


@router.get("/auth/logged_in")
async def check_logged_in(user: UserTable = Depends(get_current_user)) -> dict[str, Any]:
    return {"loggedIn": True, "user": UserRead.model_validate(user, from_attributes=True)}

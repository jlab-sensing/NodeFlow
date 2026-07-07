import os
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from sqlmodel import Session, select

from app.database import get_session
from app.schemas.user_schema import OAuthTokenTable, UserTable

UTC = timezone.utc
ACCESS_TOKEN_MINUTES = 15
REFRESH_TOKEN_DAYS = 1
REFRESH_COOKIE_NAME = "refresh-token"


def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise HTTPException(status_code=500, detail=f"{name} is not configured")
    return value


def get_cookie_secure() -> bool:
    configured = os.getenv("REFRESH_COOKIE_SECURE")
    if configured is not None:
        return configured.lower() in {"1", "true", "yes"}
    return os.getenv("CLIENT_URL", "").startswith("https://")


def create_access_token(user: UserTable) -> str:
    return jwt.encode(
        {
            "uid": str(user.id),
            "exp": datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        },
        get_required_env("ACCESS_TOKEN_SECRET"),
        algorithm="HS256",
    )


def create_refresh_token(user: UserTable) -> str:
    return jwt.encode(
        {
            "uid": str(user.id),
            "exp": datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_DAYS),
        },
        get_required_env("REFRESH_TOKEN_SECRET"),
        algorithm="HS256",
    )


def persist_tokens(session: Session, user: UserTable, access_token: str, refresh_token: str) -> None:
    token = session.exec(
        select(OAuthTokenTable).where(OAuthTokenTable.user_id == user.id)
    ).first()
    now = datetime.utcnow()
    if token is None:
        token = OAuthTokenTable(
            user_id=user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            created_at=now,
            updated_at=now,
        )
        session.add(token)
    else:
        token.access_token = access_token
        token.refresh_token = refresh_token
        token.updated_at = now
        session.add(token)
    session.commit()


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=get_cookie_secure(),
        samesite="none" if get_cookie_secure() else "lax",
        expires=datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_DAYS),
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=get_cookie_secure(),
        samesite="none" if get_cookie_secure() else "lax",
    )


def issue_login_response(user: UserTable, session: Session, response: Response) -> str:
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    persist_tokens(session, user, access_token, refresh_token)
    set_refresh_cookie(response, refresh_token)
    response.status_code = status.HTTP_201_CREATED
    return access_token


def decode_access_token(token: str) -> UUID:
    try:
        payload = jwt.decode(
            token,
            get_required_env("ACCESS_TOKEN_SECRET"),
            algorithms=["HS256"],
        )
        return UUID(payload["uid"])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=403, detail="Invalid token") from exc
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=403, detail="Invalid token payload") from exc


def decode_refresh_token(token: str) -> UUID:
    try:
        payload = jwt.decode(
            token,
            get_required_env("REFRESH_TOKEN_SECRET"),
            algorithms=["HS256"],
        )
        return UUID(payload["uid"])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=403, detail="Invalid refresh token") from exc
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=403, detail="Invalid refresh token payload") from exc


def get_current_user(
    request: Request,
    session: Session = Depends(get_session),
) -> UserTable:
    auth_header = request.headers.get("Authorization", "")
    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="No token provided")

    user_id = decode_access_token(token)
    user = session.get(UserTable, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def refresh_access_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    session: Session = Depends(get_session),
) -> str:
    if not refresh_token:
        raise HTTPException(status_code=403, detail="Missing refresh token")

    user_id = decode_refresh_token(refresh_token)
    token_record = session.exec(
        select(OAuthTokenTable).where(OAuthTokenTable.refresh_token == refresh_token)
    ).first()
    if token_record is None or token_record.user_id != user_id:
        raise HTTPException(status_code=403, detail="Invalid refresh token")

    user = session.get(UserTable, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return issue_login_response(user, session, response)


def logout_user(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    session: Session = Depends(get_session),
) -> Response:
    if refresh_token:
        token_record = session.exec(
            select(OAuthTokenTable).where(OAuthTokenTable.refresh_token == refresh_token)
        ).first()
        if token_record is not None:
            session.delete(token_record)
            session.commit()
    clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response

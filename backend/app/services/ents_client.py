import os
from typing import Any
import httpx
from fastapi import HTTPException, Request, Response


DEFAULT_TIMEOUT_SECONDS = 20.0
AUTH_FORWARD_HEADERS = {"authorization", "cookie", "content-type", "accept"}
AUTH_RESPONSE_HEADERS = {"content-type"}


def get_ents_base_url() -> str:
    base_url = os.getenv("ENTS_API_BASE_URL", "").rstrip("/")
    if not base_url:
        raise HTTPException(status_code=500, detail="ENTS_API_BASE_URL is not configured")
    return base_url


def get_ents_headers() -> dict[str, str]:
    api_key = os.getenv("ENTS_API_KEY", "")
    if not api_key:
        return {}

    header_name = os.getenv("ENTS_API_KEY_HEADER", "X-API-Key")
    header_value = f"{api_key}"
    return {header_name: header_value}


def get_forwarded_auth_headers(request: Request) -> dict[str, str]:
    return {
        key: value
        for key, value in request.headers.items()
        if key.lower() in AUTH_FORWARD_HEADERS
    }


async def ents_auth_request(request: Request, path: str, method: str = "GET") -> Response:
    """Forward user auth/session requests to ENTS without JSON coercion.

    ENTS auth endpoints return raw access-token bodies and set/clear refresh-token
    cookies. This helper preserves those response details instead of using the
    normal API-key-backed JSON helpers.
    """
    try:
        body = await request.body()
        async with httpx.AsyncClient(
            base_url=get_ents_base_url(),
            timeout=DEFAULT_TIMEOUT_SECONDS,
            follow_redirects=True,
        ) as client:
            ents_response = await client.request(
                method,
                path,
                params=dict(request.query_params),
                content=body or None,
                headers=get_forwarded_auth_headers(request),
            )

        headers = {
            key: value
            for key, value in ents_response.headers.items()
            if key.lower() in AUTH_RESPONSE_HEADERS
        }
        response = Response(
            content=ents_response.content,
            status_code=ents_response.status_code,
            headers=headers,
        )

        for cookie in ents_response.headers.get_list("set-cookie"):
            response.headers.append("set-cookie", cookie)

        return response
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"ENTS auth request failed: {exc}",
        ) from exc


async def ents_get(path: str, params: dict[str, Any] | None = None) -> Any:
    try:
        async with httpx.AsyncClient(
            base_url=get_ents_base_url(),
            headers=get_ents_headers(),
            timeout=DEFAULT_TIMEOUT_SECONDS,
            follow_redirects=True,
        ) as client:
            response = await client.get(path, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=exc.response.text,
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"ENTS request failed: {exc}",
        ) from exc


async def ents_post(path: str, json: Any | None = None, params: dict[str, Any] | None = None) -> Any:
    try:
        async with httpx.AsyncClient(
            base_url=get_ents_base_url(),
            headers=get_ents_headers(),
            timeout=DEFAULT_TIMEOUT_SECONDS,
            follow_redirects=True,
        ) as client:
            response = await client.post(path, json=json, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=exc.response.text,
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"ENTS request failed: {exc}",
        ) from exc


async def ents_put(path: str, json: Any | None = None, params: dict[str, Any] | None = None) -> Any:
    try:
        async with httpx.AsyncClient(
            base_url=get_ents_base_url(),
            headers=get_ents_headers(),
            timeout=DEFAULT_TIMEOUT_SECONDS,
            follow_redirects=True,
        ) as client:
            response = await client.put(path, json=json, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=exc.response.text,
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"ENTS request failed: {exc}",
        ) from exc


async def ents_delete(path: str, params: dict[str, Any] | None = None) -> Any:
    try:
        async with httpx.AsyncClient(
            base_url=get_ents_base_url(),
            headers=get_ents_headers(),
            timeout=DEFAULT_TIMEOUT_SECONDS,
            follow_redirects=True,
        ) as client:
            response = await client.delete(path, params=params)
            response.raise_for_status()
            if not response.content:
                return {}
            return response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=exc.response.text,
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"ENTS request failed: {exc}",
        ) from exc

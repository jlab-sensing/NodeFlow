import os
from typing import Any
import httpx
from fastapi import HTTPException


DEFAULT_TIMEOUT_SECONDS = 20.0


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

from fastapi import HTTPException, status
from app.models.logger import LoggerCreate, LoggerUpdate
from app.services.ents_client import ents_get, ents_delete, ents_post, ents_put
from typing import Any

def normalize_logger(logger: dict) ->  dict:
    logger_id = logger.get("id")
    if logger_id is None:
        logger_id = logger.get("logger_id")

    if logger_id is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Dirtviz returned a logger without an ID")
    
    return {
        **logger,
        "id": logger_id,
        "logger_id": logger_id,
    }

async def get_service_account_email() -> str:
    user = await ents_get("/api/user")
    if not isinstance(user, dict):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Dirtviz returned invalid account data")
    email = str(user.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,detail="dirtviz api key ownder does not have an email")
    return email

async def list_shared_loggers() -> list[dict[str, Any]]:
    response = await ents_get("/api/logger/", params={"user":"true"})
    if not isinstance(response, list):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,detail="Dirtviz returned invalid logger list")
    
    return [
        normalize_logger(logger)
        for logger in response
    ]

async def get_shared_logger(logger_id: int) -> dict[str, Any]:
    loggers = await list_shared_loggers()

    logger = next(
        (
            candidate
            for candidate in loggers
            if candidate["logger_id"] == logger_id
        ),
        None,
    )
    if logger is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="logger not found")
    return logger

def normalize_device_eui(value: str | None) -> str:
    if not value:
        return ""
    return "".join(
        character
        for character in value
        if character.isalnum()
    ).upper()

async def create_shared_logger(
    payload: LoggerCreate,
) -> dict[str, Any]:
    service_email = await get_service_account_email()

    response = await ents_post(
        "/api/logger/",
        json={
            "name": payload.name.strip(),
            "type": payload.type.strip(),
            "device_eui": (
                normalize_device_eui(
                    payload.device_eui
                )
            ),
            "description": payload.description.strip(),
            "userEmail": service_email,
        },
    )
    if not isinstance(response, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="dirtviz returned invalid create response"
        )
    logger_id = response.get("logger_id")
    if logger_id is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,detail="dirtviz created logger without returning logger id")
    
    logger = await ents_get(
        f"/api/logger/{logger_id}"
    )
    return normalize_logger(logger)

async def update_shared_logger(logger_id: int, payload: LoggerUpdate) -> dict[str, Any]:
    await get_shared_logger(logger_id)
    await ents_put(
        f"/api/logger/{logger_id}",
        json={
            "name": payload.name.strip(),
            "description": payload.description.strip(),
        },
    )
    updated = await ents_get(
        f"/api/logger/{logger_id}"
    )
    return normalize_logger(updated)

async def delete_shared_logger(logger_id: int) -> dict[str, Any]:
    await get_shared_logger(logger_id)
    response = await ents_delete(
        f"/api/logger/{logger_id}"
    )
    return {
        "ok": True,
        "logger_id": logger_id,
        "upstream": response,
    }
from unittest.mock import AsyncMock, call

import pytest
from fastapi import HTTPException

from app.models.logger import LoggerCreate, LoggerUpdate
from app.services.logger_service import (
    create_shared_logger,
    delete_shared_logger,
    get_shared_logger,
    list_shared_loggers,
    normalize_logger,
    update_shared_logger,
)


def test_normalize_logger_adds_both_id_fields():
    result = normalize_logger(
        {
            "id": 123,
            "name": "Shared Logger",
        }
    )

    assert result["id"] == 123
    assert result["logger_id"] == 123
    assert result["name"] == "Shared Logger"


def test_normalize_logger_accepts_logger_id():
    result = normalize_logger(
        {
            "logger_id": 456,
            "name": "Field Logger",
        }
    )

    assert result["id"] == 456
    assert result["logger_id"] == 456


def test_normalize_logger_rejects_missing_id():
    with pytest.raises(HTTPException) as error:
        normalize_logger(
            {
                "name": "Invalid Logger",
            }
        )

    assert error.value.status_code == 502


@pytest.mark.anyio
async def test_list_shared_loggers(monkeypatch):
    get_mock = AsyncMock(
        return_value=[
            {
                "id": 123,
                "name": "Shared Logger",
            },
            {
                "logger_id": 456,
                "name": "Field Logger",
            },
        ]
    )
    monkeypatch.setattr(
        "app.services.logger_service.ents_get",
        get_mock,
    )

    result = await list_shared_loggers()

    assert [
        logger["logger_id"]
        for logger in result
    ] == [123, 456]

    get_mock.assert_awaited_once_with(
        "/api/logger/",
        params={"user": "true"},
    )


@pytest.mark.anyio
async def test_get_shared_logger(monkeypatch):
    list_mock = AsyncMock(
        return_value=[
            {
                "id": 123,
                "logger_id": 123,
                "name": "Shared Logger",
            }
        ]
    )
    monkeypatch.setattr(
        "app.services.logger_service.list_shared_loggers",
        list_mock,
    )

    result = await get_shared_logger(123)

    assert result["logger_id"] == 123


@pytest.mark.anyio
async def test_get_missing_shared_logger(monkeypatch):
    list_mock = AsyncMock(return_value=[])
    monkeypatch.setattr(
        "app.services.logger_service.list_shared_loggers",
        list_mock,
    )

    with pytest.raises(HTTPException) as error:
        await get_shared_logger(999)

    assert error.value.status_code == 404
    assert error.value.detail == "logger not found"


@pytest.mark.anyio
async def test_create_shared_logger(monkeypatch):
    get_mock = AsyncMock(
        side_effect=[
            {
                "email": "nodeflow@example.com",
            },
            {
                "id": 123,
                "name": "Shared Logger",
                "type": "ents",
                "device_eui": "0080E1150546D093",
                "description": "",
            },
        ]
    )
    post_mock = AsyncMock(
        return_value={
            "logger_id": 123,
        }
    )

    monkeypatch.setattr(
        "app.services.logger_service.ents_get",
        get_mock,
    )
    monkeypatch.setattr(
        "app.services.logger_service.ents_post",
        post_mock,
    )

    result = await create_shared_logger(
        LoggerCreate(
            name="Shared Logger",
            type="ents",
            device_eui="00:80:E1:15:05:46:D0:93",
            description="",
        )
    )

    assert result["id"] == 123
    assert result["logger_id"] == 123

    assert get_mock.await_args_list == [
        call("/api/user"),
        call("/api/logger/123"),
    ]

    post_mock.assert_awaited_once_with(
        "/api/logger/",
        json={
            "name": "Shared Logger",
            "type": "ents",
            "device_eui": "0080E1150546D093",
            "description": "",
            "userEmail": "nodeflow@example.com",
        },
    )


@pytest.mark.anyio
async def test_update_shared_logger(monkeypatch):
    existing_mock = AsyncMock(
        return_value={
            "id": 123,
            "logger_id": 123,
        }
    )
    put_mock = AsyncMock(return_value={})
    get_mock = AsyncMock(
        return_value={
            "id": 123,
            "name": "Updated Logger",
            "type": "ents",
            "device_eui": "0080E1150546D093",
            "description": "Updated description",
        }
    )

    monkeypatch.setattr(
        "app.services.logger_service.get_shared_logger",
        existing_mock,
    )
    monkeypatch.setattr(
        "app.services.logger_service.ents_put",
        put_mock,
    )
    monkeypatch.setattr(
        "app.services.logger_service.ents_get",
        get_mock,
    )

    result = await update_shared_logger(
        123,
        LoggerUpdate(
            name="Updated Logger",
            description="Updated description",
        ),
    )

    assert result["logger_id"] == 123
    assert result["name"] == "Updated Logger"

    existing_mock.assert_awaited_once_with(123)

    put_mock.assert_awaited_once_with(
        "/api/logger/123",
        json={
            "name": "Updated Logger",
            "description": "Updated description",
        },
    )

    get_mock.assert_awaited_once_with(
        "/api/logger/123"
    )


@pytest.mark.anyio
async def test_delete_shared_logger(monkeypatch):
    existing_mock = AsyncMock(
        return_value={
            "id": 123,
            "logger_id": 123,
        }
    )
    delete_mock = AsyncMock(
        return_value={
            "message": "Logger deleted",
        }
    )

    monkeypatch.setattr(
        "app.services.logger_service.get_shared_logger",
        existing_mock,
    )
    monkeypatch.setattr(
        "app.services.logger_service.ents_delete",
        delete_mock,
    )

    result = await delete_shared_logger(123)

    assert result == {
        "ok": True,
        "logger_id": 123,
        "upstream": {
            "message": "Logger deleted",
        },
    }

    existing_mock.assert_awaited_once_with(123)
    delete_mock.assert_awaited_once_with(
        "/api/logger/123"
    )
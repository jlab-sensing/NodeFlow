from unittest.mock import AsyncMock
import pytest
from fastapi import Response
from app.routers.sensor_data import handle_ttn

@pytest.mark.anyio
async def test_ttn_missing_uplink_message(
    db_session,
):
    """Tets a TTN req without an uplink message"""
    response = await handle_ttn(
        uplink_json={},
        session=db_session,
    )
    assert response.status_code == 200
    assert response.body == (
        b"Missing uplink_message or f_port."
    )

@pytest.mark.anyio
async def test_ttn_rejects_non_dictionary_uplink(
    db_session,
):
    response = await handle_ttn(
        uplink_json={
            "uplink_message": "invalid",
        },
        session=db_session,
    )
    assert response.status_code == 200
    assert response.body == (
        b"Missing uplink_message or f_port."
    )

@pytest.mark.anyio
async def test_ttn_missing_f_port(
    db_session,
):
    response = await handle_ttn(
        uplink_json={
            "uplink_message": {
                "frm_payload": "dGVzdA==",
            },
        },
        session=db_session,
    )
    assert response.status_code == 200
    assert response.body == (
        b"Missing uplink_message or f_port."
    )

@pytest.mark.anyio
async def test_ttn_ignores_timesync(
    db_session,
):
    response = await handle_ttn(
        uplink_json={
            "uplink_message": {
                "f_port": 202,
            },
        },
        session=db_session,
    )
    assert response.status_code == 200
    assert response.body == (
        b"Ignoring timesync request."
    )

@pytest.mark.anyio
async def test_ttn_rejects_unknown_ports(
    db_session,
):
    response = await handle_ttn(
        uplink_json={
            "uplink_message": {
                "f_port": 99,
            },
        },
        session=db_session,
    )

    assert response.status_code == 404
    assert response.body == (
        b"f_port not recognized."
    )

@pytest.mark.anyio
async def test_ttn_requires_frame_payload(
    db_session,
):
    response = await handle_ttn(
        uplink_json={
            "uplink_message": {
                "f_port": 1,
            },
        },
        session=db_session,
    )
    assert response.status_code == 400
    assert response.body == (
        b"Missing frm_payload."
    )

@pytest.mark.anyio
async def test_ttn_rejects_invalid_base64(
    db_session,
):
    response = await handle_ttn(
        uplink_json={
            "uplink_message": {
                "f_port": 1,
                "frm_payload": (
                    "not-valid-base64!"
                ),
            },
        },
        session=db_session,
    )
    assert response.status_code == 400
    assert response.body == (
        b"frm_payload is not valid Base64."
    )

@pytest.mark.anyio
async def test_ttn_port_one_dispatches_legacy_measurements(
    db_session,
    monkeypatch,
):
    legacy_processor = AsyncMock(
        return_value=Response(
            status_code=200,
        )
    )

    generic_processor = AsyncMock(
        return_value=Response(
            status_code=200,
        )
    )
    monkeypatch.setattr(
        "app.routers.sensor_data.process_measurement",
        legacy_processor,
    )
    monkeypatch.setattr(
        (
            "app.routers.sensor_data."
            "process_generic_measurement"
        ),
        generic_processor,
    )

    response = await handle_ttn(
        uplink_json={
            "uplink_message": {
                "f_port": 1,
                "frm_payload": "dGVzdA==",
            },
        },
        session=db_session,
    )

    assert response.status_code == 200
    legacy_processor.assert_awaited_once_with(
        data=b"test",
        session=db_session,
        transport="lora",
    )
    generic_processor.assert_not_awaited()

@pytest.mark.anyio
async def test_ttn_port_two_dispatches_generic_measurement(
    db_session,
    monkeypatch,
):
    legacy_processor = AsyncMock(
        return_value=Response(
            status_code=200
        )
    )
    generic_processor = AsyncMock(
        return_value=Response(
            status_code=200
        )
    )
    monkeypatch.setattr(
        "app.routers.sensor_data.process_measurement",
        legacy_processor,
    )
    monkeypatch.setattr(
        (
            "app.routers.sensor_data."
            "process_generic_measurement"
        ),
        generic_processor,
    )
    response = await handle_ttn(
        uplink_json={
            "uplink_message": {
                "f_port": 2,
                "frm_payload": "dGVzdA==",
            },
        },
        session=db_session,
    )
    assert response.status_code == 200
    generic_processor.assert_awaited_once_with(
        data=b"test",
        session=db_session,
        transport="lora",
    )
    legacy_processor.assert_not_awaited()
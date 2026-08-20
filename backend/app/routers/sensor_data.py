import base64
import binascii

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import Session

from app.database import get_session
from app.routers.sensor_data_util import (
    process_generic_measurement,
    process_measurement,
)


router = APIRouter(
    prefix="/api/sensor",
    tags=["Sensor Data"],
)


def get_content_type(request: Request) -> str:
    """Return the request's normalized media type.

    For example, this converts:

        application/json; charset=utf-8

    into:

        application/json
    """

    return (
        request.headers
        .get("content-type", "")
        .partition(";")[0]
        .strip()
        .lower()
    )


@router.post("/upload/")
async def upload_sensor_data(
    request: Request,
    session: Session = Depends(get_session),
):
    """Receive a TTN webhook or direct binary sensor upload."""

    content_type = get_content_type(request)

    if content_type == "application/json":
        try:
            uplink_json = await request.json()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request body is not valid JSON",
            ) from exc

        if not isinstance(uplink_json, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TTN request body must be a JSON object",
            )

        return await handle_ttn(
            uplink_json=uplink_json,
            session=session,
        )

    if content_type == "application/octet-stream":
        data = await request.body()

        return await handle_binary(
            data=data,
            request=request,
            session=session,
        )

    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail=(
            f"Content-Type '{content_type}' is not supported. "
            "Use application/json or application/octet-stream."
        ),
    )


async def handle_ttn(
    uplink_json: dict,
    session: Session,
):
    """Handle a TTN JSON webhook."""

    uplink_message = uplink_json.get(
        "uplink_message"
    )

    # Preserve the existing ENTS behavior: malformed/non-uplink TTN
    # messages are acknowledged but do not store anything.
    if (
        not isinstance(uplink_message, dict)
        or "f_port" not in uplink_message
    ):
        return Response(
            content="Missing uplink_message or f_port.",
            status_code=status.HTTP_200_OK,
            media_type="text/plain",
        )

    f_port = uplink_message["f_port"]

    if f_port == 202:
        return Response(
            content="Ignoring timesync request.",
            status_code=status.HTTP_200_OK,
            media_type="text/plain",
        )

    if f_port not in {1, 2}:
        return Response(
            content="f_port not recognized.",
            status_code=status.HTTP_404_NOT_FOUND,
            media_type="text/plain",
        )

    payload_string = uplink_message.get(
        "frm_payload"
    )

    if not isinstance(payload_string, str):
        return Response(
            content="Missing frm_payload.",
            status_code=status.HTTP_400_BAD_REQUEST,
            media_type="text/plain",
        )

    try:
        payload = base64.b64decode(
            payload_string,
            validate=True,
        )
    except (binascii.Error, ValueError):
        return Response(
            content="frm_payload is not valid Base64.",
            status_code=status.HTTP_400_BAD_REQUEST,
            media_type="text/plain",
        )

    if f_port == 1:
        return await process_measurement(
            data=payload,
            session=session,
            transport="lora",
        )

    return await process_generic_measurement(
        data=payload,
        session=session,
        transport="lora",
    )


async def handle_binary(
    data: bytes,
    request: Request,
    session: Session,
):
    """Handle protobuf sent directly by a Wi-Fi-connected board."""

    if not data:
        return Response(
            content="Binary payload is empty.",
            status_code=status.HTTP_400_BAD_REQUEST,
            media_type="text/plain",
        )

    sensor_version = request.headers.get(
        "SensorVersion",
        "1",
    )

    # Preserve ENTS behavior: exactly "2" selects the generic
    # protocol. Missing or any other value selects version 1.
    if sensor_version == "2":
        return await process_generic_measurement(
            data=data,
            session=session,
            transport="wifi",
        )

    return await process_measurement(
        data=data,
        session=session,
        transport="wifi",
    )
import logging
import os
from uuid import UUID

import socketio
from pydantic import ValidationError
from sqlmodel import Session, select

from app.auth.auth import decode_access_token
from app.database import engine
from app.models.realtime_sensors import SensorSubscriptionRequest
from app.schemas.sensor import SensorTable
from app.schemas.user_schema import UserTable

logger = logging.getLogger(__name__)

DEBUG_SOCKETIO = os.getenv(
    "DEBUG_SOCKETIO",
    "False",
).lower() == "true"

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3001",
    ).split(",")
    if origin.strip()
]

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=allowed_origins,
    ping_timeout=60,
    ping_interval=25,
)

@sio.event
async def connect(sid, environ, auth):
    token = auth.get("token") if isinstance(auth, dict) else None

    if not token:
        raise socketio.exceptions.ConnectionRefusedError(
            "auth required"
        )
    
    try:
        user_id = decode_access_token(token)
    except Exception as exc:
        raise socketio.exceptions.ConnectionRefusedError(
            "invalid access token"
        ) from exc
    
    with Session(engine) as session:
        user = session.get(UserTable, user_id)
    
    if user is None:
        raise socketio.exceptions.ConnectionRefusedError(
            "user not found"
        )
    
    await sio.save_session(
        sid,
        {"user_id": str(user.id)},
    )

    await sio.enter_room(
        sid,
        f"user_{user.id}",
    )

    if DEBUG_SOCKETIO:
        logger.info(
            "[socketio] client connected: sid=%s user=%s",
            sid,
            user.id,
        )

@sio.event
async def disconnect(sid, reason):
    if DEBUG_SOCKETIO:
        logger.info(
            "[socketio] client disconnected: sid=%s reason=%s",
            sid,
            reason,
        )

@sio.on("subscribe_sensors")
async def handle_subscribe_sensors(sid, data):
    try:
        request = SensorSubscriptionRequest.model_validate(data)
    except ValidationError:
        return {
            "ok": False,
            "error": "invalid subscription request",
        }
    
    socket_session = await sio.get_session(sid)
    user_id = UUID(socket_session["user_id"])
    requested_uuids = set(request.sensorUuids)

    with Session(engine) as session:
        sensors = session.exec(
            select(SensorTable).where(
                SensorTable.uuid.in_(requested_uuids),
                SensorTable.user_id == user_id,
            )
        ).all()
    
    authorized_uuids = {sensor.uuid for sensor in sensors}

    for sensor_uuid in authorized_uuids:
        await sio.enter_room(
            sid,
            f"sensor_{sensor_uuid}",
        )
    
    if DEBUG_SOCKETIO:
        logger.info(
            "[socketio] %s subscribed to %d sensors",
            sid,
            len(authorized_uuids),
        )
    
    return {
        "ok": True,
        "subscribed": [
            str(sensor_uuid)
            for sensor_uuid in authorized_uuids
        ],
        "rejectedCount": len(requested_uuids - authorized_uuids),
    }

@sio.on("unsubscribe_sensors")
async def handle_unsubscribe_sensors(sid, data):
    try:
        request = SensorSubscriptionRequest.model_validate(data)
    except ValidationError:
        return {
            "ok": False,
            "error": "invalid unsubscription request"
        }
    
    for sensor_uuid in set(request.sensorUuids):
        await sio.leave_room(
            sid,
            f"sensor_{sensor_uuid}",
        )
    
    if DEBUG_SOCKETIO:
        logger.info(
            "[socketio] %s unsubscribed from %d sensors",
            sid,
            len(set(request.sensorUuids)),
        )
    
    return {
        "ok": True,
        "unsubscribed": [
            str(sensor_uuid)
            for sensor_uuid in set(request.sensorUuids)
        ],
    }
        
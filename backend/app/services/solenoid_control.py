import os
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException
from sqlmodel import Session

from app.schemas.solenoid import SolenoidTable
from app.schemas.solenoid_command import SolenoidCommandTable
from app.services.ents_client import ents_post
from app.services.solenoid_payload import (
    SOLENOID_F_PORT,
    encode_solenoid_command,
)

SOLENOID_TESTER_URL = os.getenv(
    "SOLENOID_TESTER_URL",
    "http://solenoid-tester:8002",
)


async def queue_logger_solenoid_command(
    logger_id: int,
    desired_state: str,
) -> dict:
    if logger_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="A real logger ID is required",
        )
    payload = encode_solenoid_command(desired_state)

    try:
        result = await ents_post(
            f"/api/logger/{logger_id}/downlink",
            json={
                "payload": payload,
                "f_port": SOLENOID_F_PORT,
            },
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail="ENTs returned an invalid downlink response",
        ) from exc

    if (
        not isinstance(result, dict)
        or result.get("logger_id") != logger_id
        or result.get("status") != "queued"
        or result.get("f_port") != SOLENOID_F_PORT
    ):
        raise HTTPException(
            status_code=502,
            detail="ENTS did not return the expected queue confirmation",
        )
    return result


async def submit_logger_solenoid_command(
    solenoid: SolenoidTable,
    desired_state: str,
    session: Session,
) -> SolenoidCommandTable:
    if desired_state not in {"open", "closed"}:
        raise HTTPException(
            status_code=400,
            detail="unsupported solenoid state",
        )

    if solenoid.archived:
        raise HTTPException(
            status_code=409,
            detail="cannot control archived hardware",
        )

    if solenoid.logger_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="a real logger is required",
        )

    command = SolenoidCommandTable(
        logger_id=solenoid.logger_id,
        user_id=solenoid.user_id,
        solenoid_id=solenoid.id,
        requested_state=desired_state,
        status="submitting",
    )

    session.add(command)
    session.commit()
    session.refresh(command)

    try:
        await queue_logger_solenoid_command(
            logger_id=command.logger_id,
            desired_state=command.requested_state,
        )
    except HTTPException as exc:
        rejected_statuses = {400, 401, 403, 404, 405, 415, 422, 429}

        command.status = "failed" if exc.status_code in rejected_statuses else "unknown"
        command.error = str(exc.detail)

        session.add(command)
        session.commit()
        raise
    command.status = "queued"
    command.queued_at = datetime.now(timezone.utc)
    session.add(command)
    session.commit()
    session.refresh(command)

    return command


async def set_solenoid_state(
    solenoid: SolenoidTable,
    desired_state: str,
    session: Session,
    force: bool = False,
):

    if solenoid.logger_id != -1:
        raise HTTPException(
            status_code=409,
            detail="Use the logger command service for real hardware",
        )

    if desired_state not in {"open", "closed"}:
        raise ValueError(f"Unsupported solenoid state: {desired_state}")

    if not force and solenoid.active_state == desired_state:
        return solenoid

    endpoint = "open" if desired_state == "open" else "close"

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(f"{SOLENOID_TESTER_URL}/{endpoint}")
        response.raise_for_status()
        result = response.json()

    solenoid.active_state = result["state"]
    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)

    return solenoid


async def open_solenoid(solenoid, session, force: bool = False):
    return await set_solenoid_state(
        solenoid,
        "open",
        session,
        force=force,
    )


async def close_solenoid(solenoid, session, force: bool = False):
    return await set_solenoid_state(
        solenoid,
        "closed",
        session,
        force=force,
    )

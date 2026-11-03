import os
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session, select

from app.auth.auth import get_current_user
from app.database import get_session
from app.models.actions import SolenoidAction
from app.models.groups import DeviceGroupUpdate
from app.models.hardware import ArchiveUpdate
from app.models.solenoid import SolenoidCreate, SolenoidRead, SolenoidUpdate
from app.schemas.groups import GroupTable
from app.schemas.solenoid import SolenoidTable
from app.schemas.user_schema import UserTable
from app.services.logger_service import get_shared_logger
from app.services.solenoid_control import (
    close_solenoid,
    open_solenoid,
    submit_logger_solenoid_command,
)
from app.services.solenoid_reads import serialize_solenoids

router = APIRouter(prefix="/api/solenoid", tags=["Solenoids"])


async def perform_manual_action(
    solenoid_id: int,
    desired_state: str,
    response: Response,
    session: Session,
    current_user: UserTable,
):
    solenoid = get_owned_solenoid(
        solenoid_id,
        session,
        current_user,
    )
    if solenoid.archived:
        raise HTTPException(
            status_code=409,
            detail="cannot control archived hardware",
        )

    is_mock = solenoid.logger_id == -1
    if is_mock:
        affected_solenoids = [solenoid]
    else:
        if solenoid.logger_id <= 0:
            raise HTTPException(
                status_code=400,
                detail="A real logger ID is required",
            )
        logger = await get_shared_logger(solenoid.logger_id)

        if str(logger.get("type", "")).lower() != "ents":
            raise HTTPException(
                status_code=400, detail="this logger does not support downlinks"
            )

        affected_solenoids = session.exec(
            select(SolenoidTable).where(
                SolenoidTable.logger_id == solenoid.logger_id,
            )
        ).all()

        if any(item.user_id != current_user.id for item in affected_solenoids):
            raise HTTPException(
                status_code=409,
                detail="This logger has hardware assigned to another user",
            )

    affected_solenoid_ids = [item.id for item in affected_solenoids]

    group_ids = {
        item.group_id for item in affected_solenoids if item.group_id is not None
    }

    groups = []
    if group_ids:
        groups = session.exec(
            select(GroupTable).where(
                GroupTable.uuid.in_(group_ids),
                GroupTable.user_id == current_user.id,
                GroupTable.kind == "irrigation",
            )
        ).all()

        if {group.uuid for group in groups} != group_ids:
            raise HTTPException(
                status_code=404, detail="an affected irrigation group was not found"
            )

    for group in groups:
        group.irrigation_mode = "manual"
        session.add(group)

    if is_mock:
        session.commit()

        try:
            if desired_state == "open":
                updated = await open_solenoid(solenoid, session)
            else:
                updated = await close_solenoid(solenoid, session)
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=503,
                detail="test solenoid unavailable",
            ) from exc

        return {
            "solenoid_id": updated.id,
            "state": updated.active_state,
            "mode": "manual" if group_ids else None,
        }

    command = await submit_logger_solenoid_command(
        solenoid=solenoid,
        desired_state=desired_state,
        session=session,
    )

    response.status_code = status.HTTP_202_ACCEPTED

    return {
        "command_id": command.id,
        "solenoid_id": solenoid_id,
        "logger_id": command.logger_id,
        "scope": "logger",
        "requested_state": command.requested_state,
        "status": command.status,
        "queued_at": command.queued_at,
        "affected_solenoid_ids": affected_solenoid_ids,
        "affected_group_ids": sorted(str(group_id) for group_id in group_ids),
    }


def get_owned_solenoid(
    solenoid_id: int,
    session: Session,
    current_user: UserTable,
):
    statement = select(SolenoidTable).where(
        SolenoidTable.id == solenoid_id,
        SolenoidTable.user_id == current_user.id,
    )
    solenoid = session.exec(statement).first()
    if not solenoid:
        raise HTTPException(status_code=404, detail="Solenoid not found")
    return solenoid


def validate_owned_group(
    group_id, session: Session, current_user: UserTable, *, logger_id: int
):
    if group_id is None:
        return

    group = session.exec(
        select(GroupTable).where(
            GroupTable.uuid == group_id,
            GroupTable.user_id == current_user.id,
            GroupTable.kind == "irrigation",
        )
    ).first()

    if group is None:
        raise HTTPException(
            status_code=404,
            detail="group not found",
        )

    if logger_id != -1 and group.irrigation_mode != "manual":
        raise HTTPException(
            status_code=409,
            detail="switch destination group to manual mode before assigning a real solenoid",
        )


SOLENOID_TESTER_URL = os.getenv(
    "SOLENOID_TESTER_URL",
    "http://solenoid-tester:8002",
)


@router.get("/", response_model=List[SolenoidRead])
def list_solenoids(
    available: bool = Query(None),
    include_archived: bool = Query(False),
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    """Lists all solenoids where there is no associated group_id"""
    statement = select(SolenoidTable).where(SolenoidTable.user_id == current_user.id)
    if not include_archived:
        statement = statement.where(SolenoidTable.archived.is_(False))
    if available:
        statement = statement.where(
            SolenoidTable.group_id.is_(None), SolenoidTable.archived.is_(False)
        )
    solenoids = session.exec(statement).all()
    return serialize_solenoids(
        solenoids,
        session,
        current_user.id,
    )


@router.get("/{solenoid_id}", response_model=SolenoidRead)
def get_specific_solenoid(
    solenoid_id: int,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    """Gets specific solenoid information."""
    solenoid = get_owned_solenoid(
        solenoid_id,
        session,
        current_user,
    )
    return serialize_solenoids(
        [solenoid],
        session,
        current_user.id,
    )[0]


@router.put("/{solenoid_id}", response_model=SolenoidRead)
async def update_solenoid(
    solenoid_id: int,
    update: SolenoidUpdate,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    solenoid = get_owned_solenoid(
        solenoid_id,
        session,
        current_user,
    )
    await get_shared_logger(update.logger_id)
    validate_owned_group(
        update.group_id,
        session,
        current_user,
        logger_id=update.logger_id,
    )
    solenoid.name = update.name
    solenoid.group_id = update.group_id
    if "physical_pin" in update.model_fields_set:
        solenoid.physical_pin = update.physical_pin
    elif solenoid.logger_id != update.logger_id:
        solenoid.physical_pin = None
    solenoid.logger_id = update.logger_id
    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)
    return serialize_solenoids(
        [solenoid],
        session,
        current_user.id,
    )[0]


@router.put("/{solenoid_id}/group", response_model=SolenoidRead)
def update_solenoid_group(
    solenoid_id: int,
    update: DeviceGroupUpdate,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    solenoid = get_owned_solenoid(
        solenoid_id,
        session,
        current_user,
    )
    validate_owned_group(
        update.group_id,
        session,
        current_user,
        logger_id=solenoid.logger_id,
    )
    solenoid.group_id = update.group_id
    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)
    return serialize_solenoids(
        [solenoid],
        session,
        current_user.id,
    )[0]


@router.post("/", response_model=SolenoidRead, status_code=status.HTTP_201_CREATED)
async def add_new_solenoid(
    solenoid: SolenoidCreate,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    """Registers a new solenoid with user ownership."""
    await get_shared_logger(solenoid.logger_id)
    validate_owned_group(
        solenoid.group_id,
        session,
        current_user,
        logger_id=solenoid.logger_id,
    )
    db_solenoid = SolenoidTable(
        name=solenoid.name,
        logger_id=solenoid.logger_id,
        physical_pin=solenoid.physical_pin,
        group_id=solenoid.group_id,
        user_id=current_user.id,
        active_state="closed",
        archived=False,
    )
    session.add(db_solenoid)
    session.commit()
    session.refresh(db_solenoid)
    return serialize_solenoids(
        [db_solenoid],
        session,
        current_user.id,
    )[0]


@router.post("/action")
async def post_action_all_solenoids(action: SolenoidAction):
    """Broadcasts an action to all solenoids."""
    return {"status": "broadcast_sent", "action": action.action}


@router.post("/{solenoid_id}/close")
async def close_specific_solenoid(
    solenoid_id: int,
    response: Response,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    """Close a specific solenoid"""
    return await perform_manual_action(
        solenoid_id,
        "closed",
        response,
        session,
        current_user,
    )


@router.post("/{solenoid_id}/open")
async def open_specific_solenoid(
    solenoid_id: int,
    response: Response,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    """Open a specific solenoid"""
    return await perform_manual_action(
        solenoid_id,
        "open",
        response,
        session,
        current_user,
    )


@router.delete("/{solenoid_id}")
async def delete_solenoid(
    solenoid_id: int,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    """Deletes a specific solenoid."""
    solenoid = get_owned_solenoid(solenoid_id, session, current_user)

    session.delete(solenoid)
    session.commit()
    return {"ok": True}


@router.patch("/{solenoid_id}/archive", response_model=SolenoidRead)
async def set_solenoid_archived(
    solenoid_id: int,
    update: ArchiveUpdate,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    solenoid = get_owned_solenoid(
        solenoid_id,
        session,
        current_user,
    )

    if solenoid.logger_id != -1:
        raise HTTPException(
            status_code=409,
            detail="error archiving real solenoid during manual control rollout",
        )

    if update.archived and solenoid.active_state == "open":
        try:
            solenoid = await close_solenoid(
                solenoid,
                session,
            )
        except httpx.HTTPError as error:
            raise HTTPException(
                status_code=503, detail="Solenoid unavailable"
            ) from error

    solenoid.archived = update.archived
    solenoid.active_state = "closed"
    solenoid.group_id = None

    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)
    return serialize_solenoids(
        [solenoid],
        session,
        current_user.id,
    )[0]


# Register Test Solenoid

TEST_SOLENOID_LOGGER_ID = -1


@router.post("/test/register", response_model=SolenoidRead)
async def register_test_solenoid(
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    existing_statement = select(SolenoidTable).where(
        SolenoidTable.user_id == current_user.id,
        SolenoidTable.logger_id == TEST_SOLENOID_LOGGER_ID,
    )
    existing = session.exec(existing_statement).first()
    if existing:
        return existing

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{SOLENOID_TESTER_URL}/status")
            response.raise_for_status()
            tester_status = response.json()

    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=503, detail="Test solenoid unavailable"
        ) from error

    solenoid = SolenoidTable(
        user_id=current_user.id,
        name="Test Solenoid",
        active_state=tester_status["state"],
        logger_id=TEST_SOLENOID_LOGGER_ID,
        group_id=None,
    )

    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)
    return solenoid

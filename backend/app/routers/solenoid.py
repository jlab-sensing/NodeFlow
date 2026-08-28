from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.schemas.solenoid import SolenoidTable
from app.models.solenoid import SolenoidRead, SolenoidCreate, SolenoidUpdate
from app.models.hardware import ArchiveUpdate
from app.models.actions import SolenoidAction
from app.models.groups import DeviceGroupUpdate
from app.schemas.groups import GroupTable
from app.schemas.logger import LoggerTable
import httpx
import os
from app.auth.auth import get_current_user
from app.schemas.user_schema import UserTable
from app.services.solenoid_control import close_solenoid, open_solenoid

router = APIRouter(prefix="/api/solenoid", tags=["Solenoids"])

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

def validate_owned_logger(
    logger_id: int,
    session: Session,
    current_user: UserTable,
):
    statement = select(LoggerTable).where(
        LoggerTable.logger_id == logger_id,
        LoggerTable.user_id == current_user.id,
    )
    if not session.exec(statement).first():
        raise HTTPException(status_code=404, detail="Logger not found")

def validate_owned_group(
    group_id,
    session: Session,
    current_user: UserTable
):
    if group_id is None:
        return
    statement = select(GroupTable).where(
        GroupTable.uuid == group_id,
        GroupTable.user_id == current_user.id,
    )
    if not session.exec(statement).first():
        raise HTTPException(status_code=404, detail="Group not found")

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
    statement = select(SolenoidTable).where(
        SolenoidTable.user_id == current_user.id
    )
    if not include_archived:
        statement = statement.where(
            SolenoidTable.archived.is_(False)
        )
    if available:
        statement = statement.where(
            SolenoidTable.group_id.is_(None),
            SolenoidTable.archived.is_(False)
        )
    return session.exec(statement).all()

@router.get("/{solenoid_id}", response_model=SolenoidRead)
def get_specific_solenoid(solenoid_id: int, session: Session = Depends(get_session), current_user: UserTable = Depends(get_current_user)):
    """Gets specific solenoid information."""
    return get_owned_solenoid(
        solenoid_id,
        session,
        current_user
    )

@router.put("/{solenoid_id}", response_model=SolenoidRead)
def update_solenoid(
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
    validate_owned_logger(
        update.logger_id,
        session,
        current_user,
    )
    validate_owned_group(
        update.group_id,
        session,
        current_user,
    )
    solenoid.name = update.name
    solenoid.logger_id = update.logger_id
    solenoid.group_id = update.group_id
    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)
    return solenoid

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
    )
    solenoid.group_id = update.group_id
    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)
    return solenoid

@router.post("/",response_model=SolenoidRead, status_code=status.HTTP_201_CREATED)
def add_new_solenoid(
    solenoid: SolenoidCreate, 
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    """Registers a new solenoid with user ownership."""
    validate_owned_logger(
        solenoid.logger_id,
        session,
        current_user,
    )
    validate_owned_group(
        solenoid.group_id,
        session,
        current_user,
    )
    db_solenoid = SolenoidTable(
        name=solenoid.name,
        logger_id=solenoid.logger_id,
        group_id=solenoid.group_id,
        user_id=current_user.id,
        active_state="closed",
        archived=False,
    )
    session.add(db_solenoid)
    session.commit()
    session.refresh(db_solenoid)
    return db_solenoid

@router.post("/action")
async def post_action_all_solenoids(action: SolenoidAction):
    """Broadcasts an action to all solenoids."""
    return {"status": "broadcast_sent", "action": action.action}

@router.post('/{solenoid_id}/close')
async def close_specific_solenoid(solenoid_id: int, session: Session=Depends(get_session), current_user: UserTable = Depends(get_current_user)):
    """Close a specific solenoid"""
    statement = select(SolenoidTable).where(SolenoidTable.id == solenoid_id, SolenoidTable.user_id == current_user.id)
    solenoid=session.exec(statement).first()
    if not solenoid: 
        raise HTTPException(status_code=404, detail="Solenoid not found")

    if solenoid.group_id is not None:
        group_statement = select(GroupTable).where(
            GroupTable.uuid == solenoid.group_id,
            GroupTable.user_id == current_user.id,
        )
        group = session.exec(group_statement).first()
        if not group:
            raise HTTPException(status_code=404, detail="group not found")
        group.irrigation_mode = "manual"
        session.add(group)
        session.commit()

    try:
        updated_solenoid = await close_solenoid(solenoid, session)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Test solenoid unavailable") from error

    return {
        "solenoid_id": updated_solenoid.id,
        "state": updated_solenoid.active_state,
        "mode": "manual" if solenoid.group_id is not None else None,
    }


@router.post("/{solenoid_id}/open")    
async def open_specific_solenoid(solenoid_id: int, session: Session = Depends(get_session), current_user: UserTable = Depends(get_current_user)):
    """Open a specific solenoid"""
    statement = select(SolenoidTable).where(
        SolenoidTable.id == solenoid_id,
        SolenoidTable.user_id == current_user.id,
    )
    solenoid = session.exec(statement).first()

    if not solenoid:
        raise HTTPException(status_code=404, detail="solenoid not found")

    if solenoid.group_id is not None:
        group_statement = select(GroupTable).where(
            GroupTable.uuid == solenoid.group_id,
            GroupTable.user_id == current_user.id,
        )
        group = session.exec(group_statement).first()

        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        group.irrigation_mode = "manual"
        session.add(group)
        session.commit()

    try:
        update_solenoid = await open_solenoid(solenoid, session)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail = "test solenoid unavailable") from error
    return {
        "solenoid_id": update_solenoid.id,
        "state": update_solenoid.active_state,
        "mode": "manual" if solenoid.group_id is not None else None,
    }

@router.delete("/{solenoid_id}")
async def delete_solenoid(solenoid_id: int, session: Session = Depends(get_session), current_user: UserTable = Depends(get_current_user)):
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
    if update.archived and solenoid.active_state == "open":
        try:
            solenoid = await close_solenoid(
                solenoid,
                session,
            )
        except httpx.HTTPError as error:
            raise HTTPException(status_code=503, detail="Solenoid unavailable") from error
        
    solenoid.archived = update.archived
    solenoid.active_state = "closed"
    solenoid.group_id = None

    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)
    return solenoid

# Register Test Solenoid

TEST_SOLENOID_LOGGER_ID = -1

@router.post("/test/register", response_model=SolenoidRead)
async def register_test_solenoid( session: Session = Depends(get_session), current_user: UserTable = Depends(get_current_user)):
    existing_statement = select(SolenoidTable).where(
        SolenoidTable.user_id == current_user.id,
        SolenoidTable.logger_id == TEST_SOLENOID_LOGGER_ID,
    )
    existing = session.exec(existing_statement).first()
    if existing:
        return existing
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{SOLENOID_TESTER_URL}/status"
            )
            response.raise_for_status()
            tester_status = response.json()

    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Test solenoid unavailable") from error

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

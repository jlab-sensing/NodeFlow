from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.schemas.solenoid import SolenoidTable
from app.models.solenoid import SolenoidRead, SolenoidCreate
from app.models.actions import SolenoidAction
from app.models.groups import DeviceGroupUpdate
import httpx
import os
from app.auth.auth import get_current_user
from app.schemas.user_schema import UserTable

router = APIRouter(prefix="/api/solenoid", tags=["Solenoids"])

SOLENOID_TESTER_URL = os.getenv(
    "SOLENOID_TESTER_URL",
    "http://solenoid-tester:8002",
)

@router.get("/", response_model=List[SolenoidRead])
def list_solenoids(available: bool = Query(None), session: Session = Depends(get_session)):
    """Lists all solenoids where there is no associated group_id"""
    statement = select(SolenoidTable)
    if available is True:
        statement = statement.where(SolenoidTable.group_id == None)
    return session.exec(statement).all()

@router.get("/{solenoid_id}", response_model=SolenoidRead)
def get_specific_solenoid(solenoid_id: int, session: Session = Depends(get_session)):
    """Gets specific solenoid information."""
    statement = select(SolenoidTable).where(SolenoidTable.id == solenoid_id)
    solenoid = session.exec(statement).first()
    if not solenoid:
        raise HTTPException(status_code=404, detail="Solenoid not found")
    return solenoid

@router.put("/{solenoid_id}/group")
def update_solenoid_group(solenoid_id: int, update: DeviceGroupUpdate, session: Session = Depends(get_session)):
    solenoid = session.get(SolenoidTable, solenoid_id)
    if not solenoid:
        raise HTTPException(status_code=404, detail="Solenoid not found")
    solenoid.group_id = update.group_id
    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)
    return solenoid

@router.post("/", status_code=status.HTTP_201_CREATED)
def add_new_solenoid(solenoid: SolenoidCreate, session: Session = Depends(get_session)):
    """Registers a new solenoid with user ownership."""
    db_solenoid = SolenoidTable.model_validate(solenoid)
    session.add(db_solenoid)
    session.commit()
    session.refresh(db_solenoid)
    return {"message": "Solenoid registered successfully"}

@router.post("/action")
async def post_action_all_solenoids(action: SolenoidAction):
    """Broadcasts an action to all solenoids."""
    return {"status": "broadcast_sent", "action": action.action}

@router.post('/{solenoid_id}/close')
async def close_specific_solenoid(solenoid_id: int, session: Session=Depends(get_session)):
    """Close a specific solenoid"""
    statement = select(SolenoidTable).where(SolenoidTable.id == solenoid_id)
    solenoid=session.exec(statement).first()
    if not solenoid: 
        raise HTTPException(status_code=404, detail="Solenoid not found")
    # implement talking to solenoid here
    # Start of test code
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(f"{SOLENOID_TESTER_URL}/close")
            response.raise_for_status()
            tester_response = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Test solenoid unavailable") from error
    
    solenoid.active_state = tester_response["state"]
    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)
    return {
        "solenoid_id": solenoid.id,
        "state": tester_response["state"],
    }
    # end of test code


@router.post("/{solenoid_id}/open")    
async def open_specific_solenoid(solenoid_id: int, session: Session = Depends(get_session)):
    """Open a specific solenoid"""
    statement = select(SolenoidTable).where(SolenoidTable.id == solenoid_id)
    solenoid = session.exec(statement).first()
    if not solenoid:
        raise HTTPException(status_code=404, detail="Solenoid not found")
    # Implement talking to solenoid here
    # Start of test code
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(f"{SOLENOID_TESTER_URL}/open")
            response.raise_for_status()
            tester_response = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Test solenoid unavailable") from error
    
    solenoid.active_state = tester_response["state"]
    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)
    return {
        "solenoid_id": solenoid.id,
        "state": tester_response["state"],
    }
    # End of test code

@router.delete("/{solenoid_id}")
async def delete_solenoid(solenoid_id: int, session: Session = Depends(get_session)):
    """Deletes a specific solenoid."""
    statement = select(SolenoidTable).where(SolenoidTable.id == solenoid_id)
    solenoid = session.exec(statement).first()
    if not solenoid:
        raise HTTPException(status_code=404, detail="Solenoid not found")
    session.delete(solenoid)
    session.commit()
    return {"ok": True}

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
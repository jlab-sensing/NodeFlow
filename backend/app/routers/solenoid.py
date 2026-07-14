from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.schemas.solenoid import SolenoidTable
from app.models.solenoid import SolenoidRead, SolenoidCreate
from app.models.actions import SolenoidAction
from app.models.groups import DeviceGroupUpdate

router = APIRouter(prefix="/api/solenoid", tags=["Solenoids"])

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

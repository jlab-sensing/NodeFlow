from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID
from app.database import get_session
from app.schemas.groups import GroupTable
from app.schemas.solenoid import SolenoidTable
from app.schemas.sensor import SensorTable
from app.schemas.preferences import ActivationPrefTable, NotificationPrefTable
from app.models.groups import GroupRead, GroupCreate
from app.models.solenoid import SolenoidRead
from app.models.actions import SolenoidAction, NotificationPref, ActivationPref
from app.auth.auth import get_current_user
from app.schemas.user_schema import UserTable

router = APIRouter(prefix="/api/groups", tags=["Groups"])

@router.get("/", response_model=List[GroupRead])
def get_user_group_list(
        session: Session = Depends(get_session),
        current_user: UserTable = Depends(get_current_user)
    ):
    statement = select(GroupTable).where(GroupTable.user_id == current_user.id)
    return session.exec(statement).all()

@router.post("/", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_new_group(group: GroupCreate, session: Session = Depends(get_session), current_user: UserTable = Depends(get_current_user)):
    db_group = GroupTable(name=group.name, user_id=current_user.id)

    session.add(db_group)
    session.commit()
    session.refresh(db_group)

    return db_group

@router.get("/{group_id}", response_model=GroupRead)
def get_specific_group_info(group_id: UUID, session: Session = Depends(get_session)):
    group = session.get(GroupTable, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@router.get("/{group_id}/solenoidData", response_model=List[SolenoidRead])
def get_group_solenoid_data(group_id: UUID, session: Session = Depends(get_session)):
    """Fetches all solenoids belonging to a specific group."""
    statement = select(SolenoidTable).where(SolenoidTable.group_id == group_id)
    solenoids = session.exec(statement).all()
    return solenoids

@router.put("/{group_id}")
def update_group(group_id: UUID, group_update: GroupCreate, session: Session = Depends(get_session)):
    db_group = session.get(GroupTable, group_id)
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group_data = group_update.model_dump(exclude_unset=True)
    for key, value in group_data.items():
        setattr(db_group, key, value)
        
    session.add(db_group)
    session.commit()
    session.refresh(db_group)
    return {"message": "Group updated successfully"}

@router.delete("/{group_id}")
def delete_group(group_id: UUID, session: Session = Depends(get_session)):
    db_group = session.get(GroupTable, group_id)
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    session.delete(db_group)
    session.commit()
    return {"message": "Group deleted successfully"}

@router.post("/{group_id}/solenoid/{solenoid_id}/action/")
async def post_solenoid_action(group_id: UUID, solenoid_id: int, action: SolenoidAction):
    return {"status": "received", "group_id": group_id, "solenoid_id": solenoid_id, "action": action.action}

@router.post("/{group_id}/notificationPref/")
async def set_notification_pref(group_id: UUID, pref: NotificationPref, session: Session = Depends(get_session)):
    db_pref = NotificationPrefTable(
        user_id=pref.user_id,
        tag_id=pref.tag_id,
        condition=pref.condition,
        notification_frequency_seconds=pref.notification_frequency_seconds,
        enabled=pref.enabled
    )
    session.add(db_pref)
    session.commit()
    return {"status": "preference_saved", "group_id": group_id}

@router.post("/{group_id}/activationPref/")
async def set_activation_pref(group_id: UUID, pref: ActivationPref, session: Session = Depends(get_session)):
    db_pref = ActivationPrefTable(
        user_id=pref.user_id,
        tag_id=pref.tag_id,
        sensor=pref.sensor,
        condition_operator=pref.condition_operator,
        condition_value=pref.condition_value,
        activated=pref.activated
    )
    session.add(db_pref)
    session.commit()
    return {"status": "activation_preference_saved", "group_id": group_id}

@router.get("/{group_id}/devices")
def get_group_devices(group_id: UUID, session: Session = Depends(get_session), current_user: UserTable = Depends(get_current_user)):
    group_statement = select(GroupTable).where(GroupTable.uuid == group_id, GroupTable.user_id == current_user.id)
    group = session.exec(group_statement).first()
    if not group:
        raise HTTPException(status_code=404, details="Group not found")
    solenoid_statement = select(SolenoidTable).where(SolenoidTable.group_id == group_id)
    sensor_statement = select(SensorTable).where(SensorTable.group_id == group_id)
    solenoids = session.exec(solenoid_statement).all()
    sensors = session.exec(sensor_statement).all()

    return {
        "solenoids": solenoids,
        "sensors": sensors,
    }
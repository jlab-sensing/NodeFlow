from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID
from app.database import get_session
from app.schemas.groups import GroupTable
from app.models.groups import GroupRead, GroupCreate
from app.models.actions import SolenoidAction, NotificationPref, ActivationPref

router = APIRouter(prefix="/api/groups", tags=["Groups"])

@router.get("/", response_model=List[GroupRead])
def get_user_group_list(session: Session = Depends(get_session)):
    """Getting list of groups for dashboard"""
    return session.exec(select(GroupTable)).all()

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_new_group(group: GroupCreate, session: Session = Depends(get_session)):
    """Adding new group"""
    db_group = GroupTable.model_validate(group)
    session.add(db_group)
    session.commit()
    session.refresh(db_group)
    return {"message": "Group created successfully"}

@router.get("/{group_id}", response_model=GroupRead)
def get_specific_group_info(group_id: UUID, session: Session = Depends(get_session)):
    """Gets specific group information"""
    group = session.get(GroupTable, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@router.put("/{group_id}")
def update_group(group_id: UUID, group_update: GroupCreate, session: Session = Depends(get_session)):
    """Updating group if something changes"""
    db_group = session.get(GroupTable, group_id)
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    db_group.name = group_update.name
    session.add(db_group)
    session.commit()
    return {"message": "Group updated successfully"}

@router.delete("/{group_id}")
def delete_group(group_id: UUID, session: Session = Depends(get_session)):
    """Deleting group"""
    db_group = session.get(GroupTable, group_id)
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    session.delete(db_group)
    session.commit()
    return {"message": "Group deleted successfully"}

@router.post("/{group_id}/solenoid/{solenoid_id}/action/")
async def post_solenoid_action(group_id: UUID, solenoid_id: int, action: SolenoidAction):
    return {"status": "received", "action": action.action}

@router.post("/{group_id}/notificationPref/")
async def set_notification_pref(group_id: UUID, pref: NotificationPref):
    return {"status": "preference_updated", "group_id": group_id}

@router.post("/{group_id}/activationPref/")
async def set_activation_pref(group_id: UUID, pref: ActivationPref):
    """Setting up activation preference for groups"""
    return {"status": "activation_pref_set", "group_id": group_id}

@router.get("/{group_id}/solenoidData")
async def get_solenoid_plot_data(group_id: UUID):
    """Graphing activation of a specific group"""
    return {"group_id": group_id, "events": []}
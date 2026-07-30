from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
import httpx
from uuid import UUID
from app.database import get_session
from app.schemas.groups import GroupTable
from app.schemas.solenoid import SolenoidTable
from app.schemas.sensor import SensorTable
from app.schemas.preferences import ActivationPrefTable, NotificationPrefTable
from app.models.groups import GroupRead, GroupCreate, GroupModeUpdate
from app.models.solenoid import SolenoidRead
from app.models.actions import SolenoidAction, NotificationPref, ActivationPref
from app.auth.auth import get_current_user
from app.schemas.user_schema import UserTable
from app.services.solenoid_control import close_solenoid

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
def get_specific_group_info(
    group_id: UUID,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    statement = select(GroupTable).where(
        GroupTable.uuid == group_id,
        GroupTable.user_id == current_user.id,
    )
    group = session.exec(statement).first()
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
def update_group(
    group_id: UUID,
    group_update: GroupCreate,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    statement = select(GroupTable).where(
        GroupTable.uuid == group_id,
        GroupTable.user_id == current_user.id,
    )
    db_group = session.exec(statement).first()
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
async def delete_group(
    group_id: UUID, 
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    group_statement = select(GroupTable).where(
        GroupTable.uuid == group_id,
        GroupTable.user_id == current_user.id,
    )
    group = session.exec(group_statement).first()

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found",
        )

    preferences = session.exec(
        select(ActivationPrefTable).where(
            ActivationPrefTable.group_id == group_id,
            ActivationPrefTable.user_id == current_user.id,
        )
    ).all()
    for preference in preferences:
        preference.enabled = False
        session.add(preference)
    
    solenoids = session.exec(
        select(SolenoidTable).where(
            SolenoidTable.group_id == group_id,
            SolenoidTable.user_id == current_user.id,
        )
    ).all()

    sensors = session.exec(
        select(SensorTable).where(
            SensorTable.group_id == group_id,
            SensorTable.user_id == current_user.id,
        )
    ).all()

    session.commit()

    try: 
        for solenoid in solenoids:
            await close_solenoid(solenoid, session, force=True)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Group not deleted because at least one solenoid could not close") from error
    
    for solenoid in solenoids:
        solenoid.group_id = None
        session.add(solenoid)

    for sensor in sensors:
        sensor.group_id = None
        session.add(sensor)

    for preference in preferences:
        session.delete(preference)
    
    session.delete(group)
    session.commit()

    return {
        "message": "Group deleted successfully"
    }


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
async def set_activation_pref(
    group_id: UUID,
    pref: ActivationPref,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    group_statement = select(GroupTable).where(
        GroupTable.uuid == group_id,
        GroupTable.user_id == current_user.id,
    )
    group = session.exec(group_statement).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    sensor_statement = select(SensorTable).where(
        SensorTable.id == pref.sensor_id,
        SensorTable.user_id == current_user.id,
        SensorTable.group_id == group_id,
    )
    sensor = session.exec(sensor_statement).first()
    if not sensor:
        raise HTTPException(
            status_code=400,
            detail="Selected sensor does not belong to this group",
        )

    preference_statement = select(ActivationPrefTable).where(
        ActivationPrefTable.group_id == group_id,
        ActivationPrefTable.user_id == current_user.id,
    )
    db_pref = session.exec(preference_statement).first()

    if not db_pref:
        db_pref = ActivationPrefTable(
            user_id=current_user.id,
            group_id=group_id,
            sensor_id=pref.sensor_id,
            measurement=pref.measurement,
            condition_operator=pref.condition_operator,
            condition_value=pref.condition_value,
            close_condition_operator=pref.close_condition_operator,
            close_condition_value=pref.close_condition_value,
            enabled=pref.enabled,
        )
    else:
        db_pref.sensor_id = pref.sensor_id
        db_pref.measurement = pref.measurement
        db_pref.condition_operator = pref.condition_operator
        db_pref.condition_value = pref.condition_value
        db_pref.close_condition_operator = pref.close_condition_operator
        db_pref.close_condition_value = pref.close_condition_value
        db_pref.enabled = pref.enabled

    session.add(db_pref)
    session.commit()
    session.refresh(db_pref)
    return db_pref


@router.get("/{group_id}/activationPref/")
def get_activation_pref(
    group_id: UUID,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    group_statement = select(GroupTable).where(
        GroupTable.uuid == group_id,
        GroupTable.user_id == current_user.id,
    )
    group = session.exec(group_statement).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    preference_statement = select(ActivationPrefTable).where(
        ActivationPrefTable.group_id == group_id,
        ActivationPrefTable.user_id == current_user.id,
    )
    return session.exec(preference_statement).first()


@router.delete("/{group_id}/activationPref/")
def delete_activation_pref(
    group_id: UUID,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    preference_statement = select(ActivationPrefTable).where(
        ActivationPrefTable.group_id == group_id,
        ActivationPrefTable.user_id == current_user.id,
    )
    preference = session.exec(preference_statement).first()

    if preference:
        session.delete(preference)
        session.commit()

    return {"message": "Activation preference removed"}

@router.get("/{group_id}/devices")
def get_group_devices(group_id: UUID, session: Session = Depends(get_session), current_user: UserTable = Depends(get_current_user)):
    group_statement = select(GroupTable).where(GroupTable.uuid == group_id, GroupTable.user_id == current_user.id)
    group = session.exec(group_statement).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    solenoid_statement = select(SolenoidTable).where(
        SolenoidTable.group_id == group_id,
        SolenoidTable.user_id == current_user.id,
    )
    sensor_statement = select(SensorTable).where(
        SensorTable.group_id == group_id,
        SensorTable.user_id == current_user.id,
    )
    solenoids = session.exec(solenoid_statement).all()
    sensors = session.exec(sensor_statement).all()

    return {
        "solenoids": solenoids,
        "sensors": sensors,
    }

@router.patch("/{group_id}/mode")
def update_group_mode(
    group_id: UUID,
    update: GroupModeUpdate,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    statement = select(GroupTable).where(
        GroupTable.uuid == group_id,
        GroupTable.user_id == current_user.id,
    )
    group = session.exec(statement).first()

    if not group: 
        raise HTTPException(status_code=404, detail="group not found")
    group.irrigation_mode = update.mode
    session.add(group)
    session.commit()
    session.refresh(group)
    return {"mode": group.irrigation_mode}
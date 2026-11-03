from typing import List
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import ValidationError
from sqlmodel import Session, select

from app.auth.auth import get_current_user
from app.database import get_session
from app.models.actions import ActivationPref, NotificationPref, SolenoidAction
from app.models.groups import GroupCreate, GroupModeUpdate, GroupRead
from app.models.solenoid import SolenoidRead
from app.schemas.groups import GroupTable
from app.schemas.preferences import ActivationPrefTable, NotificationPrefTable
from app.schemas.sensor import SensorTable
from app.schemas.solenoid import SolenoidTable
from app.schemas.user_schema import UserTable
from app.services.solenoid_control import close_solenoid
from app.services.solenoid_reads import serialize_solenoids


def require_irrigation_route(
    request: Request,
    session: Session = Depends(get_session),
):
    raw_id = request.path_params.get("group_id")

    if raw_id is None:
        return
    try:
        group_uuid = UUID(str(raw_id))
    except ValueError as exc:
        raise HTTPException(
            422,
            "invalid group UUID",
        ) from exc

    group = session.exec(
        select(GroupTable).where(
            GroupTable.uuid == group_uuid,
            GroupTable.kind == "irrigation",
        )
    ).first()

    if group is None:
        raise HTTPException(
            404,
            "irrigation group not found",
        )


router = APIRouter(
    prefix="/api/groups",
    tags=["Groups"],
    dependencies=[Depends(require_irrigation_route)],
)


@router.get("/", response_model=List[GroupRead])
def get_user_group_list(
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    statement = select(GroupTable).where(
        GroupTable.user_id == current_user.id,
        GroupTable.kind == "irrigation",
    )
    return session.exec(statement).all()


@router.post("/", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_new_group(
    group: GroupCreate,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
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
def get_group_solenoid_data(group_id: UUID, session: Session = Depends(get_session), current_user: UserTable = Depends(get_current_user)):
    """Fetches all solenoids belonging to a specific group."""
    group = session.exec(
        select(GroupTable).where(
            GroupTable.uuid == group_id,
            GroupTable.user_id == current_user.id,
            GroupTable.kind == "irrigation"
        )
    ).first()

    if group is None:
        raise HTTPException(
            status_code=404,
            detail="group not found"
        )
    
    solenoids = session.exec(
        select(SolenoidTable).where(
            SolenoidTable.group_id == group_id,
            SolenoidTable.user_id == current_user.id,
        )
    ).all()

    return serialize_solenoids(
        solenoids,session,
        current_user.id,
    )


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
    
    solenoids = session.exec(
        select(SolenoidTable).where(
            SolenoidTable.group_id == group_id,
            SolenoidTable.user_id == current_user.id,
        )
    ).all()

    if any(solenoid.logger_id != -1 for solenoid in solenoids):
        raise HTTPException(
            status_code=409,
            detail="Groups containing real solenoids cannot be eleted yet. Unassign solenoid before deleting the group"
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

    group.irrigation_mode = "manual"
    session.add(group)

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
        raise HTTPException(
            status_code=503,
            detail="Group not deleted because at least one solenoid could not close",
        ) from error

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

    return {"message": "Group deleted successfully"}


@router.post("/{group_id}/solenoid/{solenoid_id}/action/")
async def post_solenoid_action(
    group_id: UUID, solenoid_id: int, action: SolenoidAction
):
    return {
        "status": "received",
        "group_id": group_id,
        "solenoid_id": solenoid_id,
        "action": action.action,
    }


@router.post("/{group_id}/notificationPref/")
async def set_notification_pref(
    group_id: UUID, pref: NotificationPref, session: Session = Depends(get_session)
):
    db_pref = NotificationPrefTable(
        user_id=pref.user_id,
        tag_id=pref.tag_id,
        condition=pref.condition,
        notification_frequency_seconds=pref.notification_frequency_seconds,
        enabled=pref.enabled,
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
        SensorTable.archived.is_(False),
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
    if not pref.enabled:
        group.irrigation_mode = "manual"
        session.add(group)
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
    group = session.exec(
        select(GroupTable).where(
            GroupTable.uuid == group_id,
            GroupTable.user_id == current_user.id,
        )
    ).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")

    preference_statement = select(ActivationPrefTable).where(
        ActivationPrefTable.group_id == group_id,
        ActivationPrefTable.user_id == current_user.id,
    )
    preference = session.exec(preference_statement).first()

    if preference:
        session.delete(preference)

    group.irrigation_mode = "manual"
    session.add(group)
    session.commit()

    return {"message": "Activation preference removed"}


@router.get("/{group_id}/devices")
def get_group_devices(
    group_id: UUID,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    group = session.exec(
        select(GroupTable).where(
            GroupTable.uuid == group_id,
            GroupTable.user_id == current_user.id,
        )
    ).first()

    if group is None:
        raise HTTPException(
            status_code=404,
            detail="group not found"
        )

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

    return {
        "solenoids": serialize_solenoids(solenoids, session, current_user.id),
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

    if update.mode == "auto":
        preference = session.exec(
            select(ActivationPrefTable).where(
                ActivationPrefTable.group_id == group_id,
                ActivationPrefTable.user_id == current_user.id,
                ActivationPrefTable.enabled.is_(True),
            )
        ).first()
        if preference is None:
            raise HTTPException(
                status_code=409,
                detail="Configure and enable an activation threshold before switching to Auto.",
            )
        try:
            ActivationPref.model_validate(preference.model_dump())
        except ValidationError as exc:
            raise HTTPException(
                status_code=409,
                detail="Configure a valid activation threshold before switching to Auto.",
            ) from exc

        sensor = session.exec(
            select(SensorTable).where(
                SensorTable.id == preference.sensor_id,
                SensorTable.user_id == current_user.id,
                SensorTable.group_id == group_id,
                SensorTable.archived.is_(False),
            )
        ).first()
        if sensor is None:
            raise HTTPException(
                status_code=409,
                detail="The activation sensor must be active and assigned to this group before switching to Auto.",
            )

        real_solenoid = session.exec(
            select(SolenoidTable).where(
                SolenoidTable.group_id == group_id,
                SolenoidTable.user_id == current_user.id,
                SolenoidTable.logger_id != -1,
            )
        ).first()
        if real_solenoid is not None:
            raise HTTPException(
                status_code=409,
                detail="automatic control is not supported for real solenoids yet.",
            )

    group.irrigation_mode = update.mode
    session.add(group)
    session.commit()
    session.refresh(group)
    return {"mode": group.irrigation_mode}

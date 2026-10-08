from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete
from sqlmodel import Session, select

from app.auth.auth import get_current_user
from app.database import get_session
from app.models.shared import DeploymentWrite
from app.schemas.groups import GroupTable
from app.schemas.shared_cells import GroupCellLink, SharedCellTable
from app.schemas.user_schema import UserTable
from app.services import dirtviz_adapter as dirtviz

router = APIRouter(
    prefix="/api/deployments",
    tags=["Deployment demos"],
    dependencies=[Depends(get_current_user)],
)


def require_group(session, group_uuid, lock=False):
    statement = select(GroupTable).where(
        GroupTable.uuid == group_uuid,
        GroupTable.kind == "deployment",
    )

    if lock:
        statement = statement.with_for_update()

    group = session.exec(statement).first()

    if group is None:
        raise HTTPException(
            404,
            "Deployment not found",
        )
    return group


def member_cells(session, group):
    return session.exec(
        select(SharedCellTable)
        .join(
            GroupCellLink,
            GroupCellLink.shared_cell_uuid == SharedCellTable.uuid,
        )
        .where(GroupCellLink.group_id == group.id)
        .order_by(
            SharedCellTable.cached_name,
            SharedCellTable.cell_id,
        )
    ).all()


def group_header(group):
    return {
        "uuid": str(group.uuid),
        "name": group.name,
        "kind": group.kind,
    }


def group_read(session, group):
    cells = member_cells(session, group)

    return {
        **group_header(group),
        "shared_cell_uuids": [str(cell.uuid) for cell in cells],
        "cells": [dirtviz.public_cell(cell) for cell in cells],
    }


def replace_members(session, group, cell_uuids):
    cells = [
        dirtviz.require_cell(session, cell_uuid)
        for cell_uuid in dict.fromkeys(cell_uuids)
    ]

    session.execute(delete(GroupCellLink).where(GroupCellLink.group_id == group.id))

    for cell in cells:
        session.add(
            GroupCellLink(
                group_id=group.id,
                shared_cell_uuid=cell.uuid,
            )
        )


@router.get("/")
def list_deployments(
    session: Session = Depends(get_session),
):
    groups = session.exec(
        select(GroupTable)
        .where(GroupTable.kind == "deployment")
        .order_by(GroupTable.name, GroupTable.id)
    ).all()

    return [group_read(session, group) for group in groups]


@router.post("/", status_code=201)
def create_deployment(
    payload: DeploymentWrite,
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    group = GroupTable(
        name=payload.name,
        user_id=current_user.id,
        kind="deployment",
        irrigation_mode="manual",
    )
    session.add(group)
    session.flush()

    replace_members(
        session,
        group,
        payload.shared_cell_uuids,
    )
    session.commit()
    session.refresh(group)

    return group_read(session, group)


@router.get("/{group_uuid}")
def get_deployment(
    group_uuid: UUID,
    session: Session = Depends(get_session),
):
    group = require_group(session, group_uuid)
    return group_read(session, group)


@router.put("/{group_uuid}")
def update_deployment(
    group_uuid: UUID,
    payload: DeploymentWrite,
    session: Session = Depends(get_session),
):
    group = require_group(
        session,
        group_uuid,
        lock=True,
    )

    replace_members(
        session,
        group,
        payload.shared_cell_uuids,
    )

    group.name = payload.name
    session.add(group)
    session.commit()
    session.refresh(group)
    return group_read(session, group)


@router.delete("/{group_uuid}", status_code=204)
def delete_deployment(
    group_uuid: UUID,
    session: Session = Depends(get_session),
):
    group = require_group(
        session,
        group_uuid,
        lock=True,
    )

    session.execute(delete(GroupCellLink).where(GroupCellLink.group_id == group.id))

    session.delete(group)
    session.commit()

    return Response(status_code=204)


@router.get("/{group_uuid}/catalog")
async def deployment_catalog(
    group_uuid: UUID,
    session: Session = Depends(get_session),
):
    group = require_group(session, group_uuid)
    cells = member_cells(session, group)
    catalogs = [await dirtviz.safe_catalog(cell) for cell in cells]

    return {
        "group": group_header(group),
        "cells": catalogs,
    }


@router.get("/{group_uuid}/availability")
async def deployment_availability(
    group_uuid: UUID,
    session: Session = Depends(get_session),
):
    group = require_group(session, group_uuid)
    return await dirtviz.availability(member_cells(session, group))

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth.auth import get_current_user
from app.database import get_session
from app.models.shared import (
    CellMetadata,
    Resample,
    SelectCell,
    ToggleCell,
)
from app.services import dirtviz_adapter as dirtviz

router = APIRouter(
    prefix="/api/shared-cells",
    tags=["Shared Dirtviz Cells"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def list_selected(
    session: Session = Depends(get_session),
):
    return [dirtviz.public_cell(row) for row in dirtviz.selected_cells(session)]


@router.get("/available")
async def list_available(session: Session = Depends(get_session)):
    return await dirtviz.available_cells(session)


@router.post("/")
async def select_existing(
    payload: SelectCell,
    session: Session = Depends(get_session),
):
    return await dirtviz.select_cell(
        session,
        payload.cell_id,
    )


@router.post("/register")
async def register(
    payload: CellMetadata,
    session: Session = Depends(get_session),
):
    return await dirtviz.register_cell(
        session,
        payload,
    )


@router.patch("/{cell_uuid}")
def set_enabled(
    cell_uuid: UUID,
    payload: ToggleCell,
    session: Session = Depends(get_session),
):
    row = dirtviz.require_cell(session, cell_uuid)
    row.enabled = payload.enabled

    session.add(row)
    session.commit()
    session.refresh(row)

    return dirtviz.public_cell(row)


@router.get("/{cell_uuid}/metadata")
async def get_metadata(
    cell_uuid: UUID,
    session: Session = Depends(get_session),
):
    row = dirtviz.require_cell(session, cell_uuid)
    return await dirtviz.remote_cell(row.cell_id)


@router.put("/{cell_uuid}/metadata")
async def put_metadata(
    cell_uuid: UUID,
    payload: CellMetadata,
    session: Session = Depends(get_session),
):
    row = dirtviz.require_cell(session, cell_uuid)
    return await dirtviz.update_metadata(
        session,
        row,
        payload,
    )


@router.get("/{cell_uuid}/catalog")
async def get_catalog(
    cell_uuid: UUID,
    session: Session = Depends(get_session),
):
    row = dirtviz.require_cell(session, cell_uuid)
    return await dirtviz.safe_catalog(row)


@router.get("/{cell_uuid}/history")
async def get_history(
    cell_uuid: UUID,
    start: datetime,
    end: datetime,
    resample: Resample = "hour",
    session: Session = Depends(get_session),
):
    row = dirtviz.require_cell(
        session,
        cell_uuid,
        enabled=True,
    )

    return await dirtviz.history(
        row,
        start,
        end,
        resample,
    )


@router.get("/{cell_uuid}/availability")
async def get_availability(
    cell_uuid: UUID,
    session: Session = Depends(get_session),
):
    row = dirtviz.require_cell(session, cell_uuid)
    return await dirtviz.availability([row])

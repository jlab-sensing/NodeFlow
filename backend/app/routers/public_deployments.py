from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models.shared import Resample
from app.routers.deployments import (
    group_header,
    member_cells,
    require_group,
)
from app.schemas.groups import GroupTable
from app.services import dirtviz_adapter as dirtviz

router = APIRouter(
    prefix="/api/public/deployments",
    tags=["Public deployment demos"],
)

CELL_FIELDS = (
    "uuid",
    "source_instance",
    "cell_id",
    "name",
    "enabled",
)

CHANNEL_FIELDS = (
    "key",
    "source",
    "sensor_id",
    "field",
    "cell_id",
    "name",
    "measurement",
    "unit",
    "data_type",
    "has_data",
)
SOURCE_ERROR = "This data source could not be loaded"


def pick(value, fields):
    return {field: value[field] for field in fields if field in value}


def enabled_members(session, group):
    return [cell for cell in member_cells(session, group) if cell.enabled]


def public_issues(issues):
    return [
        {
            "scope": issue.get("scope", "source"),
            "error": SOURCE_ERROR,
        }
        for issue in issues
    ]


def public_channel(channel):
    result = pick(channel, CHANNEL_FIELDS)

    if channel.get("error"):
        result["error"] = SOURCE_ERROR

    return result


def public_catalog(value):
    return {
        **pick(value, CELL_FIELDS),
        "status": value["status"],
        "channels": [public_channel(channel) for channel in value.get("channels", [])],
        "entries": [
            {"panel_id": entry["panel_id"]} for entry in value.get("entries", [])
        ],
        "errors": public_issues(value.get("errors", [])),
    }


def public_result(result, fields):
    if result.get("status") != "ready":
        return {
            "status": "error",
            "data": None,
            "error": SOURCE_ERROR,
        }

    return {
        "status": "ready",
        "data": pick(result["data"], fields),
    }


def unavailable(exc):
    status = 502 if exc.status_code >= 500 else exc.status_code

    return HTTPException(
        status,
        "Deployment data is currently unavailable",
    )


@router.get("/")
def list_public_deployments(
    session: Session = Depends(get_session),
):
    groups = session.exec(
        select(GroupTable)
        .where(GroupTable.kind == "deployment")
        .order_by(GroupTable.name, GroupTable.id)
    ).all()

    result = []

    for group in groups:
        cells = enabled_members(session, group)

        result.append(
            {
                **group_header(group),
                "shared_cell_uuids": [str(cell.uuid) for cell in cells],
                "cells": [dirtviz.public_cell(cell) for cell in cells],
            }
        )

    return result


@router.get("/{group_uuid}/catalog")
async def deployment_catalog(
    group_uuid: UUID,
    session: Session = Depends(get_session),
):
    group = require_group(session, group_uuid)

    catalogs = [
        public_catalog(await dirtviz.safe_catalog(cell))
        for cell in enabled_members(session, group)
    ]

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

    try:
        result = await dirtviz.availability(enabled_members(session, group))
    except HTTPException as exc:
        raise unavailable(exc) from exc

    return {
        "earliest_timestamp": result.get("earliest_timestamp"),
        "latest_timestamp": result.get("latest_timestamp"),
        "has_recent_data": result.get("has_recent_data", False),
    }


@router.get("/{group_uuid}/cells/{cell_uuid}/history")
async def deployment_cell_history(
    group_uuid: UUID,
    cell_uuid: UUID,
    start: datetime,
    end: datetime,
    resample: Resample = "hour",
    session: Session = Depends(get_session),
):
    group = require_group(session, group_uuid)

    cell = next(
        (
            candidate
            for candidate in enabled_members(session, group)
            if candidate.uuid == cell_uuid
        ),
        None,
    )

    if cell is None:
        raise HTTPException(
            404,
            "Cell is not available in this deployment",
        )

    dirtviz.history_params(start, end, resample)

    try:
        result = await dirtviz.history(cell, start, end, resample)
    except HTTPException as exc:
        raise unavailable(exc) from exc

    return {
        "cell": pick(result["cell"], CELL_FIELDS),
        "power": public_result(
            result["power"],
            ("timestamp", "v", "i", "p"),
        ),
        "teros": public_result(
            result["teros"],
            (
                "timestamp",
                "vwc",
                "temp",
                "ec",
                "raw_vwc",
                "vwc_unit",
                "raw_vwc_unit",
            ),
        ),
        "sensors": {
            sensor_id: public_result(
                series,
                (
                    "timestamp",
                    "data",
                    "measurement",
                    "unit",
                    "type",
                ),
            )
            for sensor_id, series in result["sensors"].items()
        },
        "errors": public_issues(result.get("errors", [])),
    }

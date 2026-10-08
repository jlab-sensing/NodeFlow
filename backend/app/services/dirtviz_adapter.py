import asyncio
import math
from collections import Counter
from datetime import datetime, timezone
from email.utils import format_datetime, parsedate_to_datetime
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.models.shared import CellMetadata
from app.schemas.shared_cells import SharedCellTable
from app.services.ents_client import (
    ents_get,
    ents_post,
    ents_put,
    get_ents_source_instance,
)


def error_text(exc):
    if isinstance(exc, HTTPException):
        return str(exc.detail)
    return str(exc)


async def upstream(method, path, **kwargs):
    function = {
        "GET": ents_get,
        "POST": ents_post,
        "PUT": ents_put,
    }[method]

    try:
        return await function(path, **kwargs)
    except HTTPException as exc:
        if exc.status_code in (401, 403) or exc.status_code >= 500:
            raise HTTPException(502, f"Dirtviz request failed: {exc.detail}") from exc
        raise
    except ValueError as exc:
        raise HTTPException(
            502,
            "Dirtviz returned invalid JSON",
        ) from exc


def public_cell(row):
    return {
        "uuid": str(row.uuid),
        "source_instance": row.source_instance,
        "cell_id": row.cell_id,
        "name": row.cached_name,
        "enabled": row.enabled,
    }


def check_source(row):
    if row.source_instance != get_ents_source_instance():
        raise HTTPException(
            409, "This cell belongs to a different configured dirtviz instance"
        )


def require_cell(
    session: Session,
    cell_uuid: UUID,
    enabled=False,
):
    row = session.get(SharedCellTable, cell_uuid)

    if row is None:
        raise HTTPException(404, "shared cell not found")

    check_source(row)
    if enabled and not row.enabled:
        raise HTTPException(409, "This shared cell is disabled")

    return row


def selected_cells(session: Session):
    return session.exec(
        select(SharedCellTable).order_by(
            SharedCellTable.cached_name,
            SharedCellTable.cell_id,
        )
    ).all()


async def directory():
    get_ents_source_instance()
    rows = await upstream("GET", "/api/cell/")

    if not isinstance(rows, list):
        raise HTTPException(
            502,
            "Dirtviz returned an invalid cell directory",
        )

    ids = set()

    for row in rows:
        if (
            not isinstance(row, dict)
            or type(row.get("id")) is not int
            or row["id"] <= 0
            or not isinstance(row.get("name"), str)
            or row["id"] in ids
        ):
            raise HTTPException(
                502,
                "Dirtviz returned invalid cell identifiers",
            )
        ids.add(row["id"])

    return rows


async def remote_cell(cell_id):
    rows = await directory()

    row = next(
        (candidate for candidate in rows if candidate["id"] == cell_id),
        None,
    )

    if row is None:
        raise HTTPException(
            404,
            "Cell no longer exists in dirtviz",
        )

    return row


def save_selection(session: Session, remote):
    statement = (
        insert(SharedCellTable.__table__)
        .values(
            uuid=uuid4(),
            source_instance=get_ents_source_instance(),
            cell_id=remote["id"],
            cached_name=remote["name"],
            enabled=True,
        )
        .on_conflict_do_update(
            constraint="uq_shared_cell_source_cell",
            set_={
                "cached_name": remote["name"],
                "enabled": True,
            },
        )
        .returning(SharedCellTable.uuid)
    )

    cell_uuid = session.execute(statement).scalar_one()
    session.commit()
    return session.exec(
        select(SharedCellTable)
        .where(SharedCellTable.uuid == cell_uuid)
        .execution_options(populate_existing=True)
    ).one()


async def select_cell(session: Session, cell_id):
    remote = await remote_cell(cell_id)
    return public_cell(save_selection(session, remote))


async def available_cells(session: Session):
    instance = get_ents_source_instance()

    selected = {
        row.cell_id: row
        for row in selected_cells(session)
        if row.source_instance == instance
    }
    rows = await directory()

    return {
        "source_instance": instance,
        "cells": [
            {
                **remote,
                "shared_cell_uuid": (
                    str(selected[remote["id"]].uuid)
                    if remote["id"] in selected
                    else None
                ),
                "enabled": (
                    selected[remote["id"]].enabled if remote["id"] in selected else None
                ),
            }
            for remote in rows
        ],
    }


async def register_cell(session: Session, payload: CellMetadata):
    instance = get_ents_source_instance()
    account = await upstream("GET", "/api/user")

    if not isinstance(account, dict) or not account.get("email"):
        raise HTTPException(
            502,
            "Dirtviz integration account has no email",
        )

    body = {
        **payload.model_dump(),
        "userEmail": account["email"],
        "tag_ids": [],
    }

    try:
        created = await upstream(
            "POST",
            "/api/cell/",
            json=body,
        )
    except HTTPException as exc:
        if exc.status_code < 500:
            raise

        return {
            "status": "outcome_unknown",
            "source_instance": instance,
            "cell_id": None,
            "error": error_text(exc),
            "message": ("refresh available cells before retrying registration"),
        }

    if (
        not isinstance(created, dict)
        or type(created.get("id")) is not int
        or created["id"] <= 0
    ):
        return {
            "status": "outcome_unknown",
            "source_instance": instance,
            "cell_id": None,
            "message": ("Dirtviz did not return a cell Id.refresh available cells"),
        }
    try:
        row = save_selection(
            session,
            {
                "id": created["id"],
                "name": payload.name,
            },
        )

        return {
            "status": "created",
            "cell_id": created["id"],
            "cell": public_cell(row),
        }
    except SQLAlchemyError:
        session.rollback()

        return {
            "status": "created_not_selected",
            "source_instance": instance,
            "cell_id": created["id"],
            "message": ("The cell exists in dirtvizselect it from available cells"),
        }


async def update_metadata(
    session: Session,
    row,
    payload: CellMetadata,
):
    check_source(row)
    snapshot = public_cell(row)

    body = payload.model_dump()
    body["lat"] = body.pop("latitude")
    body["long"] = body.pop("longitude")

    try:
        await upstream(
            "PUT",
            f"/api/cell/{row.cell_id}",
            json=body,
        )
    except HTTPException as exc:
        if exc.status_code < 500:
            raise

        return {
            "status": "outcome_unknown",
            "cell": snapshot,
            "error": error_text(exc),
            "message": ("Refresh metadata to verify whether dirtvizsaved the changes"),
        }
    row.cached_name = payload.name

    try:
        session.add(row)
        session.commit()
    except SQLAlchemyError:
        session.rollback()

        return {
            "status": "updated",
            "cache_updated": False,
            "cell": {
                **snapshot,
                "name": payload.name,
            },
        }

    return {
        "status": "updated",
        "cache_updated": True,
        "cell": public_cell(row),
    }


def validate_definitions(value, cell_id):
    if not isinstance(value, list):
        raise HTTPException(
            502,
            "invalid dirtviz sensor definitions",
        )

    ids = set()

    for row in value:
        if (
            not isinstance(row, dict)
            or type(row.get("id")) is not int
            or row["id"] <= 0
            or row["id"] in ids
            or row.get("cell_id") != cell_id
        ):
            raise HTTPException(
                502,
                "invalid dirtviz sensor identifiers",
            )
        ids.add(row["id"])

    return value


async def catalog(row):
    check_source(row)
    base = public_cell(row)

    if not row.enabled:
        return {
            **base,
            "status": "disabled",
            "channels": [],
            "entries": [],
            "errors": [],
            "metadata": None,
        }

    metadata = await remote_cell(row.cell_id)

    definitions, listing = await asyncio.gather(
        upstream(
            "GET",
            f"/api/cell/{row.cell_id}/sensors",
        ),
        upstream(
            "GET",
            "/api/catalog/sensors",
            params={"cell_id": row.cell_id},
        ),
        return_exceptions=True,
    )
    errors = []

    try:
        if isinstance(definitions, Exception):
            raise definitions

        definitions = validate_definitions(
            definitions,
            row.cell_id,
        )
    except (HTTPException, ValueError, TypeError) as exc:
        errors.append(
            {
                "scope": "definitions",
                "error": error_text(exc),
            }
        )
        definitions = []
    catalog_available = True

    try:
        if isinstance(listing, Exception):
            raise listing

        entries = listing.get("entries") if isinstance(listing, dict) else None

        if not isinstance(entries, list) or any(
            not isinstance(entry, dict) or not isinstance(entry.get("panel_id"), str)
            for entry in entries
        ):
            raise HTTPException(
                502,
                "invalid dirtviz chart catalog",
            )
    except (HTTPException, ValueError, TypeError) as exc:
        errors.append(
            {
                "scope": "catalog",
                "error": error_text(exc),
            }
        )
        entries = []
        catalog_available = False

    counts = Counter(
        (
            str(item.get("name") or "").lower(),
            str(item.get("measurement") or "").lower(),
        )
        for item in definitions
    )

    data_ids = {
        entry.get("sensor_id")
        for entry in entries
        if entry.get("kind") == "sensor" and type(entry.get("sensor_id")) is int
    }
    channels = []

    for definition in definitions:
        name = definition.get("name")
        measurement = definition.get("measurement")
        dtype = definition.get("data_type")
        error = None

        if not isinstance(name, str) or not name.strip():
            error = "Sensor has no queryable name"
        elif not isinstance(measurement, str) or not measurement.strip():
            error = "sensor has no queryable measurement"
        elif counts[(name.lower(), measurement.lower())] > 1:
            error = "ambiguous name/measurement tuple; cannot identify its history"
        elif dtype not in ("int", "float", "text"):
            error = f"Unsupported sensor data type: {dtype}"

        channel = {
            "key": f"sensor:{definition['id']}",
            "source": "sensor",
            "sensor_id": definition["id"],
            "cell_id": row.cell_id,
            "name": name or "",
            "measurement": measurement or "",
            "unit": definition.get("unit") or "",
            "data_type": dtype,
            "has_data": (definition["id"] in data_ids if catalog_available else None),
        }

        if error:
            channel["error"] = error
            errors.append(
                {
                    "scope": channel["key"],
                    "error": error,
                }
            )

        channels.append(channel)

    panel_ids = {entry["panel_id"] for entry in entries}

    legacy = [
        ("power", "v", "Voltage", "mV"),
        ("power", "i", "Current", "µA"),
        ("power", "p", "Power", "µW"),
        ("teros", "vwc", "VWC", "%"),
        ("teros", "temp", "Temperature", "°C"),
        ("teros", "ec", "EC", "µS/cm"),
        ("teros", "raw_vwc", "Raw VWC", "raw"),
    ]

    for source, field, name, unit in legacy:
        relevant_panels = (
            {"power-vi", "power-p"} if source == "power" else {"teros", "temp"}
        )

        present = bool(panel_ids & relevant_panels)

        if present or not catalog_available:
            channels.append(
                {
                    "key": f"{source}:{field}",
                    "source": source,
                    "field": field,
                    "cell_id": row.cell_id,
                    "name": name,
                    "measurement": name,
                    "unit": unit,
                    "data_type": "float",
                    "has_data": (present if catalog_available else None),
                }
            )
    return {
        **base,
        "name": metadata["name"],
        "metadata": metadata,
        "status": "partial" if errors else "ready",
        "channels": channels,
        "entries": entries,
        "errors": errors,
    }


async def safe_catalog(row):
    try:
        return await catalog(row)
    except HTTPException as exc:
        return {
            **public_cell(row),
            "status": "error",
            "channels": [],
            "entries": [],
            "metadata": None,
            "errors": [{"scope": "cell", "error": error_text(exc)}],
        }


def validata_numeric(value):
    if value is None:
        return value

    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise HTTPException(
            502,
            "dirtviz returned an invalid numeric output",
        )
    if isinstance(value, str) and not value.strip():
        raise HTTPException(
            502,
            "dirtviz returned a blank numeric value",
        )

    try:
        converted = float(value)
    except (ValueError, OverflowError) as exc:
        raise HTTPException(502, "dirtviz returned an invalid numeric value") from exc

    if not math.isfinite(converted):
        raise HTTPException(
            502,
            "dirtviz returned a non-finite numeric value",
        )

    return value


def validate_payload(payload, fields, dtype="float"):
    if not isinstance(payload, dict) or not isinstance(payload.get("timestamp"), list):
        raise HTTPException(
            502,
            "dirtviz returned invalid history",
        )

    timestamps = payload["timestamp"]

    try:
        for timestamp in timestamps:
            if not isinstance(timestamp, str):
                raise ValueError("non string timestamp")

            parsed = parsedate_to_datetime(timestamp)

            if parsed.utcoffset() is None:
                raise ValueError("timestamp has no timezone")

    except (TypeError, ValueError, OverflowError) as exc:
        raise HTTPException(
            502,
            "dirtviz returned an invalid HTTP timestamp",
        ) from exc

    for field in fields:
        values = payload.get(field)

        if not isinstance(values, list) or len(values) != len(timestamps):
            raise HTTPException(
                502,
                f"mismatched timestamp/{field} arrays",
            )

        if dtype == "text":
            if any(
                value is not None and not isinstance(value, str) for value in values
            ):
                raise HTTPException(
                    502,
                    "dirtviz returned invalid text values",
                )
        else:
            for value in values:
                validata_numeric(value)

    return payload


def history_params(
    start: datetime,
    end: datetime,
    resample,
):
    if start.utcoffset() is None or end.utcoffset() is None:
        raise HTTPException(
            422,
            "start and end must include timezone offsets",
        )
    if start > end:
        raise HTTPException(
            422,
            "start must not exceed end",
        )

    return {
        "startTime": format_datetime(
            start.astimezone(timezone.utc),
            usegmt=True,
        ),
        "endTime": format_datetime(
            end.astimezone(timezone.utc),
            usegmt=True,
        ),
        "resample": resample,
        "stream": "false",
    }


async def history(row, start, end, resample):
    check_source(row)
    params = history_params(start, end, resample)

    if not row.enabled:
        raise HTTPException(
            409,
            "this shared cell is disabled",
        )

    source = await catalog(row)
    gate = asyncio.Semaphore(6)

    async def fetch(path, fields, query, dtype="float"):
        try:
            async with gate:
                payload = await upstream(
                    "GET",
                    path,
                    params=query,
                )
            return {
                "status": "ready",
                "data": validate_payload(
                    payload,
                    fields,
                    dtype,
                ),
            }
        except HTTPException as exc:
            return {
                "status": "error",
                "data": None,
                "error": error_text(exc),
            }

    async def generic(channel):
        if channel.get("error"):
            return {
                "status": "error",
                "data": None,
                "error": channel["error"],
            }

        query = {
            **params,
            "cellId": row.cell_id,
            "name": channel["name"],
            "measurement": channel["measurement"],
        }

        if channel["data_type"] == "text":
            query["resample"] = "none"

        return await fetch(
            "/api/sensor/",
            ["data"],
            query,
            channel["data_type"],
        )

    sensors = [
        channel for channel in source["channels"] if channel["source"] == "sensor"
    ]

    results = await asyncio.gather(
        fetch(
            f"/api/power/{row.cell_id}",
            ["v", "i", "p"],
            params,
        ),
        fetch(
            f"/api/teros/{row.cell_id}",
            ["vwc", "temp", "ec", "raw_vwc"],
            params,
        ),
        *(generic(channel) for channel in sensors),
    )

    return {
        "cell": {
            **public_cell(row),
            "name": source["name"],
        },
        "power": results[0],
        "teros": results[1],
        "sensors": {
            str(channel["sensor_id"]): result
            for channel, result in zip(
                sensors,
                results[2:],
            )
        },
        "errors": source["errors"],
    }


async def availability(rows):
    enabled = [row for row in rows if row.enabled]

    for row in enabled:
        check_source(row)

    ids = sorted({row.cell_id for row in enabled})

    if not ids:
        return {
            "earliest_timestamp": None,
            "latest_timestamp": None,
            "has_recent_data": False,
        }

    result = await upstream(
        "GET",
        "/api/data-availability",
        params={
            "cell_ids": ",".join(map(str, ids)),
        },
    )

    if (
        not isinstance(result, dict)
        or "latest_timestamp" not in result
        or "earliest_timestamp" not in result
    ):
        raise HTTPException(
            502,
            "dirtviz returned invalid availability",
        )
    return result

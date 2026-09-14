from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlmodel import Session, select

from app.auth.auth import get_current_user
from app.database import get_session
from app.models.logger import (
    LoggerCreate,
    LoggerRead,
    LoggerUpdate,
)
from app.schemas.sensor import SensorTable
from app.schemas.solenoid import SolenoidTable
from app.schemas.user_schema import UserTable
from app.services.logger_service import (
    create_shared_logger,
    delete_shared_logger,
    get_shared_logger,
    list_shared_loggers,
    update_shared_logger,
)

router = APIRouter(prefix="/api/logger", tags=["Loggers"])


@router.get("/", response_model=list[LoggerRead])
async def list_loggers(_current_user: UserTable = Depends(get_current_user)):
    return await list_shared_loggers()
    # _current_user means the value is required for auth, but not used


@router.post("/", response_model=LoggerRead, status_code=status.HTTP_201_CREATED)
async def add_new_logger(
    logger: LoggerCreate, _current_user: UserTable = Depends(get_current_user)
):
    return await create_shared_logger(logger)


@router.get("/{logger_id}", response_model=LoggerRead)
async def get_specific_logger(
    logger_id: int, _current_user: UserTable = Depends(get_current_user)
):
    return await get_shared_logger(logger_id)


@router.put("/{logger_id}", response_model=LoggerRead)
async def update_logger(
    logger_id: int,
    update: LoggerUpdate,
    _current_user: UserTable = Depends(get_current_user),
):
    return await update_shared_logger(logger_id, update)


@router.delete("/{logger_id}")
async def delete_logger(
    logger_id: int,
    session: Session = Depends(get_session),
    _current_user: UserTable = Depends(get_current_user),
):
    await get_shared_logger(logger_id)
    sensor = session.exec(
        select(SensorTable).where(
            SensorTable.logger_id == logger_id,
        )
    ).first()
    solenoid = session.exec(
        select(SolenoidTable).where(
            SolenoidTable.logger_id == logger_id,
        )
    ).first()

    if sensor is not None or solenoid is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This logger is assigned to NodeFlow hardware. Reassign or remove that hardware before deleting the logger",
        )
    return await delete_shared_logger(logger_id)

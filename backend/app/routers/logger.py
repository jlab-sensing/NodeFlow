from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.schemas.logger import LoggerTable
from app.models.logger import LoggerCreate, LoggerRead
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/api/logger", tags=["Loggers"])

@router.get("/", response_model=List[LoggerRead])
def list_loggers(session: Session = Depends(get_session)):
    return session.exec(select(LoggerTable)).all()

@router.post("/", response_model=LoggerRead, status_code=status.HTTP_201_CREATED)
def add_new_logger(logger: LoggerCreate, session: Session = Depends(get_session)):
    existing = session.exec(
        select(LoggerTable).where(
            LoggerTable.logger_id == logger.logger_id,
        )
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Logger ID {logger.logger_id} is already registered",
        )
    db_logger = LoggerTable.model_validate(logger)
    session.add(db_logger)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Logger ID {logger.logger_id} is already registered",
        ) from exc
    session.refresh(db_logger)
    return db_logger

@router.get("/{logger_id}", response_model=LoggerRead)
def get_specific_logger(logger_id: int, session: Session = Depends(get_session)):
    statement = select(LoggerTable).where(LoggerTable.logger_id == logger_id)
    logger = session.exec(statement).first()
    if not logger:
        raise HTTPException(status_code=404, detail="Logger not found")
    return logger

@router.delete("/{logger_id}")
def delete_logger(logger_id: int, session: Session = Depends(get_session)):
    statement = select(LoggerTable).where(LoggerTable.logger_id == logger_id)
    logger = session.exec(statement).first()
    if not logger:
        raise HTTPException(status_code=404, detail="Logger not found")
    session.delete(logger)
    session.commit()
    return {"ok": True}
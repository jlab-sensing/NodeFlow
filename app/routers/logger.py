from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.schemas.logger import LoggerTable

router = APIRouter(prefix="/api/logger", tags=["Loggers"])

@router.get("/", response_model=List[LoggerTable])
def list_loggers(session: Session = Depends(get_session)):
    return session.exec(select(LoggerTable)).all()

@router.post("/", status_code=status.HTTP_201_CREATED)
def add_new_logger(logger: LoggerTable, session: Session = Depends(get_session)):
    """Adds a new logger"""
    session.add(logger)
    session.commit()
    session.refresh(logger)
    return {"message": "Logger registered successfully"}

@router.get("/{logger_id}", response_model=LoggerTable)
def get_specific_logger(logger_id: int, session: Session = Depends(get_session)):
    """Gets information about a specific logger"""
    logger = session.get(LoggerTable, logger_id)
    if not logger:
        raise HTTPException(status_code=404, detail="Logger not found")
    return logger

@router.delete("/{logger_id}")
def delete_logger(logger_id: int, session: Session = Depends(get_session)):
    """Deletes a specific logger"""
    logger = session.get(LoggerTable, logger_id)
    if not logger:
        raise HTTPException(status_code=404, detail="Logger not found")
    session.delete(logger)
    session.commit()
    return {"message": "Logger deleted successfully"}
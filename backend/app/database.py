from sqlmodel import create_engine, Session, SQLModel
from fastapi import Depends
from typing import Generator

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    """Initializes the database and creates tables based on schemas."""
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator:
    """Dependency to provide a database session to routers."""
    with Session(engine) as session:
        yield session
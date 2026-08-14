import os
from urllib.parse import quote_plus

from sqlmodel import create_engine, Session, SQLModel
from typing import Generator


def get_database_url() -> str:
    """Build the Postgres connection URL from environment variables."""
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    user = quote_plus(os.getenv("DB_USER", "nodeflow"))
    password = quote_plus(os.getenv("DB_PASS", "nf_password"))
    host = os.getenv("DB_HOST", "postgresql")
    port = os.getenv("DB_PORT", "5432")
    database = os.getenv("DB_DATABASE", "nodeflow")

    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"


engine = create_engine(get_database_url())

def get_session() -> Generator:
    """Dependency to provide a database session to routers."""
    with Session(engine) as session:
        yield session

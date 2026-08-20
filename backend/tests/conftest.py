import os
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from pytest_postgresql.janitor import DatabaseJanitor

from urllib.parse import quote_plus
from sqlalchemy.engine import make_url
from app.auth.auth import get_current_user

from app.database import get_session
from app.main import fastapi_app

from app.schemas.groups import GroupTable
from app.schemas.logger import LoggerTable
from app.schemas.preferences import ActivationPrefTable, NotificationPrefTable
from app.schemas.sensor import SensorTable
from app.schemas.sensor_reading import SensorReadingTable
from app.schemas.solenoid import SolenoidTable
from app.schemas.user_schema import UserTable, OAuthTokenTable

@pytest.fixture(autouse=True)
def test_environment(monkeypatch):
    monkeypatch.setenv(
        "ACCESS_TOKEN_SECRET",
        "nodeflow-test-access-secret",
    )
    monkeypatch.setenv(
        "REFRESH_TOKEN_SECRET",
        "nodeflow-test-refresh-secret",
    )
    monkeypatch.setenv(
        "REFRESH_COOKIE_SECURE",
        "false",
    )

@pytest.fixture(scope="session")
def database_url(request):
    external_url = os.getenv("TEST_DATABASE_URL")

    if external_url:
        database_name = make_url(external_url).database or ""

        if "test" not in database_name.lower():
            raise RuntimeError(
                "Refusing to run tests against a database "
                f"that does not look like a test database: {database_name!r}"
            )
        yield external_url
        return

    postgres = request.getfixturevalue("postgresql_proc")

    username = quote_plus(str(postgres.user))
    password = quote_plus(str(postgres.password or ""))
    host = postgres.host
    port = postgres.port
    database = postgres.dbname

    url = (
        f"postgresql+psycopg2://"
        f"{username}:{password}@"
        f"{host}:{port}/{database}"
    )
    database_name = make_url(url).database or ""

    if "test" not in database_name.lower():
        raise RuntimeError(
            "Refusing to run tests against a database "
            f"that does not look like a test database: {database_name!r}"
        )

    janitor = DatabaseJanitor(
        user=postgres.user,
        password=postgres.password,
        host=postgres.host,
        port=postgres.port,
        dbname=postgres.dbname,
        template_dbname=postgres.template_dbname,
        version=postgres.version,
    )
    with janitor:
        yield url


@pytest.fixture(scope="session")
def test_engine(database_url):
    engine = create_engine(database_url)

    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    yield engine

    SQLModel.metadata.drop_all(engine)
    engine.dispose()

@pytest.fixture
def db_session(test_engine):
    with Session(test_engine) as session:
        try:
            yield session
        finally:
            session.rollback()
    
    SQLModel.metadata.drop_all(test_engine)
    SQLModel.metadata.create_all(test_engine)

@pytest.fixture
def client(db_session):
    def override_get_session():
        yield db_session
    
    fastapi_app.dependency_overrides[get_session] = override_get_session

    test_client = TestClient(fastapi_app)

    try:
        yield test_client
    finally:
        test_client.close()
        fastapi_app.dependency_overrides.pop(
            get_session,
            None,
        )

@pytest.fixture
def test_user(db_session):
    user = UserTable(
        first_name="Test",
        last_name="User",
        email="test@example.com",
        password="",
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    return user

@pytest.fixture
def authenticated_client(client, test_user):
    fastapi_app.dependency_overrides[get_current_user] = lambda: test_user
    try:
        yield client
    finally:
        fastapi_app.dependency_overrides.pop(
            get_current_user,
            None,
        )

@pytest.fixture
def anyio_backend():
    return "asyncio"

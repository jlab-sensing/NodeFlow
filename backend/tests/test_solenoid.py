from unittest.mock import AsyncMock
import httpx
from app.schemas.groups import GroupTable
from app.schemas.solenoid import SolenoidTable
from app.schemas.user_schema import UserTable
from app.schemas.logger import LoggerTable

def create_user(
    db_session,
    email="other@example.com",
):
    user = UserTable(
        first_name="Other",
        last_name="User",
        email=email,
        password="",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def create_group(db_session, user_id, name="Test group"):
    group = GroupTable(
        name=name,
        user_id=user_id,
    )
    db_session.add(group)
    db_session.commit()
    db_session.refresh(group)
    return group

def create_solenoid(
    db_session,
    user_id,
    name="Test Solenoid",
    logger_id=123,
    active_state="closed",
    group_id=None,
    archived=False,
):
    solenoid = SolenoidTable(
        user_id=user_id,
        name=name,
        active_state=active_state,
        logger_id=logger_id,
        group_id=group_id,
        archived=archived,
    )
    db_session.add(solenoid)
    db_session.commit()
    db_session.refresh(solenoid)
    return solenoid

def create_logger(
    db_session,
    user_id,
    logger_id=123,
):
    logger = LoggerTable(
        user_id=user_id,
        logger_id=logger_id,
        update_interval=60,
    )
    db_session.add(logger)
    db_session.commit()
    db_session.refresh(logger)
    return logger

def mock_successful_close(monkeypatch):
    async def close_and_persist(solenoid, session):
        solenoid.active_state = "closed"
        session.add(solenoid)
        session.commit()
        session.refresh(solenoid)
        return solenoid
    close_mock = AsyncMock(side_effect=close_and_persist)
    monkeypatch.setattr(
        "app.routers.solenoid.close_solenoid",
        close_mock,
    )
    return close_mock

def reload_solenoid(db_session, solenoid_id):
    db_session.expire_all()
    return db_session.get(SolenoidTable, solenoid_id)

def test_list_solenoids_returns_only_current_users_active_solenoids(
    authenticated_client,
    db_session,
    test_user,
):
    active_solenoid = create_solenoid(
        db_session,
        test_user.id,
        name="Active Solenoid",
        logger_id=101,
    )
    create_solenoid(
        db_session,
        test_user.id,
        name="Archived Solenoid",
        logger_id=102,
        archived=True,
    )
    other_user = create_user(db_session)
    create_solenoid(
        db_session,
        other_user.id,
        name="Other User Solenoid",
        logger_id=103,
    )
    response = authenticated_client.get("/api/solenoid/")
    assert response.status_code == 200
    returned_ids = {
        solenoid["id"]
        for solenoid in response.json()
    }
    assert returned_ids == {active_solenoid.id}

def test_list_solenoids_can_include_archived_solenoids(
    authenticated_client,
    db_session,
    test_user,
):
    active_solenoid = create_solenoid(
        db_session,
        test_user.id,
        name="Active Solenoid",
        logger_id=201,
    )
    archived_solenoid = create_solenoid(
        db_session,
        test_user.id,
        name="Archived Solenoid",
        logger_id=202,
        archived=True,
    )

    response = authenticated_client.get(
        "/api/solenoid/",
        params={"include_archived": True},
    )
    assert response.status_code == 200
    returned_ids = {
        solenoid["id"]
        for solenoid in response.json()
    }
    assert returned_ids == {
        active_solenoid.id,
        archived_solenoid.id,
    }

def test_list_solenoids_require_authentication(client):
    response = client.get("/api/solenoid/")
    assert response.status_code == 401

def test_archive_open_solenoid_closes_it_first(
    authenticated_client,
    db_session,
    test_user,
    monkeypatch,
):
    solenoid = create_solenoid(
        db_session,
        test_user.id,
        active_state="open",
    )
    close_mock= mock_successful_close(monkeypatch)
    response = authenticated_client.patch(
        f"/api/solenoid/{solenoid.id}/archive",
        json={"archived": True},
    )
    assert response.status_code == 200
    close_mock.assert_awaited_once()

    stored_solenoid = reload_solenoid(
        db_session,
        solenoid.id,
    )
    assert stored_solenoid is not None
    assert stored_solenoid.active_state == "closed"
    assert stored_solenoid.archived is True

def  test_archive_closed_solenoid_does_not_close_it_again(
    authenticated_client,
    db_session,
    test_user,
    monkeypatch
):
    solenoid = create_solenoid(
        db_session,
        test_user.id,
        active_state="closed",
    )
    close_mock = AsyncMock()
    monkeypatch.setattr(
        "app.routers.solenoid.close_solenoid",
        close_mock,
    )
    response = authenticated_client.patch(
        f"/api/solenoid/{solenoid.id}/archive",
        json={"archived": True},
    )
    assert response.status_code == 200
    close_mock.assert_not_awaited()

    stored_solenoid = reload_solenoid(
        db_session,
        solenoid.id,
    )
    assert stored_solenoid is not None
    assert stored_solenoid.active_state == "closed"
    assert stored_solenoid.archived is True

def test_archive_solenoid_clears_group(
    authenticated_client,
    db_session,
    test_user,
    monkeypatch,
):
    group = create_group(
        db_session,
        test_user.id,
    )
    solenoid = create_solenoid(
        db_session,
        test_user.id,
        active_state="open",
        group_id=group.uuid
    )
    mock_successful_close(monkeypatch)
    response = authenticated_client.patch(
        f"/api/solenoid/{solenoid.id}/archive",
        json={"archived": True},
    )
    assert response.status_code == 200
    assert response.json()["group_id"] is None

    stored_solenoid = reload_solenoid(
        db_session,
        solenoid.id,
    )
    assert stored_solenoid is not None
    assert stored_solenoid.group_id is None
    assert stored_solenoid.archived is True

def test_archive_solenoid_aborts_when_close_fails(
    authenticated_client,
    db_session,
    test_user,
    monkeypatch,
):
    group = create_group(
        db_session,
        test_user.id,
    )
    solenoid = create_solenoid(
        db_session,
        test_user.id,
        active_state="open",
        group_id=group.uuid,
    )
    close_mock = AsyncMock(
        side_effect=httpx.ConnectError("solenoid simulator unavailable")
    )
    monkeypatch.setattr(
        "app.routers.solenoid.close_solenoid",
        close_mock,
    )
    response = authenticated_client.patch(
        f"/api/solenoid/{solenoid.id}/archive",
        json={"archived": True},
    )
    assert response.status_code == 503
    close_mock.assert_awaited_once()
    stored_solenoid = reload_solenoid(
        db_session,
        solenoid.id,
    )
    assert stored_solenoid is not None
    assert stored_solenoid.active_state == "open"
    assert stored_solenoid.archived is False
    assert stored_solenoid.group_id == group.uuid

def test_restore_solenoid_keeps_it_closed_and_ungrouped(
    authenticated_client,
    db_session,
    test_user,
    monkeypatch,
):
    solenoid = create_solenoid(
        db_session,
        test_user.id,
        active_state="closed",
        group_id=None,
        archived=True,
    )
    close_mock = AsyncMock()
    monkeypatch.setattr(
        "app.routers.solenoid.close_solenoid",
        close_mock,
    )
    response = authenticated_client.patch(
        f"/api/solenoid/{solenoid.id}/archive",
        json={"archived": False},
    )
    assert response.status_code == 200
    close_mock.assert_not_awaited()
    stored_solenoid = reload_solenoid(
        db_session,
        solenoid.id,
    )
    assert stored_solenoid is not None
    assert stored_solenoid.archived is False
    assert stored_solenoid.active_state == "closed"
    assert stored_solenoid.group_id is None

def test_cannot_archive_another_users_solenoid(
    authenticated_client,
    db_session,
    monkeypatch,
):
    other_user = create_user(db_session)
    solenoid = create_solenoid(
        db_session,
        other_user.id,
        active_state="open",
    )
    close_mock = AsyncMock()
    monkeypatch.setattr(
        "app.routers.solenoid.close_solenoid",
        close_mock,
    )
    response = authenticated_client.patch(
        f"/api/solenoid/{solenoid.id}/archive",
        json={"archived": True},
    )
    assert response.status_code == 404
    assert response.json() == {
        "detail": "Solenoid not found",
    }
    close_mock.assert_not_awaited()
    stored_solenoid = reload_solenoid(
        db_session,
        solenoid.id,
    )
    assert stored_solenoid is not None
    assert stored_solenoid.archived is False
    assert stored_solenoid.active_state == "open"

def test_archive_missing_solenoid_returns_not_found(
    authenticated_client,
    monkeypatch,
):
    close_mock = AsyncMock()
    monkeypatch.setattr(
        "app.routers.solenoid.close_solenoid",
        close_mock,
    )
    response = authenticated_client.patch(
        "/api/solenoid/999999/archive",
        json={"archived": True},
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Solenoid not found",
    }
    close_mock.assert_not_awaited()

def test_create_solenoid_assigns_owner_and_closed_state(
    authenticated_client,
    db_session,
    test_user
):
    create_logger(
        db_session,
        test_user.id,
        logger_id=301,
    )
    response = authenticated_client.post(
        "/api/solenoid/",
        json={
            "name": "Greenhouse Valve",
            "logger_id":301,
            "group_id": None,
        },
    )
    assert response.status_code == 201

    payload = response.json()
    assert payload["user_id"] == str(test_user.id)
    assert payload["name"] == "Greenhouse Valve"
    assert payload["active_state"] == "closed"
    assert payload["archived"] is False
    assert "id" in payload
    assert "uuid" in payload
    assert "date_created" in payload

def test_create_solenoid_requires_owned_logger(
    authenticated_client,
):
    response = authenticated_client.post(
        "/api/solenoid/",
        json={
            "name": "Greenhouse Valve",
            "logger_id": 999,
            "group_id": None,
        },
    )
    assert response.status_code == 404
    assert response.json() == {
        "detail": "Logger not found",
    }

def test_update_solenoid_preserves_state_and_owner(
    authenticated_client,
    db_session,
    test_user,
): 
    create_logger(
        db_session,
        test_user.id,
        logger_id=401,
    )
    create_logger(
        db_session,
        test_user.id,
        logger_id=402,
    )
    solenoid = create_solenoid(
        db_session,
        test_user.id,
        name="Original Name",
        logger_id=401,
        active_state="closed",
    )
    response = authenticated_client.put(
        f"/api/solenoid/{solenoid.id}",
        json={
            "name": "Updated Name",
            "logger_id": 402,
            "group_id": None,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == solenoid.id
    assert payload["uuid"] == str(solenoid.uuid)
    assert payload["user_id"] == str(test_user.id)
    assert payload["name"] == "Updated Name"
    assert payload["active_state"] == "closed"
    assert payload["logger_id"] == 402
    assert payload["archived"] is False
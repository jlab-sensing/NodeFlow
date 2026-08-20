def logger_payload(user_id, logger_id=123):
    return {
        "user_id": str(user_id),
        "logger_id": logger_id,
        "update_interval": 60,
    }

def test_create_logger(client, test_user):
    response = client.post(
        "/api/logger/",
        json=logger_payload(test_user.id)
    )

    assert response.status_code == 201

    payload = response.json()

    assert payload["user_id"] == str(test_user.id)
    assert payload["logger_id"] == 123
    assert payload["update_interval"] == 60
    assert "id" in payload
    assert "uuid" in payload
    assert "last_seen" in payload

def test_create_duplicate_logger_returns_conflict(
    client,
    test_user,
):
    payload = logger_payload(test_user.id)

    first_response = client.post(
        "/api/logger/",
        json=payload,
    )
    second_response = client.post(
        "/api/logger/",
        json=payload,
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json()["detail"] == "Logger ID 123 is already registered"

def test_list_logger(client, test_user):
    first_response = client.post(
        "/api/logger/",
        json=logger_payload(
            test_user.id,
            logger_id=123,
        ),
    )
    second_response = client.post(
        "/api/logger/",
        json=logger_payload(
            test_user.id,
            logger_id=456,
        ),
    )
    assert first_response.status_code == 201
    assert second_response.status_code == 201

    response = client.get("/api/logger/")

    assert response.status_code == 200
    payload = response.json()
    returned_logger_ids = {
        logger["logger_id"] for logger in payload
    }
    assert returned_logger_ids == {123, 456}

def test_get_specific_logger(client, test_user):
    create_response = client.post(
        "/api/logger",
        json=logger_payload(test_user.id),
    )
    assert create_response.status_code == 201
    response = client.get("/api/logger/123")
    assert response.status_code == 200
    assert response.json()["logger_id"] == 123
    assert response.json()["user_id"] == str(test_user.id)

    
def test_delete_logger(client, test_user):
    create_response = client.post(
        "/api/logger/",
        json=logger_payload(test_user.id)
    )
    assert create_response.status_code == 201

    delete_response = client.delete("/api/logger/123")

    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}

    get_response = client.get("/api/logger/123")

    assert get_response.status_code == 404
    assert get_response.json() == {
        "detail": "Logger not found",
    }

def test_delete_missing_logger_returns_not_found(client, test_user):
    response = client.delete("/api/logger/999")
    assert response.status_code == 404
    assert response.json() == {
        "detail": "Logger not found",
    }


from sqlmodel import select
from app.auth.auth import persist_tokens
from app.schemas.user_schema import OAuthTokenTable

def test_set_token(db_session, test_user):
    persist_tokens(
        db_session,
        test_user,
        access_token="random123",
        refresh_token="random234",
    )

    token = db_session.exec(
        select(OAuthTokenTable).where(
            OAuthTokenTable.user_id == test_user.id
        )
    ).first()

    assert token is not None
    assert token.user_id == test_user.id
    assert token.access_token == "random123"
    assert token.refresh_token == "random234"

def test_persist_tokens_updates_existing_token(db_session, test_user):
    persist_tokens(
        db_session,
        test_user,
        access_token="old-access-token",
        refresh_token="old-refresh-token",
    )

    persist_tokens(
        db_session,
        test_user,
        access_token="new-access-token",
        refresh_token="new-refresh-token",
    )

    tokens = db_session.exec(
        select(OAuthTokenTable).where(
            OAuthTokenTable.user_id == test_user.id
        )
    ).all()

    assert len(tokens) == 1
    assert tokens[0].access_token == "new-access-token"
    assert tokens[0].refresh_token == "new-refresh-token"


from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_get_me_without_authentication():
    response = client.get("/api/v1/users/me")

    assert response.status_code == 401


@patch("app.dependencies.auth.create_user_client")
@patch("app.dependencies.auth.supabase")
def test_get_me_with_valid_user(mock_supabase, mock_create_user_client):
    # Mock Supabase Auth user
    mock_auth_user = MagicMock()
    mock_auth_user.id = "49c8cc3b-19ba-47e1-b6ac-5a479100147c"

    mock_supabase.auth.get_user.return_value.user = mock_auth_user

    # Mock profile query
    mock_client = MagicMock()

    mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "49c8cc3b-19ba-47e1-b6ac-5a479100147c",
        "email": "test@example.com",
        "display_name": "Test User",
        "role": "USER",
        "is_active": True,
    }

    mock_create_user_client.return_value = mock_client

    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer fake-valid-token"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == "49c8cc3b-19ba-47e1-b6ac-5a479100147c"
    assert data["email"] == "test@example.com"
    assert data["display_name"] == "Test User"
    assert data["role"] == "USER"
    assert data["is_active"] is True


@patch("app.dependencies.auth.create_user_client")
@patch("app.dependencies.auth.supabase")
def test_get_me_with_missing_profile(
    mock_supabase,
    mock_create_user_client,
):
    # Mock Supabase Auth user
    mock_auth_user = MagicMock()
    mock_auth_user.id = "49c8cc3b-19ba-47e1-b6ac-5a479100147c"

    mock_supabase.auth.get_user.return_value.user = mock_auth_user

    # Simulate profile query failure
    mock_client = MagicMock()

    mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = Exception(
        "Profile not found"
    )

    mock_create_user_client.return_value = mock_client

    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer fake-valid-token"},
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "User profile not found"
    }


@patch("app.dependencies.auth.create_user_client")
@patch("app.dependencies.auth.supabase")
def test_get_me_with_inactive_user(
    mock_supabase,
    mock_create_user_client,
):
    # Mock Supabase Auth user
    mock_auth_user = MagicMock()
    mock_auth_user.id = "49c8cc3b-19ba-47e1-b6ac-5a479100147c"

    mock_supabase.auth.get_user.return_value.user = mock_auth_user

    # Mock inactive profile
    mock_client = MagicMock()

    mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "49c8cc3b-19ba-47e1-b6ac-5a479100147c",
        "email": "test@example.com",
        "display_name": "Test User",
        "role": "USER",
        "is_active": False,
    }

    mock_create_user_client.return_value = mock_client

    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer fake-valid-token"},
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "User account is inactive"
    }
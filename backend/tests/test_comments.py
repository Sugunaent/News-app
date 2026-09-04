from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.dependencies.auth import AuthContext, get_current_user
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_record_audit():
    with patch(
        "app.routers.comments.record_audit"
    ):
        yield


USER_ID = UUID("11111111-1111-1111-1111-111111111111")
ARTICLE_ID = UUID("22222222-2222-2222-2222-222222222222")
COMMENT_ID = UUID("33333333-3333-3333-3333-333333333333")


def make_context(
    role="USER",
    user_id=USER_ID,
):
    user = MagicMock()
    user.id = user_id
    user.role = role
    user.is_active = True
    user.display_name = "Test User"

    return AuthContext(
        user=user,
        client=MagicMock(),
    )


# ============================================================
# GET COMMENTS
# ============================================================

@patch("app.routers.comments.supabase")
def test_list_comments_returns_visible_comments(mock_supabase):
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.is_.return_value.order.return_value.execute.return_value.data = [
        {
            "id": str(COMMENT_ID),
            "article_id": str(ARTICLE_ID),
            "user_id": str(USER_ID),
            "content": "This is a great article.",
            "created_at": "2026-08-30T10:00:00+00:00",
            "updated_at": "2026-08-30T10:00:00+00:00",
            "profiles": {
                "id": str(USER_ID),
                "display_name": "Test User",
            },
        }
    ]

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/comments"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == str(COMMENT_ID)
    assert data["items"][0]["article_id"] == str(ARTICLE_ID)
    assert data["items"][0]["user_id"] == str(USER_ID)
    assert data["items"][0]["content"] == "This is a great article."
    assert data["items"][0]["author"]["display_name"] == "Test User"


@patch("app.routers.comments.supabase")
def test_list_comments_returns_empty_list(
    mock_supabase,
):
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.is_.return_value.order.return_value.execute.return_value.data = []

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/comments"
    )

    assert response.status_code == 200
    assert response.json() == {"items": []}


# ============================================================
# CREATE
# ============================================================

def test_create_comment_requires_authentication():
    response = client.post(
        f"/api/v1/articles/{ARTICLE_ID}/comments",
        json={"content": "Hello"},
    )

    assert response.status_code == 401


def test_create_comment_rejects_empty_content():
    app.dependency_overrides[
        get_current_user
    ] = lambda: make_context()

    try:
        response = client.post(
            f"/api/v1/articles/{ARTICLE_ID}/comments",
            json={"content": ""},
        )

        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_create_comment_rejects_content_over_2000_characters():
    app.dependency_overrides[
        get_current_user
    ] = lambda: make_context()

    try:
        response = client.post(
            f"/api/v1/articles/{ARTICLE_ID}/comments",
            json={"content": "x" * 2001},
        )

        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_create_comment_requires_published_article():
    context = make_context()

    article_query = MagicMock()
    article_query.select.return_value = article_query
    article_query.eq.return_value = article_query
    article_query.not_.is_.return_value = article_query
    article_query.single.return_value = article_query

    article_query.execute.return_value.data = None

    context.client.table.return_value = article_query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.post(
            f"/api/v1/articles/{ARTICLE_ID}/comments",
            json={"content": "Hello"},
        )

        assert response.status_code == 404
        assert response.json() == {
            "detail": "Article not found"
        }
    finally:
        app.dependency_overrides.clear()


def test_create_comment_returns_created_comment():
    context = make_context()

    article_query = MagicMock()
    article_query.select.return_value = article_query
    article_query.eq.return_value = article_query
    article_query.not_.is_.return_value = article_query
    article_query.single.return_value = article_query
    article_query.execute.return_value.data = [
        {"id": str(ARTICLE_ID)}
    ]

    comment_query = MagicMock()
    comment_query.insert.return_value = comment_query
    comment_query.execute.return_value.data = [
        {
            "id": str(COMMENT_ID),
            "article_id": str(ARTICLE_ID),
            "user_id": str(USER_ID),
            "content": "Hello from the user.",
            "created_at": "2026-08-30T10:00:00+00:00",
            "updated_at": "2026-08-30T10:00:00+00:00",
        }
    ]

    profile_query = MagicMock()
    profile_query.select.return_value = profile_query
    profile_query.eq.return_value = profile_query
    profile_query.single.return_value = profile_query
    profile_query.execute.return_value.data = {
        "id": str(USER_ID),
        "display_name": "Test User",
    }

    context.client.table.side_effect = [
        article_query,
        comment_query,
        profile_query,
    ]

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.post(
            f"/api/v1/articles/{ARTICLE_ID}/comments",
            json={"content": "  Hello from the user.  "},
        )

        assert response.status_code == 201

        data = response.json()

        assert data["id"] == str(COMMENT_ID)
        assert data["article_id"] == str(ARTICLE_ID)
        assert data["user_id"] == str(USER_ID)
        assert data["content"] == "Hello from the user."
        assert data["author"]["id"] == str(USER_ID)
        assert data["author"]["display_name"] == "Test User"
    finally:
        app.dependency_overrides.clear()


# ============================================================
# UPDATE OWN COMMENT
# ============================================================

def test_update_comment_requires_ownership():
    context = make_context()

    query = MagicMock()
    query.update.return_value = query
    query.eq.return_value = query
    query.is_.return_value = query
    query.execute.return_value.data = []

    context.client.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.patch(
            f"/api/v1/articles/{ARTICLE_ID}/comments/{COMMENT_ID}",
            json={"content": "Updated"},
        )

        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_update_comment_returns_updated_comment():
    context = make_context()

    comment_query = MagicMock()
    comment_query.update.return_value = comment_query
    comment_query.eq.return_value = comment_query
    comment_query.is_.return_value = comment_query
    comment_query.execute.return_value.data = [
        {
            "id": str(COMMENT_ID),
            "article_id": str(ARTICLE_ID),
            "user_id": str(USER_ID),
            "content": "Updated comment.",
            "created_at": "2026-08-30T10:00:00+00:00",
            "updated_at": "2026-08-30T10:05:00+00:00",
        }
    ]

    profile_query = MagicMock()
    profile_query.select.return_value = profile_query
    profile_query.eq.return_value = profile_query
    profile_query.single.return_value = profile_query
    profile_query.execute.return_value.data = {
        "id": str(USER_ID),
        "display_name": "Test User",
    }

    context.client.table.side_effect = [
        comment_query,
        profile_query,
    ]

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.patch(
            f"/api/v1/articles/{ARTICLE_ID}/comments/{COMMENT_ID}",
            json={"content": "Updated comment."},
        )

        assert response.status_code == 200

        data = response.json()

        assert data["content"] == "Updated comment."
        assert data["author"]["id"] == str(USER_ID)
        assert data["author"]["display_name"] == "Test User"
    finally:
        app.dependency_overrides.clear()


# ============================================================
# USER DELETE
# ============================================================

def test_delete_comment_requires_ownership():
    context = make_context()

    query = MagicMock()
    query.update.return_value = query
    query.eq.return_value = query
    query.is_.return_value = query
    query.execute.return_value.data = []

    context.client.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.delete(
            f"/api/v1/articles/{ARTICLE_ID}/comments/{COMMENT_ID}"
        )

        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_delete_comment_returns_204():
    context = make_context()

    query = MagicMock()
    query.update.return_value = query
    query.eq.return_value = query
    query.is_.return_value = query
    query.execute.return_value.data = [
        {
            "id": str(COMMENT_ID),
        }
    ]

    context.client.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.delete(
            f"/api/v1/articles/{ARTICLE_ID}/comments/{COMMENT_ID}"
        )

        assert response.status_code == 204
    finally:
        app.dependency_overrides.clear()


# ============================================================
# SUPERADMIN MODERATION
# ============================================================

def test_normal_user_cannot_moderate_comment():
    context = make_context(role="USER")

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.patch(
            f"/api/v1/articles/{ARTICLE_ID}/comments/{COMMENT_ID}/moderation",
            params={"hidden": "true"},
        )

        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_superadmin_can_hide_comment():
    context = make_context(role="SUPERADMIN")

    query = MagicMock()
    query.update.return_value = query
    query.eq.return_value = query
    query.is_.return_value = query
    query.execute.return_value.data = [
        {
            "id": str(COMMENT_ID),
            "is_hidden": True,
            "deleted_at": None,
        }
    ]

    context.client.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.patch(
            f"/api/v1/articles/{ARTICLE_ID}/comments/{COMMENT_ID}/moderation",
            params={"hidden": "true"},
        )

        assert response.status_code == 200

        data = response.json()

        assert data["id"] == str(COMMENT_ID)
        assert data["is_hidden"] is True
        assert data["deleted_at"] is None
    finally:
        app.dependency_overrides.clear()


def test_superadmin_can_unhide_comment():
    context = make_context(role="SUPERADMIN")

    query = MagicMock()
    query.update.return_value = query
    query.eq.return_value = query
    query.is_.return_value = query
    query.execute.return_value.data = [
        {
            "id": str(COMMENT_ID),
            "is_hidden": False,
            "deleted_at": None,
        }
    ]

    context.client.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.patch(
            f"/api/v1/articles/{ARTICLE_ID}/comments/{COMMENT_ID}/moderation",
            params={"hidden": "false"},
        )

        assert response.status_code == 200
        assert response.json()["is_hidden"] is False
    finally:
        app.dependency_overrides.clear()


def test_normal_user_cannot_admin_delete_comment():
    context = make_context(role="USER")

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.delete(
            f"/api/v1/articles/{ARTICLE_ID}/comments/{COMMENT_ID}/admin"
        )

        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_superadmin_can_delete_comment():
    context = make_context(role="SUPERADMIN")

    query = MagicMock()
    query.update.return_value = query
    query.eq.return_value = query
    query.is_.return_value = query
    query.execute.return_value.data = [
        {
            "id": str(COMMENT_ID),
            "is_hidden": False,
            "deleted_at": "2026-08-30T10:10:00+00:00",
        }
    ]

    context.client.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.delete(
            f"/api/v1/articles/{ARTICLE_ID}/comments/{COMMENT_ID}/admin"
        )

        assert response.status_code == 200

        data = response.json()

        assert data["id"] == str(COMMENT_ID)
        assert data["deleted_at"] is not None
    finally:
        app.dependency_overrides.clear()
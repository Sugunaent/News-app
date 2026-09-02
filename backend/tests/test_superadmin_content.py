from unittest.mock import MagicMock
from uuid import UUID

from fastapi.testclient import TestClient

from app.dependencies.auth import (
    AuthContext,
    get_current_user,
)
from app.main import app


client = TestClient(app)

USER_ID = UUID(
    "11111111-1111-1111-1111-111111111111"
)

ARTICLE_ID = UUID(
    "22222222-2222-2222-2222-222222222222"
)

CATEGORY_ID = UUID(
    "33333333-3333-3333-3333-333333333333"
)


def make_auth_context(role="SUPERADMIN"):
    mock_client = MagicMock()

    mock_user = MagicMock()
    mock_user.id = USER_ID
    mock_user.role = role

    return AuthContext(
        user=mock_user,
        client=mock_client,
    )


def teardown_function():
    app.dependency_overrides.clear()


def test_article_management_requires_superadmin():
    auth = make_auth_context(
        role="USER"
    )

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.get(
        "/api/v1/superadmin/articles"
    )

    assert response.status_code == 403


def test_category_management_requires_superadmin():
    auth = make_auth_context(
        role="USER"
    )

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.get(
        "/api/v1/superadmin/categories"
    )

    assert response.status_code == 403


def test_home_management_requires_superadmin():
    auth = make_auth_context(
        role="USER"
    )

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.get(
        "/api/v1/superadmin/home"
    )

    assert response.status_code == 403


def test_list_articles_returns_all_statuses():
    auth = make_auth_context()

    query = MagicMock()

    query.select.return_value.order.return_value.execute.return_value.data = [
        {
            "id": str(ARTICLE_ID),
            "category_id": str(CATEGORY_ID),
            "article_type": "STANDARD",
            "status": "DRAFT",
            "cover_media_id": None,
            "created_by": str(USER_ID),
            "updated_by": str(USER_ID),
            "created_at": "2026-09-01T10:00:00+00:00",
            "updated_at": "2026-09-01T10:00:00+00:00",
            "published_at": None,
            "scheduled_at": None,
            "is_author_pick": False,
            "author_pick_order": None,
            "categories": {
                "id": str(CATEGORY_ID),
                "name": "AI",
                "slug": "ai",
                "description": None,
                "display_order": 0,
                "is_active": True,
                "created_at": "2026-09-01T09:00:00+00:00",
                "updated_at": "2026-09-01T09:00:00+00:00",
            },
            "article_translations": [
                {
                    "id": "44444444-4444-4444-4444-444444444444",
                    "language_code": "EN",
                    "title": "Draft Article",
                    "subtitle": None,
                    "summary": "Draft summary",
                    "slug": "draft-article",
                    "created_at": "2026-09-01T10:00:00+00:00",
                    "updated_at": "2026-09-01T10:00:00+00:00",
                }
            ],
        }
    ]

    auth.client.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.get(
        "/api/v1/superadmin/articles"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["status"] == "DRAFT"
    assert data[0]["translation"]["title"] == (
        "Draft Article"
    )


def test_list_categories_returns_inactive_categories():
    auth = make_auth_context()

    query = MagicMock()

    query.select.return_value.order.return_value.execute.return_value.data = [
        {
            "id": str(CATEGORY_ID),
            "name": "AI",
            "slug": "ai",
            "description": "Artificial intelligence",
            "display_order": 0,
            "is_active": False,
            "created_at": "2026-09-01T09:00:00+00:00",
            "updated_at": "2026-09-01T09:00:00+00:00",
        }
    ]

    auth.client.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.get(
        "/api/v1/superadmin/categories"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["is_active"] is False


def test_author_pick_requires_order():
    auth = make_auth_context()

    article_query = MagicMock()

    article_query \
        .select.return_value \
        .eq.return_value \
        .maybe_single.return_value \
        .execute.return_value.data = {
            "id": str(ARTICLE_ID),
            "category_id": str(CATEGORY_ID),
            "article_type": "STANDARD",
            "status": "PUBLISHED",
            "cover_media_id": None,
            "created_by": str(USER_ID),
            "updated_by": str(USER_ID),
            "created_at": "2026-09-01T10:00:00+00:00",
            "updated_at": "2026-09-01T10:00:00+00:00",
            "published_at": "2026-09-01T10:00:00+00:00",
            "scheduled_at": None,
            "is_author_pick": False,
            "author_pick_order": None,
            "categories": None,
            "article_translations": [],
        }

    auth.client.table.return_value = article_query

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.patch(
        f"/api/v1/superadmin/articles/"
        f"{ARTICLE_ID}/author-pick",
        json={
            "is_author_pick": True
        },
    )

    assert response.status_code == 422
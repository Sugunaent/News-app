from unittest.mock import MagicMock, patch
from uuid import UUID

from fastapi.testclient import TestClient

from app.dependencies.auth import AuthContext, get_current_user
from app.main import app


client = TestClient(app)


USER_ID = UUID("11111111-1111-1111-1111-111111111111")
SUPERADMIN_ID = UUID("22222222-2222-2222-2222-222222222222")
RULE_ID = UUID("33333333-3333-3333-3333-333333333333")
LEVEL_ID = UUID("44444444-4444-4444-4444-444444444444")
BADGE_ID = UUID("55555555-5555-5555-5555-555555555555")
COMMENT_ID = UUID("66666666-6666-6666-6666-666666666666")
ARTICLE_ID = UUID("77777777-7777-7777-7777-777777777777")


def make_context(role="SUPERADMIN", user_id=SUPERADMIN_ID):
    user = MagicMock()
    user.id = user_id
    user.email = "superadmin@example.com"
    user.display_name = "Superadmin"
    user.role = role
    user.is_active = True

    return AuthContext(
        user=user,
        client=MagicMock(),
    )


def chainable_query():
    query = MagicMock()
    query.select.return_value = query
    query.order.return_value = query
    query.or_.return_value = query
    query.eq.return_value = query
    query.insert.return_value = query
    query.update.return_value = query
    query.not_.is_.return_value = query
    query.is_.return_value = query
    return query


# ============================================================
# USERS
# ============================================================


def test_users_requires_superadmin():
    context = make_context(role="USER")

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.get(
            "/api/v1/superadmin/users"
        )

        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.superadmin_management.supabase")
def test_superadmin_can_list_users(mock_supabase):
    context = make_context()

    query = chainable_query()
    query.execute.return_value.data = [
        {
            "id": str(USER_ID),
            "email": "user@example.com",
            "display_name": "Test User",
            "avatar_media_id": None,
            "role": "USER",
            "is_active": True,
            "created_at": "2026-09-03T10:00:00+00:00",
        }
    ]
    query.execute.return_value.count = 1

    mock_supabase.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.get(
            "/api/v1/superadmin/users"
        )

        assert response.status_code == 200

        data = response.json()

        assert data["total"] == 1
        assert data["items"][0]["email"] == (
            "user@example.com"
        )
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.superadmin_management.supabase")
def test_superadmin_can_filter_users(mock_supabase):
    context = make_context()

    query = chainable_query()

    query.execute.return_value.data = []
    query.execute.return_value.count = 0

    mock_supabase.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.get(
            "/api/v1/superadmin/users",
            params={
                "search": "test",
                "is_active": "true",
            },
        )

        assert response.status_code == 200
        assert response.json()["total"] == 0
    finally:
        app.dependency_overrides.clear()


def test_superadmin_cannot_deactivate_self():
    context = make_context()

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.patch(
            f"/api/v1/superadmin/users/"
            f"{SUPERADMIN_ID}/status",
            json={"is_active": False},
        )

        assert response.status_code == 400
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.superadmin_management.supabase")
def test_superadmin_can_update_user_status(mock_supabase):
    context = make_context()

    query = chainable_query()

    query.execute.return_value.data = [
        {
            "id": str(USER_ID),
            "email": "user@example.com",
            "display_name": "Test User",
            "avatar_media_id": None,
            "role": "USER",
            "is_active": False,
            "created_at": "2026-09-03T10:00:00+00:00",
        }
    ]

    mock_supabase.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.patch(
            f"/api/v1/superadmin/users/"
            f"{USER_ID}/status",
            json={"is_active": False},
        )

        assert response.status_code == 200
        assert response.json()["is_active"] is False
    finally:
        app.dependency_overrides.clear()


# ============================================================
# COMMENTS
# ============================================================


def test_normal_user_cannot_list_superadmin_comments():
    context = make_context(role="USER")

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.get(
            "/api/v1/superadmin/comments"
        )

        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.superadmin_management.supabase")
def test_superadmin_can_list_comments(mock_supabase):
    context = make_context()

    query = chainable_query()

    query.execute.return_value.data = [
        {
            "id": str(COMMENT_ID),
            "article_id": str(ARTICLE_ID),
            "user_id": str(USER_ID),
            "content": "Interesting article.",
            "is_hidden": False,
            "deleted_at": None,
            "created_at": "2026-09-03T10:00:00+00:00",
            "updated_at": "2026-09-03T10:00:00+00:00",
            "profiles": {
                "id": str(USER_ID),
                "display_name": "Test User",
                "email": "user@example.com",
            },
        }
    ]

    query.execute.return_value.count = 1

    mock_supabase.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.get(
            "/api/v1/superadmin/comments"
        )

        assert response.status_code == 200

        data = response.json()

        assert data["total"] == 1
        assert data["items"][0]["content"] == (
            "Interesting article."
        )
        assert data["items"][0]["author"]["email"] == (
            "user@example.com"
        )
    finally:
        app.dependency_overrides.clear()


# ============================================================
# XP RULES
# ============================================================


def test_normal_user_cannot_manage_xp_rules():
    context = make_context(role="USER")

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.get(
            "/api/v1/superadmin/gamification/xp-rules"
        )

        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.superadmin_management.supabase")
def test_superadmin_can_create_xp_rule(mock_supabase):
    context = make_context()

    query = chainable_query()

    query.execute.return_value.data = [
        {
            "id": str(RULE_ID),
            "event_type": "ARTICLE_COMPLETED",
            "amount": 10,
            "description": "Complete an article",
            "is_active": True,
            "created_at": "2026-09-03T10:00:00+00:00",
            "updated_at": "2026-09-03T10:00:00+00:00",
        }
    ]

    mock_supabase.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.post(
            "/api/v1/superadmin/gamification/xp-rules",
            json={
                "event_type": "ARTICLE_COMPLETED",
                "amount": 10,
                "description": "Complete an article",
                "is_active": True,
            },
        )

        assert response.status_code == 201
        assert response.json()["amount"] == 10
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.superadmin_management.supabase")
def test_superadmin_can_update_xp_rule(mock_supabase):
    context = make_context()

    query = chainable_query()

    query.execute.return_value.data = [
        {
            "id": str(RULE_ID),
            "event_type": "ARTICLE_COMPLETED",
            "amount": 15,
            "description": "Updated",
            "is_active": True,
            "created_at": "2026-09-03T10:00:00+00:00",
            "updated_at": "2026-09-03T10:05:00+00:00",
        }
    ]

    mock_supabase.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.patch(
            f"/api/v1/superadmin/gamification/"
            f"xp-rules/{RULE_ID}",
            json={"amount": 15},
        )

        assert response.status_code == 200
        assert response.json()["amount"] == 15
    finally:
        app.dependency_overrides.clear()


# ============================================================
# LEVELS
# ============================================================


@patch("app.routers.superadmin_management.supabase")
def test_superadmin_can_create_level(mock_supabase):
    context = make_context()

    query = chainable_query()

    query.execute.return_value.data = [
        {
            "id": str(LEVEL_ID),
            "name": "Level 2",
            "minimum_xp": 100,
            "display_order": 2,
            "created_at": "2026-09-03T10:00:00+00:00",
        }
    ]

    mock_supabase.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.post(
            "/api/v1/superadmin/gamification/levels",
            json={
                "name": "Level 2",
                "minimum_xp": 100,
                "display_order": 2,
            },
        )

        assert response.status_code == 201
        assert response.json()["minimum_xp"] == 100
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.superadmin_management.supabase")
def test_superadmin_can_update_level(mock_supabase):
    context = make_context()

    query = chainable_query()

    query.execute.return_value.data = [
        {
            "id": str(LEVEL_ID),
            "name": "Level 2",
            "minimum_xp": 150,
            "display_order": 2,
            "created_at": "2026-09-03T10:00:00+00:00",
        }
    ]

    mock_supabase.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.patch(
            f"/api/v1/superadmin/gamification/"
            f"levels/{LEVEL_ID}",
            json={"minimum_xp": 150},
        )

        assert response.status_code == 200
        assert response.json()["minimum_xp"] == 150
    finally:
        app.dependency_overrides.clear()


# ============================================================
# BADGES
# ============================================================


@patch("app.routers.superadmin_management.supabase")
def test_superadmin_can_create_badge(mock_supabase):
    context = make_context()

    query = chainable_query()

    query.execute.return_value.data = [
        {
            "id": str(BADGE_ID),
            "name": "First Article",
            "description": "Complete your first article",
            "image_asset_id": None,
            "rule_type": "ARTICLE_COMPLETIONS",
            "rule_config": {"count": 1},
            "is_active": True,
            "created_at": "2026-09-03T10:00:00+00:00",
            "updated_at": "2026-09-03T10:00:00+00:00",
        }
    ]

    mock_supabase.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.post(
            "/api/v1/superadmin/gamification/badges",
            json={
                "name": "First Article",
                "description": "Complete your first article",
                "rule_type": "ARTICLE_COMPLETIONS",
                "rule_config": {
                    "count": 1
                },
                "is_active": True,
            },
        )

        assert response.status_code == 201
        assert response.json()["name"] == (
            "First Article"
        )
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.superadmin_management.supabase")
def test_superadmin_can_update_badge(mock_supabase):
    context = make_context()

    query = chainable_query()

    query.execute.return_value.data = [
        {
            "id": str(BADGE_ID),
            "name": "First Article",
            "description": "Updated description",
            "image_asset_id": None,
            "rule_type": "ARTICLE_COMPLETIONS",
            "rule_config": {"count": 1},
            "is_active": True,
            "created_at": "2026-09-03T10:00:00+00:00",
            "updated_at": "2026-09-03T10:05:00+00:00",
        }
    ]

    mock_supabase.table.return_value = query

    app.dependency_overrides[
        get_current_user
    ] = lambda: context

    try:
        response = client.patch(
            f"/api/v1/superadmin/gamification/"
            f"badges/{BADGE_ID}",
            json={
                "description": "Updated description"
            },
        )

        assert response.status_code == 200
        assert response.json()["description"] == (
            "Updated description"
        )
    finally:
        app.dependency_overrides.clear()
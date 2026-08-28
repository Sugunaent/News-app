from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.dependencies.auth import get_current_user
from app.main import app

client = TestClient(app)

PROMOTION_ID = "11111111-1111-1111-1111-111111111111"
MEDIA_ID = "22222222-2222-2222-2222-222222222222"
USER_ID = "33333333-3333-3333-3333-333333333333"


def make_auth_context(role="USER"):
    auth = MagicMock()

    auth.user_id = USER_ID
    auth.role = role

    auth.user = MagicMock()
    auth.user.id = USER_ID

    auth.profile = {
        "id": USER_ID,
        "email": "test@example.com",
        "display_name": "Test User",
        "role": role,
        "is_active": True,
    }

    auth.client = MagicMock()

    return auth


def promotion_data(
    *,
    is_active=True,
    event_date=None,
    starts_at=None,
    ends_at=None,
):
    return {
        "id": PROMOTION_ID,
        "image_media_id": MEDIA_ID,
        "title": "Upcoming Webinar",
        "description": "Join our upcoming educational webinar.",
        "external_url": "https://example.com/webinar",
        "event_date": event_date,
        "display_order": 1,
        "is_active": is_active,
        "starts_at": starts_at,
        "ends_at": ends_at,
        "created_at": "2026-08-29T10:00:00+00:00",
        "updated_at": "2026-08-29T10:00:00+00:00",
        "image": {
            "id": MEDIA_ID,
            "storage_path": "promotions/webinar.jpg",
        },
    }


def test_list_promotions_returns_active_items():
    query = MagicMock()
    query.select.return_value.eq.return_value.order.return_value.order.return_value.execute.return_value.data = [
        promotion_data(
            event_date="2026-09-15T18:30:00+00:00",
        )
    ]

    with patch("app.routers.promotions.supabase") as mock_supabase:
        mock_supabase.table.return_value = query

        response = client.get("/api/v1/promotions")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["title"] == "Upcoming Webinar"
    assert data[0]["event_date"].replace("+00:00", "Z") == "2026-09-15T18:30:00Z"
    assert data[0]["image"]["storage_path"] == "promotions/webinar.jpg"


def test_list_promotions_returns_empty_list_when_no_items():
    query = MagicMock()
    query.select.return_value.eq.return_value.order.return_value.order.return_value.execute.return_value.data = []

    with patch("app.routers.promotions.supabase") as mock_supabase:
        mock_supabase.table.return_value = query

        response = client.get("/api/v1/promotions")

    assert response.status_code == 200
    assert response.json() == []


def test_list_promotions_excludes_future_items():
    query = MagicMock()
    query.select.return_value.eq.return_value.order.return_value.order.return_value.execute.return_value.data = [
        promotion_data(
            starts_at="2999-01-01T00:00:00+00:00",
        )
    ]

    with patch("app.routers.promotions.supabase") as mock_supabase:
        mock_supabase.table.return_value = query

        response = client.get("/api/v1/promotions")

    assert response.status_code == 200
    assert response.json() == []


def test_list_promotions_excludes_expired_items():
    query = MagicMock()
    query.select.return_value.eq.return_value.order.return_value.order.return_value.execute.return_value.data = [
        promotion_data(
            ends_at="2020-01-01T00:00:00+00:00",
        )
    ]

    with patch("app.routers.promotions.supabase") as mock_supabase:
        mock_supabase.table.return_value = query

        response = client.get("/api/v1/promotions")

    assert response.status_code == 200
    assert response.json() == []


def test_list_promotions_is_public():
    app.dependency_overrides.clear()

    query = MagicMock()
    query.select.return_value.eq.return_value.order.return_value.order.return_value.execute.return_value.data = [
        promotion_data(
            event_date="2026-09-15T18:30:00+00:00",
        )
    ]

    with patch("app.routers.promotions.supabase") as mock_supabase:
        mock_supabase.table.return_value = query

        response = client.get("/api/v1/promotions")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["title"] == "Upcoming Webinar"
    assert data[0]["event_date"].replace("+00:00", "Z") == "2026-09-15T18:30:00Z"


def test_create_promotion_requires_superadmin():
    auth = make_auth_context(role="USER")

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.post(
        "/api/v1/promotions",
        json={
            "image_media_id": MEDIA_ID,
            "title": "Affiliate Promotion",
            "description": "Check out this offer.",
            "external_url": "https://example.com/offer",
            "display_order": 1,
        },
    )

    assert response.status_code == 403


def test_create_promotion_accepts_optional_event_date():
    auth = make_auth_context(role="SUPERADMIN")

    media_query = MagicMock()
    media_query.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": MEDIA_ID,
        "storage_path": "promotions/event.jpg",
    }

    insert_query = MagicMock()
    insert_query.insert.return_value.select.return_value.single.return_value.execute.return_value.data = promotion_data(
        event_date="2026-09-15T18:30:00+00:00",
    )

    def table(name):
        if name == "media_assets":
            return media_query
        if name == "promotional_items":
            return insert_query
        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.post(
        "/api/v1/promotions",
        json={
            "image_media_id": MEDIA_ID,
            "title": "Upcoming Webinar",
            "description": "Join our upcoming webinar.",
            "external_url": "https://example.com/webinar",
            "event_date": "2026-09-15T18:30:00+00:00",
            "display_order": 1,
        },
    )

    assert response.status_code == 201

    data = response.json()
    assert data["event_date"].replace("+00:00", "Z") == "2026-09-15T18:30:00Z"


def test_create_promotion_allows_null_event_date():
    auth = make_auth_context(role="SUPERADMIN")

    media_query = MagicMock()
    media_query.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": MEDIA_ID,
        "storage_path": "promotions/affiliate.jpg",
    }

    insert_query = MagicMock()
    insert_query.insert.return_value.select.return_value.single.return_value.execute.return_value.data = promotion_data(
        event_date=None,
    )

    def table(name):
        if name == "media_assets":
            return media_query
        if name == "promotional_items":
            return insert_query
        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.post(
        "/api/v1/promotions",
        json={
            "image_media_id": MEDIA_ID,
            "title": "Affiliate Promotion",
            "description": "Check out this offer.",
            "external_url": "https://example.com/offer",
            "display_order": 1,
        },
    )

    assert response.status_code == 201
    assert response.json()["event_date"] is None


def test_create_promotion_rejects_invalid_external_url():
    auth = make_auth_context(role="SUPERADMIN")

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.post(
        "/api/v1/promotions",
        json={
            "image_media_id": MEDIA_ID,
            "title": "Bad Link",
            "description": "Invalid URL test.",
            "external_url": "javascript:alert(1)",
            "display_order": 1,
        },
    )

    assert response.status_code == 422


def test_create_promotion_rejects_negative_display_order():
    auth = make_auth_context(role="SUPERADMIN")

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.post(
        "/api/v1/promotions",
        json={
            "image_media_id": MEDIA_ID,
            "title": "Invalid Order",
            "description": "Negative order test.",
            "external_url": "https://example.com",
            "display_order": -1,
        },
    )

    assert response.status_code == 422


def test_create_promotion_rejects_invalid_visibility_window():
    auth = make_auth_context(role="SUPERADMIN")

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.post(
        "/api/v1/promotions",
        json={
            "image_media_id": MEDIA_ID,
            "title": "Invalid Dates",
            "description": "Invalid date window.",
            "external_url": "https://example.com",
            "starts_at": "2026-10-10T10:00:00+00:00",
            "ends_at": "2026-10-09T10:00:00+00:00",
        },
    )

    assert response.status_code == 422


def test_admin_listing_requires_superadmin():
    auth = make_auth_context(role="USER")

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.get("/api/v1/promotions/admin")

    assert response.status_code == 403


def test_admin_listing_returns_all_promotions():
    auth = make_auth_context(role="SUPERADMIN")

    query = MagicMock()
    query.select.return_value.order.return_value.order.return_value.execute.return_value.data = [
        promotion_data(is_active=True),
        promotion_data(
            is_active=False,
            event_date=None,
        ),
    ]

    auth.client.table.return_value = query

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.get("/api/v1/promotions/admin")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_update_promotion_requires_superadmin():
    auth = make_auth_context(role="USER")

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.patch(
        f"/api/v1/promotions/{PROMOTION_ID}",
        json={
            "is_active": False,
        },
    )

    assert response.status_code == 403


def test_delete_promotion_requires_superadmin():
    auth = make_auth_context(role="USER")

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.delete(
        f"/api/v1/promotions/{PROMOTION_ID}",
    )

    assert response.status_code == 403
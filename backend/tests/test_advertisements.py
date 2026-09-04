from collections import defaultdict
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.dependencies.auth import (
    AuthContext,
    get_current_user,
)
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_record_audit():
    with patch(
        "app.routers.advertisements.record_audit"
    ):
        yield


USER_ID = UUID(
    "11111111-1111-1111-1111-111111111111"
)

SUPERADMIN_ID = UUID(
    "99999999-9999-9999-9999-999999999999"
)

ADVERTISEMENT_ID = (
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
)

SLOT_ID = (
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
)

MEDIA_ID = (
    "cccccccc-cccc-cccc-cccc-cccccccccccc"
)

TIMESTAMP = "2026-03-01T12:00:00Z"


def _make_auth(role="SUPERADMIN"):
    mock_client = MagicMock()

    mock_user = MagicMock()
    mock_user.id = (
        SUPERADMIN_ID
        if role == "SUPERADMIN"
        else USER_ID
    )
    mock_user.role = role

    auth = AuthContext(
        user=mock_user,
        client=mock_client,
    )

    return auth, mock_client


def _advertisement():
    return {
        "id": ADVERTISEMENT_ID,
        "slot_id": SLOT_ID,
        "image_media_id": MEDIA_ID,
        "title": "Test Advertisement",
        "description": "Test advertisement description.",
        "destination_url": "https://example.com",
        "starts_at": None,
        "ends_at": None,
        "is_active": True,
        "display_order": 1,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
        "slot": {
            "id": SLOT_ID,
            "key": "HOME_TOP",
            "name": "Home Top",
            "description": "Home top placement.",
            "is_active": True,
            "created_at": TIMESTAMP,
            "updated_at": TIMESTAMP,
        },
        "image": {
            "id": MEDIA_ID,
            "storage_path": "advertisements/test.jpg",
        },
    }


def test_public_advertisement_retrieval_returns_active_ad():
    import app.routers.advertisements as advertisements_module

    mock_supabase = MagicMock()
    advertisements_module.supabase = mock_supabase

    query = MagicMock()
    query.execute.return_value.data = [_advertisement()]

    mock_supabase.table.return_value.select.return_value.order.return_value.order.return_value = query

    try:
        response = client.get(
            "/api/v1/advertisements"
        )

        assert response.status_code == 200

        data = response.json()

        assert len(data) == 1
        assert data[0]["id"] == ADVERTISEMENT_ID
        assert data[0]["slot"]["key"] == "HOME_TOP"

    finally:
        advertisements_module.supabase = mock_supabase


def test_public_advertisement_excludes_inactive_ad():
    import app.routers.advertisements as advertisements_module

    mock_supabase = MagicMock()
    advertisements_module.supabase = mock_supabase

    inactive = _advertisement()
    inactive["is_active"] = False

    query = MagicMock()
    query.execute.return_value.data = [inactive]

    mock_supabase.table.return_value.select.return_value.order.return_value.order.return_value = query

    response = client.get(
        "/api/v1/advertisements"
    )

    assert response.status_code == 200
    assert response.json() == []


def test_public_advertisement_excludes_future_ad():
    import app.routers.advertisements as advertisements_module

    mock_supabase = MagicMock()
    advertisements_module.supabase = mock_supabase

    future_ad = _advertisement()
    future_ad["starts_at"] = (
        "2099-01-01T00:00:00Z"
    )

    query = MagicMock()
    query.execute.return_value.data = [future_ad]

    mock_supabase.table.return_value.select.return_value.order.return_value.order.return_value = query

    response = client.get(
        "/api/v1/advertisements"
    )

    assert response.status_code == 200
    assert response.json() == []


def test_public_advertisement_excludes_expired_ad():
    import app.routers.advertisements as advertisements_module

    mock_supabase = MagicMock()
    advertisements_module.supabase = mock_supabase

    expired_ad = _advertisement()
    expired_ad["ends_at"] = (
        "2020-01-01T00:00:00Z"
    )

    query = MagicMock()
    query.execute.return_value.data = [expired_ad]

    mock_supabase.table.return_value.select.return_value.order.return_value.order.return_value = query

    response = client.get(
        "/api/v1/advertisements"
    )

    assert response.status_code == 200
    assert response.json() == []


def test_public_advertisement_excludes_inactive_slot():
    import app.routers.advertisements as advertisements_module

    mock_supabase = MagicMock()
    advertisements_module.supabase = mock_supabase

    inactive_slot_ad = _advertisement()
    inactive_slot_ad["slot"]["is_active"] = False

    query = MagicMock()
    query.execute.return_value.data = [inactive_slot_ad]

    mock_supabase.table.return_value.select.return_value.order.return_value.order.return_value = query

    response = client.get(
        "/api/v1/advertisements"
    )

    assert response.status_code == 200
    assert response.json() == []


def test_public_advertisement_filters_by_slot():
    import app.routers.advertisements as advertisements_module

    mock_supabase = MagicMock()
    advertisements_module.supabase = mock_supabase

    eq_mock = MagicMock()
    order_mock = MagicMock()
    execute_mock = MagicMock()

    execute_mock.data = [_advertisement()]

    mock_supabase.table.return_value.select.return_value.eq = eq_mock
    eq_mock.return_value = order_mock
    order_mock.order.return_value.execute.return_value = execute_mock

    response = client.get(
        "/api/v1/advertisements?slot=HOME_TOP"
    )

    assert response.status_code == 200
    eq_mock.assert_called_once_with(
        "slot.key",
        "HOME_TOP",
    )


def test_superadmin_can_list_all_advertisements():
    auth, mock_client = _make_auth(
        "SUPERADMIN"
    )

    query = MagicMock()
    query.execute.return_value.data = [_advertisement()]

    mock_client.table.return_value.select.return_value.order.return_value.order.return_value = query

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    try:
        response = client.get(
            "/api/v1/advertisements/admin"
        )

        assert response.status_code == 200
        assert len(response.json()) == 1

    finally:
        app.dependency_overrides.clear()


def test_normal_user_cannot_list_admin_advertisements():
    auth, _ = _make_auth("USER")

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    try:
        response = client.get(
            "/api/v1/advertisements/admin"
        )

        assert response.status_code == 403

    finally:
        app.dependency_overrides.clear()


def test_superadmin_can_create_advertisement():
    auth, mock_client = _make_auth(
        "SUPERADMIN"
    )

    slot_query = MagicMock()
    slot_query.data = {
        "id": SLOT_ID,
        "key": "HOME_TOP",
        "name": "Home Top",
        "description": None,
        "is_active": True,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }

    media_query = MagicMock()
    media_query.data = {
        "id": MEDIA_ID,
        "storage_path": "advertisements/test.jpg",
    }

    table_queries = defaultdict(MagicMock)

    def table_side_effect(table_name):
        return table_queries[table_name]

    mock_client.table.side_effect = table_side_effect

    (
        table_queries["advertisement_slots"]
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value
    ) = slot_query

    (
        table_queries["media_assets"]
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value
    ) = media_query

    (
        table_queries["advertisements"]
        .insert.return_value
        .select.return_value
        .single.return_value
        .execute.return_value.data
    ) = _advertisement()

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    payload = {
        "slot_id": SLOT_ID,
        "image_media_id": MEDIA_ID,
        "title": "Test Advertisement",
        "description": "Test advertisement description.",
        "destination_url": "https://example.com",
        "display_order": 1,
    }

    try:
        response = client.post(
            "/api/v1/advertisements",
            json=payload,
        )

        assert response.status_code == 201

        data = response.json()

        assert data["id"] == ADVERTISEMENT_ID

    finally:
        app.dependency_overrides.clear()


def test_create_advertisement_rejects_invalid_url():
    auth, _ = _make_auth("SUPERADMIN")

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    payload = {
        "slot_id": SLOT_ID,
        "image_media_id": MEDIA_ID,
        "title": "Test Advertisement",
        "description": "Test advertisement description.",
        "destination_url": "not-a-url",
    }

    try:
        response = client.post(
            "/api/v1/advertisements",
            json=payload,
        )

        assert response.status_code == 422

    finally:
        app.dependency_overrides.clear()


def test_create_advertisement_rejects_invalid_visibility_window():
    auth, _ = _make_auth(
        "SUPERADMIN"
    )

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    payload = {
        "slot_id": SLOT_ID,
        "image_media_id": MEDIA_ID,
        "title": "Test Advertisement",
        "description": "Test advertisement description.",
        "destination_url": "https://example.com",
        "starts_at": "2026-04-01T00:00:00Z",
        "ends_at": "2026-03-01T00:00:00Z",
    }

    try:
        response = client.post(
            "/api/v1/advertisements",
            json=payload,
        )

        assert response.status_code == 422
        assert (
            response.json()["detail"]
            == "ends_at must be later than starts_at"
        )

    finally:
        app.dependency_overrides.clear()


def test_superadmin_can_get_single_advertisement():
    auth, mock_client = _make_auth(
        "SUPERADMIN"
    )

    (
        mock_client
        .table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = _advertisement()

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    try:
        response = client.get(
            f"/api/v1/advertisements/admin/"
            f"{ADVERTISEMENT_ID}"
        )

        assert response.status_code == 200
        assert (
            response.json()["id"]
            == ADVERTISEMENT_ID
        )

    finally:
        app.dependency_overrides.clear()


def test_superadmin_get_returns_not_found():
    auth, mock_client = _make_auth(
        "SUPERADMIN"
    )

    (
        mock_client
        .table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = None

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    try:
        response = client.get(
            f"/api/v1/advertisements/admin/"
            f"{ADVERTISEMENT_ID}"
        )

        assert response.status_code == 404

    finally:
        app.dependency_overrides.clear()


def test_superadmin_can_delete_advertisement():
    auth, mock_client = _make_auth(
        "SUPERADMIN"
    )

    (
        mock_client
        .table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = {"id": ADVERTISEMENT_ID}

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    try:
        response = client.delete(
            f"/api/v1/advertisements/"
            f"{ADVERTISEMENT_ID}"
        )

        assert response.status_code == 204

    finally:
        app.dependency_overrides.clear()


def test_normal_user_cannot_create_advertisement():
    auth, _ = _make_auth("USER")

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    payload = {
        "slot_id": SLOT_ID,
        "image_media_id": MEDIA_ID,
        "title": "Test Advertisement",
        "description": "Test advertisement description.",
        "destination_url": "https://example.com",
    }

    try:
        response = client.post(
            "/api/v1/advertisements",
            json=payload,
        )

        assert response.status_code == 403

    finally:
        app.dependency_overrides.clear()


def test_superadmin_can_list_slots():
    auth, mock_client = _make_auth(
        "SUPERADMIN"
    )

    slots = [
        {
            "id": SLOT_ID,
            "key": "HOME_TOP",
            "name": "Home Top",
            "description": None,
            "is_active": True,
            "created_at": TIMESTAMP,
            "updated_at": TIMESTAMP,
        }
    ]

    (
        mock_client
        .table.return_value
        .select.return_value
        .order.return_value
        .execute.return_value.data
    ) = slots

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    try:
        response = client.get(
            "/api/v1/advertisements/slots/admin"
        )

        assert response.status_code == 200
        assert len(response.json()) == 1

    finally:
        app.dependency_overrides.clear()


from unittest.mock import MagicMock, patch

def test_public_can_list_active_slots():
    slots = [
        {
            "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "key": "HOME_TOP",
            "name": "Home Top",
            "description": "Home top placement.",
            "is_active": True,
            "created_at": "2026-03-01T12:00:00Z",
            "updated_at": "2026-03-01T12:00:00Z",
        }
    ]

    exec_result = MagicMock()
    exec_result.data = slots

    # Patch both the router level and db level to prevent fallback queries
    with patch("app.routers.advertisements.supabase") as mock_router_supabase, \
         patch("app.db.supabase.supabase") as mock_db_supabase:
        
        for mock_supabase in (mock_router_supabase, mock_db_supabase):
            # Chain configuration handling any query order combinations
            mock_table = mock_supabase.table.return_value
            mock_table.select.return_value.eq.return_value.order.return_value.execute.return_value = exec_result
            mock_table.select.return_value.order.return_value.eq.return_value.execute.return_value = exec_result
            mock_table.select.return_value.execute.return_value = exec_result

        response = client.get("/api/v1/advertisements/slots")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["key"] == "HOME_TOP"
        assert data[0]["name"] == "Home Top"
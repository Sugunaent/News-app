from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.dependencies.auth import AuthContext, get_current_user
from app.main import app
from app.routers import media as media_router
from app.services import media_urls

client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_record_audit(monkeypatch):
    admin_client = MagicMock()
    monkeypatch.setattr(media_router, "supabase_admin", admin_client)
    monkeypatch.setattr(media_urls, "supabase_admin", admin_client)
    with patch(
        "app.routers.media.record_audit"
    ):
        yield

USER_ID = UUID("11111111-1111-1111-1111-111111111111")
SUPERADMIN_ID = UUID("99999999-9999-9999-9999-999999999999")
MEDIA_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

TIMESTAMP = "2026-03-01T12:00:00Z"


def _make_auth(role="SUPERADMIN"):
    mock_client = media_router.supabase_admin
    mock_user = MagicMock()
    mock_user.id = SUPERADMIN_ID if role == "SUPERADMIN" else USER_ID
    mock_user.role = role

    auth = AuthContext(
        user=mock_user,
        client=mock_client,
    )
    return auth, mock_client


def _media():
    return {
        "id": str(MEDIA_ID),
        "storage_path": "media/image/test.jpg",
        "media_type": "IMAGE",
        "mime_type": "image/jpeg",
        "file_size": 1024,
        "uploaded_by": str(SUPERADMIN_ID),
        "created_at": TIMESTAMP,
    }


def test_media_admin_listing_requires_superadmin():
    auth, _ = _make_auth("USER")
    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get("/api/v1/media/admin")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_superadmin_can_list_media():
    auth, mock_client = _make_auth()

    query = MagicMock()
    query.execute.return_value.data = [_media()]

    (
        mock_client.table.return_value.select.return_value.order.return_value
    ) = query

    storage = MagicMock()
    storage.from_.return_value.create_signed_url.return_value = {
        "signedURL": "https://signed.example/test.jpg"
    }
    mock_client.storage = storage

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get("/api/v1/media/admin")
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(MEDIA_ID)
        assert data[0]["media_type"] == "IMAGE"
        assert data[0]["mime_type"] == "image/jpeg"
    finally:
        app.dependency_overrides.clear()


def test_superadmin_can_get_media_detail():
    auth, mock_client = _make_auth()

    media_table_mock = MagicMock()
    (
        media_table_mock.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data
    ) = _media()

    def table_side_effect(name):
        if name == "media_assets":
            return media_table_mock
        reference_table = MagicMock()
        reference_table.select.return_value.eq.return_value.execute.return_value.data = (
            [
                {
                    "id": str(USER_ID),
                    "display_name": "Sample profile",
                }
            ]
            if name == "profiles"
            else []
        )
        return reference_table

    mock_client.table.side_effect = table_side_effect

    storage = MagicMock()
    storage.from_.return_value.create_signed_url.return_value = {
        "signedURL": "https://signed.example/test.jpg"
    }
    mock_client.storage = storage

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get(f"/api/v1/media/admin/{MEDIA_ID}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == str(MEDIA_ID)
        assert data["references"] == [
            {
                "resource_type": "profile_avatar",
                "resource_id": str(USER_ID),
                "resource_label": "Sample profile",
            }
        ]
    finally:
        app.dependency_overrides.clear()


def test_media_detail_returns_not_found():
    auth, mock_client = _make_auth()

    media_table_mock = MagicMock()
    (
        media_table_mock.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data
    ) = None

    mock_client.table.return_value = media_table_mock

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get(f"/api/v1/media/admin/{MEDIA_ID}")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_normal_user_cannot_upload_media():
    auth, _ = _make_auth("USER")
    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            "/api/v1/media/admin/upload",
            files={
                "file": (
                    "test.jpg",
                    b"fake image",
                    "image/jpeg",
                )
            },
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_upload_rejects_unsupported_mime_type():
    auth, _ = _make_auth("SUPERADMIN")
    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            "/api/v1/media/admin/upload",
            files={
                "file": (
                    "test.txt",
                    b"hello",
                    "text/plain",
                )
            },
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_upload_rejects_empty_file():
    auth, _ = _make_auth("SUPERADMIN")
    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            "/api/v1/media/admin/upload",
            files={
                "file": (
                    "test.jpg",
                    b"",
                    "image/jpeg",
                )
            },
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_superadmin_can_upload_image():
    auth, mock_client = _make_auth()
    inserted_media = _media()

    insert_query = MagicMock()
    (
        insert_query.insert.return_value.select.return_value.execute.return_value.data
    ) = [inserted_media]

    def table_side_effect(name):
        if name == "media_assets":
            return insert_query
        raise AssertionError(f"Unexpected table: {name}")

    mock_client.table.side_effect = table_side_effect

    storage = MagicMock()
    storage.from_.return_value.upload.return_value = {}
    storage.from_.return_value.create_signed_url.return_value = {
        "signedURL": "https://signed.example/test.jpg"
    }
    mock_client.storage = storage

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            "/api/v1/media/admin/upload",
            files={
                "file": (
                    "test.jpg",
                    b"fake image data",
                    "image/jpeg",
                )
            },
        )

        assert response.status_code == 201

        data = response.json()
        assert data["id"] == str(MEDIA_ID)
        assert data["media_type"] == "IMAGE"
        assert data["mime_type"] == "image/jpeg"

        storage.from_.return_value.upload.assert_called_once()
    finally:
        app.dependency_overrides.clear()


def test_upload_failure_rolls_back_media_metadata():
    auth, mock_client = _make_auth()
    inserted_media = _media()

    insert_query = MagicMock()
    (
        insert_query.insert.return_value.select.return_value.execute.return_value.data
    ) = [inserted_media]

    def table_side_effect(name):
        if name == "media_assets":
            return insert_query
        raise AssertionError(f"Unexpected table: {name}")

    mock_client.table.side_effect = table_side_effect

    storage = MagicMock()
    storage.from_.return_value.upload.side_effect = Exception("storage failure")
    mock_client.storage = storage

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            "/api/v1/media/admin/upload",
            files={
                "file": (
                    "test.jpg",
                    b"fake image data",
                    "image/jpeg",
                )
            },
        )

        assert response.status_code == 500

        assert insert_query.delete.return_value.eq.called
    finally:
        app.dependency_overrides.clear()


def test_superadmin_cannot_delete_referenced_media():
    auth, mock_client = _make_auth()

    media_table_mock = MagicMock()
    (
        media_table_mock.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data
    ) = {
        "id": str(MEDIA_ID),
        "storage_path": "media/image/test.jpg",
    }

    ref_table_mock = MagicMock()
    ref_table_mock.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": str(UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"))}
    ]

    def table_side_effect(name):
        if name == "media_assets":
            return media_table_mock
        return ref_table_mock

    mock_client.table.side_effect = table_side_effect

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.delete(f"/api/v1/media/admin/{MEDIA_ID}")
        assert response.status_code == 409
        assert "cannot be deleted" in response.json()["detail"]
        mock_client.storage.from_.return_value.remove.assert_not_called()
    finally:
        app.dependency_overrides.clear()


def test_superadmin_can_delete_unreferenced_media():
    auth, mock_client = _make_auth()

    media_table_mock = MagicMock()
    (
        media_table_mock.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data
    ) = {
        "id": str(MEDIA_ID),
        "storage_path": "media/image/test.jpg",
    }

    ref_table_mock = MagicMock()
    ref_table_mock.select.return_value.eq.return_value.execute.return_value.data = []

    def table_side_effect(name):
        if name == "media_assets":
            return media_table_mock
        return ref_table_mock

    mock_client.table.side_effect = table_side_effect

    storage = MagicMock()
    storage.from_.return_value.remove.return_value = {}
    mock_client.storage = storage

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.delete(f"/api/v1/media/admin/{MEDIA_ID}")
        assert response.status_code == 204

        storage.from_.return_value.remove.assert_called_once_with(
            ["media/image/test.jpg"]
        )
    finally:
        app.dependency_overrides.clear()


def test_media_delete_surfaces_storage_failure_detail():
    auth, mock_client = _make_auth()

    media_table_mock = MagicMock()
    (
        media_table_mock.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data
    ) = {
        "id": str(MEDIA_ID),
        "storage_path": "media/image/test.jpg",
    }

    ref_table_mock = MagicMock()
    ref_table_mock.select.return_value.eq.return_value.execute.return_value.data = []

    def table_side_effect(name):
        if name == "media_assets":
            return media_table_mock
        return ref_table_mock

    mock_client.table.side_effect = table_side_effect
    mock_client.storage.from_.return_value.remove.side_effect = Exception(
        "storage permission denied"
    )
    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.delete(f"/api/v1/media/admin/{MEDIA_ID}")
        assert response.status_code == 500
        assert "storage permission denied" in response.json()["detail"]
        media_table_mock.delete.assert_not_called()
    finally:
        app.dependency_overrides.clear()


def test_sample_uploaded_media_active_promotion_is_available_to_homepage():
    auth, admin_client = _make_auth()
    uploaded_media = _media()
    storage_id = UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
    uploaded_media["storage_path"] = f"media/image/{storage_id}.jpg"
    admin_client.table.return_value.insert.return_value.select.return_value.execute.return_value.data = [
        uploaded_media
    ]
    admin_client.storage.from_.return_value.upload.return_value = {}
    admin_client.storage.from_.return_value.create_signed_url.return_value = {
        "signedURL": "https://signed.example/test.jpg"
    }
    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        with patch("app.routers.media.uuid4", return_value=storage_id):
            upload_response = client.post(
                "/api/v1/media/admin/upload",
                files={
                    "file": (
                        "test.jpg",
                        b"sample image bytes",
                        "image/jpeg",
                    )
                },
            )
        assert upload_response.status_code == 201
        uploaded = upload_response.json()
        assert uploaded["id"] == str(MEDIA_ID)
        assert uploaded["storage_path"] == uploaded_media["storage_path"]
        assert uploaded["signed_url"] == "https://signed.example/test.jpg"
        admin_client.storage.from_.return_value.upload.assert_called_once_with(
            uploaded["storage_path"],
            b"sample image bytes",
            {"content-type": "image/jpeg", "upsert": False},
        )

        promotion = {
            "id": str(UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")),
            "image_media_id": str(MEDIA_ID),
            "image_url": None,
            "title": "Sample promotion",
            "description": "This promotion uses the uploaded sample image.",
            "external_url": "https://example.test/promotion",
            "event_date": None,
            "display_order": 0,
            "is_active": True,
            "starts_at": None,
            "ends_at": None,
            "created_at": TIMESTAMP,
            "updated_at": TIMESTAMP,
            "image": {
                "id": str(MEDIA_ID),
                "storage_path": uploaded["storage_path"],
            },
        }
        media_lookup = MagicMock()
        media_lookup.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "id": str(MEDIA_ID),
            "storage_path": uploaded["storage_path"],
        }
        promotion_insert = MagicMock()
        promotion_insert.insert.return_value.select.return_value.execute.return_value.data = [
            promotion
        ]

        def user_table(name):
            if name == "media_assets":
                return media_lookup
            if name == "promotional_items":
                return promotion_insert
            raise AssertionError(f"Unexpected table: {name}")

        admin_client.table.side_effect = user_table

        with patch("app.routers.promotions.record_audit"):
            create_response = client.post(
                "/api/v1/promotions",
                json={
                    "image_media_id": str(MEDIA_ID),
                    "title": promotion["title"],
                    "description": promotion["description"],
                    "external_url": promotion["external_url"],
                    "is_active": True,
                },
            )

        assert create_response.status_code == 201
        assert create_response.json()["is_active"] is True
        assert create_response.json()["image_media_id"] == str(MEDIA_ID)

        public_query = MagicMock()
        public_query.select.return_value.eq.return_value.order.return_value.order.return_value.execute.return_value.data = [
            promotion
        ]
        with (
            patch("app.routers.promotions.supabase") as public_supabase,
            patch("app.routers.promotions.record_audit"),
        ):
            public_supabase.table.return_value = public_query
            home_response = client.get("/api/v1/promotions")

        assert home_response.status_code == 200
        home_item = home_response.json()[0]
        assert home_item["title"] == promotion["title"]
        assert home_item["description"] == promotion["description"]
        assert home_item["external_url"] == promotion["external_url"]
        assert home_item["is_active"] is True
        assert home_item["image"]["signed_url"] == "https://signed.example/test.jpg"
    finally:
        app.dependency_overrides.clear()


def test_normal_user_cannot_delete_media():
    auth, _ = _make_auth("USER")
    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.delete(f"/api/v1/media/admin/{MEDIA_ID}")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()
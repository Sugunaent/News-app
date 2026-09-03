from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import UUID

from fastapi.testclient import TestClient

from app.dependencies.auth import AuthContext, get_current_user
from app.main import app

client = TestClient(app)

USER_ID = UUID("11111111-1111-1111-1111-111111111111")
SUPERADMIN_ID = UUID("99999999-9999-9999-9999-999999999999")
MEDIA_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

TIMESTAMP = "2026-03-01T12:00:00Z"


def _make_auth(role="SUPERADMIN"):
    mock_client = MagicMock()
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

    ref_table_mock = MagicMock()
    ref_table_mock.select.return_value.eq.return_value.execute.return_value.data = []

    def table_side_effect(name):
        if name == "media_assets":
            return media_table_mock
        return ref_table_mock

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
        assert data["references"] == []
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
        insert_query.insert.return_value.select.return_value.single.return_value.execute.return_value.data
    ) = inserted_media

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
        insert_query.insert.return_value.select.return_value.single.return_value.execute.return_value.data
    ) = inserted_media

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


def test_normal_user_cannot_delete_media():
    auth, _ = _make_auth("USER")
    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.delete(f"/api/v1/media/admin/{MEDIA_ID}")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()
from unittest.mock import MagicMock
from uuid import UUID

from fastapi.testclient import TestClient

from app.dependencies.auth import get_current_user
from app.main import app


client = TestClient(app)

ARTICLE_ID = "11111111-1111-1111-1111-111111111111"
BLOCK_ID = "22222222-2222-2222-2222-222222222222"
USER_ID = UUID("33333333-3333-3333-3333-333333333333")


def make_auth_context():
    auth = MagicMock()
    auth.user.id = USER_ID
    auth.client = MagicMock()
    return auth


def test_get_progress_returns_null_when_no_progress():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": ARTICLE_ID,
    }

    progress_query = MagicMock()
    progress_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    def table(name):
        if name == "articles":
            return article_query
        if name == "reading_progress":
            return progress_query
        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/progress"
    )

    assert response.status_code == 200
    assert response.json() is None

    app.dependency_overrides.clear()


def test_get_progress_returns_existing_progress():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": ARTICLE_ID,
    }

    progress_query = MagicMock()
    progress_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "article_id": ARTICLE_ID,
        "progress_percentage": 42.5,
        "last_block_id": BLOCK_ID,
        "last_position": 1234.5,
        "started_at": "2026-08-24T10:00:00Z",
        "last_read_at": "2026-08-24T10:30:00Z",
        "completed_at": None,
    }

    def table(name):
        if name == "articles":
            return article_query
        if name == "reading_progress":
            return progress_query
        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/progress"
    )

    assert response.status_code == 200
    assert response.json() == {
        "article_id": ARTICLE_ID,
        "progress_percentage": 42.5,
        "last_block_id": BLOCK_ID,
        "last_position": 1234.5,
        "started_at": "2026-08-24T10:00:00Z",
        "last_read_at": "2026-08-24T10:30:00Z",
        "completed_at": None,
    }

    app.dependency_overrides.clear()


def test_update_progress_creates_progress():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": ARTICLE_ID,
    }

    existing_query = MagicMock()
    existing_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    progress_query = MagicMock()

    progress_query.upsert.return_value.select.return_value.single.return_value.execute.return_value.data = {
        "article_id": ARTICLE_ID,
        "progress_percentage": 42.5,
        "last_block_id": BLOCK_ID,
        "last_position": 1234.5,
        "started_at": "2026-08-24T10:00:00Z",
        "last_read_at": "2026-08-24T10:30:00Z",
        "completed_at": None,
    }

    block_query = MagicMock()
    block_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": BLOCK_ID,
    }

    table_calls = []

    def table(name):
        table_calls.append(name)

        if name == "articles":
            return article_query
        if name == "reading_progress":
            if len([x for x in table_calls if x == "reading_progress"]) == 1:
                return existing_query
            return progress_query
        if name == "article_blocks":
            return block_query
        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.put(
        f"/api/v1/articles/{ARTICLE_ID}/progress",
        json={
            "progress_percentage": 42.5,
            "last_block_id": BLOCK_ID,
            "last_position": 1234.5,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "article_id": ARTICLE_ID,
        "progress_percentage": 42.5,
        "last_block_id": BLOCK_ID,
        "last_position": 1234.5,
        "started_at": "2026-08-24T10:00:00Z",
        "last_read_at": "2026-08-24T10:30:00Z",
        "completed_at": None,
    }

    app.dependency_overrides.clear()


def test_update_progress_rejects_invalid_percentage():
    auth = make_auth_context()

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.put(
        f"/api/v1/articles/{ARTICLE_ID}/progress",
        json={
            "progress_percentage": 101,
        },
    )

    assert response.status_code == 422

    app.dependency_overrides.clear()


def test_update_progress_rejects_negative_percentage():
    auth = make_auth_context()

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.put(
        f"/api/v1/articles/{ARTICLE_ID}/progress",
        json={
            "progress_percentage": -1,
        },
    )

    assert response.status_code == 422

    app.dependency_overrides.clear()


def test_update_progress_marks_article_complete_at_100_percent():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": ARTICLE_ID,
    }

    existing_query = MagicMock()
    existing_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    progress_query = MagicMock()

    progress_query.upsert.return_value.select.return_value.single.return_value.execute.return_value.data = {
        "article_id": ARTICLE_ID,
        "progress_percentage": 100,
        "last_block_id": None,
        "last_position": None,
        "started_at": "2026-08-24T10:00:00Z",
        "last_read_at": "2026-08-24T10:30:00Z",
        "completed_at": "2026-08-24T10:30:00Z",
    }

    table_calls = []

    def table(name):
        table_calls.append(name)

        if name == "articles":
            return article_query
        if name == "reading_progress":
            if len([x for x in table_calls if x == "reading_progress"]) == 1:
                return existing_query
            return progress_query
        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.put(
        f"/api/v1/articles/{ARTICLE_ID}/progress",
        json={
            "progress_percentage": 100,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["article_id"] == ARTICLE_ID
    assert data["progress_percentage"] == 100
    assert data["completed_at"] == "2026-08-24T10:30:00Z"

    app.dependency_overrides.clear()


def test_update_progress_rejects_invalid_block_for_article():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": ARTICLE_ID,
    }

    block_query = MagicMock()
    block_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    def table(name):
        if name == "articles":
            return article_query
        if name == "article_blocks":
            return block_query
        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.put(
        f"/api/v1/articles/{ARTICLE_ID}/progress",
        json={
            "progress_percentage": 50,
            "last_block_id": BLOCK_ID,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Article block not found"

    app.dependency_overrides.clear()
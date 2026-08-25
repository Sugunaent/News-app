from unittest.mock import MagicMock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.dependencies.auth import get_current_user
from app.main import app


client = TestClient(app)


ARTICLE_ID = str(uuid4())
USER_ID = str(uuid4())


def make_auth_context():
    auth = MagicMock()

    auth.user.id = USER_ID
    auth.user.is_active = True

    return auth


def teardown_function():
    app.dependency_overrides.clear()


def test_get_completion_returns_null_when_not_completed():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": ARTICLE_ID
    }

    completion_query = MagicMock()
    completion_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    def table(name):
        if name == "articles":
            return article_query

        if name == "article_completions":
            return completion_query

        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/completion"
    )

    assert response.status_code == 200
    assert response.json() is None


def test_get_completion_returns_existing_completion():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": ARTICLE_ID
    }

    completion_query = MagicMock()
    completion_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "article_id": ARTICLE_ID,
        "completed_at": "2026-08-25T10:30:00+00:00",
    }

    def table(name):
        if name == "articles":
            return article_query

        if name == "article_completions":
            return completion_query

        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/completion"
    )

    assert response.status_code == 200
    assert response.json() == {
        "article_id": ARTICLE_ID,
        "completed_at": "2026-08-25T10:30:00Z",
    }


def test_get_completion_returns_404_when_article_not_found():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    def table(name):
        if name == "articles":
            return article_query

        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/completion"
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Article not found"
    }


def test_complete_article_creates_completion():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": ARTICLE_ID
    }

    existing_query = MagicMock()
    existing_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    def table(name):
        if name == "articles":
            return article_query

        if name == "article_completions":
            return existing_query

        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    from app.routers import completions

    trusted_query = MagicMock()

    trusted_query.insert.return_value.select.return_value.single.return_value.execute.return_value.data = {
        "article_id": ARTICLE_ID,
        "completed_at": "2026-08-25T10:30:00+00:00",
    }

    original_supabase = completions.supabase
    completions.supabase = MagicMock()

    completions.supabase.table.return_value = trusted_query

    try:
        response = client.post(
            f"/api/v1/articles/{ARTICLE_ID}/completion"
        )
    finally:
        completions.supabase = original_supabase

    assert response.status_code == 200
    assert response.json() == {
        "article_id": ARTICLE_ID,
        "completed_at": "2026-08-25T10:30:00Z",
    }

    trusted_query.insert.assert_called_once_with(
        {
            "user_id": USER_ID,
            "article_id": ARTICLE_ID,
        }
    )


def test_complete_article_returns_existing_completion_without_creating_duplicate():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": ARTICLE_ID
    }

    existing_completion = {
        "article_id": ARTICLE_ID,
        "completed_at": "2026-08-25T10:30:00+00:00",
    }

    completion_query = MagicMock()
    completion_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = existing_completion

    def table(name):
        if name == "articles":
            return article_query

        if name == "article_completions":
            return completion_query

        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    from app.routers import completions

    mock_supabase = MagicMock()
    original_supabase = completions.supabase
    completions.supabase = mock_supabase

    try:
        response = client.post(
            f"/api/v1/articles/{ARTICLE_ID}/completion"
        )
    finally:
        completions.supabase = original_supabase

    assert response.status_code == 200
    assert response.json() == {
        "article_id": ARTICLE_ID,
        "completed_at": "2026-08-25T10:30:00Z",
    }

    mock_supabase.table.assert_not_called()


def test_complete_article_returns_404_when_article_not_found():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    def table(name):
        if name == "articles":
            return article_query

        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    response = client.post(
        f"/api/v1/articles/{ARTICLE_ID}/completion"
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Article not found"
    }
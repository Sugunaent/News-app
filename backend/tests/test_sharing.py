from datetime import datetime, timezone
from uuid import UUID
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.dependencies.auth import get_current_user
from app.main import app


client = TestClient(app)

USER_ID = UUID("11111111-1111-1111-1111-111111111111")
ARTICLE_ID = UUID("22222222-2222-2222-2222-222222222222")
QUESTION_ID = UUID("33333333-3333-3333-3333-333333333333")
OPTION_ID = UUID("44444444-4444-4444-4444-444444444444")


def make_auth_context():
    auth = MagicMock()

    auth.user.id = USER_ID

    return auth


def teardown_function():
    app.dependency_overrides.pop(
        get_current_user,
        None,
    )


def test_get_completion_share_returns_completion_data():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": str(ARTICLE_ID),
        "article_translations": [
            {
                "language_code": "EN",
                "title": "Test Article",
            }
        ],
    }

    completion_query = MagicMock()
    completion_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "article_id": str(ARTICLE_ID),
        "completed_at": "2026-08-29T10:00:00+00:00",
    }

    def table(name):
        if name == "articles":
            return article_query

        if name == "article_completions":
            return completion_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/completion/share"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["article_id"] == str(ARTICLE_ID)
    assert data["article_title"] == "Test Article"
    assert (
        datetime.fromisoformat(data["completed_at"].replace("Z", "+00:00"))
        == datetime(2026, 8, 29, 10, 0, 0, tzinfo=timezone.utc)
    )


def test_get_completion_share_returns_404_when_article_not_found():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = None

    def table(name):
        if name == "articles":
            return article_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/completion/share"
    )

    assert response.status_code == 404


def test_get_completion_share_returns_404_when_user_has_not_completed():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": str(ARTICLE_ID),
        "article_translations": [
            {
                "language_code": "EN",
                "title": "Test Article",
            }
        ],
    }

    completion_query = MagicMock()
    completion_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    def table(name):
        if name == "articles":
            return article_query

        if name == "article_completions":
            return completion_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/completion/share"
    )

    assert response.status_code == 404


def test_get_opinion_share_returns_predefined_opinion():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": str(ARTICLE_ID),
        "article_translations": [
            {
                "language_code": "EN",
                "title": "Opinion Article",
            }
        ],
    }

    question_query = MagicMock()
    question_query.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "id": str(QUESTION_ID),
            "article_id": str(ARTICLE_ID),
            "opinion_question_translations": [
                {
                    "language_code": "EN",
                    "question_text": "What do you think?",
                }
            ],
        }
    ]

    response_query = MagicMock()
    response_query.select.return_value.eq.return_value.in_.return_value.order.return_value.limit.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "55555555-5555-5555-5555-555555555555",
        "opinion_question_id": str(QUESTION_ID),
        "selected_option_id": str(OPTION_ID),
        "custom_response": None,
        "created_at": "2026-08-29T11:00:00+00:00",
    }

    option_query = MagicMock()
    option_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": str(OPTION_ID),
        "question_id": str(QUESTION_ID),
        "opinion_option_translations": [
            {
                "language_code": "EN",
                "option_text": "I agree",
            }
        ],
    }

    def table(name):
        if name == "articles":
            return article_query

        if name == "opinion_questions":
            return question_query

        if name == "opinion_responses":
            return response_query

        if name == "opinion_options":
            return option_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/opinion/share"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["article_id"] == str(ARTICLE_ID)
    assert data["article_title"] == "Opinion Article"
    assert data["opinion_question_id"] == str(QUESTION_ID)
    assert data["opinion_question"] == "What do you think?"
    assert data["selected_option_id"] == str(OPTION_ID)
    assert data["selected_option_text"] == "I agree"
    assert data["custom_response"] is None


def test_get_opinion_share_returns_custom_opinion():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": str(ARTICLE_ID),
        "article_translations": [
            {
                "language_code": "EN",
                "title": "Opinion Article",
            }
        ],
    }

    question_query = MagicMock()
    question_query.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "id": str(QUESTION_ID),
            "article_id": str(ARTICLE_ID),
            "opinion_question_translations": [
                {
                    "language_code": "EN",
                    "question_text": "What do you think?",
                }
            ],
        }
    ]

    response_query = MagicMock()
    response_query.select.return_value.eq.return_value.in_.return_value.order.return_value.limit.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "55555555-5555-5555-5555-555555555555",
        "opinion_question_id": str(QUESTION_ID),
        "selected_option_id": None,
        "custom_response": "I think this is very interesting.",
        "created_at": "2026-08-29T11:00:00+00:00",
    }

    def table(name):
        if name == "articles":
            return article_query

        if name == "opinion_questions":
            return question_query

        if name == "opinion_responses":
            return response_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/opinion/share"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["article_id"] == str(ARTICLE_ID)
    assert data["selected_option_id"] is None
    assert data["selected_option_text"] is None
    assert (
        data["custom_response"]
        == "I think this is very interesting."
    )


def test_get_opinion_share_returns_404_when_no_opinion_response():
    auth = make_auth_context()

    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": str(ARTICLE_ID),
        "article_translations": [
            {
                "language_code": "EN",
                "title": "Opinion Article",
            }
        ],
    }

    question_query = MagicMock()
    question_query.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "id": str(QUESTION_ID),
            "article_id": str(ARTICLE_ID),
            "opinion_question_translations": [
                {
                    "language_code": "EN",
                    "question_text": "What do you think?",
                }
            ],
        }
    ]

    response_query = MagicMock()
    response_query.select.return_value.eq.return_value.in_.return_value.order.return_value.limit.return_value.maybe_single.return_value.execute.return_value.data = None

    def table(name):
        if name == "articles":
            return article_query

        if name == "opinion_questions":
            return question_query

        if name == "opinion_responses":
            return response_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/opinion/share"
    )

    assert response.status_code == 404


def test_sharing_requires_authentication():
    response = client.get(
        f"/api/v1/articles/{ARTICLE_ID}/completion/share"
    )

    assert response.status_code in (401, 403)
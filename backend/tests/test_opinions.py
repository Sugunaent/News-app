from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.dependencies.auth import get_current_user
from app.main import app

client = TestClient(app)

QUESTION_ID = "33333333-3333-3333-3333-333333333333"
QUESTION_2_ID = "55555555-5555-5555-5555-555555555555"

ARTICLE_ID = "11111111-1111-1111-1111-111111111111"

OPTION_1_ID = "44444444-4444-4444-4444-444444444444"
OPTION_2_ID = "66666666-6666-6666-6666-666666666666"

RESPONSE_ID = "77777777-7777-7777-7777-777777777777"


def make_auth_mock():
    auth = MagicMock()
    auth.user_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

    auth.user = MagicMock()
    auth.user.id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

    auth.client = MagicMock()

    return auth


def make_query(data):
    """
    Create an isolated Supabase-style query mock.
    """
    query = MagicMock()

    query.select.return_value = query
    query.insert.return_value = query
    query.eq.return_value = query
    query.order.return_value = query
    query.single.return_value = query
    query.maybe_single.return_value = query

    query.execute.return_value.data = data

    return query


def clear_auth_override():
    app.dependency_overrides.pop(get_current_user, None)


# ============================================================
# GET /api/v1/opinions/article/{article_id}
# ============================================================


def test_get_article_opinions_returns_question_and_options():
    auth = make_auth_mock()

    question_query = make_query(
        [
            {
                "id": QUESTION_ID,
                "article_id": ARTICLE_ID,
                "display_order": 0,
                "allow_custom_response": True,
                "opinion_question_translations": [
                    {
                        "language_code": "en",
                        "question_text": "What do you think about this?",
                    }
                ],
            }
        ]
    )

    option_query = make_query(
        [
            {
                "id": OPTION_1_ID,
                "question_id": QUESTION_ID,
                "display_order": 0,
                "opinion_option_translations": [
                    {
                        "language_code": "en",
                        "option_text": "I agree",
                    }
                ],
            },
            {
                "id": OPTION_2_ID,
                "question_id": QUESTION_ID,
                "display_order": 1,
                "opinion_option_translations": [
                    {
                        "language_code": "en",
                        "option_text": "I disagree",
                    }
                ],
            },
        ]
    )

    def table(name):
        if name == "opinion_questions":
            return question_query

        if name == "opinion_options":
            return option_query

        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get(
            f"/api/v1/opinions/article/{ARTICLE_ID}"
        )

        assert response.status_code == 200

        data = response.json()

        assert len(data) == 1
        assert data[0]["id"] == QUESTION_ID
        assert data[0]["article_id"] == ARTICLE_ID
        assert data[0]["allow_custom_response"] is True
        assert data[0]["question_text"] == (
            "What do you think about this?"
        )

        assert len(data[0]["options"]) == 2
        assert data[0]["options"][0]["option_text"] == "I agree"
        assert data[0]["options"][1]["option_text"] == "I disagree"

    finally:
        clear_auth_override()


def test_get_article_opinions_returns_empty_when_no_questions():
    auth = make_auth_mock()

    question_query = make_query([])

    def table(name):
        if name == "opinion_questions":
            return question_query

        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get(
            f"/api/v1/opinions/article/{ARTICLE_ID}"
        )

        assert response.status_code == 200
        assert response.json() == []

    finally:
        clear_auth_override()


def test_get_article_opinions_prefers_english_translation():
    auth = make_auth_mock()

    question_query = make_query(
        [
            {
                "id": QUESTION_ID,
                "article_id": ARTICLE_ID,
                "display_order": 0,
                "allow_custom_response": True,
                "opinion_question_translations": [
                    {
                        "language_code": "hi",
                        "question_text": "यह प्रश्न है",
                    },
                    {
                        "language_code": "en",
                        "question_text": "This is the English question",
                    },
                ],
            }
        ]
    )

    option_query = make_query(
        [
            {
                "id": OPTION_1_ID,
                "question_id": QUESTION_ID,
                "display_order": 0,
                "opinion_option_translations": [
                    {
                        "language_code": "hi",
                        "option_text": "हिंदी विकल्प",
                    },
                    {
                        "language_code": "en",
                        "option_text": "English option",
                    },
                ],
            }
        ]
    )

    def table(name):
        if name == "opinion_questions":
            return question_query

        if name == "opinion_options":
            return option_query

        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get(
            f"/api/v1/opinions/article/{ARTICLE_ID}"
        )

        assert response.status_code == 200

        data = response.json()

        assert data[0]["question_text"] == (
            "This is the English question"
        )

        assert data[0]["options"][0]["option_text"] == (
            "English option"
        )

    finally:
        clear_auth_override()


def test_get_article_opinions_skips_question_without_translation():
    auth = make_auth_mock()

    question_query = make_query(
        [
            {
                "id": QUESTION_ID,
                "article_id": ARTICLE_ID,
                "display_order": 0,
                "allow_custom_response": True,
                "opinion_question_translations": [],
            },
            {
                "id": QUESTION_2_ID,
                "article_id": ARTICLE_ID,
                "display_order": 1,
                "allow_custom_response": False,
                "opinion_question_translations": [
                    {
                        "language_code": "en",
                        "question_text": "Valid question",
                    }
                ],
            },
        ]
    )

    option_query = make_query(
        [
            {
                "id": OPTION_1_ID,
                "question_id": QUESTION_2_ID,
                "display_order": 0,
                "opinion_option_translations": [
                    {
                        "language_code": "en",
                        "option_text": "Valid option",
                    }
                ],
            }
        ]
    )

    def table(name):
        if name == "opinion_questions":
            return question_query

        if name == "opinion_options":
            return option_query

        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get(
            f"/api/v1/opinions/article/{ARTICLE_ID}"
        )

        assert response.status_code == 200

        data = response.json()

        assert len(data) == 1
        assert data[0]["id"] == QUESTION_2_ID

    finally:
        clear_auth_override()


# ============================================================
# POST /api/v1/opinions/{question_id}/responses
# ============================================================


def test_submit_predefined_opinion():
    auth = make_auth_mock()

    question_query = make_query(
        [
            {
                "id": QUESTION_ID,
                "article_id": ARTICLE_ID,
                "allow_custom_response": True,
            }
        ]
    )

    option_query = make_query(
        [
            {
                "id": OPTION_1_ID,
                "question_id": QUESTION_ID,
            }
        ]
    )

    response_query = make_query(
        [
            {
                "id": RESPONSE_ID,
                "opinion_question_id": QUESTION_ID,
                "selected_option_id": OPTION_1_ID,
                "custom_response": None,
                "created_at": "2026-08-25T00:00:00Z",
            }
        ]
    )

    def table(name):
        if name == "opinion_questions":
            return question_query

        if name == "opinion_options":
            return option_query

        if name == "opinion_responses":
            return response_query

        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/opinions/{QUESTION_ID}/responses",
            json={
                "selected_option_id": OPTION_1_ID,
            },
        )

        assert response.status_code == 200

        data = response.json()

        assert data["response"]["id"] == RESPONSE_ID
        assert data["response"]["opinion_question_id"] == QUESTION_ID
        assert data["response"]["selected_option_id"] == OPTION_1_ID
        assert data["response"]["custom_response"] is None

    finally:
        clear_auth_override()


def test_submit_custom_opinion():
    auth = make_auth_mock()

    question_query = make_query(
        [
            {
                "id": QUESTION_ID,
                "article_id": ARTICLE_ID,
                "allow_custom_response": True,
            }
        ]
    )

    response_query = make_query(
        [
            {
                "id": RESPONSE_ID,
                "opinion_question_id": QUESTION_ID,
                "selected_option_id": None,
                "custom_response": "This is my opinion.",
                "created_at": "2026-08-25T00:00:00Z",
            }
        ]
    )

    def table(name):
        if name == "opinion_questions":
            return question_query

        if name == "opinion_responses":
            return response_query

        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/opinions/{QUESTION_ID}/responses",
            json={
                "custom_response": "This is my opinion.",
            },
        )

        assert response.status_code == 200

        data = response.json()

        assert data["response"]["custom_response"] == (
            "This is my opinion."
        )

        assert data["response"]["selected_option_id"] is None

    finally:
        clear_auth_override()


def test_submit_opinion_returns_404_when_question_not_found():
    auth = make_auth_mock()

    question_query = make_query([])

    def table(name):
        if name == "opinion_questions":
            return question_query

        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/opinions/{QUESTION_ID}/responses",
            json={
                "selected_option_id": OPTION_1_ID,
            },
        )

        assert response.status_code == 404
        assert response.json() == {
            "detail": "Opinion question not found"
        }

    finally:
        clear_auth_override()


def test_submit_opinion_returns_404_when_option_not_found():
    auth = make_auth_mock()

    question_query = make_query(
        [
            {
                "id": QUESTION_ID,
                "article_id": ARTICLE_ID,
                "allow_custom_response": True,
            }
        ]
    )

    option_query = make_query([])

    def table(name):
        if name == "opinion_questions":
            return question_query

        if name == "opinion_options":
            return option_query

        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/opinions/{QUESTION_ID}/responses",
            json={
                "selected_option_id": OPTION_1_ID,
            },
        )

        assert response.status_code == 404
        assert response.json() == {
            "detail": "Opinion option not found"
        }

    finally:
        clear_auth_override()


def test_submit_opinion_rejects_custom_response_when_disabled():
    auth = make_auth_mock()

    question_query = make_query(
        [
            {
                "id": QUESTION_ID,
                "article_id": ARTICLE_ID,
                "allow_custom_response": False,
            }
        ]
    )

    def table(name):
        if name == "opinion_questions":
            return question_query

        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/opinions/{QUESTION_ID}/responses",
            json={
                "custom_response": "My own opinion",
            },
        )

        assert response.status_code == 404
        assert response.json() == {
            "detail": "Custom opinion responses are not allowed"
        }

    finally:
        clear_auth_override()


def test_submit_opinion_rejects_both_response_types():
    auth = make_auth_mock()

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/opinions/{QUESTION_ID}/responses",
            json={
                "selected_option_id": OPTION_1_ID,
                "custom_response": "My opinion",
            },
        )

        assert response.status_code == 422

    finally:
        clear_auth_override()


def test_submit_opinion_rejects_empty_response():
    auth = make_auth_mock()

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/opinions/{QUESTION_ID}/responses",
            json={
                "custom_response": "",
            },
        )

        assert response.status_code == 422

    finally:
        clear_auth_override()


def test_submit_opinion_rejects_custom_response_over_200_characters():
    auth = make_auth_mock()

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/opinions/{QUESTION_ID}/responses",
            json={
                "custom_response": "x" * 201,
            },
        )

        assert response.status_code == 422

    finally:
        clear_auth_override()


def test_submit_opinion_rejects_when_neither_response_type_is_provided():
    auth = make_auth_mock()

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/opinions/{QUESTION_ID}/responses",
            json={},
        )

        assert response.status_code == 422

    finally:
        clear_auth_override()
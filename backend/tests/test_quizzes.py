from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.dependencies.auth import get_current_user
from app.main import app

client = TestClient(app)

QUIZ_ID = "22222222-2222-2222-2222-222222222222"
ARTICLE_ID = "11111111-1111-1111-1111-111111111111"

QUESTION_ID = "33333333-3333-3333-3333-333333333333"
QUESTION_2_ID = "55555555-5555-5555-5555-555555555555"

OPTION_1_ID = "44444444-4444-4444-4444-444444444444"
OPTION_2_ID = "66666666-6666-6666-6666-666666666666"


def make_auth_mock():
    auth = MagicMock()
    auth.user_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    auth.user.id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    auth.client = MagicMock()

    # Mock RPC calls if XP/Awards logic uses client.rpc()
    rpc_mock = MagicMock()
    rpc_mock.execute.return_value = MagicMock(
        data={"xp_awarded": 10, "total_xp": 100}
    )
    auth.client.rpc.return_value = rpc_mock

    return auth


def make_query(data):
    """
    Creates an isolated Supabase query mock.
    Ensures any chained method call returns the query mock itself,
    and `.execute()` always yields an object containing `.data`.
    """
    query = MagicMock()
    
    # Configure execute response
    response = MagicMock()
    response.data = data
    query.execute.return_value = response

    # Self-returning chain for standard operations
    methods = [
        "select", "insert", "update", "delete", 
        "eq", "order", "single", "maybe_single"
    ]
    for method in methods:
        getattr(query, method).side_effect = lambda *args, **kwargs: query

    return query


def clear_auth_override():
    app.dependency_overrides.pop(get_current_user, None)


# ============================================================
# GET /api/v1/quizzes/article/{article_id}
# ============================================================


def test_get_article_quiz_returns_quiz_with_questions_and_options():
    auth = make_auth_mock()

    quiz_query = make_query(
        {
            "id": QUIZ_ID,
            "article_id": ARTICLE_ID,
        }
    )

    question_query = make_query(
        [
            {
                "id": QUESTION_ID,
                "quiz_id": QUIZ_ID,
                "display_order": 0,
                "quiz_question_translations": [
                    {
                        "language_code": "en",
                        "question_text": "What is the capital of France?",
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
                "quiz_option_translations": [
                    {
                        "language_code": "en",
                        "option_text": "Paris",
                    }
                ],
            },
            {
                "id": OPTION_2_ID,
                "question_id": QUESTION_ID,
                "display_order": 1,
                "quiz_option_translations": [
                    {
                        "language_code": "en",
                        "option_text": "London",
                    }
                ],
            },
        ]
    )

    def table(name):
        if name == "quizzes":
            return quiz_query
        if name == "quiz_questions":
            return question_query
        if name == "quiz_options":
            return option_query
        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get(f"/api/v1/quizzes/article/{ARTICLE_ID}")

        assert response.status_code == 200

        data = response.json()

        assert data["id"] == QUIZ_ID
        assert data["article_id"] == ARTICLE_ID

        assert len(data["questions"]) == 1

        question = data["questions"][0]

        assert question["id"] == QUESTION_ID
        assert question["question_text"] == "What is the capital of France?"

        assert len(question["options"]) == 2

        assert question["options"][0]["id"] == OPTION_1_ID
        assert question["options"][0]["option_text"] == "Paris"

        assert question["options"][1]["id"] == OPTION_2_ID
        assert question["options"][1]["option_text"] == "London"

    finally:
        clear_auth_override()


def test_get_article_quiz_returns_empty_questions_when_no_questions():
    auth = make_auth_mock()

    quiz_query = make_query(
        {
            "id": QUIZ_ID,
            "article_id": ARTICLE_ID,
        }
    )

    question_query = make_query([])

    def table(name):
        if name == "quizzes":
            return quiz_query
        if name == "quiz_questions":
            return question_query
        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get(f"/api/v1/quizzes/article/{ARTICLE_ID}")

        assert response.status_code == 200

        data = response.json()

        assert data["id"] == QUIZ_ID
        assert data["article_id"] == ARTICLE_ID
        assert data["questions"] == []

    finally:
        clear_auth_override()


def test_get_article_quiz_returns_404_when_quiz_not_found():
    auth = make_auth_mock()

    quiz_query = make_query(None)

    def table(name):
        if name == "quizzes":
            return quiz_query
        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get(f"/api/v1/quizzes/article/{ARTICLE_ID}")

        assert response.status_code == 404

    finally:
        clear_auth_override()


def test_get_article_quiz_prefers_english_translation():
    auth = make_auth_mock()

    quiz_query = make_query(
        {
            "id": QUIZ_ID,
            "article_id": ARTICLE_ID,
        }
    )

    question_query = make_query(
        [
            {
                "id": QUESTION_ID,
                "quiz_id": QUIZ_ID,
                "display_order": 0,
                "quiz_question_translations": [
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
                "quiz_option_translations": [
                    {
                        "language_code": "hi",
                        "option_text": "हिंदी उत्तर",
                    },
                    {
                        "language_code": "en",
                        "option_text": "English answer",
                    },
                ],
            }
        ]
    )

    def table(name):
        if name == "quizzes":
            return quiz_query
        if name == "quiz_questions":
            return question_query
        if name == "quiz_options":
            return option_query
        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get(f"/api/v1/quizzes/article/{ARTICLE_ID}")

        assert response.status_code == 200

        data = response.json()

        question = data["questions"][0]

        assert question["question_text"] == "This is the English question"

        assert question["options"][0]["option_text"] == "English answer"

    finally:
        clear_auth_override()


def test_get_article_quiz_skips_question_without_translation():
    auth = make_auth_mock()

    quiz_query = make_query(
        {
            "id": QUIZ_ID,
            "article_id": ARTICLE_ID,
        }
    )

    question_query = make_query(
        [
            {
                "id": QUESTION_ID,
                "quiz_id": QUIZ_ID,
                "display_order": 0,
                "quiz_question_translations": [],
            },
            {
                "id": QUESTION_2_ID,
                "quiz_id": QUIZ_ID,
                "display_order": 1,
                "quiz_question_translations": [
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
                "quiz_option_translations": [
                    {
                        "language_code": "en",
                        "option_text": "Valid option",
                    }
                ],
            }
        ]
    )

    def table(name):
        if name == "quizzes":
            return quiz_query
        if name == "quiz_questions":
            return question_query
        if name == "quiz_options":
            return option_query
        return make_query([])

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.get(f"/api/v1/quizzes/article/{ARTICLE_ID}")

        assert response.status_code == 200

        data = response.json()

        assert len(data["questions"]) == 1

        assert data["questions"][0]["id"] == QUESTION_2_ID
        assert data["questions"][0]["question_text"] == "Valid question"

    finally:
        clear_auth_override()


# ============================================================
# POST /api/v1/quizzes/{quiz_id}/attempts
# ============================================================

@patch("app.routers.quizzes.award_xp")
def test_submit_quiz_attempt_returns_correct_result(mock_award_xp):
    auth = make_auth_mock()

    question_query = make_query(
        {
            "id": QUESTION_ID,
            "quiz_id": QUIZ_ID,
        }
    )

    option_query = make_query(
        {
            "id": OPTION_1_ID,
            "question_id": QUESTION_ID,
            "is_correct": True,
        }
    )

    # Wrap dict inside a list [] so response.data[0] works in your route
    attempt_query = make_query(
        [
            {
                "question_id": QUESTION_ID,
                "selected_option_id": OPTION_1_ID,
                "is_correct": True,
                "created_at": "2026-08-24T00:00:00Z",
            }
        ]
    )

    def table(name):
        if name == "quiz_questions":
            return question_query
        if name == "quiz_options":
            return option_query
        if name == "quiz_attempts":
            return attempt_query
        return make_query([])

    auth.client.table.side_effect = table
    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/quizzes/{QUIZ_ID}/attempts",
            json={
                "question_id": QUESTION_ID,
                "selected_option_id": OPTION_1_ID,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["attempt"]["is_correct"] is True
    finally:
        clear_auth_override()


@patch("app.routers.quizzes.award_xp")
def test_submit_quiz_attempt_returns_incorrect_result(mock_award_xp):
    auth = make_auth_mock()

    question_query = make_query(
        {
            "id": QUESTION_ID,
            "quiz_id": QUIZ_ID,
        }
    )

    option_query = make_query(
        {
            "id": OPTION_1_ID,
            "question_id": QUESTION_ID,
            "is_correct": False,
        }
    )

    # Wrap dict inside a list []
    attempt_query = make_query(
        [
            {
                "question_id": QUESTION_ID,
                "selected_option_id": OPTION_1_ID,
                "is_correct": False,
                "created_at": "2026-08-24T00:00:00Z",
            }
        ]
    )

    def table(name):
        if name == "quiz_questions":
            return question_query
        if name == "quiz_options":
            return option_query
        if name == "quiz_attempts":
            return attempt_query
        return make_query([])

    auth.client.table.side_effect = table
    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/quizzes/{QUIZ_ID}/attempts",
            json={
                "question_id": QUESTION_ID,
                "selected_option_id": OPTION_1_ID,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["attempt"]["is_correct"] is False
    finally:
        clear_auth_override()


def test_submit_quiz_attempt_returns_404_when_question_not_found():
    auth = make_auth_mock()

    question_query = make_query(None)

    def table(name):
        if name == "quiz_questions":
            return question_query
        return make_query(None)

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/quizzes/{QUIZ_ID}/attempts",
            json={
                "question_id": QUESTION_ID,
                "selected_option_id": OPTION_1_ID,
            },
        )

        assert response.status_code == 404

        assert response.json() == {"detail": "Quiz question not found"}

    finally:
        clear_auth_override()


def test_submit_quiz_attempt_returns_404_when_option_not_found():
    auth = make_auth_mock()

    question_query = make_query(
        {
            "id": QUESTION_ID,
            "quiz_id": QUIZ_ID,
        }
    )

    option_query = make_query(None)

    def table(name):
        if name == "quiz_questions":
            return question_query
        if name == "quiz_options":
            return option_query
        return make_query(None)

    auth.client.table.side_effect = table

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/quizzes/{QUIZ_ID}/attempts",
            json={
                "question_id": QUESTION_ID,
                "selected_option_id": OPTION_1_ID,
            },
        )

        assert response.status_code == 404

        assert response.json() == {"detail": "Quiz option not found"}

    finally:
        clear_auth_override()


@patch("app.routers.quizzes.award_xp")
def test_submit_quiz_attempt_uses_server_side_correctness(mock_award_xp):
    auth = make_auth_mock()

    question_query = make_query(
        {
            "id": QUESTION_ID,
            "quiz_id": QUIZ_ID,
        }
    )

    option_query = make_query(
        {
            "id": OPTION_1_ID,
            "question_id": QUESTION_ID,
            "is_correct": False,
        }
    )

    # Wrap dict inside a list []
    attempt_query = make_query(
        [
            {
                "question_id": QUESTION_ID,
                "selected_option_id": OPTION_1_ID,
                "is_correct": False,
                "created_at": "2026-08-24T00:00:00Z",
            }
        ]
    )

    def table(name):
        if name == "quiz_questions":
            return question_query
        if name == "quiz_options":
            return option_query
        if name == "quiz_attempts":
            return attempt_query
        return make_query([])

    auth.client.table.side_effect = table
    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/quizzes/{QUIZ_ID}/attempts",
            json={
                "question_id": QUESTION_ID,
                "selected_option_id": OPTION_1_ID,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["attempt"]["is_correct"] is False
    finally:
        clear_auth_override()
from unittest.mock import MagicMock
from uuid import UUID

from fastapi.testclient import TestClient

from app.dependencies.auth import (
    AuthContext,
    get_current_user,
)
from app.main import app


client = TestClient(app)

USER_ID = "11111111-1111-1111-1111-111111111111"
ARTICLE_ID = "22222222-2222-2222-2222-222222222222"
LEVEL_ID = "33333333-3333-3333-3333-333333333333"
BADGE_ID = "44444444-4444-4444-4444-444444444444"
BLOCK_ID = "55555555-5555-5555-5555-555555555555"
OPINION_ID = "66666666-6666-6666-6666-666666666666"
QUESTION_ID = "77777777-7777-7777-7777-777777777777"
OPTION_ID = "88888888-8888-8888-8888-888888888888"

TIMESTAMP = "2026-03-01T12:00:00Z"


def test_get_profile_returns_basic_user_information():
    mock_client = MagicMock()

    mock_user = MagicMock()
    mock_user.id = UUID(USER_ID)

    mock_profile = {
        "id": USER_ID,
        "email": "user@example.com",
        "display_name": "Test User",
        "avatar_media_id": None,
        "role": "USER",
        "is_active": True,
    }

    auth = AuthContext(
        user=mock_user,
        client=mock_client,
    )

    auth.profile = mock_profile

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    try:
        response = client.get(
            "/api/v1/users/me"
        )

        assert response.status_code == 200

        data = response.json()

        assert data["id"] == USER_ID
        assert data["email"] == "user@example.com"
        assert data["display_name"] == "Test User"
        assert data["avatar_media_id"] is None
        assert data["role"] == "USER"
        assert data["is_active"] is True

    finally:
        app.dependency_overrides.clear()


def test_get_profile_returns_zero_state_for_new_user():
    mock_client = MagicMock()

    mock_user = MagicMock()
    mock_user.id = UUID(USER_ID)

    mock_profile = {
        "id": USER_ID,
        "email": "newuser@example.com",
        "display_name": "New User",
        "avatar_media_id": None,
        "role": "USER",
        "is_active": True,
    }

    auth = AuthContext(
        user=mock_user,
        client=mock_client,
    )

    auth.profile = mock_profile

    table_queries = {}

    def table_side_effect(table_name):
        if table_name not in table_queries:
            table_queries[table_name] = MagicMock()

        return table_queries[table_name]

    mock_client.table.side_effect = table_side_effect

    table_queries["profiles"] = MagicMock()

    table_queries[
        "profiles"
    ].select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = (
        mock_profile
    )

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    try:
        response = client.get(
            "/api/v1/users/me/profile"
        )

        assert response.status_code == 200

        data = response.json()

        assert data["user"]["id"] == USER_ID

        assert data["total_xp"] == 0

        assert data["current_level"] is None

        assert data["articles_completed"] == 0

        assert (
            data["quiz_performance"][
                "total_attempts"
            ]
            == 0
        )

        assert (
            data["quiz_performance"][
                "correct_attempts"
            ]
            == 0
        )

        assert (
            data["quiz_performance"][
                "incorrect_attempts"
            ]
            == 0
        )

        assert (
            data["quiz_performance"][
                "accuracy_percentage"
            ]
            == 0.0
        )

        assert data["opinions_submitted"] == 0

        assert data["badges"] == []

        assert data["achievement_history"] == []

        assert data["share_cards"] == []

        assert data["reading_history"] == []

    finally:
        app.dependency_overrides.clear()


def test_get_profile_aggregates_gamification_and_activity():
    mock_client = MagicMock()

    mock_user = MagicMock()
    mock_user.id = UUID(USER_ID)

    mock_profile = {
        "id": USER_ID,
        "email": "activeuser@example.com",
        "display_name": "Active User",
        "avatar_media_id": None,
        "role": "USER",
        "is_active": True,
    }

    auth = AuthContext(
        user=mock_user,
        client=mock_client,
    )

    auth.profile = mock_profile

    table_queries = {}

    def table_side_effect(table_name):
        if table_name not in table_queries:
            table_queries[table_name] = MagicMock()

        return table_queries[table_name]

    mock_client.table.side_effect = table_side_effect

    # ---------------------------------------------------------
    # Profiles
    # ---------------------------------------------------------

    table_queries["profiles"] = MagicMock()

    table_queries[
        "profiles"
    ].select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = (
        mock_profile
    )

    # ---------------------------------------------------------
    # XP
    # ---------------------------------------------------------

    table_queries["xp_transactions"] = MagicMock()

    table_queries[
        "xp_transactions"
    ].select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "id": "xp-1",
            "xp_rule_id": "rule-1",
            "article_id": ARTICLE_ID,
            "source_type": "ARTICLE_COMPLETION",
            "source_id": ARTICLE_ID,
            "amount": 20,
            "created_at": TIMESTAMP,
        },
        {
            "id": "xp-2",
            "xp_rule_id": "rule-2",
            "article_id": None,
            "source_type": "QUIZ_CORRECT",
            "source_id": "question-1",
            "amount": 10,
            "created_at": TIMESTAMP,
        },
    ]

    # ---------------------------------------------------------
    # Level
    # ---------------------------------------------------------

    table_queries["levels"] = MagicMock()

    table_queries[
        "levels"
    ].select.return_value.lte.return_value.order.return_value.limit.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": LEVEL_ID,
        "name": "Level 2",
        "minimum_xp": 25,
        "display_order": 2,
    }

    # ---------------------------------------------------------
    # Badges
    # ---------------------------------------------------------

    table_queries["user_badges"] = MagicMock()

    table_queries[
        "user_badges"
    ].select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "badge_id": BADGE_ID,
            "earned_at": TIMESTAMP,
            "badges": {
                "id": BADGE_ID,
                "name": "First Article",
                "description": (
                    "Completed your first article."
                ),
                "image_asset_id": None,
            },
        }
    ]

    # ---------------------------------------------------------
    # Article completions
    # ---------------------------------------------------------

    table_queries["article_completions"] = MagicMock()

    table_queries[
        "article_completions"
    ].select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "article_id": ARTICLE_ID,
            "completed_at": TIMESTAMP,
            "articles": {
                "id": ARTICLE_ID,
                "article_translations": [
                    {
                        "language_code": "EN",
                        "title": "Test Article",
                    }
                ],
            },
        }
    ]

    # ---------------------------------------------------------
    # Quiz attempts
    # ---------------------------------------------------------

    table_queries["quiz_attempts"] = MagicMock()

    table_queries[
        "quiz_attempts"
    ].select.return_value.eq.return_value.execute.return_value.data = [
        {
            "question_id": "question-1",
            "selected_option_id": "option-1",
            "is_correct": True,
            "created_at": TIMESTAMP,
        },
        {
            "question_id": "question-2",
            "selected_option_id": "option-2",
            "is_correct": False,
            "created_at": TIMESTAMP,
        },
    ]

    # ---------------------------------------------------------
    # Opinions
    # ---------------------------------------------------------

    table_queries["opinion_responses"] = MagicMock()

    table_queries[
        "opinion_responses"
    ].select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "id": OPINION_ID,
            "opinion_question_id": QUESTION_ID,
            "selected_option_id": OPTION_ID,
            "custom_response": None,
            "created_at": TIMESTAMP,
            "opinion_questions": {
                "id": QUESTION_ID,
                "article_id": ARTICLE_ID,
                "opinion_question_translations": [
                    {
                        "language_code": "EN",
                        "question_text": (
                            "What do you think?"
                        ),
                    }
                ],
                "articles": {
                    "id": ARTICLE_ID,
                    "article_translations": [
                        {
                            "language_code": "EN",
                            "title": "Test Article",
                        }
                    ],
                },
            },
        }
    ]

    # ---------------------------------------------------------
    # Opinion options
    # ---------------------------------------------------------

    table_queries["opinion_options"] = MagicMock()

    table_queries[
        "opinion_options"
    ].select.return_value.in_.return_value.execute.return_value.data = [
        {
            "id": OPTION_ID,
            "question_id": QUESTION_ID,
            "opinion_option_translations": [
                {
                    "language_code": "EN",
                    "option_text": "I agree",
                }
            ],
        }
    ]

    # ---------------------------------------------------------
    # Reading progress
    # ---------------------------------------------------------

    table_queries["reading_progress"] = MagicMock()

    table_queries[
        "reading_progress"
    ].select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "article_id": ARTICLE_ID,
            "progress_percentage": 100.0,
            "last_block_id": BLOCK_ID,
            "last_position": 1.0,
            "started_at": TIMESTAMP,
            "last_read_at": TIMESTAMP,
            "completed_at": TIMESTAMP,
        }
    ]

    app.dependency_overrides[get_current_user] = (
        lambda: auth
    )

    try:
        response = client.get(
            "/api/v1/users/me/profile"
        )

        assert response.status_code == 200

        data = response.json()

        assert data["total_xp"] == 30

        assert (
            data["current_level"]["name"]
            == "Level 2"
        )

        assert data["articles_completed"] == 1

        assert (
            data["quiz_performance"][
                "total_attempts"
            ]
            == 2
        )

        assert (
            data["quiz_performance"][
                "correct_attempts"
            ]
            == 1
        )

        assert (
            data["quiz_performance"][
                "incorrect_attempts"
            ]
            == 1
        )

        assert (
            data["quiz_performance"][
                "accuracy_percentage"
            ]
            == 50.0
        )

        assert data["opinions_submitted"] == 1

        assert len(data["badges"]) == 1

        assert len(data["achievement_history"]) == 4

        assert len(data["reading_history"]) == 1

        # -----------------------------------------------------
        # Share cards
        # -----------------------------------------------------

        assert len(data["share_cards"]) == 2

        completion_card = next(
            card
            for card in data["share_cards"]
            if card["card_type"]
            == "ARTICLE_COMPLETION"
        )

        assert (
            completion_card["article_id"]
            == ARTICLE_ID
        )

        assert (
            completion_card["article_title"]
            == "Test Article"
        )

        assert (
            completion_card["share_path"]
            == (
                f"/api/v1/articles/"
                f"{ARTICLE_ID}/completion/share"
            )
        )

        opinion_card = next(
            card
            for card in data["share_cards"]
            if card["card_type"] == "OPINION"
        )

        assert (
            opinion_card["article_id"]
            == ARTICLE_ID
        )

        assert (
            opinion_card["article_title"]
            == "Test Article"
        )

        assert (
            opinion_card["opinion_question_id"]
            == QUESTION_ID
        )

        assert (
            opinion_card["opinion_text"]
            == "I agree"
        )

        assert (
            opinion_card["share_path"]
            == (
                f"/api/v1/articles/"
                f"{ARTICLE_ID}/opinion/share"
                f"?response_id={OPINION_ID}"
            )
        )

    finally:
        app.dependency_overrides.clear()
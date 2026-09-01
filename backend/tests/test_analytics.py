from unittest.mock import MagicMock
from uuid import UUID

from fastapi.testclient import TestClient

from app.dependencies.auth import get_current_user
from app.main import app


client = TestClient(app)


USER_ID = UUID(
    "11111111-1111-1111-1111-111111111111"
)

ARTICLE_ID = UUID(
    "22222222-2222-2222-2222-222222222222"
)

CATEGORY_ID = UUID(
    "33333333-3333-3333-3333-333333333333"
)

ADVERTISEMENT_ID = UUID(
    "44444444-4444-4444-4444-444444444444"
)

EVENT_ID = UUID(
    "55555555-5555-5555-5555-555555555555"
)

SHARE_SOURCE_ID = UUID(
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
)


def make_auth_context(
    role: str = "SUPERADMIN",
):
    auth = MagicMock()

    auth.user.id = USER_ID
    auth.user.role = role

    return auth


def teardown_function():
    app.dependency_overrides.pop(
        get_current_user,
        None,
    )


def test_analytics_requires_superadmin():
    auth = make_auth_context(
        role="USER"
    )

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.get(
        "/api/v1/analytics/dashboard"
    )

    assert response.status_code == 403


def test_analytics_dashboard_returns_metrics():
    auth = make_auth_context()

    users_query = MagicMock()

    users_query.select.return_value.execute.return_value.data = [
        {
            "id": str(USER_ID),
            "display_name": "Test User",
        }
    ]

    articles_query = MagicMock()

    articles_query.select.return_value.execute.return_value.data = [
        {
            "id": str(ARTICLE_ID),
            "category_id": str(CATEGORY_ID),
            "article_translations": [
                {
                    "language_code": "en",
                    "title": "Test Article",
                }
            ],
            "categories": {
                "id": str(CATEGORY_ID),
                "name": "Technology",
            },
        }
    ]

    events_query = MagicMock()

    events_query.select.return_value.order.return_value.execute.return_value.data = [
        {
            "id": str(EVENT_ID),
            "event_type": "ARTICLE_VIEWED",
            "user_id": str(USER_ID),
            "article_id": str(ARTICLE_ID),
            "source_type": "ARTICLE",
            "source_id": str(ARTICLE_ID),
            "metadata": {},
            "created_at": "2026-08-31T10:00:00+00:00",
        },
        {
            "id": str(
                UUID(
                    "66666666-6666-6666-6666-666666666666"
                )
            ),
            "event_type": "ARTICLE_VIEWED",
            "user_id": str(USER_ID),
            "article_id": str(ARTICLE_ID),
            "source_type": "ARTICLE",
            "source_id": str(ARTICLE_ID),
            "metadata": {},
            "created_at": "2026-08-31T10:01:00+00:00",
        },
        {
            "id": str(
                UUID(
                    "77777777-7777-7777-7777-777777777777"
                )
            ),
            "event_type": "ADVERTISEMENT_CLICKED",
            "user_id": str(USER_ID),
            "article_id": None,
            "source_type": "ADVERTISEMENT",
            "source_id": str(ADVERTISEMENT_ID),
            "metadata": {},
            "created_at": "2026-08-31T10:02:00+00:00",
        },
    ]

    completions_query = MagicMock()

    completions_query.select.return_value.execute.return_value.data = [
        {
            "user_id": str(USER_ID),
            "article_id": str(ARTICLE_ID),
            "completed_at": "2026-08-31T10:30:00+00:00",
        }
    ]

    quiz_attempts_query = MagicMock()

    quiz_attempts_query.select.return_value.execute.return_value.data = [
        {
            "user_id": str(USER_ID),
            "question_id": "88888888-8888-8888-8888-888888888888",
            "is_correct": True,
            "created_at": "2026-08-31T10:20:00+00:00",
        },
        {
            "user_id": str(USER_ID),
            "question_id": "99999999-9999-9999-9999-999999999999",
            "is_correct": False,
            "created_at": "2026-08-31T10:21:00+00:00",
        },
    ]

    quiz_questions_query = MagicMock()

    quiz_questions_query.select.return_value.execute.return_value.data = [
        {
            "id": "88888888-8888-8888-8888-888888888888",
            "quiz_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "quizzes": {
                "article_id": str(ARTICLE_ID),
            },
        },
        {
            "id": "99999999-9999-9999-9999-999999999999",
            "quiz_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "quizzes": {
                "article_id": str(ARTICLE_ID),
            },
        },
    ]

    opinions_query = MagicMock()

    opinions_query.select.return_value.execute.return_value.data = [
        {
            "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "user_id": str(USER_ID),
            "opinion_question_id": (
                "cccccccc-cccc-cccc-cccc-cccccccccccc"
            ),
            "created_at": "2026-08-31T10:25:00+00:00",
        }
    ]

    opinion_questions_query = MagicMock()

    opinion_questions_query.select.return_value.execute.return_value.data = [
        {
            "id": (
                "cccccccc-cccc-cccc-cccc-cccccccccccc"
            ),
            "article_id": str(ARTICLE_ID),
        }
    ]

    comments_query = MagicMock()

    comments_query.select.return_value.execute.return_value.data = [
        {
            "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
            "user_id": str(USER_ID),
            "article_id": str(ARTICLE_ID),
            "created_at": "2026-08-31T10:26:00+00:00",
        }
    ]

    xp_query = MagicMock()

    xp_query.select.return_value.execute.return_value.data = [
        {
            "user_id": str(USER_ID),
            "amount": 100,
        },
        {
            "user_id": str(USER_ID),
            "amount": 50,
        },
    ]

    advertisements_query = MagicMock()

    advertisements_query.select.return_value.execute.return_value.data = [
        {
            "id": str(ADVERTISEMENT_ID),
            "title": "Test Advertisement",
            "slot": {
                "key": "HOME_TOP",
            },
        }
    ]

    def table(name):
        if name == "profiles":
            return users_query

        if name == "articles":
            return articles_query

        if name == "analytics_events":
            return events_query

        if name == "article_completions":
            return completions_query

        if name == "quiz_attempts":
            return quiz_attempts_query

        if name == "quiz_questions":
            return quiz_questions_query

        if name == "opinion_responses":
            return opinions_query

        if name == "opinion_questions":
            return opinion_questions_query

        if name == "comments":
            return comments_query

        if name == "xp_transactions":
            return xp_query

        if name == "advertisements":
            return advertisements_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.get(
        "/api/v1/analytics/dashboard"
    )

    assert response.status_code == 200

    data = response.json()

    overview = data["overview"]

    assert overview["total_users"] == 1
    assert overview["active_users"] == 1

    assert overview["total_article_views"] == 2
    assert overview["unique_article_readers"] == 1

    assert overview["articles_completed"] == 1

    assert overview["quiz_attempts"] == 2
    assert overview["quiz_correct_attempts"] == 1
    assert overview["quiz_success_rate"] == 50.0

    assert overview["opinions_submitted"] == 1
    assert overview["comments_created"] == 1

    assert overview["advertisement_clicks"] == 1


def test_analytics_dashboard_accepts_custom_limits():
    auth = make_auth_context()

    empty_query = MagicMock()

    empty_query.select.return_value.execute.return_value.data = []

    events_query = MagicMock()

    events_query.select.return_value.order.return_value.execute.return_value.data = []

    def table(name):
        if name == "profiles":
            return empty_query

        if name == "articles":
            return empty_query

        if name == "analytics_events":
            return events_query

        if name == "article_completions":
            return empty_query

        if name == "quiz_attempts":
            return empty_query

        if name == "quiz_questions":
            return empty_query

        if name == "opinion_responses":
            return empty_query

        if name == "opinion_questions":
            return empty_query

        if name == "comments":
            return empty_query

        if name == "xp_transactions":
            return empty_query

        if name == "advertisements":
            return empty_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.get(
        "/api/v1/analytics/dashboard"
        "?top_articles_limit=5"
        "&top_categories_limit=5"
        "&top_users_limit=5"
    )

    assert response.status_code == 200


def test_analytics_rejects_invalid_limits():
    auth = make_auth_context()

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.get(
        "/api/v1/analytics/dashboard"
        "?top_articles_limit=0"
    )

    assert response.status_code == 422


def test_record_article_view():
    from app.services import analytics

    supabase_mock = MagicMock()

    query = MagicMock()

    query.insert.return_value.select.return_value.single.return_value.execute.return_value.data = {
        "id": str(EVENT_ID),
        "event_type": "ARTICLE_VIEWED",
        "user_id": str(USER_ID),
        "article_id": str(ARTICLE_ID),
    }

    supabase_mock.table.return_value = query

    result = analytics.record_article_view(
        article_id=ARTICLE_ID,
        user_id=USER_ID,
        client=supabase_mock,
    )

    assert result["event_type"] == "ARTICLE_VIEWED"

    query.insert.assert_called_once()


def test_record_advertisement_click():
    from app.services import analytics

    supabase_mock = MagicMock()

    query = MagicMock()

    query.insert.return_value.select.return_value.single.return_value.execute.return_value.data = {
        "id": str(EVENT_ID),
        "event_type": "ADVERTISEMENT_CLICKED",
        "user_id": str(USER_ID),
        "source_type": "ADVERTISEMENT",
        "source_id": str(ADVERTISEMENT_ID),
    }

    supabase_mock.table.return_value = query

    result = analytics.record_advertisement_click(
        advertisement_id=ADVERTISEMENT_ID,
        user_id=USER_ID,
        client=supabase_mock,
    )

    assert result["event_type"] == (
        "ADVERTISEMENT_CLICKED"
    )

    query.insert.assert_called_once()

def test_record_share():
    from app.services import analytics

    supabase_mock = MagicMock()

    query = MagicMock()

    query.insert.return_value.select.return_value.single.return_value.execute.return_value.data = {
        "id": str(EVENT_ID),
        "event_type": "SHARE_CREATED",
        "user_id": str(USER_ID),
        "article_id": str(ARTICLE_ID),
        "source_type": "ARTICLE_COMPLETION",
        "source_id": str(SHARE_SOURCE_ID),
    }

    supabase_mock.table.return_value = query

    result = analytics.record_share(
        source_type="ARTICLE_COMPLETION",
        source_id=SHARE_SOURCE_ID,
        article_id=ARTICLE_ID,
        user_id=USER_ID,
        client=supabase_mock,
    )

    assert result["event_type"] == "SHARE_CREATED"
    assert result["user_id"] == str(USER_ID)
    assert result["article_id"] == str(ARTICLE_ID)
    assert result["source_type"] == "ARTICLE_COMPLETION"
    assert result["source_id"] == str(SHARE_SOURCE_ID)

    query.insert.assert_called_once()

def test_share_event_records_authenticated_share(monkeypatch):
    from app.routers import sharing

    auth = make_auth_context()

    calls = []

    def fake_record_share(**kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(
        sharing,
        "record_share",
        fake_record_share,
    )

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.post(
        "/api/v1/articles/share/event"
        f"?source_type=ARTICLE_COMPLETION"
        f"&source_id={SHARE_SOURCE_ID}"
        f"&article_id={ARTICLE_ID}"
    )

    assert response.status_code == 204

    assert calls == [
        {
            "source_type": "ARTICLE_COMPLETION",
            "source_id": SHARE_SOURCE_ID,
            "article_id": ARTICLE_ID,
            "user_id": USER_ID,
            "client": auth.client,
        }
    ]

def test_share_event_rejects_unsupported_source_type():
    auth = make_auth_context()

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    response = client.post(
        "/api/v1/articles/share/event"
        f"?source_type=INVALID"
        f"&source_id={SHARE_SOURCE_ID}"
    )

    assert response.status_code == 422

def test_share_event_requires_authentication():
    response = client.post(
        "/api/v1/articles/share/event"
        f"?source_type=BADGE"
        f"&source_id={SHARE_SOURCE_ID}"
    )

    assert response.status_code in (401, 403)
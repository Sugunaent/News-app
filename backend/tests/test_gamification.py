from unittest.mock import MagicMock
from uuid import UUID

from fastapi.testclient import TestClient

from app.dependencies.auth import get_current_user
from app.main import app


client = TestClient(app)


USER_ID = UUID("33333333-3333-3333-3333-333333333333")
LEVEL_ID = UUID("44444444-4444-4444-4444-444444444444")
BADGE_ID = UUID("55555555-5555-5555-5555-555555555555")
TRANSACTION_ID = UUID("66666666-6666-6666-6666-666666666666")
ARTICLE_ID = UUID("77777777-7777-7777-7777-777777777777")
SOURCE_ID = UUID("88888888-8888-8888-8888-888888888888")
RULE_ID = UUID("99999999-9999-9999-9999-999999999999")


def make_auth_context():
    auth = MagicMock()
    auth.user.id = USER_ID
    auth.user_id = USER_ID
    auth.client = MagicMock()
    return auth


def teardown_function():
    app.dependency_overrides.pop(get_current_user, None)


def test_get_my_gamification_returns_xp_level_badges_and_transactions():
    auth = make_auth_context()

    transactions_query = MagicMock()
    transactions_query.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "id": str(TRANSACTION_ID),
            "xp_rule_id": str(RULE_ID),
            "article_id": str(ARTICLE_ID),
            "source_type": "ARTICLE_COMPLETION",
            "source_id": str(SOURCE_ID),
            "amount": 20,
            "created_at": "2026-08-27T10:00:00+00:00",
        },
        {
            "id": str(UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")),
            "xp_rule_id": str(RULE_ID),
            "article_id": str(ARTICLE_ID),
            "source_type": "QUIZ_CORRECT",
            "source_id": str(UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")),
            "amount": 10,
            "created_at": "2026-08-27T09:00:00+00:00",
        },
    ]

    levels_query = MagicMock()
    (
        levels_query
        .select.return_value
        .lte.return_value
        .order.return_value
        .limit.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = {
        "id": str(LEVEL_ID),
        "name": "Level 2",
        "minimum_xp": 30,
        "display_order": 2,
    }

    badges_query = MagicMock()
    (
        badges_query
        .select.return_value
        .eq.return_value
        .order.return_value
        .execute.return_value.data
    ) = [
        {
            "badge_id": str(BADGE_ID),
            "earned_at": "2026-08-27T08:00:00+00:00",
            "badges": {
                "id": str(BADGE_ID),
                "name": "First Article",
                "description": "Completed your first article",
                "image_asset_id": None,
            },
        }
    ]

    def table(name):
        if name == "xp_transactions":
            return transactions_query

        if name == "levels":
            return levels_query

        if name == "user_badges":
            return badges_query

        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    # The service intentionally uses the trusted Supabase client.
    # Patch it on the imported service module.
    import app.services.gamification as gamification_service

    original_supabase = gamification_service.supabase
    gamification_service.supabase = auth.client

    try:
        app.dependency_overrides[get_current_user] = lambda: auth

        response = client.get("/api/v1/gamification/me")

        assert response.status_code == 200

        data = response.json()

        assert data["total_xp"] == 30

        assert data["level"] == {
            "id": str(LEVEL_ID),
            "name": "Level 2",
            "minimum_xp": 30,
            "display_order": 2,
        }

        assert len(data["badges"]) == 1
        assert data["badges"][0]["id"] == str(BADGE_ID)
        assert data["badges"][0]["name"] == "First Article"

        assert len(data["transactions"]) == 2
        assert data["transactions"][0]["amount"] == 20
        assert data["transactions"][1]["amount"] == 10

    finally:
        gamification_service.supabase = original_supabase


def test_get_my_gamification_returns_zero_xp_when_no_transactions():
    auth = make_auth_context()

    transactions_query = MagicMock()
    transactions_query.select.return_value.eq.return_value.order.return_value.execute.return_value.data = []

    levels_query = MagicMock()
    (
        levels_query
        .select.return_value
        .lte.return_value
        .order.return_value
        .limit.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = None

    badges_query = MagicMock()
    (
        badges_query
        .select.return_value
        .eq.return_value
        .order.return_value
        .execute.return_value.data
    ) = []

    def table(name):
        if name == "xp_transactions":
            return transactions_query

        if name == "levels":
            return levels_query

        if name == "user_badges":
            return badges_query

        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table

    import app.services.gamification as gamification_service

    original_supabase = gamification_service.supabase
    gamification_service.supabase = auth.client

    try:
        app.dependency_overrides[get_current_user] = lambda: auth

        response = client.get("/api/v1/gamification/me")

        assert response.status_code == 200

        data = response.json()

        assert data["total_xp"] == 0
        assert data["level"] is None
        assert data["badges"] == []
        assert data["transactions"] == []

    finally:
        gamification_service.supabase = original_supabase


def test_get_my_gamification_requires_authentication():
    response = client.get("/api/v1/gamification/me")

    assert response.status_code == 401


def test_award_xp_uses_server_side_rule_amount():
    import app.services.gamification as gamification_service

    supabase_mock = MagicMock()

    existing_query = MagicMock()
    (
        existing_query
        .select.return_value
        .eq.return_value
        .eq.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = None

    rule_query = MagicMock()
    (
        rule_query
        .select.return_value
        .eq.return_value
        .eq.return_value
        .order.return_value
        .limit.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = {
        "id": str(RULE_ID),
        "event_type": "ARTICLE_COMPLETED",
        "amount": 20,
    }

    insert_query = MagicMock()
    (
        insert_query
        .insert.return_value
        .select.return_value
        .single.return_value
        .execute.return_value.data
    ) = {
        "id": str(TRANSACTION_ID),
        "xp_rule_id": str(RULE_ID),
        "article_id": str(ARTICLE_ID),
        "source_type": "ARTICLE_COMPLETION",
        "source_id": str(SOURCE_ID),
        "amount": 20,
        "created_at": "2026-08-27T10:00:00+00:00",
    }

    def table(name):
        if name == "xp_transactions":
            # First call = duplicate check.
            return existing_query

        if name == "xp_rules":
            return rule_query

        raise AssertionError(f"Unexpected table: {name}")

    # We need xp_transactions twice, so use a call counter.
    xp_transaction_calls = 0

    def table_with_insert(name):
        nonlocal xp_transaction_calls

        if name == "xp_transactions":
            xp_transaction_calls += 1

            if xp_transaction_calls == 1:
                return existing_query

            return insert_query

        if name == "xp_rules":
            return rule_query

        raise AssertionError(f"Unexpected table: {name}")

    supabase_mock.table.side_effect = table_with_insert

    original_supabase = gamification_service.supabase
    gamification_service.supabase = supabase_mock

    try:
        result = gamification_service.award_xp(
            user_id=USER_ID,
            event_type="ARTICLE_COMPLETED",
            source_type="ARTICLE_COMPLETION",
            source_id=SOURCE_ID,
            article_id=ARTICLE_ID,
        )

        assert result["amount"] == 20

        inserted_payload = insert_query.insert.call_args.args[0]

        assert inserted_payload["amount"] == 20
        assert inserted_payload["xp_rule_id"] == str(RULE_ID)
        assert inserted_payload["user_id"] == str(USER_ID)

    finally:
        gamification_service.supabase = original_supabase


def test_award_xp_does_not_create_duplicate_transaction():
    import app.services.gamification as gamification_service

    supabase_mock = MagicMock()

    existing_query = MagicMock()
    (
        existing_query
        .select.return_value
        .eq.return_value
        .eq.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = {
        "id": str(TRANSACTION_ID),
        "xp_rule_id": str(RULE_ID),
        "article_id": str(ARTICLE_ID),
        "source_type": "ARTICLE_COMPLETION",
        "source_id": str(SOURCE_ID),
        "amount": 20,
        "created_at": "2026-08-27T10:00:00+00:00",
    }

    supabase_mock.table.return_value = existing_query

    original_supabase = gamification_service.supabase
    gamification_service.supabase = supabase_mock

    try:
        result = gamification_service.award_xp(
            user_id=USER_ID,
            event_type="ARTICLE_COMPLETED",
            source_type="ARTICLE_COMPLETION",
            source_id=SOURCE_ID,
            article_id=ARTICLE_ID,
        )

        assert result["id"] == str(TRANSACTION_ID)
        assert result["amount"] == 20

        # No INSERT should occur when the transaction already exists.
        existing_query.insert.assert_not_called()

    finally:
        gamification_service.supabase = original_supabase

def test_article_completion_awards_xp(monkeypatch):
    from app.routers import completions

    auth = make_auth_context()

    # Mock DB query for article existing
    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": str(ARTICLE_ID)
    }

    # Mock DB query for existing completion check (None -> not completed yet)
    existing_completion_query = MagicMock()
    existing_completion_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    # Mock DB query for insert completion
    insert_completion_query = MagicMock()
    insert_completion_query.insert.return_value.select.return_value.single.return_value.execute.return_value.data = {
        "article_id": str(ARTICLE_ID),
        "completed_at": "2026-08-27T10:00:00+00:00",
    }

    call_count = 0

    def table_mock(name):
        nonlocal call_count
        if name == "articles":
            return article_query
        if name == "article_completions":
            call_count += 1
            if call_count == 1:
                return existing_completion_query
            return insert_completion_query
        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table_mock

    calls = []

    def fake_award_xp(**kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(
        completions,
        "award_xp",
        fake_award_xp,
    )

    try:
        app.dependency_overrides[get_current_user] = lambda: auth

        # Execute the POST request to complete the article
        response = client.post(f"/api/v1/articles/{ARTICLE_ID}/completion")

        assert response.status_code == 200

        # Verify that award_xp was called with exact expected contract
        assert calls == [
            {
                "user_id": USER_ID,
                "event_type": "ARTICLE_COMPLETED",
                "source_type": "ARTICLE_COMPLETION",
                "source_id": ARTICLE_ID,
                "article_id": ARTICLE_ID,
            }
        ]

    finally:
        app.dependency_overrides.pop(get_current_user, None)

def test_award_xp_returns_none_when_no_active_rule():
    import app.services.gamification as gamification_service

    supabase_mock = MagicMock()

    existing_query = MagicMock()
    (
        existing_query
        .select.return_value
        .eq.return_value
        .eq.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = None

    rule_query = MagicMock()
    (
        rule_query
        .select.return_value
        .eq.return_value
        .eq.return_value
        .order.return_value
        .limit.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = None

    def table(name):
        if name == "xp_transactions":
            return existing_query

        if name == "xp_rules":
            return rule_query

        raise AssertionError(f"Unexpected table: {name}")

    supabase_mock.table.side_effect = table

    original_supabase = gamification_service.supabase
    gamification_service.supabase = supabase_mock

    try:
        result = gamification_service.award_xp(
            user_id=USER_ID,
            event_type="ARTICLE_COMPLETED",
            source_type="ARTICLE_COMPLETION",
            source_id=ARTICLE_ID,
            article_id=ARTICLE_ID,
        )

        assert result is None

    finally:
        gamification_service.supabase = original_supabase

def test_award_first_article_badge():
    import app.services.gamification as gamification_service

    supabase_mock = MagicMock()

    completion_query = MagicMock()
    (
        completion_query
        .select.return_value
        .eq.return_value
        .execute.return_value.data
    ) = [
        {
            "article_id": str(ARTICLE_ID),
        }
    ]

    badge_query = MagicMock()
    (
        badge_query
        .select.return_value
        .eq.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = {
        "id": str(BADGE_ID),
        "name": "First Article",
        "description": "Completed your first article",
        "image_asset_id": None,
    }

    user_badge_check = MagicMock()
    (
        user_badge_check
        .select.return_value
        .eq.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = None

    user_badge_insert = MagicMock()
    (
        user_badge_insert
        .insert.return_value
        .select.return_value
        .single.return_value
        .execute.return_value.data
    ) = {
        "user_id": str(USER_ID),
        "badge_id": str(BADGE_ID),
        "earned_at": "2026-08-27T10:00:00+00:00",
    }

    def table(name):
        if name == "article_completions":
            return completion_query

        if name == "badges":
            return badge_query

        if name == "user_badges":
            if user_badge_check.select.called:
                return user_badge_insert

            return user_badge_check

        raise AssertionError(f"Unexpected table: {name}")

    # Explicit call sequencing is easier and more reliable than
    # inspecting MagicMock call state.
    user_badges_calls = 0

    def table_with_sequence(name):
        nonlocal user_badges_calls

        if name == "article_completions":
            return completion_query

        if name == "badges":
            return badge_query

        if name == "user_badges":
            user_badges_calls += 1

            if user_badges_calls == 1:
                return user_badge_check

            return user_badge_insert

        raise AssertionError(f"Unexpected table: {name}")

    supabase_mock.table.side_effect = table_with_sequence

    original_supabase = gamification_service.supabase
    gamification_service.supabase = supabase_mock

    try:
        result = gamification_service.award_badges_for_user(USER_ID)

        assert len(result) == 1
        assert result[0]["id"] == str(BADGE_ID)
        assert result[0]["name"] == "First Article"

        inserted_payload = user_badge_insert.insert.call_args.args[0]

        assert inserted_payload == {
            "user_id": str(USER_ID),
            "badge_id": str(BADGE_ID),
        }

    finally:
        gamification_service.supabase = original_supabase

def test_award_ten_articles_badge():
    import app.services.gamification as gamification_service

    supabase_mock = MagicMock()

    completion_query = MagicMock()
    (
        completion_query
        .select.return_value
        .eq.return_value
        .execute.return_value.data
    ) = [
        {"article_id": str(UUID("00000000-0000-0000-0000-000000000001"))},
        {"article_id": str(UUID("00000000-0000-0000-0000-000000000002"))},
        {"article_id": str(UUID("00000000-0000-0000-0000-000000000003"))},
        {"article_id": str(UUID("00000000-0000-0000-0000-000000000004"))},
        {"article_id": str(UUID("00000000-0000-0000-0000-000000000005"))},
        {"article_id": str(UUID("00000000-0000-0000-0000-000000000006"))},
        {"article_id": str(UUID("00000000-0000-0000-0000-000000000007"))},
        {"article_id": str(UUID("00000000-0000-0000-0000-000000000008"))},
        {"article_id": str(UUID("00000000-0000-0000-0000-000000000009"))},
        {"article_id": str(UUID("00000000-0000-0000-0000-000000000010"))},
    ]

    badge_query = MagicMock()
    (
        badge_query
        .select.return_value
        .eq.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = {
        "id": str(BADGE_ID),
        "name": "10 Articles Completed",
        "description": "Completed ten articles",
        "image_asset_id": None,
    }

    user_badge_check = MagicMock()
    (
        user_badge_check
        .select.return_value
        .eq.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = None

    user_badge_insert = MagicMock()
    (
        user_badge_insert
        .insert.return_value
        .select.return_value
        .single.return_value
        .execute.return_value.data
    ) = {
        "user_id": str(USER_ID),
        "badge_id": str(BADGE_ID),
        "earned_at": "2026-08-27T10:00:00+00:00",
    }

    user_badges_calls = 0

    def table(name):
        nonlocal user_badges_calls

        if name == "article_completions":
            return completion_query

        if name == "badges":
            return badge_query

        if name == "user_badges":
            user_badges_calls += 1

            if user_badges_calls == 1:
                return user_badge_check

            return user_badge_insert

        raise AssertionError(f"Unexpected table: {name}")

    supabase_mock.table.side_effect = table

    original_supabase = gamification_service.supabase
    gamification_service.supabase = supabase_mock

    try:
        result = gamification_service.award_badges_for_user(USER_ID)

        assert len(result) == 1
        assert result[0]["name"] == "10 Articles Completed"

    finally:
        gamification_service.supabase = original_supabase

def test_award_badges_does_nothing_without_completed_articles():
    import app.services.gamification as gamification_service

    supabase_mock = MagicMock()

    completion_query = MagicMock()
    (
        completion_query
        .select.return_value
        .eq.return_value
        .execute.return_value.data
    ) = []

    supabase_mock.table.return_value = completion_query

    original_supabase = gamification_service.supabase
    gamification_service.supabase = supabase_mock

    try:
        result = gamification_service.award_badges_for_user(USER_ID)

        assert result == []

    finally:
        gamification_service.supabase = original_supabase

def test_award_badge_does_not_duplicate_existing_badge():
    import app.services.gamification as gamification_service

    supabase_mock = MagicMock()

    completion_query = MagicMock()
    (
        completion_query
        .select.return_value
        .eq.return_value
        .execute.return_value.data
    ) = [
        {"article_id": str(ARTICLE_ID)}
    ]

    badge_query = MagicMock()
    (
        badge_query
        .select.return_value
        .eq.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = {
        "id": str(BADGE_ID),
        "name": "First Article",
        "description": "Completed your first article",
        "image_asset_id": None,
    }

    existing_user_badge = MagicMock()
    (
        existing_user_badge
        .select.return_value
        .eq.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value.data
    ) = {
        "user_id": str(USER_ID),
        "badge_id": str(BADGE_ID),
    }

    def table(name):
        if name == "article_completions":
            return completion_query

        if name == "badges":
            return badge_query

        if name == "user_badges":
            return existing_user_badge

        raise AssertionError(f"Unexpected table: {name}")

    supabase_mock.table.side_effect = table

    original_supabase = gamification_service.supabase
    gamification_service.supabase = supabase_mock

    try:
        result = gamification_service.award_badges_for_user(USER_ID)

        assert result == []

        existing_user_badge.insert.assert_not_called()

    finally:
        gamification_service.supabase = original_supabase

def test_article_completion_awards_badge(monkeypatch):
    from app.routers import completions

    auth = make_auth_context()

    calls = []

    def fake_award_xp(**kwargs):
        calls.append(("xp", kwargs))

    def fake_award_badges(user_id):
        calls.append(("badge", user_id))
        return [
            {
                "id": str(BADGE_ID),
                "name": "First Article",
                "description": "Completed your first article",
                "image_asset_id": None,
                "earned_at": "2026-08-27T10:00:00+00:00",
            }
        ]

    monkeypatch.setattr(
        completions,
        "award_xp",
        fake_award_xp,
    )

    monkeypatch.setattr(
        completions,
        "award_badges_for_user",
        fake_award_badges,
    )

    # Reuse the same DB mocks from your existing
    # test_article_completion_awards_xp test.
    article_query = MagicMock()
    article_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": str(ARTICLE_ID)
    }

    existing_completion_query = MagicMock()
    existing_completion_query.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    insert_completion_query = MagicMock()
    insert_completion_query.insert.return_value.select.return_value.single.return_value.execute.return_value.data = {
        "article_id": str(ARTICLE_ID),
        "completed_at": "2026-08-27T10:00:00+00:00",
    }

    call_count = 0

    def table_mock(name):
        nonlocal call_count

        if name == "articles":
            return article_query

        if name == "article_completions":
            call_count += 1

            if call_count == 1:
                return existing_completion_query

            return insert_completion_query

        raise AssertionError(f"Unexpected table: {name}")

    auth.client.table.side_effect = table_mock

    app.dependency_overrides[get_current_user] = lambda: auth

    try:
        response = client.post(
            f"/api/v1/articles/{ARTICLE_ID}/completion"
        )

        assert response.status_code == 200

        assert calls[0][0] == "xp"
        assert calls[1] == ("badge", USER_ID)

    finally:
        app.dependency_overrides.pop(get_current_user, None)
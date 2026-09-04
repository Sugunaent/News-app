from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.dependencies.auth import (
    AuthContext,
    get_current_user,
)
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_record_audit():
    with patch(
        "app.routers.superadmin_interactive.record_audit"
    ):
        yield


# ============================================================
# TEST IDS
# ============================================================

USER_ID = UUID("11111111-1111-1111-1111-111111111111")

ARTICLE_ID = UUID("22222222-2222-2222-2222-222222222222")

QUIZ_ID = UUID("33333333-3333-3333-3333-333333333333")

QUIZ_ID_2 = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

QUESTION_ID = UUID("44444444-4444-4444-4444-444444444444")

QUESTION_ID_2 = UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

OPTION_ID = UUID("55555555-5555-5555-5555-555555555555")

OPTION_ID_2 = UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")

OPINION_ID = UUID("66666666-6666-6666-6666-666666666666")

OPINION_ID_2 = UUID("dddddddd-dddd-dddd-dddd-dddddddddddd")

OPINION_OPTION_ID = UUID("77777777-7777-7777-7777-777777777777")

OPINION_OPTION_ID_2 = UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")

TIMESTAMP = "2026-09-01T10:00:00+00:00"


# ============================================================
# AUTH HELPERS
# ============================================================

def make_auth_context(
    role: str = "SUPERADMIN",
):
    mock_user = MagicMock()
    mock_user.id = USER_ID
    mock_user.role = role

    return AuthContext(
        user=mock_user,
        client=MagicMock(),
    )


def set_auth(
    role: str = "SUPERADMIN",
):
    auth = make_auth_context(role=role)

    app.dependency_overrides[
        get_current_user
    ] = lambda: auth

    return auth


def teardown_function():
    app.dependency_overrides.pop(
        get_current_user,
        None,
    )


# ============================================================
# FACTORIES
# ============================================================

def quiz_row(
    *,
    quiz_id=QUIZ_ID,
    article_id=ARTICLE_ID,
):
    return {
        "id": str(quiz_id),
        "article_id": str(article_id),
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }


def quiz_question_row(
    *,
    question_id=QUESTION_ID,
    quiz_id=QUIZ_ID,
    display_order=0,
    question_text="What do you think?",
):
    return {
        "id": str(question_id),
        "quiz_id": str(quiz_id),
        "display_order": display_order,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
        "quiz_question_translations": [
            {
                "language_code": "en",
                "question_text": question_text,
            }
        ],
    }


def quiz_option_row(
    *,
    option_id=OPTION_ID,
    question_id=QUESTION_ID,
    display_order=0,
    is_correct=False,
    option_text="Option A",
):
    return {
        "id": str(option_id),
        "question_id": str(question_id),
        "display_order": display_order,
        "is_correct": is_correct,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
        "quiz_option_translations": [
            {
                "language_code": "en",
                "option_text": option_text,
            }
        ],
    }


def quiz_question_translation_row(
    *,
    question_id=QUESTION_ID,
    text="What do you think?",
):
    return {
        "id": "88888888-8888-8888-8888-888888888888",
        "question_id": str(question_id),
        "language_code": "en",
        "question_text": text,
    }


def quiz_option_translation_row(
    *,
    option_id=OPTION_ID,
    text="Option A",
):
    return {
        "id": "99999999-9999-9999-9999-999999999999",
        "option_id": str(option_id),
        "language_code": "en",
        "option_text": text,
    }


def opinion_row(
    *,
    opinion_id=OPINION_ID,
    article_id=ARTICLE_ID,
    display_order=0,
    allow_custom_response=True,
    question_text="What do you think?",
):
    return {
        "id": str(opinion_id),
        "article_id": str(article_id),
        "display_order": display_order,
        "allow_custom_response": allow_custom_response,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
        "opinion_question_translations": [
            {
                "language_code": "en",
                "question_text": question_text,
            }
        ],
    }


def opinion_option_row(
    *,
    option_id=OPINION_OPTION_ID,
    question_id=OPINION_ID,
    display_order=0,
    option_text="I agree",
):
    return {
        "id": str(option_id),
        "question_id": str(question_id),
        "display_order": display_order,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
        "opinion_option_translations": [
            {
                "language_code": "en",
                "option_text": option_text,
            }
        ],
    }


def opinion_question_translation_row(
    *,
    question_id=OPINION_ID,
    text="What do you think?",
):
    return {
        "id": "aaaaaaaa-1111-1111-1111-111111111111",
        "question_id": str(question_id),
        "language_code": "en",
        "question_text": text,
    }


def opinion_option_translation_row(
    *,
    option_id=OPINION_OPTION_ID,
    text="I agree",
):
    return {
        "id": "bbbbbbbb-2222-2222-2222-222222222222",
        "option_id": str(option_id),
        "language_code": "en",
        "option_text": text,
    }


def make_translation_table_mock(
    existing_id=None,
):
    query = MagicMock()

    (
        query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = (
        {"id": existing_id}
        if existing_id
        else None
    )

    (
        query
        .insert
        .return_value
        .execute
        .return_value
        .data
    ) = []

    (
        query
        .update
        .return_value
        .eq
        .return_value
        .execute
        .return_value
        .data
    ) = []

    return query


def make_opinion_translation_read_mock(
    text="What do you think?",
):
    query = MagicMock()

    (
        query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "language_code": "en",
        "question_text": text,
    }

    return query


def make_empty_list_query():
    query = MagicMock()

    (
        query
        .select
        .return_value
        .eq
        .return_value
        .order
        .return_value
        .execute
        .return_value
        .data
    ) = []

    return query


# ============================================================
# QUIZ MANAGEMENT
# ============================================================

def test_list_quizzes_returns_quizzes():
    auth = set_auth()

    query = MagicMock()

    (
        query
        .select
        .return_value
        .order
        .return_value
        .execute
        .return_value
        .data
    ) = [
        quiz_row()
    ]

    auth.client.table.return_value = query

    response = client.get(
        "/api/v1/superadmin/quizzes"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["id"] == str(QUIZ_ID)
    assert data[0]["article_id"] == str(ARTICLE_ID)


def test_list_quizzes_returns_empty_list():
    auth = set_auth()

    query = MagicMock()

    (
        query
        .select
        .return_value
        .order
        .return_value
        .execute
        .return_value
        .data
    ) = []

    auth.client.table.return_value = query

    response = client.get(
        "/api/v1/superadmin/quizzes"
    )

    assert response.status_code == 200
    assert response.json() == []


def test_create_quiz_successfully():
    auth = set_auth()

    article_query = MagicMock()

    (
        article_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(ARTICLE_ID)
    }

    existing_quiz_query = MagicMock()

    (
        existing_quiz_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = None

    insert_quiz_query = MagicMock()

    (
        insert_quiz_query
        .insert
        .return_value
        .select
        .return_value
        .single
        .return_value
        .execute
        .return_value
        .data
    ) = quiz_row()

    quiz_calls = 0

    def table(name):
        nonlocal quiz_calls

        if name == "articles":
            return article_query

        if name == "quizzes":
            quiz_calls += 1

            if quiz_calls == 1:
                return existing_quiz_query

            return insert_quiz_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.post(
        "/api/v1/superadmin/quizzes",
        json={
            "article_id": str(ARTICLE_ID),
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["id"] == str(QUIZ_ID)
    assert data["article_id"] == str(ARTICLE_ID)


def test_create_quiz_rejects_missing_article():
    auth = set_auth()

    article_query = MagicMock()

    (
        article_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = None

    auth.client.table.side_effect = (
        lambda name: (
            article_query
            if name == "articles"
            else AssertionError(
                f"Unexpected table: {name}"
            )
        )
    )

    response = client.post(
        "/api/v1/superadmin/quizzes",
        json={
            "article_id": str(ARTICLE_ID),
        },
    )

    assert response.status_code == 404


def test_create_quiz_rejects_duplicate():
    auth = set_auth()

    article_query = MagicMock()

    (
        article_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(ARTICLE_ID)
    }

    existing_quiz_query = MagicMock()

    (
        existing_quiz_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = quiz_row()

    def table(name):
        if name == "articles":
            return article_query

        if name == "quizzes":
            return existing_quiz_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.post(
        "/api/v1/superadmin/quizzes",
        json={
            "article_id": str(ARTICLE_ID),
        },
    )

    assert response.status_code == 403


def test_get_quiz_returns_detail():
    auth = set_auth()

    quiz_query = MagicMock()

    (
        quiz_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = quiz_row()

    questions_query = MagicMock()

    (
        questions_query
        .select
        .return_value
        .eq
        .return_value
        .order
        .return_value
        .execute
        .return_value
        .data
    ) = []

    options_query = make_empty_list_query()

    def table(name):
        if name == "quizzes":
            return quiz_query

        if name == "quiz_questions":
            return questions_query

        if name == "quiz_options":
            return options_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.get(
        f"/api/v1/superadmin/quizzes/{QUIZ_ID}"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == str(QUIZ_ID)
    assert data["article_id"] == str(ARTICLE_ID)


def test_get_missing_quiz_returns_404():
    auth = set_auth()

    query = MagicMock()

    (
        query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = None

    auth.client.table.return_value = query

    response = client.get(
        f"/api/v1/superadmin/quizzes/{QUIZ_ID}"
    )

    assert response.status_code == 404


def test_update_quiz_successfully():
    auth = set_auth()

    existing_query = MagicMock()

    (
        existing_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = quiz_row()

    update_query = MagicMock()

    updated = quiz_row()

    (
        update_query
        .update
        .return_value
        .eq
        .return_value
        .select
        .return_value
        .single
        .return_value
        .execute
        .return_value
        .data
    ) = updated

    table_calls = 0

    def table(name):
        nonlocal table_calls

        if name != "quizzes":
            raise AssertionError(
                f"Unexpected table: {name}"
            )

        table_calls += 1

        if table_calls == 1:
            return existing_query

        return update_query

    auth.client.table.side_effect = table

    response = client.patch(
        f"/api/v1/superadmin/quizzes/{QUIZ_ID}",
        json={},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == str(QUIZ_ID)


def test_update_missing_quiz_returns_404():
    auth = set_auth()

    query = MagicMock()

    (
        query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = None

    auth.client.table.return_value = query

    response = client.patch(
        f"/api/v1/superadmin/quizzes/{QUIZ_ID}",
        json={},
    )

    assert response.status_code == 404


def test_delete_quiz_successfully():
    auth = set_auth()

    query = MagicMock()

    (
        query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = quiz_row()

    delete_query = MagicMock()

    (
        delete_query
        .delete
        .return_value
        .eq
        .return_value
        .execute
        .return_value
        .data
    ) = None

    calls = 0

    def table(name):
        nonlocal calls

        if name != "quizzes":
            raise AssertionError(
                f"Unexpected table: {name}"
            )

        calls += 1

        if calls == 1:
            return query

        return delete_query

    auth.client.table.side_effect = table

    response = client.delete(
        f"/api/v1/superadmin/quizzes/{QUIZ_ID}"
    )

    assert response.status_code in (200, 204)


# ============================================================
# QUIZ QUESTIONS
# ============================================================

def test_list_quiz_questions_returns_questions():
    auth = set_auth()

    quiz_query = MagicMock()

    (
        quiz_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = quiz_row()

    questions_query = MagicMock()

    (
        questions_query
        .select
        .return_value
        .eq
        .return_value
        .order
        .return_value
        .execute
        .return_value
        .data
    ) = [
        quiz_question_row()
    ]

    options_query = make_empty_list_query()

    def table(name):
        if name == "quizzes":
            return quiz_query

        if name == "quiz_questions":
            return questions_query

        if name == "quiz_options":
            return options_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.get(
        f"/api/v1/superadmin/quizzes/{QUIZ_ID}/questions"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["id"] == str(QUESTION_ID)


def test_create_quiz_question_successfully():
    auth = set_auth()

    quiz_query = MagicMock()

    (
        quiz_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = quiz_row()

    question_query = MagicMock()

    (
        question_query
        .insert
        .return_value
        .select
        .return_value
        .single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(QUESTION_ID),
        "quiz_id": str(QUIZ_ID),
        "display_order": 0,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }

    translation_query = make_translation_table_mock()

    def table(name):
        if name == "quizzes":
            return quiz_query

        if name == "quiz_questions":
            return question_query

        if name == "quiz_question_translations":
            return translation_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.post(
        f"/api/v1/superadmin/quizzes/{QUIZ_ID}/questions",
        json={
            "display_order": 0,
            "question_text": "What do you think?",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["id"] == str(QUESTION_ID)
    assert data["quiz_id"] == str(QUIZ_ID)


def test_update_quiz_question_successfully():
    auth = set_auth()

    question_query = MagicMock()

    (
        question_query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(QUESTION_ID),
        "quiz_id": str(QUIZ_ID),
        "display_order": 0,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }

    translation_query = make_translation_table_mock()

    def table(name):
        if name == "quiz_questions":
            return question_query

        if name == "quiz_question_translations":
            return translation_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.patch(
        f"/api/v1/superadmin/quizzes/{QUIZ_ID}/questions/{QUESTION_ID}",
        json={
            "question_text": "Updated question?",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == str(QUESTION_ID)


def test_delete_quiz_question_returns_success():
    auth = set_auth()

    existing_query = MagicMock()

    (
        existing_query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = quiz_question_row()

    delete_query = MagicMock()

    (
        delete_query
        .delete
        .return_value
        .eq
        .return_value
        .execute
        .return_value
        .data
    ) = None

    calls = 0

    def table(name):
        nonlocal calls

        if name != "quiz_questions":
            raise AssertionError(
                f"Unexpected table: {name}"
            )

        calls += 1

        if calls == 1:
            return existing_query

        return delete_query

    auth.client.table.side_effect = table

    response = client.delete(
        f"/api/v1/superadmin/quizzes/{QUIZ_ID}/questions/{QUESTION_ID}"
    )

    assert response.status_code in (200, 204)


# ============================================================
# QUIZ OPTIONS
# ============================================================

def test_list_quiz_options_returns_options():
    auth = set_auth()

    question_query = MagicMock()

    (
        question_query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = quiz_question_row()

    options_query = MagicMock()

    (
        options_query
        .select
        .return_value
        .eq
        .return_value
        .order
        .return_value
        .execute
        .return_value
        .data
    ) = [
        quiz_option_row()
    ]

    def table(name):
        if name == "quiz_questions":
            return question_query

        if name == "quiz_options":
            return options_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.get(
        f"/api/v1/superadmin/quizzes/"
        f"{QUIZ_ID}/questions/{QUESTION_ID}/options"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["id"] == str(OPTION_ID)


def test_create_quiz_option_successfully():
    auth = set_auth()

    question_query = MagicMock()

    (
        question_query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = quiz_question_row()

    option_query = MagicMock()

    (
        option_query
        .insert
        .return_value
        .select
        .return_value
        .single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(OPTION_ID),
        "question_id": str(QUESTION_ID),
        "display_order": 0,
        "is_correct": False,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }

    translation_query = make_translation_table_mock()

    def table(name):
        if name == "quiz_questions":
            return question_query

        if name == "quiz_options":
            return option_query

        if name == "quiz_option_translations":
            return translation_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.post(
        f"/api/v1/superadmin/quizzes/"
        f"{QUIZ_ID}/questions/{QUESTION_ID}/options",
        json={
            "display_order": 0,
            "is_correct": False,
            "option_text": "Option A",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["id"] == str(OPTION_ID)
    assert data["question_id"] == str(QUESTION_ID)


def test_update_quiz_option_successfully():
    auth = set_auth()

    option_query = MagicMock()

    (
        option_query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(OPTION_ID),
        "question_id": str(QUESTION_ID),
        "display_order": 0,
        "is_correct": False,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }

    question_query = MagicMock()

    (
        question_query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(QUESTION_ID),
        "quiz_id": str(QUIZ_ID),
        "display_order": 0,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }

    clear_correct_query = MagicMock()

    (
        clear_correct_query
        .update
        .return_value
        .eq
        .return_value
        .execute
        .return_value
        .data
    ) = []

    update_query = MagicMock()

    (
        update_query
        .update
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .select
        .return_value
        .single
        .return_value
        .execute
        .return_value
        .data
    ) = quiz_option_row(
        is_correct=True,
        option_text="Correct answer",
    )

    translation_query = make_translation_table_mock()

    quiz_option_calls = 0

    def table(name):
        nonlocal quiz_option_calls

        if name == "quiz_questions":
            return question_query

        if name == "quiz_options":
            quiz_option_calls += 1

            if quiz_option_calls == 1:
                return option_query

            if quiz_option_calls == 2:
                return clear_correct_query

            return update_query

        if name == "quiz_option_translations":
            return translation_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.patch(
        f"/api/v1/superadmin/quizzes/"
        f"{QUIZ_ID}/questions/{QUESTION_ID}/options/{OPTION_ID}",
        json={
            "is_correct": True,
            "option_text": "Correct answer",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == str(OPTION_ID)


def test_delete_quiz_option_returns_success():
    auth = set_auth()

    question_query = MagicMock()

    (
        question_query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(QUESTION_ID),
        "quiz_id": str(QUIZ_ID),
        "display_order": 0,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }

    existing_query = MagicMock()

    (
        existing_query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(OPTION_ID),
        "question_id": str(QUESTION_ID),
        "display_order": 0,
        "is_correct": False,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }

    delete_query = MagicMock()

    (
        delete_query
        .delete
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .execute
        .return_value
        .data
    ) = None

    quiz_option_calls = 0

    def table(name):
        nonlocal quiz_option_calls

        if name == "quiz_questions":
            return question_query

        if name == "quiz_options":
            quiz_option_calls += 1

            if quiz_option_calls == 1:
                return existing_query

            return delete_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.delete(
        f"/api/v1/superadmin/quizzes/"
        f"{QUIZ_ID}/questions/{QUESTION_ID}/options/{OPTION_ID}"
    )

    assert response.status_code in (200, 204)


# ============================================================
# OPINION MANAGEMENT
# ============================================================

def test_list_opinions_returns_opinions():
    auth = set_auth()

    opinions_query = MagicMock()

    (
        opinions_query
        .select
        .return_value
        .order
        .return_value
        .order
        .return_value
        .execute
        .return_value
        .data
    ) = [
        opinion_row()
    ]

    options_query = make_empty_list_query()

    def table(name):
        if name == "opinion_questions":
            return opinions_query

        if name == "opinion_options":
            return options_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.get(
        "/api/v1/superadmin/opinions"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["id"] == str(OPINION_ID)


def test_list_opinions_returns_empty_list():
    auth = set_auth()

    query = MagicMock()

    (
        query
        .select
        .return_value
        .order
        .return_value
        .order
        .return_value
        .execute
        .return_value
        .data
    ) = []

    auth.client.table.return_value = query

    response = client.get(
        "/api/v1/superadmin/opinions"
    )

    assert response.status_code == 200
    assert response.json() == []


def test_create_opinion_successfully():
    auth = set_auth()

    article_query = MagicMock()

    (
        article_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(ARTICLE_ID)
    }

    opinion_query = MagicMock()

    (
        opinion_query
        .insert
        .return_value
        .select
        .return_value
        .single
        .return_value
        .execute
        .return_value
        .data
    ) = opinion_row()

    translation_query = make_translation_table_mock()

    def table(name):
        if name == "articles":
            return article_query

        if name == "opinion_questions":
            return opinion_query

        if name == "opinion_question_translations":
            return translation_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.post(
        "/api/v1/superadmin/opinions",
        json={
            "article_id": str(ARTICLE_ID),
            "display_order": 0,
            "allow_custom_response": True,
            "question_text": "What do you think?",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["id"] == str(OPINION_ID)
    assert data["article_id"] == str(ARTICLE_ID)


def test_create_opinion_rejects_missing_article():
    auth = set_auth()

    article_query = MagicMock()

    (
        article_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = None

    auth.client.table.side_effect = (
        lambda name: (
            article_query
            if name == "articles"
            else AssertionError(
                f"Unexpected table: {name}"
            )
        )
    )

    response = client.post(
        "/api/v1/superadmin/opinions",
        json={
            "article_id": str(ARTICLE_ID),
            "display_order": 0,
            "allow_custom_response": True,
            "question_text": "What do you think?",
        },
    )

    assert response.status_code == 404


def test_get_opinion_returns_opinion():
    auth = set_auth()

    opinion_query = MagicMock()

    (
        opinion_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = opinion_row()

    translation_query = make_opinion_translation_read_mock()

    options_query = make_empty_list_query()

    def table(name):
        if name == "opinion_questions":
            return opinion_query

        if name == "opinion_question_translations":
            return translation_query

        if name == "opinion_options":
            return options_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.get(
        f"/api/v1/superadmin/opinions/{OPINION_ID}"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == str(OPINION_ID)
    assert data["article_id"] == str(ARTICLE_ID)


def test_get_missing_opinion_returns_404():
    auth = set_auth()

    query = MagicMock()

    (
        query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = None

    auth.client.table.return_value = query

    response = client.get(
        f"/api/v1/superadmin/opinions/{OPINION_ID}"
    )

    assert response.status_code == 404


def test_update_opinion_successfully():
    auth = set_auth()

    existing_query = MagicMock()

    (
        existing_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = opinion_row()

    update_query = MagicMock()

    (
        update_query
        .update
        .return_value
        .eq
        .return_value
        .select
        .return_value
        .single
        .return_value
        .execute
        .return_value
        .data
    ) = opinion_row(
        allow_custom_response=False
    )

    translation_query = make_opinion_translation_read_mock()

    calls = 0

    def table(name):
        nonlocal calls

        if name == "opinion_questions":
            calls += 1

            if calls == 1:
                return existing_query

            return update_query

        if name == "opinion_question_translations":
            return translation_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.patch(
        f"/api/v1/superadmin/opinions/{OPINION_ID}",
        json={
            "allow_custom_response": False,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == str(OPINION_ID)
    assert data["allow_custom_response"] is False


def test_update_missing_opinion_returns_404():
    auth = set_auth()

    query = MagicMock()

    (
        query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = None

    auth.client.table.return_value = query

    response = client.patch(
        f"/api/v1/superadmin/opinions/{OPINION_ID}",
        json={
            "allow_custom_response": False,
        },
    )

    assert response.status_code == 404


def test_delete_opinion_returns_success():
    auth = set_auth()

    existing_query = MagicMock()

    (
        existing_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = opinion_row()

    delete_query = MagicMock()

    (
        delete_query
        .delete
        .return_value
        .eq
        .return_value
        .execute
        .return_value
        .data
    ) = None

    calls = 0

    def table(name):
        nonlocal calls

        if name != "opinion_questions":
            raise AssertionError(
                f"Unexpected table: {name}"
            )

        calls += 1

        if calls == 1:
            return existing_query

        return delete_query

    auth.client.table.side_effect = table

    response = client.delete(
        f"/api/v1/superadmin/opinions/{OPINION_ID}"
    )

    assert response.status_code in (200, 204)


# ============================================================
# OPINION OPTIONS
# ============================================================

def test_list_opinion_options_returns_options():
    auth = set_auth()

    opinion_query = MagicMock()

    (
        opinion_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = opinion_row()

    options_query = MagicMock()

    (
        options_query
        .select
        .return_value
        .eq
        .return_value
        .order
        .return_value
        .execute
        .return_value
        .data
    ) = [
        opinion_option_row()
    ]

    def table(name):
        if name == "opinion_questions":
            return opinion_query

        if name == "opinion_options":
            return options_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.get(
        f"/api/v1/superadmin/opinions/"
        f"{OPINION_ID}/options"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["id"] == str(OPINION_OPTION_ID)


def test_create_opinion_option_successfully():
    auth = set_auth()

    opinion_query = MagicMock()

    (
        opinion_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = opinion_row()

    option_query = MagicMock()

    (
        option_query
        .insert
        .return_value
        .select
        .return_value
        .single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(OPINION_OPTION_ID),
        "question_id": str(OPINION_ID),
        "display_order": 0,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }

    translation_query = make_translation_table_mock()

    def table(name):
        if name == "opinion_questions":
            return opinion_query

        if name == "opinion_options":
            return option_query

        if name == "opinion_option_translations":
            return translation_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.post(
        f"/api/v1/superadmin/opinions/"
        f"{OPINION_ID}/options",
        json={
            "display_order": 0,
            "option_text": "I agree",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["id"] == str(OPINION_OPTION_ID)
    assert data["question_id"] == str(OPINION_ID)


def test_update_opinion_option_successfully():
    auth = set_auth()

    opinion_query = MagicMock()

    (
        opinion_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = opinion_row()

    option_query = MagicMock()

    (
        option_query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(OPINION_OPTION_ID),
        "question_id": str(OPINION_ID),
        "display_order": 0,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }

    translation_query = make_translation_table_mock()

    def table(name):
        if name == "opinion_questions":
            return opinion_query

        if name == "opinion_options":
            return option_query

        if name == "opinion_option_translations":
            return translation_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.patch(
        f"/api/v1/superadmin/opinions/"
        f"{OPINION_ID}/options/{OPINION_OPTION_ID}",
        json={
            "option_text": "Updated option",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == str(OPINION_OPTION_ID)


def test_delete_opinion_option_returns_success():
    auth = set_auth()

    opinion_query = MagicMock()

    (
        opinion_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = opinion_row()

    existing_query = MagicMock()

    (
        existing_query
        .select
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = {
        "id": str(OPINION_OPTION_ID),
        "question_id": str(OPINION_ID),
        "display_order": 0,
        "created_at": TIMESTAMP,
        "updated_at": TIMESTAMP,
    }

    delete_query = MagicMock()

    (
        delete_query
        .delete
        .return_value
        .eq
        .return_value
        .eq
        .return_value
        .execute
        .return_value
        .data
    ) = None

    def table(name):
        if name == "opinion_questions":
            return opinion_query

        if name == "opinion_options":
            if not hasattr(table, "calls"):
                table.calls = 0

            table.calls += 1

            if table.calls == 1:
                return existing_query

            return delete_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.delete(
        f"/api/v1/superadmin/opinions/"
        f"{OPINION_ID}/options/{OPINION_OPTION_ID}"
    )

    assert response.status_code in (200, 204)


# ============================================================
# CUSTOM RESPONSE TOGGLE
# ============================================================

def test_opinion_can_disable_custom_response():
    auth = set_auth()

    existing = opinion_row(
        allow_custom_response=True
    )

    existing_query = MagicMock()

    (
        existing_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = existing

    updated = opinion_row(
        allow_custom_response=False
    )

    update_query = MagicMock()

    (
        update_query
        .update
        .return_value
        .eq
        .return_value
        .select
        .return_value
        .single
        .return_value
        .execute
        .return_value
        .data
    ) = updated

    translation_query = make_opinion_translation_read_mock()

    def table(name):
        if name == "opinion_questions":
            if not hasattr(table, "calls"):
                table.calls = 0

            table.calls += 1

            if table.calls == 1:
                return existing_query

            return update_query

        if name == "opinion_question_translations":
            return translation_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.patch(
        f"/api/v1/superadmin/opinions/{OPINION_ID}",
        json={
            "allow_custom_response": False,
        },
    )

    assert response.status_code == 200
    assert (
        response.json()["allow_custom_response"]
        is False
    )


def test_opinion_can_enable_custom_response():
    auth = set_auth()

    existing = opinion_row(
        allow_custom_response=False
    )

    existing_query = MagicMock()

    (
        existing_query
        .select
        .return_value
        .eq
        .return_value
        .maybe_single
        .return_value
        .execute
        .return_value
        .data
    ) = existing

    updated = opinion_row(
        allow_custom_response=True
    )

    update_query = MagicMock()

    (
        update_query
        .update
        .return_value
        .eq
        .return_value
        .select
        .return_value
        .single
        .return_value
        .execute
        .return_value
        .data
    ) = updated

    translation_query = make_opinion_translation_read_mock()

    def table(name):
        if name == "opinion_questions":
            if not hasattr(table, "calls"):
                table.calls = 0

            table.calls += 1

            if table.calls == 1:
                return existing_query

            return update_query

        if name == "opinion_question_translations":
            return translation_query

        raise AssertionError(
            f"Unexpected table: {name}"
        )

    auth.client.table.side_effect = table

    response = client.patch(
        f"/api/v1/superadmin/opinions/{OPINION_ID}",
        json={
            "allow_custom_response": True,
        },
    )

    assert response.status_code == 200
    assert (
        response.json()["allow_custom_response"]
        is True
    )


# ============================================================
# AUTHORIZATION
# ============================================================

def test_quiz_management_requires_superadmin():
    auth = set_auth(
        role="USER"
    )

    response = client.get(
        "/api/v1/superadmin/quizzes"
    )

    assert response.status_code == 403


def test_opinion_management_requires_superadmin():
    auth = set_auth(
        role="USER"
    )

    response = client.get(
        "/api/v1/superadmin/opinions"
    )

    assert response.status_code == 403


def test_quiz_management_requires_authentication():
    app.dependency_overrides.pop(
        get_current_user,
        None,
    )

    response = client.get(
        "/api/v1/superadmin/quizzes"
    )

    assert response.status_code in (401, 403)


def test_opinion_management_requires_authentication():
    app.dependency_overrides.pop(
        get_current_user,
        None,
    )

    response = client.get(
        "/api/v1/superadmin/opinions"
    )

    assert response.status_code in (401, 403)


# ============================================================
# UUID / ROUTE VALIDATION
# ============================================================

def test_quiz_invalid_uuid_is_rejected():
    set_auth()

    response = client.get(
        "/api/v1/superadmin/quizzes/not-a-uuid"
    )

    assert response.status_code == 422


def test_opinion_invalid_uuid_is_rejected():
    set_auth()

    response = client.get(
        "/api/v1/superadmin/opinions/not-a-uuid"
    )

    assert response.status_code == 422

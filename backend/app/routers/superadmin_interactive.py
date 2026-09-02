from uuid import UUID

from fastapi import APIRouter, Depends, status
from postgrest.exceptions import APIError

from app.core.exceptions import AuthorizationError, NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.superadmin_interactive import (
    SuperadminOpinionCreate,
    SuperadminOpinionOptionCreate,
    SuperadminOpinionOptionReorder,
    SuperadminOpinionOptionResponse,
    SuperadminOpinionOptionUpdate,
    SuperadminOpinionReorder,
    SuperadminOpinionResponse,
    SuperadminOpinionUpdate,
    SuperadminQuizCorrectAnswerUpdate,
    SuperadminQuizCreate,
    SuperadminQuizDetailResponse,
    SuperadminQuizListItem,
    SuperadminQuizOptionCreate,
    SuperadminQuizOptionReorder,
    SuperadminQuizOptionResponse,
    SuperadminQuizOptionUpdate,
    SuperadminQuizQuestionCreate,
    SuperadminQuizQuestionReorder,
    SuperadminQuizQuestionResponse,
    SuperadminQuizQuestionUpdate,
    SuperadminQuizUpdate,
)


router = APIRouter(
    prefix="/api/v1/superadmin",
    tags=["Superadmin Interactive Content"],
)


# ============================================================
# AUTHORIZATION
# ============================================================


def _require_superadmin(
    context: AuthContext,
) -> None:
    role = getattr(
        context.user,
        "role",
        None,
    )

    if role != "SUPERADMIN":
        raise AuthorizationError(
            "Superadmin access required"
        )


# ============================================================
# HELPERS
# ============================================================


def _normalise_translation(data):
    if isinstance(data, list):
        return data[0] if data else None

    return data


def _extract_text(
    translations,
    key: str,
) -> str | None:
    translation = _normalise_translation(
        translations
    )

    if not translation:
        return None

    return translation.get(key)


def _article_exists(
    client,
    article_id: UUID,
) -> None:
    result = (
        client.table("articles")
        .select("id")
        .eq("id", str(article_id))
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        raise NotFoundError(
            "Article not found"
        )


def _get_quiz(
    client,
    quiz_id: UUID,
):
    result = (
        client.table("quizzes")
        .select(
            "id, article_id, created_at, updated_at"
        )
        .eq("id", str(quiz_id))
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        raise NotFoundError(
            "Quiz not found"
        )

    return result.data


def _get_quiz_question(
    client,
    quiz_id: UUID,
    question_id: UUID,
):
    result = (
        client.table("quiz_questions")
        .select(
            "id, quiz_id, display_order, "
            "created_at, updated_at"
        )
        .eq("id", str(question_id))
        .eq("quiz_id", str(quiz_id))
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        raise NotFoundError(
            "Quiz question not found"
        )

    return result.data


def _get_quiz_option(
    client,
    question_id: UUID,
    option_id: UUID,
):
    result = (
        client.table("quiz_options")
        .select(
            "id, question_id, display_order, "
            "is_correct, created_at, updated_at"
        )
        .eq("id", str(option_id))
        .eq("question_id", str(question_id))
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        raise NotFoundError(
            "Quiz option not found"
        )

    return result.data


def _get_opinion(
    client,
    opinion_id: UUID,
):
    result = (
        client.table("opinion_questions")
        .select(
            "id, article_id, display_order, "
            "allow_custom_response, created_at, updated_at"
        )
        .eq("id", str(opinion_id))
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        raise NotFoundError(
            "Opinion question not found"
        )

    return result.data


def _get_opinion_option(
    client,
    question_id: UUID,
    option_id: UUID,
):
    result = (
        client.table("opinion_options")
        .select(
            "id, question_id, display_order, "
            "created_at, updated_at"
        )
        .eq("id", str(option_id))
        .eq("question_id", str(question_id))
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        raise NotFoundError(
            "Opinion option not found"
        )

    return result.data


def _reorder_rows(
    client,
    table_name: str,
    parent_column: str,
    parent_id: UUID,
    items,
) -> None:
    # Use temporary negative values first so a unique
    # (parent_id, display_order) constraint cannot collide
    # while positions are being rearranged.
    for index, item in enumerate(items):
        (
            client.table(table_name)
            .update(
                {
                    "display_order": -(index + 1),
                }
            )
            .eq("id", str(item.id))
            .eq(
                parent_column,
                str(parent_id),
            )
            .execute()
        )

    for item in items:
        (
            client.table(table_name)
            .update(
                {
                    "display_order": item.display_order,
                }
            )
            .eq("id", str(item.id))
            .eq(
                parent_column,
                str(parent_id),
            )
            .execute()
        )


def _upsert_translation(
    client,
    table_name: str,
    parent_column: str,
    parent_id: UUID,
    text_column: str,
    text_value: str,
) -> None:
    existing = (
        client.table(table_name)
        .select("id")
        .eq(parent_column, str(parent_id))
        .eq("language_code", "en")
        .maybe_single()
        .execute()
    )

    if existing and existing.data:
        (
            client.table(table_name)
            .update(
                {
                    text_column: text_value,
                }
            )
            .eq("id", str(existing.data["id"]))
            .execute()
        )

        return

    (
        client.table(table_name)
        .insert(
            {
                parent_column: str(parent_id),
                "language_code": "en",
                text_column: text_value,
            }
        )
        .execute()
    )


def _delete_translation(
    client,
    table_name: str,
    parent_column: str,
    parent_id: UUID,
) -> None:
    (
        client.table(table_name)
        .delete()
        .eq(parent_column, str(parent_id))
        .execute()
    )


# ============================================================
# QUIZ MANAGEMENT
# ============================================================


@router.get(
    "/quizzes",
    response_model=list[SuperadminQuizListItem],
)
async def list_quizzes(
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    result = (
        auth.client.table("quizzes")
        .select(
            "id, article_id, created_at, updated_at"
        )
        .order("created_at", desc=True)
        .execute()
    )

    return result.data or []


@router.get(
    "/quizzes/{quiz_id}",
    response_model=SuperadminQuizDetailResponse,
)
async def get_quiz(
    quiz_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    quiz = _get_quiz(
        client,
        quiz_id,
    )

    questions_result = (
        client.table("quiz_questions")
        .select(
            "id, quiz_id, display_order, "
            "created_at, updated_at, "
            "quiz_question_translations("
            "language_code, question_text"
            ")"
        )
        .eq("quiz_id", str(quiz_id))
        .order("display_order")
        .execute()
    )

    questions = []

    for question in questions_result.data or []:
        options_result = (
            client.table("quiz_options")
            .select(
                "id, question_id, display_order, "
                "is_correct, created_at, updated_at, "
                "quiz_option_translations("
                "language_code, option_text"
                ")"
            )
            .eq(
                "question_id",
                str(question["id"]),
            )
            .order("display_order")
            .execute()
        )

        options = [
            SuperadminQuizOptionResponse(
                id=option["id"],
                question_id=option["question_id"],
                display_order=option["display_order"],
                is_correct=option["is_correct"],
                option_text=_extract_text(
                    option.get(
                        "quiz_option_translations"
                    ),
                    "option_text",
                ),
                created_at=option["created_at"],
                updated_at=option["updated_at"],
            )
            for option in (
                options_result.data or []
            )
        ]

        questions.append(
            SuperadminQuizQuestionResponse(
                id=question["id"],
                quiz_id=question["quiz_id"],
                display_order=question["display_order"],
                question_text=_extract_text(
                    question.get(
                        "quiz_question_translations"
                    ),
                    "question_text",
                ),
                created_at=question["created_at"],
                updated_at=question["updated_at"],
                options=options,
            )
        )

    return SuperadminQuizDetailResponse(
        id=quiz["id"],
        article_id=quiz["article_id"],
        created_at=quiz["created_at"],
        updated_at=quiz["updated_at"],
        questions=questions,
    )


@router.post(
    "/quizzes",
    response_model=SuperadminQuizDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_quiz(
    payload: SuperadminQuizCreate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _article_exists(
        client,
        payload.article_id,
    )

    existing = (
        client.table("quizzes")
        .select("id")
        .eq(
            "article_id",
            str(payload.article_id),
        )
        .maybe_single()
        .execute()
    )

    if existing and existing.data:
        raise AuthorizationError(
            "This article already has a quiz"
        )

    result = (
        client.table("quizzes")
        .insert(
            {
                "article_id": str(
                    payload.article_id
                )
            }
        )
        .select(
            "id, article_id, created_at, updated_at"
        )
        .single()
        .execute()
    )

    quiz = result.data

    return SuperadminQuizDetailResponse(
        id=quiz["id"],
        article_id=quiz["article_id"],
        created_at=quiz["created_at"],
        updated_at=quiz["updated_at"],
        questions=[],
    )


@router.patch(
    "/quizzes/{quiz_id}",
    response_model=SuperadminQuizListItem,
)
async def update_quiz(
    quiz_id: UUID,
    payload: SuperadminQuizUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    quiz = _get_quiz(
        client,
        quiz_id,
    )

    update_data = {}

    if payload.article_id is not None:
        _article_exists(
            client,
            payload.article_id,
        )

        existing = (
            client.table("quizzes")
            .select("id")
            .eq(
                "article_id",
                str(payload.article_id),
            )
            .neq("id", str(quiz_id))
            .maybe_single()
            .execute()
        )

        if existing and existing.data:
            raise AuthorizationError(
                "This article already has a quiz"
            )

        update_data["article_id"] = str(
            payload.article_id
        )

    if update_data:
        result = (
            client.table("quizzes")
            .update(update_data)
            .eq("id", str(quiz_id))
            .select(
                "id, article_id, created_at, updated_at"
            )
            .single()
            .execute()
        )

        return result.data

    return quiz


@router.delete(
    "/quizzes/{quiz_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_quiz(
    quiz_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    _get_quiz(
        auth.client,
        quiz_id,
    )

    (
        auth.client.table("quizzes")
        .delete()
        .eq("id", str(quiz_id))
        .execute()
    )


# ============================================================
# QUIZ QUESTIONS
# ============================================================


@router.get(
    "/quizzes/{quiz_id}/questions",
    response_model=list[SuperadminQuizQuestionResponse],
)
async def list_quiz_questions(
    quiz_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_quiz(
        client,
        quiz_id,
    )

    result = (
        client.table("quiz_questions")
        .select(
            "id, quiz_id, display_order, "
            "created_at, updated_at, "
            "quiz_question_translations("
            "language_code, question_text"
            ")"
        )
        .eq("quiz_id", str(quiz_id))
        .order("display_order")
        .execute()
    )

    output = []

    for question in result.data or []:
        options_result = (
            client.table("quiz_options")
            .select(
                "id, question_id, display_order, "
                "is_correct, created_at, updated_at, "
                "quiz_option_translations("
                "language_code, option_text"
                ")"
            )
            .eq(
                "question_id",
                str(question["id"]),
            )
            .order("display_order")
            .execute()
        )

        output.append(
            SuperadminQuizQuestionResponse(
                id=question["id"],
                quiz_id=question["quiz_id"],
                display_order=question["display_order"],
                question_text=_extract_text(
                    question.get(
                        "quiz_question_translations"
                    ),
                    "question_text",
                ),
                created_at=question["created_at"],
                updated_at=question["updated_at"],
                options=[
                    SuperadminQuizOptionResponse(
                        id=option["id"],
                        question_id=option["question_id"],
                        display_order=option[
                            "display_order"
                        ],
                        is_correct=option["is_correct"],
                        option_text=_extract_text(
                            option.get(
                                "quiz_option_translations"
                            ),
                            "option_text",
                        ),
                        created_at=option["created_at"],
                        updated_at=option["updated_at"],
                    )
                    for option in (
                        options_result.data or []
                    )
                ],
            )
        )

    return output


@router.post(
    "/quizzes/{quiz_id}/questions",
    response_model=SuperadminQuizQuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_quiz_question(
    quiz_id: UUID,
    payload: SuperadminQuizQuestionCreate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_quiz(
        client,
        quiz_id,
    )

    result = (
        client.table("quiz_questions")
        .insert(
            {
                "quiz_id": str(quiz_id),
                "display_order": payload.display_order,
            }
        )
        .select(
            "id, quiz_id, display_order, "
            "created_at, updated_at"
        )
        .single()
        .execute()
    )

    question = result.data

    _upsert_translation(
        client,
        "quiz_question_translations",
        "question_id",
        UUID(str(question["id"])),
        "question_text",
        payload.question_text,
    )

    return SuperadminQuizQuestionResponse(
        id=question["id"],
        quiz_id=question["quiz_id"],
        display_order=question["display_order"],
        question_text=payload.question_text,
        created_at=question["created_at"],
        updated_at=question["updated_at"],
        options=[],
    )


@router.patch(
    "/quizzes/{quiz_id}/questions/{question_id}",
    response_model=SuperadminQuizQuestionResponse,
)
async def update_quiz_question(
    quiz_id: UUID,
    question_id: UUID,
    payload: SuperadminQuizQuestionUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    question = _get_quiz_question(
        client,
        quiz_id,
        question_id,
    )

    update_data = {}

    if payload.display_order is not None:
        update_data["display_order"] = (
            payload.display_order
        )

    if update_data:
        result = (
            client.table("quiz_questions")
            .update(update_data)
            .eq("id", str(question_id))
            .eq("quiz_id", str(quiz_id))
            .select(
                "id, quiz_id, display_order, "
                "created_at, updated_at"
            )
            .single()
            .execute()
        )

        question = result.data

    if payload.question_text is not None:
        _upsert_translation(
            client,
            "quiz_question_translations",
            "question_id",
            question_id,
            "question_text",
            payload.question_text,
        )

    return SuperadminQuizQuestionResponse(
        id=question["id"],
        quiz_id=question["quiz_id"],
        display_order=question["display_order"],
        question_text=(
            payload.question_text
            if payload.question_text is not None
            else _extract_text(
                (
                    client.table(
                        "quiz_question_translations"
                    )
                    .select(
                        "language_code, question_text"
                    )
                    .eq(
                        "question_id",
                        str(question_id),
                    )
                    .eq("language_code", "en")
                    .maybe_single()
                    .execute()
                    .data
                ),
                "question_text",
            )
        ),
        created_at=question["created_at"],
        updated_at=question["updated_at"],
        options=[],
    )


@router.delete(
    "/quizzes/{quiz_id}/questions/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_quiz_question(
    quiz_id: UUID,
    question_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_quiz_question(
        client,
        quiz_id,
        question_id,
    )

    (
        client.table("quiz_questions")
        .delete()
        .eq("id", str(question_id))
        .eq("quiz_id", str(quiz_id))
        .execute()
    )


@router.patch(
    "/quizzes/{quiz_id}/questions/reorder",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def reorder_quiz_questions(
    quiz_id: UUID,
    payload: SuperadminQuizQuestionReorder,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_quiz(
        client,
        quiz_id,
    )

    existing = (
        client.table("quiz_questions")
        .select("id")
        .eq("quiz_id", str(quiz_id))
        .execute()
    )

    existing_ids = {
        str(row["id"])
        for row in (
            existing.data or []
        )
    }

    supplied_ids = {
        str(item.id)
        for item in payload.items
    }

    if existing_ids != supplied_ids:
        raise AuthorizationError(
            "Reorder payload must contain every quiz question"
        )

    _reorder_rows(
        client,
        "quiz_questions",
        "quiz_id",
        quiz_id,
        payload.items,
    )

# ============================================================
# QUIZ OPTIONS
# ============================================================


@router.get(
    "/quizzes/{quiz_id}/questions/{question_id}/options",
    response_model=list[SuperadminQuizOptionResponse],
)
async def list_quiz_options(
    quiz_id: UUID,
    question_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_quiz_question(
        client,
        quiz_id,
        question_id,
    )

    result = (
        client.table("quiz_options")
        .select(
            "id, question_id, display_order, "
            "is_correct, created_at, updated_at, "
            "quiz_option_translations("
            "language_code, option_text"
            ")"
        )
        .eq("question_id", str(question_id))
        .order("display_order")
        .execute()
    )

    return [
        SuperadminQuizOptionResponse(
            id=option["id"],
            question_id=option["question_id"],
            display_order=option["display_order"],
            is_correct=option["is_correct"],
            option_text=_extract_text(
                option.get("quiz_option_translations"),
                "option_text",
            ),
            created_at=option["created_at"],
            updated_at=option["updated_at"],
        )
        for option in (result.data or [])
    ]


@router.post(
    "/quizzes/{quiz_id}/questions/{question_id}/options",
    response_model=SuperadminQuizOptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_quiz_option(
    quiz_id: UUID,
    question_id: UUID,
    payload: SuperadminQuizOptionCreate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_quiz_question(
        client,
        quiz_id,
        question_id,
    )

    if payload.is_correct:
        (
            client.table("quiz_options")
            .update({"is_correct": False})
            .eq(
                "question_id",
                str(question_id),
            )
            .execute()
        )

    result = (
        client.table("quiz_options")
        .insert(
            {
                "question_id": str(question_id),
                "display_order": payload.display_order,
                "is_correct": payload.is_correct,
            }
        )
        .select(
            "id, question_id, display_order, "
            "is_correct, created_at, updated_at"
        )
        .single()
        .execute()
    )

    option = result.data

    _upsert_translation(
        client,
        "quiz_option_translations",
        "option_id",
        UUID(str(option["id"])),
        "option_text",
        payload.option_text,
    )

    return SuperadminQuizOptionResponse(
        id=option["id"],
        question_id=option["question_id"],
        display_order=option["display_order"],
        is_correct=option["is_correct"],
        option_text=payload.option_text,
        created_at=option["created_at"],
        updated_at=option["updated_at"],
    )


@router.patch(
    "/quizzes/{quiz_id}/questions/{question_id}/options/{option_id}",
    response_model=SuperadminQuizOptionResponse,
)
async def update_quiz_option(
    quiz_id: UUID,
    question_id: UUID,
    option_id: UUID,
    payload: SuperadminQuizOptionUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    option = _get_quiz_option(
        client,
        question_id,
        option_id,
    )

    _get_quiz_question(
        client,
        quiz_id,
        question_id,
    )

    update_data = {}

    if payload.display_order is not None:
        update_data["display_order"] = payload.display_order

    if payload.is_correct is True:
        (
            client.table("quiz_options")
            .update({"is_correct": False})
            .eq(
                "question_id",
                str(question_id),
            )
            .execute()
        )

        update_data["is_correct"] = True

    elif payload.is_correct is False:
        update_data["is_correct"] = False

    if update_data:
        result = (
            client.table("quiz_options")
            .update(update_data)
            .eq("id", str(option_id))
            .eq(
                "question_id",
                str(question_id),
            )
            .select(
                "id, question_id, display_order, "
                "is_correct, created_at, updated_at, "
                "quiz_option_translations("
                "language_code, option_text"
                ")"
            )
            .single()
            .execute()
        )

        option = result.data

    if payload.option_text is not None:
        _upsert_translation(
            client,
            "quiz_option_translations",
            "option_id",
            option_id,
            "option_text",
            payload.option_text,
        )

    return SuperadminQuizOptionResponse(
        id=option["id"],
        question_id=option["question_id"],
        display_order=option["display_order"],
        is_correct=option["is_correct"],
        option_text=(
            payload.option_text
            if payload.option_text is not None
            else _extract_text(
                option.get("quiz_option_translations"),
                "option_text",
            )
        ),
        created_at=option["created_at"],
        updated_at=option["updated_at"],
    )


@router.delete(
    "/quizzes/{quiz_id}/questions/{question_id}/options/{option_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_quiz_option(
    quiz_id: UUID,
    question_id: UUID,
    option_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_quiz_question(
        client,
        quiz_id,
        question_id,
    )

    _get_quiz_option(
        client,
        question_id,
        option_id,
    )

    (
        client.table("quiz_options")
        .delete()
        .eq("id", str(option_id))
        .eq(
            "question_id",
            str(question_id),
        )
        .execute()
    )


@router.patch(
    "/quizzes/{quiz_id}/questions/{question_id}/options/reorder",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def reorder_quiz_options(
    quiz_id: UUID,
    question_id: UUID,
    payload: SuperadminQuizOptionReorder,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_quiz_question(
        client,
        quiz_id,
        question_id,
    )

    existing = (
        client.table("quiz_options")
        .select("id")
        .eq(
            "question_id",
            str(question_id),
        )
        .execute()
    )

    existing_ids = {
        str(row["id"])
        for row in (existing.data or [])
    }

    supplied_ids = {
        str(item.id)
        for item in payload.items
    }

    if existing_ids != supplied_ids:
        raise AuthorizationError(
            "Reorder payload must contain every quiz option"
        )

    _reorder_rows(
        client,
        "quiz_options",
        "question_id",
        question_id,
        payload.items,
    )


@router.patch(
    "/quizzes/{quiz_id}/questions/{question_id}/correct-answer",
    response_model=SuperadminQuizOptionResponse,
)
async def set_quiz_correct_answer(
    quiz_id: UUID,
    question_id: UUID,
    payload: SuperadminQuizCorrectAnswerUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_quiz_question(
        client,
        quiz_id,
        question_id,
    )

    option = _get_quiz_option(
        client,
        question_id,
        payload.option_id,
    )

    (
        client.table("quiz_options")
        .update({"is_correct": False})
        .eq(
            "question_id",
            str(question_id),
        )
        .execute()
    )

    result = (
        client.table("quiz_options")
        .update({"is_correct": True})
        .eq("id", str(payload.option_id))
        .eq(
            "question_id",
            str(question_id),
        )
        .select(
            "id, question_id, display_order, "
            "is_correct, created_at, updated_at, "
            "quiz_option_translations("
            "language_code, option_text"
            ")"
        )
        .single()
        .execute()
    )

    option = result.data

    return SuperadminQuizOptionResponse(
        id=option["id"],
        question_id=option["question_id"],
        display_order=option["display_order"],
        is_correct=option["is_correct"],
        option_text=_extract_text(
            option.get("quiz_option_translations"),
            "option_text",
        ),
        created_at=option["created_at"],
        updated_at=option["updated_at"],
    )


# ============================================================
# OPINION MANAGEMENT
# ============================================================


@router.get(
    "/opinions",
    response_model=list[SuperadminOpinionResponse],
)
async def list_opinions(
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    result = (
        client.table("opinion_questions")
        .select(
            "id, article_id, display_order, "
            "allow_custom_response, created_at, updated_at, "
            "opinion_question_translations("
            "language_code, question_text"
            ")"
        )
        .order("article_id")
        .order("display_order")
        .execute()
    )

    output = []

    for opinion in result.data or []:
        options = (
            client.table("opinion_options")
            .select(
                "id, question_id, display_order, "
                "created_at, updated_at, "
                "opinion_option_translations("
                "language_code, option_text)"
            )
            .eq(
                "question_id",
                str(opinion["id"]),
            )
            .order("display_order")
            .execute()
        )

        output.append(
            SuperadminOpinionResponse(
                id=opinion["id"],
                article_id=opinion["article_id"],
                display_order=opinion["display_order"],
                allow_custom_response=opinion[
                    "allow_custom_response"
                ],
                question_text=_extract_text(
                    opinion.get(
                        "opinion_question_translations"
                    ),
                    "question_text",
                ),
                created_at=opinion["created_at"],
                updated_at=opinion["updated_at"],
                options=[
                    SuperadminOpinionOptionResponse(
                        id=option["id"],
                        question_id=option["question_id"],
                        display_order=option[
                            "display_order"
                        ],
                        option_text=_extract_text(
                            option.get(
                                "opinion_option_translations"
                            ),
                            "option_text",
                        ),
                        created_at=option[
                            "created_at"
                        ],
                        updated_at=option[
                            "updated_at"
                        ],
                    )
                    for option in (
                        options.data or []
                    )
                ],
            )
        )

    return output


@router.get(
    "/opinions/{opinion_id}",
    response_model=SuperadminOpinionResponse,
)
async def get_opinion(
    opinion_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    opinion = _get_opinion(
        client,
        opinion_id,
    )

    translation = (
        client.table("opinion_question_translations")
        .select(
            "language_code, question_text"
        )
        .eq(
            "question_id",
            str(opinion_id),
        )
        .eq("language_code", "en")
        .maybe_single()
        .execute()
    )

    options = (
        client.table("opinion_options")
        .select(
            "id, question_id, display_order, "
            "created_at, updated_at, "
            "opinion_option_translations("
            "language_code, option_text)"
        )
        .eq(
            "question_id",
            str(opinion_id),
        )
        .order("display_order")
        .execute()
    )

    return SuperadminOpinionResponse(
        id=opinion["id"],
        article_id=opinion["article_id"],
        display_order=opinion["display_order"],
        allow_custom_response=opinion[
            "allow_custom_response"
        ],
        question_text=(
            translation.data["question_text"]
            if translation and translation.data
            else None
        ),
        created_at=opinion["created_at"],
        updated_at=opinion["updated_at"],
        options=[
            SuperadminOpinionOptionResponse(
                id=option["id"],
                question_id=option["question_id"],
                display_order=option["display_order"],
                option_text=_extract_text(
                    option.get(
                        "opinion_option_translations"
                    ),
                    "option_text",
                ),
                created_at=option["created_at"],
                updated_at=option["updated_at"],
            )
            for option in (
                options.data or []
            )
        ],
    )


@router.post(
    "/opinions",
    response_model=SuperadminOpinionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_opinion(
    payload: SuperadminOpinionCreate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _article_exists(
        client,
        payload.article_id,
    )

    result = (
        client.table("opinion_questions")
        .insert(
            {
                "article_id": str(
                    payload.article_id
                ),
                "display_order": payload.display_order,
                "allow_custom_response": (
                    payload.allow_custom_response
                ),
            }
        )
        .select(
            "id, article_id, display_order, "
            "allow_custom_response, created_at, updated_at"
        )
        .single()
        .execute()
    )

    opinion = result.data

    _upsert_translation(
        client,
        "opinion_question_translations",
        "question_id",
        UUID(str(opinion["id"])),
        "question_text",
        payload.question_text,
    )

    return SuperadminOpinionResponse(
        id=opinion["id"],
        article_id=opinion["article_id"],
        display_order=opinion["display_order"],
        allow_custom_response=opinion[
            "allow_custom_response"
        ],
        question_text=payload.question_text,
        created_at=opinion["created_at"],
        updated_at=opinion["updated_at"],
        options=[],
    )


@router.patch(
    "/opinions/{opinion_id}",
    response_model=SuperadminOpinionResponse,
)
async def update_opinion(
    opinion_id: UUID,
    payload: SuperadminOpinionUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    opinion = _get_opinion(
        client,
        opinion_id,
    )

    update_data = {}

    if payload.display_order is not None:
        update_data["display_order"] = (
            payload.display_order
        )

    if payload.allow_custom_response is not None:
        update_data["allow_custom_response"] = (
            payload.allow_custom_response
        )

    if update_data:
        result = (
            client.table("opinion_questions")
            .update(update_data)
            .eq("id", str(opinion_id))
            .select(
                "id, article_id, display_order, "
                "allow_custom_response, created_at, updated_at"
            )
            .single()
            .execute()
        )

        opinion = result.data

    if payload.question_text is not None:
        _upsert_translation(
            client,
            "opinion_question_translations",
            "question_id",
            opinion_id,
            "question_text",
            payload.question_text,
        )

    translation = (
        client.table("opinion_question_translations")
        .select(
            "language_code, question_text"
        )
        .eq(
            "question_id",
            str(opinion_id),
        )
        .eq("language_code", "en")
        .maybe_single()
        .execute()
    )

    return SuperadminOpinionResponse(
        id=opinion["id"],
        article_id=opinion["article_id"],
        display_order=opinion["display_order"],
        allow_custom_response=opinion[
            "allow_custom_response"
        ],
        question_text=(
            translation.data["question_text"]
            if translation and translation.data
            else None
        ),
        created_at=opinion["created_at"],
        updated_at=opinion["updated_at"],
        options=[],
    )


@router.patch(
    "/opinions/reorder",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def reorder_opinions(
    payload: SuperadminOpinionReorder,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    if not payload.items:
        return

    first = _get_opinion(
        client,
        payload.items[0].id,
    )

    article_id = first["article_id"]

    existing = (
        client.table("opinion_questions")
        .select("id")
        .eq(
            "article_id",
            str(article_id),
        )
        .execute()
    )

    existing_ids = {
        str(row["id"])
        for row in (
            existing.data or []
        )
    }

    supplied_ids = {
        str(item.id)
        for item in payload.items
    }

    if existing_ids != supplied_ids:
        raise AuthorizationError(
            "Reorder payload must contain every opinion for the article"
        )

    for item in payload.items:
        current = _get_opinion(
            client,
            item.id,
        )

        if str(current["article_id"]) != str(
            article_id
        ):
            raise AuthorizationError(
                "All opinions must belong to the same article"
            )

    _reorder_rows(
        client,
        "opinion_questions",
        "article_id",
        article_id,
        payload.items,
    )


@router.delete(
    "/opinions/{opinion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_opinion(
    opinion_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    _get_opinion(
        auth.client,
        opinion_id,
    )

    (
        auth.client.table("opinion_questions")
        .delete()
        .eq("id", str(opinion_id))
        .execute()
    )


# ============================================================
# OPINION OPTIONS
# ============================================================


@router.get(
    "/opinions/{opinion_id}/options",
    response_model=list[SuperadminOpinionOptionResponse],
)
async def list_opinion_options(
    opinion_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_opinion(
        client,
        opinion_id,
    )

    result = (
        client.table("opinion_options")
        .select(
            "id, question_id, display_order, "
            "created_at, updated_at, "
            "opinion_option_translations("
            "language_code, option_text)"
        )
        .eq(
            "question_id",
            str(opinion_id),
        )
        .order("display_order")
        .execute()
    )

    return [
        SuperadminOpinionOptionResponse(
            id=option["id"],
            question_id=option["question_id"],
            display_order=option["display_order"],
            option_text=_extract_text(
                option.get(
                    "opinion_option_translations"
                ),
                "option_text",
            ),
            created_at=option["created_at"],
            updated_at=option["updated_at"],
        )
        for option in (
            result.data or []
        )
    ]


@router.post(
    "/opinions/{opinion_id}/options",
    response_model=SuperadminOpinionOptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_opinion_option(
    opinion_id: UUID,
    payload: SuperadminOpinionOptionCreate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_opinion(
        client,
        opinion_id,
    )

    result = (
        client.table("opinion_options")
        .insert(
            {
                "question_id": str(opinion_id),
                "display_order": payload.display_order,
            }
        )
        .select(
            "id, question_id, display_order, "
            "created_at, updated_at"
        )
        .single()
        .execute()
    )

    option = result.data

    _upsert_translation(
        client,
        "opinion_option_translations",
        "option_id",
        UUID(str(option["id"])),
        "option_text",
        payload.option_text,
    )

    return SuperadminOpinionOptionResponse(
        id=option["id"],
        question_id=option["question_id"],
        display_order=option["display_order"],
        option_text=payload.option_text,
        created_at=option["created_at"],
        updated_at=option["updated_at"],
    )


@router.patch(
    "/opinions/{opinion_id}/options/{option_id}",
    response_model=SuperadminOpinionOptionResponse,
)
async def update_opinion_option(
    opinion_id: UUID,
    option_id: UUID,
    payload: SuperadminOpinionOptionUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_opinion(
        client,
        opinion_id,
    )

    option = _get_opinion_option(
        client,
        opinion_id,
        option_id,
    )

    update_data = {}

    if payload.display_order is not None:
        update_data["display_order"] = (
            payload.display_order
        )

    if update_data:
        result = (
            client.table("opinion_options")
            .update(update_data)
            .eq("id", str(option_id))
            .eq(
                "question_id",
                str(opinion_id),
            )
            .select(
                "id, question_id, display_order, "
                "created_at, updated_at, "
                "opinion_option_translations("
                "language_code, option_text)"
            )
            .single()
            .execute()
        )
        option = result.data

    if payload.option_text is not None:
        _upsert_translation(
            client,
            "opinion_option_translations",
            "option_id",
            option_id,
            "option_text",
            payload.option_text,
        )

    return SuperadminOpinionOptionResponse(
        id=option["id"],
        question_id=option["question_id"],
        display_order=option["display_order"],
        option_text=(
            payload.option_text
            if payload.option_text is not None
            else _extract_text(
                option.get(
                    "opinion_option_translations"
                ),
                "option_text",
            )
        ),
        created_at=option["created_at"],
        updated_at=option["updated_at"],
    )


@router.delete(
    "/opinions/{opinion_id}/options/{option_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_opinion_option(
    opinion_id: UUID,
    option_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_opinion(
        client,
        opinion_id,
    )

    _get_opinion_option(
        client,
        opinion_id,
        option_id,
    )

    (
        client.table("opinion_options")
        .delete()
        .eq("id", str(option_id))
        .eq(
            "question_id",
            str(opinion_id),
        )
        .execute()
    )


@router.patch(
    "/opinions/{opinion_id}/options/reorder",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def reorder_opinion_options(
    opinion_id: UUID,
    payload: SuperadminOpinionOptionReorder,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    client = auth.client

    _get_opinion(
        client,
        opinion_id,
    )

    existing = (
        client.table("opinion_options")
        .select("id")
        .eq(
            "question_id",
            str(opinion_id),
        )
        .execute()
    )

    existing_ids = {
        str(row["id"])
        for row in (
            existing.data or []
        )
    }

    supplied_ids = {
        str(item.id)
        for item in payload.items
    }

    if existing_ids != supplied_ids:
        raise AuthorizationError(
            "Reorder payload must contain every opinion option"
        )

    _reorder_rows(
        client,
        "opinion_options",
        "question_id",
        opinion_id,
        payload.items,
    )
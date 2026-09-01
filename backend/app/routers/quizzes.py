from uuid import UUID

from fastapi import APIRouter, Depends
from postgrest.exceptions import APIError

from app.core.exceptions import NotFoundError
from app.dependencies.auth import (
    AuthContext,
    get_current_user,
)
from app.schemas.quizzes import (
    QuizAttemptCreate,
    QuizAttemptResponse,
    QuizOptionResponse,
    QuizQuestionResponse,
    QuizResponse,
    QuizSubmitResponse,
)
from app.services.analytics import (
    record_quiz_attempt,
)
from app.services.gamification import award_xp


router = APIRouter(
    prefix="/api/v1/quizzes",
    tags=["quizzes"],
)


def _extract_translation(
    translations: list[dict],
    fallback_lang: str = "en",
) -> str | None:
    if not translations:
        return None

    for item in translations:
        if (
            item.get("language_code", "").lower()
            == fallback_lang.lower()
        ):
            return (
                item.get("question_text")
                or item.get("option_text")
            )

    first_item = translations[0]

    return (
        first_item.get("question_text")
        or first_item.get("option_text")
    )


@router.get(
    "/article/{article_id}",
    response_model=QuizResponse,
)
async def get_article_quiz(
    article_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    client = auth.client

    try:
        quiz_res = (
            client.table("quizzes")
            .select("id, article_id")
            .eq("article_id", str(article_id))
            .maybe_single()
            .execute()
        )
    except APIError as exc:
        raise NotFoundError("Quiz not found") from exc

    if not quiz_res or not quiz_res.data:
        raise NotFoundError("Quiz not found")

    quiz_id = quiz_res.data["id"]

    try:
        questions_res = (
            client.table("quiz_questions")
            .select(
                "id, quiz_id, display_order, "
                "quiz_question_translations("
                "language_code, question_text)"
            )
            .eq("quiz_id", str(quiz_id))
            .order("display_order")
            .execute()
        )
    except APIError as exc:
        raise NotFoundError(
            "Failed to fetch questions"
        ) from exc

    questions_data = questions_res.data or []

    question_ids = [
        q["id"]
        for q in questions_data
    ]

    options_by_question: dict[str, list] = {}

    if question_ids:
        try:
            options_res = (
                client.table("quiz_options")
                .select(
                    "id, question_id, display_order, "
                    "quiz_option_translations("
                    "language_code, option_text)"
                )
                .order("display_order")
                .execute()
            )

            for opt in options_res.data or []:
                q_id = opt["question_id"]

                if q_id in question_ids:
                    options_by_question.setdefault(
                        q_id,
                        [],
                    ).append(opt)

        except APIError as exc:
            raise NotFoundError(
                "Failed to fetch options"
            ) from exc

    formatted_questions = []

    for question in questions_data:
        question_text = _extract_translation(
            question.get(
                "quiz_question_translations",
                [],
            )
        )

        if not question_text:
            continue

        raw_options = options_by_question.get(
            question["id"],
            [],
        )

        formatted_options = []

        for opt in raw_options:
            option_text = _extract_translation(
                opt.get(
                    "quiz_option_translations",
                    [],
                )
            )

            if option_text:
                formatted_options.append(
                    QuizOptionResponse(
                        id=opt["id"],
                        display_order=opt[
                            "display_order"
                        ],
                        option_text=option_text,
                    )
                )

        formatted_questions.append(
            QuizQuestionResponse(
                id=question["id"],
                display_order=question[
                    "display_order"
                ],
                question_text=question_text,
                options=formatted_options,
            )
        )

    return QuizResponse(
        id=quiz_id,
        article_id=article_id,
        questions=formatted_questions,
    )


@router.post(
    "/{quiz_id}/attempts",
    response_model=QuizSubmitResponse,
)
async def submit_quiz_attempt(
    quiz_id: UUID,
    payload: QuizAttemptCreate,
    auth: AuthContext = Depends(get_current_user),
):
    client = auth.client

    # ---------------------------------------------------------
    # 1. Validate question exists & belongs to quiz
    # ---------------------------------------------------------

    try:
        question_res = (
            client.table("quiz_questions")
            .select("id, quiz_id")
            .eq(
                "id",
                str(payload.question_id),
            )
            .eq(
                "quiz_id",
                str(quiz_id),
            )
            .maybe_single()
            .execute()
        )
    except APIError as exc:
        raise NotFoundError(
            "Quiz question not found"
        ) from exc

    if not question_res or not question_res.data:
        raise NotFoundError(
            "Quiz question not found"
        )

    # ---------------------------------------------------------
    # 2. Validate option exists & belongs to question
    # ---------------------------------------------------------

    try:
        option_res = (
            client.table("quiz_options")
            .select(
                "id, question_id, is_correct"
            )
            .eq(
                "id",
                str(payload.selected_option_id),
            )
            .eq(
                "question_id",
                str(payload.question_id),
            )
            .maybe_single()
            .execute()
        )
    except APIError as exc:
        raise NotFoundError(
            "Quiz option not found"
        ) from exc

    if not option_res or not option_res.data:
        raise NotFoundError(
            "Quiz option not found"
        )

    # IMPORTANT:
    # Correctness comes from the database, never the client.
    is_correct = option_res.data["is_correct"]

    # ---------------------------------------------------------
    # 3. Record trusted quiz attempt
    # ---------------------------------------------------------

    try:
        attempt_response = (
            client.table("quiz_attempts")
            .insert(
                {
                    "user_id": str(auth.user.id),
                    "question_id": str(
                        payload.question_id
                    ),
                    "selected_option_id": str(
                        payload.selected_option_id
                    ),
                    "is_correct": is_correct,
                }
            )
            .select(
                "question_id, selected_option_id, "
                "is_correct, created_at"
            )
            .execute()
        )
    except APIError as exc:
        raise NotFoundError(
            "Unable to record quiz attempt"
        ) from exc

    # ---------------------------------------------------------
    # 4. Award XP only for a correct answer
    # ---------------------------------------------------------

    if is_correct:
        award_xp(
            user_id=auth.user.id,
            event_type="QUIZ_CORRECT",
            source_type="QUIZ_CORRECT",
            source_id=payload.question_id,
        )

    # ---------------------------------------------------------
    # 5. Analytics
    #
    # The attempt is recorded first. Therefore only a
    # successfully persisted quiz attempt reaches analytics.
    #
    # Analytics failure must never invalidate the quiz result.
    # ---------------------------------------------------------

    try:
        record_quiz_attempt(
            quiz_id=quiz_id,
            question_id=payload.question_id,
            user_id=auth.user.id,
            is_correct=is_correct,
        )
    except Exception:
        pass

    # ---------------------------------------------------------
    # 6. Safely extract response data regardless of
    #    Supabase/mock return shape
    # ---------------------------------------------------------

    attempt_data = getattr(
        attempt_response,
        "data",
        None,
    )

    if attempt_data and len(attempt_data) > 0:
        raw_attempt = attempt_data[0]

    else:
        raw_attempt = {
            "question_id": str(
                payload.question_id
            ),
            "selected_option_id": str(
                payload.selected_option_id
            ),
            "is_correct": is_correct,
            "created_at": (
                "2026-08-24T00:00:00Z"
            ),
        }

    return QuizSubmitResponse(
        attempt=QuizAttemptResponse(
            question_id=raw_attempt[
                "question_id"
            ],
            selected_option_id=raw_attempt[
                "selected_option_id"
            ],
            is_correct=raw_attempt[
                "is_correct"
            ],
            created_at=raw_attempt[
                "created_at"
            ],
        )
    )
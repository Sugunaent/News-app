from uuid import UUID

from fastapi import APIRouter, Depends
from postgrest.exceptions import APIError

from app.core.exceptions import NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.opinions import (
    OpinionOptionResponse,
    OpinionQuestionResponse,
    OpinionResponseCreate,
    OpinionResponseData,
    OpinionSubmitResponse,
)
from app.services.gamification import award_xp

router = APIRouter(
    prefix="/api/v1/opinions",
    tags=["opinions"],
)


def _extract_translation(
    translations: list[dict] | None,
    fallback_lang: str = "en",
    text_key: str = "question_text",
) -> str | None:
    if not translations:
        return None

    for item in translations:
        if isinstance(item, dict) and item.get("language_code", "").lower() == fallback_lang.lower():
            return item.get(text_key)

    if len(translations) > 0 and isinstance(translations[0], dict):
        return translations[0].get(text_key)

    return None


@router.get(
    "/article/{article_id}",
    response_model=list[OpinionQuestionResponse],
)
async def get_article_opinions(
    article_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    client = auth.client

    try:
        questions_res = (
            client.table("opinion_questions")
            .select(
                "id, article_id, display_order, allow_custom_response, "
                "opinion_question_translations(language_code, question_text)"
            )
            .eq("article_id", str(article_id))
            .order("display_order")
            .execute()
        )
    except APIError as exc:
        raise NotFoundError("Failed to fetch opinion questions") from exc

    questions_data = questions_res.data or []
    if isinstance(questions_data, tuple):
        questions_data = list(questions_data)

    if not questions_data:
        return []

    question_ids = [q["id"] if isinstance(q, dict) else q[0] for q in questions_data]

    options_by_question: dict[str, list] = {}

    try:
        options_res = (
            client.table("opinion_options")
            .select(
                "id, question_id, display_order, "
                "opinion_option_translations(language_code, option_text)"
            )
            .order("display_order")
            .execute()
        )

        raw_options = options_res.data or []
        if isinstance(raw_options, tuple):
            raw_options = list(raw_options)

        for option in raw_options:
            if not isinstance(option, dict):
                continue
            question_id = option.get("question_id")

            if question_id in question_ids:
                options_by_question.setdefault(
                    question_id,
                    [],
                ).append(option)

    except APIError as exc:
        raise NotFoundError("Failed to fetch opinion options") from exc

    formatted_questions = []

    for question in questions_data:
        if not isinstance(question, dict):
            continue

        question_text = _extract_translation(
            question.get("opinion_question_translations", []),
            text_key="question_text",
        )

        if not question_text:
            continue

        formatted_options = []

        for option in options_by_question.get(question["id"], []):
            option_text = _extract_translation(
                option.get("opinion_option_translations", []),
                text_key="option_text",
            )

            if not option_text:
                continue

            formatted_options.append(
                OpinionOptionResponse(
                    id=option["id"],
                    display_order=option["display_order"],
                    option_text=option_text,
                )
            )

        formatted_questions.append(
            OpinionQuestionResponse(
                id=question["id"],
                article_id=question["article_id"],
                display_order=question["display_order"],
                allow_custom_response=question["allow_custom_response"],
                question_text=question_text,
                options=formatted_options,
            )
        )

    return formatted_questions


@router.post(
    "/{question_id}/responses",
    response_model=OpinionSubmitResponse,
)
async def submit_opinion_response(
    question_id: UUID,
    payload: OpinionResponseCreate,
    auth: AuthContext = Depends(get_current_user),
):
    client = auth.client

    try:
        question_res = (
            client.table("opinion_questions")
            .select("id, article_id, allow_custom_response")
            .eq("id", str(question_id))
            .maybe_single()
            .execute()
        )
    except APIError as exc:
        raise NotFoundError("Opinion question not found") from exc

    if not question_res or question_res.data is None:
        raise NotFoundError("Opinion question not found")

    question = question_res.data
    if isinstance(question, (list, tuple)):
        if not question:
            raise NotFoundError("Opinion question not found")
        question = question[0]

    if payload.custom_response is not None:
        allow_custom = (
            question.get("allow_custom_response")
            if isinstance(question, dict)
            else getattr(question, "allow_custom_response", False)
        )
        if not allow_custom:
            raise NotFoundError("Custom opinion responses are not allowed")

    if payload.selected_option_id is not None:
        try:
            option_res = (
                client.table("opinion_options")
                .select("id, question_id")
                .eq("id", str(payload.selected_option_id))
                .eq("question_id", str(question_id))
                .maybe_single()
                .execute()
            )
        except APIError as exc:
            raise NotFoundError("Opinion option not found") from exc

        if not option_res or option_res.data is None:
            raise NotFoundError("Opinion option not found")

        option_data = option_res.data
        if isinstance(option_data, (list, tuple)):
            if not option_data:
                raise NotFoundError("Opinion option not found")

    insert_data = {
        "user_id": str(auth.user.id),
        "opinion_question_id": str(question_id),
        "selected_option_id": (
            str(payload.selected_option_id)
            if payload.selected_option_id is not None
            else None
        ),
        "custom_response": payload.custom_response,
    }

    try:
        response_res = (
            client.table("opinion_responses")
            .insert(insert_data)
            .select(
                "id, opinion_question_id, selected_option_id, "
                "custom_response, created_at"
            )
            .execute()
        )
    except APIError as exc:
        raise NotFoundError("Unable to record opinion response") from exc

    raw_response_data = response_res.data
    if isinstance(raw_response_data, (list, tuple)) and raw_response_data:
        raw_response = raw_response_data[0]
    elif isinstance(raw_response_data, dict):
        raw_response = raw_response_data
    else:
        raw_response = {
            "id": None,
            "opinion_question_id": str(question_id),
            "selected_option_id": (
                str(payload.selected_option_id)
                if payload.selected_option_id is not None
                else None
            ),
            "custom_response": payload.custom_response,
            "created_at": "2026-08-25T00:00:00Z",
        }

    article_id_val = (
        question.get("article_id")
        if isinstance(question, dict)
        else getattr(question, "article_id", None)
    )

    award_xp(
        user_id=auth.user.id,
        event_type="OPINION_SUBMITTED",
        source_type="OPINION_RESPONSE",
        source_id=question_id,
        article_id=article_id_val,
    )

    return OpinionSubmitResponse(
        response=OpinionResponseData(
            id=raw_response["id"],
            opinion_question_id=raw_response["opinion_question_id"],
            selected_option_id=raw_response["selected_option_id"],
            custom_response=raw_response["custom_response"],
            created_at=raw_response["created_at"],
        )
    )
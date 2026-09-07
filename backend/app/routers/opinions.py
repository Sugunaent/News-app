from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
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
                "id, article_id, display_order, allow_custom_response, question_text"
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
            .select("id, question_id, display_order, option_text")
            .in_("question_id", question_ids)
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

        question_text = question.get("question_text")

        if not question_text:
            continue

        formatted_options = []

        for option in options_by_question.get(question["id"], []):
            option_text = option.get("option_text")

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

    # 1. Fetch opinion question
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

    # 2. Check custom response permission
    if payload.custom_response is not None:
        allow_custom = (
            question.get("allow_custom_response")
            if isinstance(question, dict)
            else getattr(question, "allow_custom_response", False)
        )
        if not allow_custom:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom opinion responses are not allowed for this question",
            )

    # 3. Validate selected option
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

    user_id_str = str(auth.user.id)
    question_id_str = str(question_id)
    selected_option_str = (
        str(payload.selected_option_id) if payload.selected_option_id else None
    )

    # 4. Check for existing response to allow re-submission/update
    existing_id = None
    try:
        existing_res = (
            client.table("opinion_responses")
            .select("id")
            .eq("user_id", user_id_str)
            .eq("opinion_question_id", question_id_str)
            .maybe_single()
            .execute()
        )
        if existing_res and existing_res.data:
            existing_data = (
                existing_res.data[0]
                if isinstance(existing_res.data, list)
                else existing_res.data
            )
            existing_id = existing_data.get("id")
    except APIError:
        pass

    insert_payload = {
        "user_id": user_id_str,
        "opinion_question_id": question_id_str,
        "selected_option_id": selected_option_str,
        "custom_response": payload.custom_response,
    }

    # 5. Insert or Update safely
    try:
        if existing_id:
            response_res = (
                client.table("opinion_responses")
                .update({
                    "selected_option_id": selected_option_str,
                    "custom_response": payload.custom_response,
                })
                .eq("id", existing_id)
                .select()
                .execute()
            )
        else:
            response_res = (
                client.table("opinion_responses")
                .insert(insert_payload)
                .select()
                .execute()
            )
    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database error while saving response: {exc.message}",
        ) from exc

    raw_response = {}
    if response_res and response_res.data:
        raw_data = response_res.data
        raw_response = raw_data[0] if isinstance(raw_data, list) else raw_data

    # 6. Safely execute XP award inside try-except block
    article_id_val = (
        question.get("article_id")
        if isinstance(question, dict)
        else getattr(question, "article_id", None)
    )

    try:
        award_xp(
            user_id=auth.user.id,
            event_type="OPINION_SUBMITTED",
            source_type="OPINION_RESPONSE",
            source_id=question_id,
            article_id=article_id_val,
        )
    except Exception:
        pass  # Prevent XP errors from blocking the API response

    return OpinionSubmitResponse(
        response=OpinionResponseData(
            id=raw_response.get("id") or existing_id,
            opinion_question_id=raw_response.get(
                "opinion_question_id", question_id_str
            ),
            selected_option_id=raw_response.get(
                "selected_option_id", selected_option_str
            ),
            custom_response=raw_response.get("custom_response", payload.custom_response),
            created_at=raw_response.get("created_at", "2026-08-25T00:00:00Z"),
        )
    )
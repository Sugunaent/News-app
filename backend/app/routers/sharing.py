from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException

from app.core.exceptions import NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.sharing import (
    ArticleCompletionShareResponse,
    OpinionShareResponse,
)
from app.services.analytics import record_share

router = APIRouter(
    prefix="/api/v1/articles",
    tags=["Sharing"],
)


def _resolve_translation(
    translations,
    field_name: str,
):
    translations = translations or []

    if isinstance(translations, dict):
        translations = [translations]

    # Prefer English.
    for translation in translations:
        if translation.get("language_code") == "EN":
            value = translation.get(field_name)

            if value:
                return value

    # Fall back to first available translation.
    for translation in translations:
        value = translation.get(field_name)

        if value:
            return value

    return None


@router.get(
    "/{article_id}/completion/share",
    response_model=ArticleCompletionShareResponse,
)
def get_completion_share_card(
    article_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    # ---------------------------------------------------------
    # 1. Verify that the article exists and is published.
    # ---------------------------------------------------------

    article_response = (
        auth.client.table("articles")
        .select(
            "id, article_translations("
            "language_code, title"
            ")"
        )
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .maybe_single()
        .execute()
    )

    if not article_response.data:
        raise NotFoundError("Article not found")

    article = article_response.data

    # ---------------------------------------------------------
    # 2. Verify that the authenticated user completed it.
    # ---------------------------------------------------------

    completion_response = (
        auth.client.table("article_completions")
        .select(
            "article_id, completed_at"
        )
        .eq("article_id", str(article_id))
        .eq("user_id", str(auth.user.id))
        .maybe_single()
        .execute()
    )

    if not completion_response.data:
        raise NotFoundError(
            "Article completion not found"
        )

    article_title = _resolve_translation(
        article.get("article_translations"),
        "title",
    )

    if not article_title:
        raise NotFoundError(
            "Article title not found"
        )

    return ArticleCompletionShareResponse(
        article_id=article_id,
        article_title=article_title,
        completed_at=completion_response.data[
            "completed_at"
        ],
    )


@router.get(
    "/{article_id}/opinion/share",
    response_model=OpinionShareResponse,
)
def get_opinion_share_card(
    article_id: UUID,
    response_id: UUID | None = Query(
        default=None,
        description=(
            "Specific historical opinion response to share. "
            "If omitted, the latest response for the article "
            "is used for backwards compatibility."
        ),
    ),
    auth: AuthContext = Depends(get_current_user),
):
    # ---------------------------------------------------------
    # 1. Verify that the article exists and is published.
    # ---------------------------------------------------------

    article_response = (
        auth.client.table("articles")
        .select(
            "id, article_translations("
            "language_code, title"
            ")"
        )
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .maybe_single()
        .execute()
    )

    if not article_response.data:
        raise NotFoundError("Article not found")

    article = article_response.data

    # ---------------------------------------------------------
    # 2. Find the opinion question belonging to this article.
    # ---------------------------------------------------------

    question_response = (
        auth.client.table("opinion_questions")
        .select(
            "id, article_id, "
            "opinion_question_translations("
            "language_code, question_text"
            ")"
        )
        .eq("article_id", str(article_id))
        .order("display_order")
        .execute()
    )

    questions = question_response.data or []

    if not questions:
        raise NotFoundError(
            "Opinion question not found"
        )

    question_ids = [
        str(question["id"])
        for question in questions
    ]

    # ---------------------------------------------------------
    # 3. Retrieve the user's opinion response.
    #
    # If response_id is supplied, it MUST belong to:
    #
    #   - the authenticated user
    #   - this article's opinion question
    #
    # This prevents a user from requesting another user's
    # response or a response belonging to another article.
    # ---------------------------------------------------------

    response_query = (
        auth.client.table("opinion_responses")
        .select(
            "id, opinion_question_id, "
            "selected_option_id, custom_response, created_at"
        )
        .eq("user_id", str(auth.user.id))
        .in_(
            "opinion_question_id",
            question_ids,
        )
    )

    if response_id is not None:
        response_query = response_query.eq(
            "id",
            str(response_id),
        )

    response_response = (
        response_query
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )

    response_data = response_response.data

    if not response_data:
        raise NotFoundError(
            "Opinion response not found"
        )

    # ---------------------------------------------------------
    # 4. Resolve the exact question.
    # ---------------------------------------------------------

    question = next(
        (
            item
            for item in questions
            if str(item["id"])
            == str(
                response_data["opinion_question_id"]
            )
        ),
        None,
    )

    if question is None:
        raise NotFoundError(
            "Opinion question not found"
        )

    # ---------------------------------------------------------
    # 5. Resolve question text.
    # ---------------------------------------------------------

    question_text = _resolve_translation(
        question.get(
            "opinion_question_translations"
        ),
        "question_text",
    )

    if not question_text:
        raise NotFoundError(
            "Opinion question text not found"
        )

    # ---------------------------------------------------------
    # 6. Resolve selected predefined option.
    # ---------------------------------------------------------

    selected_option_text = None

    if (
        response_data.get("selected_option_id")
        is not None
    ):
        option_response = (
            auth.client.table("opinion_options")
            .select(
                "id, question_id, "
                "opinion_option_translations("
                "language_code, option_text"
                ")"
            )
            .eq(
                "id",
                str(
                    response_data[
                        "selected_option_id"
                    ]
                ),
            )
            .eq(
                "question_id",
                str(
                    response_data[
                        "opinion_question_id"
                    ]
                ),
            )
            .maybe_single()
            .execute()
        )

        if not option_response.data:
            raise NotFoundError(
                "Opinion option not found"
            )

        option = option_response.data

        selected_option_text = _resolve_translation(
            option.get(
                "opinion_option_translations"
            ),
            "option_text",
        )

        if not selected_option_text:
            raise NotFoundError(
                "Opinion option text not found"
            )

    # ---------------------------------------------------------
    # 7. Resolve article title.
    # ---------------------------------------------------------

    article_title = _resolve_translation(
        article.get("article_translations"),
        "title",
    )

    if not article_title:
        raise NotFoundError(
            "Article title not found"
        )

    # ---------------------------------------------------------
    # 8. Return share payload.
    # ---------------------------------------------------------

    return OpinionShareResponse(
        response_id=response_data["id"],
        article_id=article_id,
        article_title=article_title,
        opinion_question_id=response_data[
            "opinion_question_id"
        ],
        opinion_question=question_text,
        selected_option_id=response_data[
            "selected_option_id"
        ],
        selected_option_text=selected_option_text,
        custom_response=response_data[
            "custom_response"
        ],
        created_at=response_data["created_at"],
    )

@router.post(
    "/share/event",
    status_code=204,
)
def record_share_event(
    source_type: str,
    source_id: UUID,
    article_id: UUID | None = None,
    auth: AuthContext = Depends(get_current_user),
):
    """
    Record that an authenticated user successfully completed
    a share action.

    The client must call this endpoint only after the native
    share operation has succeeded.

    Supported source types include:

        ARTICLE_COMPLETION
        OPINION
        BADGE
    """

    allowed_source_types = {
        "ARTICLE_COMPLETION",
        "OPINION",
        "BADGE",
    }

    if source_type not in allowed_source_types:
        raise HTTPException(
            status_code=422,
            detail="Unsupported share source type",
        )

    record_share(
        source_type=source_type,
        source_id=source_id,
        article_id=article_id,
        user_id=auth.user.id,
        client=auth.client,
    )

    return None
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.exceptions import NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.sharing import (
    ArticleCompletionShareResponse,
    OpinionShareResponse,
)

router = APIRouter(
    prefix="/api/v1/articles",
    tags=["Sharing"],
)


@router.get(
    "/{article_id}/completion/share",
    response_model=ArticleCompletionShareResponse,
)
def get_completion_share_card(
    article_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    # ------------------------------------------------------------
    # Verify that the article exists and is published.
    # ------------------------------------------------------------

    article_response = (
        auth.client.table("articles")
        .select(
            "id,article_translations(title)"
        )
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .single()
        .execute()
    )

    if not article_response.data:
        raise NotFoundError("Article not found")

    article = article_response.data

    # ------------------------------------------------------------
    # Verify that the authenticated user completed the article.
    # ------------------------------------------------------------

    completion_response = (
        auth.client.table("article_completions")
        .select("article_id,completed_at")
        .eq("article_id", str(article_id))
        .eq("user_id", str(auth.user.id))
        .maybe_single()
        .execute()
    )

    if not completion_response.data:
        raise NotFoundError(
            "Article completion not found"
        )

    translations = article.get("article_translations") or []

    if isinstance(translations, dict):
        translations = [translations]

    article_title = None

    # Prefer English when available.
    for translation in translations:
        if translation.get("language_code") == "EN":
            article_title = translation.get("title")
            break

    # Fall back to the first available translation.
    if article_title is None and translations:
        article_title = translations[0].get("title")

    if not article_title:
        raise NotFoundError(
            "Article title not found"
        )

    return ArticleCompletionShareResponse(
        article_id=article_id,
        article_title=article_title,
        completed_at=completion_response.data["completed_at"],
    )


@router.get(
    "/{article_id}/opinion/share",
    response_model=OpinionShareResponse,
)
def get_opinion_share_card(
    article_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    # ------------------------------------------------------------
    # Verify that the article exists and is published.
    # ------------------------------------------------------------

    article_response = (
        auth.client.table("articles")
        .select(
            "id,article_translations(title)"
        )
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .single()
        .execute()
    )

    if not article_response.data:
        raise NotFoundError("Article not found")

    article = article_response.data

    # ------------------------------------------------------------
    # Find the user's opinion response for this article.
    #
    # We obtain the opinion question first so that the response
    # can never accidentally expose an opinion belonging to
    # another article.
    # ------------------------------------------------------------

    question_response = (
        auth.client.table("opinion_questions")
        .select(
            "id,article_id,opinion_question_translations(question_text)"
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

    # ------------------------------------------------------------
    # Retrieve the authenticated user's response.
    # ------------------------------------------------------------

    responses_response = (
        auth.client.table("opinion_responses")
        .select(
            "id,opinion_question_id,selected_option_id,"
            "custom_response,created_at"
        )
        .eq("user_id", str(auth.user.id))
        .in_(
            "opinion_question_id",
            [str(question["id"]) for question in questions],
        )
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )

    response_data = responses_response.data

    if not response_data:
        raise NotFoundError(
            "Opinion response not found"
        )

    question = next(
        (
            item
            for item in questions
            if str(item["id"])
            == str(response_data["opinion_question_id"])
        ),
        None,
    )

    if question is None:
        raise NotFoundError(
            "Opinion question not found"
        )

    # ------------------------------------------------------------
    # Resolve question text.
    # ------------------------------------------------------------

    question_translations = (
        question.get("opinion_question_translations") or []
    )

    if isinstance(question_translations, dict):
        question_translations = [question_translations]

    question_text = None

    for translation in question_translations:
        if translation.get("language_code") == "EN":
            question_text = translation.get("question_text")
            break

    if question_text is None and question_translations:
        question_text = question_translations[0].get(
            "question_text"
        )

    if not question_text:
        raise NotFoundError(
            "Opinion question text not found"
        )

    # ------------------------------------------------------------
    # Resolve selected predefined option.
    # ------------------------------------------------------------

    selected_option_text = None

    if response_data.get("selected_option_id") is not None:
        option_response = (
            auth.client.table("opinion_options")
            .select(
                "id,question_id,"
                "opinion_option_translations(option_text)"
            )
            .eq(
                "id",
                str(response_data["selected_option_id"]),
            )
            .eq(
                "question_id",
                str(response_data["opinion_question_id"]),
            )
            .maybe_single()
            .execute()
        )

        if not option_response.data:
            raise NotFoundError(
                "Opinion option not found"
            )

        option = option_response.data

        option_translations = (
            option.get("opinion_option_translations") or []
        )

        if isinstance(option_translations, dict):
            option_translations = [option_translations]

        for translation in option_translations:
            if translation.get("language_code") == "EN":
                selected_option_text = translation.get(
                    "option_text"
                )
                break

        if (
            selected_option_text is None
            and option_translations
        ):
            selected_option_text = option_translations[0].get(
                "option_text"
            )

        if not selected_option_text:
            raise NotFoundError(
                "Opinion option text not found"
            )

    # ------------------------------------------------------------
    # Resolve article title.
    # ------------------------------------------------------------

    article_translations = (
        article.get("article_translations") or []
    )

    if isinstance(article_translations, dict):
        article_translations = [article_translations]

    article_title = None

    for translation in article_translations:
        if translation.get("language_code") == "EN":
            article_title = translation.get("title")
            break

    if article_title is None and article_translations:
        article_title = article_translations[0].get("title")

    if not article_title:
        raise NotFoundError(
            "Article title not found"
        )

    return OpinionShareResponse(
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
        custom_response=response_data["custom_response"],
        created_at=response_data["created_at"],
    )
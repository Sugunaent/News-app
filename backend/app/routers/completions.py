from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.exceptions import NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.completions import ArticleCompletionResponse
from app.services.gamification import (
    award_badges_for_user,
    award_xp,
)


router = APIRouter(
    prefix="/api/v1/articles",
    tags=["Article Completions"],
)


@router.get(
    "/{article_id}/completion",
    response_model=ArticleCompletionResponse | None,
)
async def get_article_completion(
    article_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    article_response = (
        auth.client
        .table("articles")
        .select("id")
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .maybe_single()
        .execute()
    )

    if not article_response.data:
        raise NotFoundError("Article not found")

    completion_response = (
        auth.client
        .table("article_completions")
        .select("article_id, completed_at")
        .eq("article_id", str(article_id))
        .eq("user_id", str(auth.user.id))
        .maybe_single()
        .execute()
    )

    if not completion_response.data:
        return None

    data = completion_response.data

    return ArticleCompletionResponse(
        article_id=data["article_id"],
        completed_at=data["completed_at"],
    )


@router.post(
    "/{article_id}/completion",
    response_model=ArticleCompletionResponse,
)
async def complete_article(
    article_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    article_response = (
        auth.client
        .table("articles")
        .select("id")
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .maybe_single()
        .execute()
    )

    if not article_response.data:
        raise NotFoundError("Article not found")

    existing_response = (
        auth.client
        .table("article_completions")
        .select("article_id, completed_at")
        .eq("article_id", str(article_id))
        .eq("user_id", str(auth.user.id))
        .maybe_single()
        .execute()
    )

    # Completion, XP and badges are all idempotent.
    # An already-completed article must not trigger another award.
    if existing_response.data:
        data = existing_response.data

        return ArticleCompletionResponse(
            article_id=data["article_id"],
            completed_at=data["completed_at"],
        )

    completion_response = (
        auth.client
        .table("article_completions")
        .insert(
            {
                "user_id": str(auth.user.id),
                "article_id": str(article_id),
            }
        )
        .select("article_id, completed_at")
        .single()
        .execute()
    )

    data = completion_response.data

    # Award completion XP using the server-side XP rule.
    award_xp(
        user_id=auth.user.id,
        event_type="ARTICLE_COMPLETED",
        source_type="ARTICLE_COMPLETION",
        source_id=article_id,
        article_id=article_id,
    )

    # Evaluate all badge criteria after the newly completed article.
    # The badge service is responsible for determining which badges
    # have actually been earned and for preventing duplicates.
    award_badges_for_user(
        user_id=auth.user.id,
    )

    return ArticleCompletionResponse(
        article_id=data["article_id"],
        completed_at=data["completed_at"],
    )
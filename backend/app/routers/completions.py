from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.db_utils import extract_single_record
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
    # Use admin_client if available, falling back to auth.client for reads
    db = getattr(auth, "admin_client", auth.client)

    article_response = (
        db
        .table("articles")
        .select("id")
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .maybe_single()
        .execute()
    )

    if not article_response or not getattr(article_response, "data", None):
        raise NotFoundError("Article not found")

    completion_response = (
        db
        .table("article_completions")
        .select("article_id, completed_at")
        .eq("article_id", str(article_id))
        .eq("user_id", str(auth.user.id))
        .maybe_single()
        .execute()
    )

    if not completion_response or not getattr(completion_response, "data", None):
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
    # Use service-role client (admin_client) to bypass user-level RLS policies on writes
    db = getattr(auth, "admin_client", auth.client)

    article_response = (
        db
        .table("articles")
        .select("id")
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .maybe_single()
        .execute()
    )

    if not article_response or not getattr(article_response, "data", None):
        raise NotFoundError("Article not found")

    existing_response = (
        db
        .table("article_completions")
        .select("article_id, completed_at")
        .eq("article_id", str(article_id))
        .eq("user_id", str(auth.user.id))
        .maybe_single()
        .execute()
    )

    # Completion, XP, and badges are all idempotent.
    if existing_response and getattr(existing_response, "data", None):
        data = existing_response.data

        return ArticleCompletionResponse(
            article_id=data["article_id"],
            completed_at=data["completed_at"],
        )

    now = datetime.now(timezone.utc)

    completion_payload = {
        "user_id": str(auth.user.id),
        "article_id": str(article_id),
        "completed_at": now.isoformat(),
    }

    completion_response = (
        db
        .table("article_completions")
        .upsert(
            completion_payload,
            on_conflict="user_id,article_id",
        )
        .select("article_id, completed_at")
        .execute()
    )

    if not completion_response or not getattr(completion_response, "data", None):
        raise NotFoundError("Failed to record article completion")

    data = extract_single_record(completion_response.data, "Article completion insert failed")

    # Award completion XP using the server-side XP rule.
    award_xp(
        user_id=auth.user.id,
        event_type="ARTICLE_COMPLETED",
        source_type="ARTICLE_COMPLETION",
        source_id=article_id,
        article_id=article_id,
    )

    # Evaluate all badge criteria after the newly completed article.
    award_badges_for_user(
        user_id=auth.user.id,
    )

    return ArticleCompletionResponse(
        article_id=data["article_id"],
        completed_at=data["completed_at"],
    )
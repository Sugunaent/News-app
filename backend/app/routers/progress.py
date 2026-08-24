from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.exceptions import NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.progress import (
    ReadingProgressResponse,
    ReadingProgressUpdate,
)

router = APIRouter(
    prefix="/api/v1/articles",
    tags=["Reading Progress"],
)


@router.get(
    "/{article_id}/progress",
    response_model=ReadingProgressResponse | None,
)
async def get_reading_progress(
    article_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    # Only published articles are readable by the public application.
    article_response = (
        auth.client
        .table("articles")
        .select("id")
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .single()
        .execute()
    )

    if not article_response.data:
        raise NotFoundError("Article not found")

    response = (
        auth.client
        .table("reading_progress")
        .select(
            """
            article_id,
            progress_percentage,
            last_block_id,
            last_position,
            started_at,
            last_read_at,
            completed_at
            """
        )
        .eq("user_id", str(auth.user.id))
        .eq("article_id", str(article_id))
        .maybe_single()
        .execute()
    )

    if not response.data:
        return None

    return response.data


@router.put(
    "/{article_id}/progress",
    response_model=ReadingProgressResponse,
)
async def update_reading_progress(
    article_id: UUID,
    payload: ReadingProgressUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    # Verify that the article exists and is currently readable.
    article_response = (
        auth.client
        .table("articles")
        .select("id")
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .single()
        .execute()
    )

    if not article_response.data:
        raise NotFoundError("Article not found")

    # If a block is supplied, make sure it belongs to this article.
    if payload.last_block_id is not None:
        block_response = (
            auth.client
            .table("article_blocks")
            .select("id")
            .eq("id", str(payload.last_block_id))
            .eq("article_id", str(article_id))
            .maybe_single()
            .execute()
        )

        if not block_response.data:
            raise NotFoundError("Article block not found")

    now = datetime.now(timezone.utc)

    # Preserve completion once the article has been completed.
    existing_response = (
        auth.client
        .table("reading_progress")
        .select("completed_at, started_at")
        .eq("user_id", str(auth.user.id))
        .eq("article_id", str(article_id))
        .maybe_single()
        .execute()
    )

    existing = existing_response.data

    completed_at = None

    if existing and existing.get("completed_at"):
        completed_at = existing["completed_at"]
    elif payload.progress_percentage >= 100:
        completed_at = now.isoformat()

    started_at = (
        existing["started_at"]
        if existing and existing.get("started_at")
        else now.isoformat()
    )

    data = {
        "user_id": str(auth.user.id),
        "article_id": str(article_id),
        "progress_percentage": payload.progress_percentage,
        "last_block_id": (
            str(payload.last_block_id)
            if payload.last_block_id is not None
            else None
        ),
        "last_position": payload.last_position,
        "started_at": started_at,
        "last_read_at": now.isoformat(),
        "completed_at": completed_at,
    }

    response = (
        auth.client
        .table("reading_progress")
        .upsert(
            data,
            on_conflict="user_id,article_id",
        )
        .select(
            """
            article_id,
            progress_percentage,
            last_block_id,
            last_position,
            started_at,
            last_read_at,
            completed_at
            """
        )
        .single()
        .execute()
    )

    return response.data
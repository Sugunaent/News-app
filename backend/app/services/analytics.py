from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from app.db.supabase import supabase


# ============================================================
# ANALYTICS EVENT TYPES
# ============================================================

ARTICLE_VIEWED = "ARTICLE_VIEWED"
ADVERTISEMENT_CLICKED = "ADVERTISEMENT_CLICKED"
SHARE_CREATED = "SHARE_CREATED"
COMMENT_CREATED = "COMMENT_CREATED"
COMMENT_LIKED = "COMMENT_LIKED"


def record_event(
    *,
    event_type: str,
    user_id: UUID | None = None,
    article_id: UUID | None = None,
    source_type: str | None = None,
    source_id: UUID | None = None,
    metadata: dict | None = None,
    client=None,
) -> dict | None:
    """
    Record one analytics event.
    """
    db = client or supabase

    data = {
        "event_type": event_type,
        "user_id": str(user_id) if user_id else None,
        "article_id": str(article_id) if article_id else None,
        "source_type": source_type,
        "source_id": str(source_id) if source_id else None,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    response = (
        db
        .table("analytics_events")
        .insert(data)
        .select("*")
        .single()
        .execute()
    )

    return response.data


def record_article_view(
    *,
    article_id: UUID,
    user_id: UUID | None = None,
    client=None,
) -> dict | None:
    return record_event(
        event_type=ARTICLE_VIEWED,
        user_id=user_id,
        article_id=article_id,
        source_type="ARTICLE",
        source_id=article_id,
        client=client,
    )


def record_advertisement_click(
    *,
    advertisement_id: UUID,
    user_id: UUID | None = None,
    client=None,
) -> dict | None:
    return record_event(
        event_type=ADVERTISEMENT_CLICKED,
        user_id=user_id,
        source_type="ADVERTISEMENT",
        source_id=advertisement_id,
        client=client,
    )


def record_share(
    *,
    source_type: str,
    source_id: UUID,
    article_id: UUID | None = None,
    user_id: UUID | None = None,
    client=None,
) -> dict | None:
    return record_event(
        event_type=SHARE_CREATED,
        user_id=user_id,
        article_id=article_id,
        source_type=source_type,
        source_id=source_id,
        client=client,
    )


def record_quiz_attempt(
    question_id: UUID,
    user_id: UUID,
    is_correct: bool,
    client: Any = None,
    selected_option_id: Optional[UUID] = None,
) -> Dict[str, Any]:
    db = client or supabase
    payload = {
        "question_id": str(question_id),
        "user_id": str(user_id),
        "is_correct": is_correct,
    }
    if selected_option_id:
        payload["selected_option_id"] = str(selected_option_id)

    result = (
        db.table("quiz_attempts")
        .insert(payload)
        .select()
        .single()
        .execute()
    )
    return result.data


def record_comment_created(
    *,
    comment_id: UUID,
    article_id: UUID,
    user_id: UUID | None = None,
    client=None,
) -> dict | None:
    """
    Record an event when a user posts a comment on an article.
    """
    return record_event(
        event_type=COMMENT_CREATED,
        user_id=user_id,
        article_id=article_id,
        source_type="COMMENT",
        source_id=comment_id,
        client=client,
    )


def record_comment_liked(
    *,
    comment_id: UUID,
    article_id: UUID | None = None,
    user_id: UUID | None = None,
    client=None,
) -> dict | None:
    """
    Record an event when a user likes a comment.
    """
    return record_event(
        event_type=COMMENT_LIKED,
        user_id=user_id,
        article_id=article_id,
        source_type="COMMENT",
        source_id=comment_id,
        client=client,
    )
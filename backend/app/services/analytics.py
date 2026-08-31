from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from app.db.supabase import supabase


# ============================================================
# ANALYTICS EVENT TYPES
# ============================================================

ARTICLE_VIEWED = "ARTICLE_VIEWED"
ADVERTISEMENT_CLICKED = "ADVERTISEMENT_CLICKED"
SHARE_CREATED = "SHARE_CREATED"


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

    Analytics events are intentionally append-only.

    The caller is responsible for ensuring that the event
    represents a legitimate product action.

    Analytics failures should not normally break the user's
    primary product action, so this function returns None when
    the insert produces no row.
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
    """
    Record an article view.

    A view is intentionally an event rather than a counter.
    This lets the Superadmin reporting layer calculate:
      - total views
      - unique readers
      - article popularity
      - category popularity
    """

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
    """
    Record an advertisement click.
    """

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
    """
    Record a successful share action.

    Examples:
        source_type="ARTICLE_COMPLETION"
        source_type="OPINION"
        source_type="BADGE"
    """

    return record_event(
        event_type=SHARE_CREATED,
        user_id=user_id,
        article_id=article_id,
        source_type=source_type,
        source_id=source_id,
        client=client,
    )
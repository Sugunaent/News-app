from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.db_utils import extract_single_record
from app.core.exceptions import (
    AuthorizationError,
    NotFoundError,
)
from app.db.supabase import supabase
from app.dependencies.auth import (
    AuthContext,
    get_current_user,
)
from app.schemas.comments import (
    CommentCreate,
    CommentListResponse,
    CommentModerationResponse,
    CommentResponse,
    CommentUpdate,
)
from app.services.analytics import (
    record_comment_created,
)
from app.services.audit import record_audit

router = APIRouter(
    prefix="/api/v1/articles",
    tags=["Comments"],
)


def _require_superadmin(
    context: AuthContext,
) -> None:
    if context.user.role != "SUPERADMIN":
        raise AuthorizationError(
            "Superadmin access required"
        )


def _map_comment(
    comment: dict,
) -> dict:
    profile = comment.get("profiles") or {}

    return {
        "id": comment["id"],
        "article_id": comment["article_id"],
        "user_id": comment["user_id"],
        "content": comment["content"],
        "author": {
            "id": comment["user_id"],
            "display_name": profile.get("display_name"),
        },
        "created_at": comment["created_at"],
        "updated_at": comment["updated_at"],
    }


# ============================================================
# PUBLIC COMMENTS
# ============================================================

@router.get(
    "/{article_id}/comments",
    response_model=CommentListResponse,
)
async def list_comments(
    article_id: UUID,
):
    # Fetch comments and left-join profiles (handles case where RLS or missing profile yields null profile)
    response = (
        supabase
        .table("comments")
        .select(
            """
            id,
            article_id,
            user_id,
            content,
            is_deleted,
            is_hidden,
            created_at,
            updated_at,
            profiles (
                id,
                display_name
            )
            """
        )
        .eq("article_id", str(article_id))
        .eq("is_hidden", False)
        .eq("is_deleted", False)
        .order("created_at", desc=False)
        .execute()
    )

    return {
        "items": [
            _map_comment(comment)
            for comment in (response.data or [])
        ]
    }


# ============================================================
# CREATE COMMENT
# ============================================================

@router.post(
    "/{article_id}/comments",
    response_model=CommentResponse,
    status_code=201,
)
async def create_comment(
    article_id: UUID,
    payload: CommentCreate,
    context: AuthContext = Depends(
        get_current_user
    ),
):
    article_response = (
        context.client
        .table("articles")
        .select("id")
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .not_.is_("published_at", "null")
        .maybe_single()
        .execute()
    )

    if not article_response.data:
        raise NotFoundError("Article not found")

    response = (
        context.client
        .table("comments")
        .insert(
            {
                "article_id": str(article_id),
                "user_id": str(context.user.id),
                "content": payload.content.strip(),
                "is_deleted": False,
            }
        )
        .execute()
    )

    comment = extract_single_record(response.data, "Comment could not be created")

    profile_response = (
        context.client
        .table("profiles")
        .select("id, display_name")
        .eq("id", str(context.user.id))
        .maybe_single()
        .execute()
    )

    profile = profile_response.data or {}
    comment["profiles"] = profile

    try:
        record_comment_created(
            article_id=article_id,
            user_id=context.user.id,
            comment_id=comment["id"],
        )
    except Exception:
        pass

    return _map_comment(comment)


# ============================================================
# UPDATE OWN COMMENT
# ============================================================

@router.patch(
    "/{article_id}/comments/{comment_id}",
    response_model=CommentResponse,
)
async def update_comment(
    article_id: UUID,
    comment_id: UUID,
    payload: CommentUpdate,
    context: AuthContext = Depends(
        get_current_user
    ),
):
    response = (
        context.client
        .table("comments")
        .update(
            {
                "content": payload.content.strip(),
            }
        )
        .eq("id", str(comment_id))
        .eq("article_id", str(article_id))
        .eq("user_id", str(context.user.id))
        .eq("is_deleted", False)
        .execute()
    )

    comment = extract_single_record(response.data, "Comment not found")

    profile_response = (
        context.client
        .table("profiles")
        .select("id, display_name")
        .eq("id", str(context.user.id))
        .maybe_single()
        .execute()
    )

    comment["profiles"] = profile_response.data or {}

    return _map_comment(comment)


# ============================================================
# DELETE OWN COMMENT (SOFT DELETE)
# ============================================================

@router.delete(
    "/{article_id}/comments/{comment_id}",
    status_code=204,
)
async def delete_comment(
    article_id: UUID,
    comment_id: UUID,
    context: AuthContext = Depends(
        get_current_user
    ),
):
    now_iso = datetime.now(timezone.utc).isoformat()

    response = (
        context.client
        .table("comments")
        .update(
            {
                "is_deleted": True,
                "deleted_at": now_iso,
            }
        )
        .eq("id", str(comment_id))
        .eq("article_id", str(article_id))
        .eq("user_id", str(context.user.id))
        .eq("is_deleted", False)
        .execute()
    )

    if not response.data:
        raise NotFoundError("Comment not found")

    return None


# ============================================================
# SUPERADMIN HIDE / UNHIDE
# ============================================================

@router.patch(
    "/{article_id}/comments/{comment_id}/moderation",
    response_model=CommentModerationResponse,
)
async def moderate_comment(
    article_id: UUID,
    comment_id: UUID,
    hidden: bool,
    context: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(context)

    response = (
        context.client
        .table("comments")
        .update(
            {
                "is_hidden": hidden,
            }
        )
        .eq("id", str(comment_id))
        .eq("article_id", str(article_id))
        .eq("is_deleted", False)
        .execute()
    )

    comment = extract_single_record(response.data, "Comment not found")

    record_audit(
        actor_user_id=context.user.id,
        action=(
            "COMMENT_HIDDEN"
            if hidden
            else "COMMENT_UNHIDDEN"
        ),
        entity_type="COMMENT",
        entity_id=comment_id,
        metadata={
            "article_id": str(article_id),
            "user_id": comment.get("user_id"),
            "is_hidden": comment.get("is_hidden"),
        },
        client=context.client,
    )

    return {
        "id": comment["id"],
        "is_hidden": comment["is_hidden"],
        "deleted_at": comment.get("deleted_at"),
    }


# ============================================================
# SUPERADMIN DELETE (SOFT DELETE)
# ============================================================

@router.delete(
    "/{article_id}/comments/{comment_id}/admin",
    response_model=CommentModerationResponse,
)
async def admin_delete_comment(
    article_id: UUID,
    comment_id: UUID,
    context: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(context)

    now_iso = datetime.now(timezone.utc).isoformat()

    response = (
        context.client
        .table("comments")
        .update(
            {
                "is_deleted": True,
                "deleted_at": now_iso,
            }
        )
        .eq("id", str(comment_id))
        .eq("article_id", str(article_id))
        .eq("is_deleted", False)
        .execute()
    )

    comment = extract_single_record(response.data, "Comment not found")

    record_audit(
        actor_user_id=context.user.id,
        action="COMMENT_DELETED",
        entity_type="COMMENT",
        entity_id=comment_id,
        metadata={
            "article_id": str(article_id),
            "user_id": comment.get("user_id"),
            "is_hidden": comment.get("is_hidden"),
            "deleted_at": comment.get("deleted_at"),
        },
        client=context.client,
    )

    return {
        "id": comment["id"],
        "is_hidden": comment["is_hidden"],
        "deleted_at": comment.get("deleted_at"),
    }
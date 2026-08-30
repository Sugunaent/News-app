from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.exceptions import AuthorizationError, NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.db.supabase import supabase
from app.schemas.comments import (
    CommentCreate,
    CommentListResponse,
    CommentModerationResponse,
    CommentResponse,
    CommentUpdate,
)


router = APIRouter(
    prefix="/api/v1/articles",
    tags=["Comments"],
)


def _require_superadmin(context: AuthContext) -> None:
    if context.user.role != "SUPERADMIN":
        raise AuthorizationError("Superadmin access required")


def _map_comment(comment: dict) -> dict:
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
    response = (
        supabase
        .table("comments")
        .select(
            """
            id,
            article_id,
            user_id,
            content,
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
        .is_("deleted_at", "null")
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
    context: AuthContext = Depends(get_current_user),
):
    article_response = (
        context.client
        .table("articles")
        .select("id")
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .not_.is_("published_at", "null")
        .single()
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
            }
        )
        .execute()
    )

    if not response.data:
        raise NotFoundError("Comment could not be created")

    comment = response.data[0]

    profile_response = (
        context.client
        .table("profiles")
        .select("id, display_name")
        .eq("id", str(context.user.id))
        .single()
        .execute()
    )

    profile = profile_response.data or {}

    comment["profiles"] = profile

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
    context: AuthContext = Depends(get_current_user),
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
        .is_("deleted_at", "null")
        .execute()
    )

    if not response.data:
        raise NotFoundError("Comment not found")

    comment = response.data[0]

    profile_response = (
        context.client
        .table("profiles")
        .select("id, display_name")
        .eq("id", str(context.user.id))
        .single()
        .execute()
    )

    comment["profiles"] = profile_response.data or {}

    return _map_comment(comment)


# ============================================================
# DELETE OWN COMMENT
# ============================================================
#
# Soft deletion.
# ============================================================

@router.delete(
    "/{article_id}/comments/{comment_id}",
    status_code=204,
)
async def delete_comment(
    article_id: UUID,
    comment_id: UUID,
    context: AuthContext = Depends(get_current_user),
):
    response = (
        context.client
        .table("comments")
        .update(
            {
                "deleted_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(comment_id))
        .eq("article_id", str(article_id))
        .eq("user_id", str(context.user.id))
        .is_("deleted_at", "null")
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
    context: AuthContext = Depends(get_current_user),
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
        .is_("deleted_at", "null")
        .execute()
    )

    if not response.data:
        raise NotFoundError("Comment not found")

    comment = response.data[0]

    return {
        "id": comment["id"],
        "is_hidden": comment["is_hidden"],
        "deleted_at": comment["deleted_at"],
    }


# ============================================================
# SUPERADMIN DELETE
# ============================================================
#
# Superadmin deletion is also soft deletion so moderation
# history is retained.
# ============================================================

@router.delete(
    "/{article_id}/comments/{comment_id}/admin",
    response_model=CommentModerationResponse,
)
async def admin_delete_comment(
    article_id: UUID,
    comment_id: UUID,
    context: AuthContext = Depends(get_current_user),
):
    _require_superadmin(context)

    response = (
        context.client
        .table("comments")
        .update(
            {
                "deleted_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(comment_id))
        .eq("article_id", str(article_id))
        .is_("deleted_at", "null")
        .execute()
    )

    if not response.data:
        raise NotFoundError("Comment not found")

    comment = response.data[0]

    return {
        "id": comment["id"],
        "is_hidden": comment["is_hidden"],
        "deleted_at": comment["deleted_at"],
    }
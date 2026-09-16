from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.core.db_utils import extract_single_record
from app.core.exceptions import NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.bookmarks import BookmarkListResponse, BookmarkResponse

router = APIRouter(
    prefix="/api/v1/bookmarks",
    tags=["Bookmarks"],
)


@router.get("", response_model=BookmarkListResponse)
def list_bookmarks(auth: AuthContext = Depends(get_current_user)):
    response = (
        auth.client.table("article_bookmarks")
        .select("id, user_id, article_id, created_at")
        .eq("user_id", str(auth.user.id))
        .order("created_at", desc=True)
        .execute()
    )
    return {"items": response.data or []}


@router.get("/{article_id}", response_model=dict)
def bookmark_status(
    article_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    response = (
        auth.client.table("article_bookmarks")
        .select("id")
        .eq("user_id", str(auth.user.id))
        .eq("article_id", str(article_id))
        .maybe_single()
        .execute()
    )
    return {"bookmarked": bool(response and response.data)}


@router.post(
    "/{article_id}",
    response_model=BookmarkResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_bookmark(
    article_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    article = (
        auth.client.table("articles")
        .select("id")
        .eq("id", str(article_id))
        .eq("status", "PUBLISHED")
        .maybe_single()
        .execute()
    )
    if not article or not article.data:
        raise NotFoundError("Article not found")

    existing = (
        auth.client.table("article_bookmarks")
        .select("id, user_id, article_id, created_at")
        .eq("user_id", str(auth.user.id))
        .eq("article_id", str(article_id))
        .maybe_single()
        .execute()
    )
    if existing and existing.data:
        return existing.data

    response = (
        auth.client.table("article_bookmarks")
        .insert(
            {
                "user_id": str(auth.user.id),
                "article_id": str(article_id),
            }
        )
        .select("id, user_id, article_id, created_at")
        .execute()
    )
    return extract_single_record(response.data, "Failed to create bookmark")


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_bookmark(
    article_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    (
        auth.client.table("article_bookmarks")
        .delete()
        .eq("user_id", str(auth.user.id))
        .eq("article_id", str(article_id))
        .execute()
    )
    return None

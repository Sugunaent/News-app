from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.exceptions import AuthorizationError, NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.superadmin_content import (
    SuperadminArticleCreate,
    SuperadminArticleDetailResponse,
    SuperadminArticleListItem,
    SuperadminArticleStatusUpdate,
    SuperadminArticleUpdate,
    SuperadminAuthorPickUpdate,
    SuperadminCategoryCreate,
    SuperadminCategoryResponse,
    SuperadminCategoryUpdate,
    SuperadminHomeResponse,
)


router = APIRouter(
    prefix="/api/v1/superadmin",
    tags=["Superadmin Content"],
)


# ============================================================
# AUTHORIZATION
# ============================================================

def _require_superadmin(
    context: AuthContext,
) -> None:
    role = getattr(
        context.user,
        "role",
        None,
    )

    if role != "SUPERADMIN":
        raise AuthorizationError(
            "Superadmin access required"
        )


# ============================================================
# HELPERS
# ============================================================

CATEGORY_SELECT = """
    id,
    name,
    slug,
    description,
    display_order,
    is_active,
    created_at,
    updated_at
"""


ARTICLE_SELECT = """
    id,
    category_id,
    article_type,
    status,
    cover_media_id,
    created_by,
    updated_by,
    created_at,
    updated_at,
    published_at,
    scheduled_at,
    is_author_pick,
    author_pick_order,
    categories (
        id,
        name,
        slug,
        description,
        display_order,
        is_active,
        created_at,
        updated_at
    ),
    article_translations (
        id,
        language_code,
        title,
        subtitle,
        summary,
        slug,
        created_at,
        updated_at
    )
"""


def _normalise_translation(data):
    if isinstance(data, list):
        return data[0] if data else None

    return data


def _map_article(data: dict) -> dict:
    translation = _normalise_translation(
        data.get("article_translations")
    )

    return {
        "id": data["id"],
        "category_id": data["category_id"],
        "article_type": data["article_type"],
        "status": data["status"],
        "cover_media_id": data.get("cover_media_id"),
        "created_by": data.get("created_by"),
        "updated_by": data.get("updated_by"),
        "created_at": data["created_at"],
        "updated_at": data["updated_at"],
        "published_at": data.get("published_at"),
        "scheduled_at": data.get("scheduled_at"),
        "is_author_pick": data.get(
            "is_author_pick",
            False,
        ),
        "author_pick_order": data.get(
            "author_pick_order"
        ),
        "category": data.get("categories"),
        "translation": translation,
    }


def _validate_article_status(
    value: str,
) -> None:
    allowed = {
        "DRAFT",
        "PENDING_REVIEW",
        "REJECTED",
        "PUBLISHED",
        "UNPUBLISHED",
        "SCHEDULED",
        "ARCHIVED",
    }

    if value not in allowed:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid article status: {value}",
        )


def _validate_article_type(
    value: str,
) -> None:
    allowed = {
        "STANDARD",
        "QUIZ",
        "OPINION",
    }

    if value not in allowed:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid article type: {value}",
        )


def _get_article(
    client,
    article_id: UUID,
):
    response = (
        client
        .table("articles")
        .select(ARTICLE_SELECT)
        .eq("id", str(article_id))
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise NotFoundError(
            "Article not found"
        )

    return response.data


def _get_category(
    client,
    category_id: UUID,
):
    response = (
        client
        .table("categories")
        .select(CATEGORY_SELECT)
        .eq("id", str(category_id))
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise NotFoundError(
            "Category not found"
        )

    return response.data


# ============================================================
# ARTICLES — LIST
# ============================================================

@router.get(
    "/articles",
    response_model=list[SuperadminArticleListItem],
)
def list_articles(
    current_user: AuthContext = Depends(
        get_current_user
    ),
    article_status: str | None = Query(
        default=None,
        alias="status",
    ),
    category_id: UUID | None = None,
):
    _require_superadmin(current_user)

    query = (
        current_user.client
        .table("articles")
        .select(ARTICLE_SELECT)
    )

    if article_status is not None:
        _validate_article_status(article_status)

        query = query.eq(
            "status",
            article_status,
        )

    if category_id is not None:
        query = query.eq(
            "category_id",
            str(category_id),
        )

    response = (
        query
        .order("created_at", desc=True)
        .execute()
    )

    return [
        _map_article(article)
        for article in (response.data or [])
    ]


# ============================================================
# ARTICLES — DETAIL
# ============================================================

@router.get(
    "/articles/{article_id}",
    response_model=SuperadminArticleDetailResponse,
)
def get_article(
    article_id: UUID,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    article = _get_article(
        current_user.client,
        article_id,
    )

    return _map_article(article)


# ============================================================
# ARTICLES — CREATE
# ============================================================

@router.post(
    "/articles",
    response_model=SuperadminArticleDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_article(
    payload: SuperadminArticleCreate,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    _get_category(
        current_user.client,
        payload.category_id,
    )

    _validate_article_type(
        payload.article_type
    )

    _validate_article_status(
        payload.status
    )

    if (
        payload.status == "SCHEDULED"
        and payload.scheduled_at is None
    ):
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422,
            detail=(
                "scheduled_at is required "
                "for scheduled articles"
            ),
        )

    article_response = (
        current_user.client
        .table("articles")
        .insert(
            {
                "category_id": str(
                    payload.category_id
                ),
                "article_type": payload.article_type,
                "status": payload.status,
                "cover_media_id": (
                    str(payload.cover_media_id)
                    if payload.cover_media_id
                    else None
                ),
                "created_by": str(
                    current_user.user.id
                ),
                "updated_by": str(
                    current_user.user.id
                ),
                "published_at": (
                    payload.published_at.isoformat()
                    if payload.published_at
                    else None
                ),
                "scheduled_at": (
                    payload.scheduled_at.isoformat()
                    if payload.scheduled_at
                    else None
                ),
            }
        )
        .select(ARTICLE_SELECT)
        .single()
        .execute()
    )

    article = article_response.data

    current_user.client \
        .table("article_translations") \
        .insert(
            {
                "article_id": article["id"],
                "language_code": (
                    payload.translation.language_code
                ),
                "title": payload.translation.title,
                "subtitle": (
                    payload.translation.subtitle
                ),
                "summary": (
                    payload.translation.summary
                ),
                "slug": payload.translation.slug,
            }
        ) \
        .execute()

    return _map_article(
        _get_article(
            current_user.client,
            UUID(str(article["id"])),
        )
    )


# ============================================================
# ARTICLES — UPDATE
# ============================================================

@router.patch(
    "/articles/{article_id}",
    response_model=SuperadminArticleDetailResponse,
)
def update_article(
    article_id: UUID,
    payload: SuperadminArticleUpdate,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    client = current_user.client

    existing = _get_article(
        client,
        article_id,
    )

    updates = {}

    if payload.category_id is not None:
        _get_category(
            client,
            payload.category_id,
        )

        updates["category_id"] = str(
            payload.category_id
        )

    if payload.article_type is not None:
        _validate_article_type(
            payload.article_type
        )

        updates["article_type"] = (
            payload.article_type
        )

    if payload.cover_media_id is not None:
        updates["cover_media_id"] = str(
            payload.cover_media_id
        )

    if payload.published_at is not None:
        updates["published_at"] = (
            payload.published_at.isoformat()
        )

    if payload.scheduled_at is not None:
        updates["scheduled_at"] = (
            payload.scheduled_at.isoformat()
        )

    updates["updated_by"] = str(
        current_user.user.id
    )

    if updates:
        (
            client
            .table("articles")
            .update(updates)
            .eq("id", str(article_id))
            .execute()
        )

    if payload.translation is not None:
        translation = payload.translation

        (
            client
            .table("article_translations")
            .update(
                {
                    "title": translation.title,
                    "subtitle": translation.subtitle,
                    "summary": translation.summary,
                    "slug": translation.slug,
                }
            )
            .eq(
                "article_id",
                str(article_id),
            )
            .eq(
                "language_code",
                translation.language_code,
            )
            .execute()
        )

    return _map_article(
        _get_article(
            client,
            article_id,
        )
    )


# ============================================================
# ARTICLES — DELETE
# ============================================================

@router.delete(
    "/articles/{article_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_article(
    article_id: UUID,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    _get_article(
        current_user.client,
        article_id,
    )

    (
        current_user.client
        .table("articles")
        .delete()
        .eq("id", str(article_id))
        .execute()
    )

    return None


# ============================================================
# ARTICLES — PUBLISH
# ============================================================

@router.post(
    "/articles/{article_id}/publish",
    response_model=SuperadminArticleDetailResponse,
)
def publish_article(
    article_id: UUID,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    client = current_user.client

    article = _get_article(
        client,
        article_id,
    )

    (
        client
        .table("articles")
        .update(
            {
                "status": "PUBLISHED",
                "published_at": (
                    article.get("published_at")
                    or "now()"
                ),
                "scheduled_at": None,
                "updated_by": str(
                    current_user.user.id
                ),
            }
        )
        .eq("id", str(article_id))
        .execute()
    )

    return _map_article(
        _get_article(
            client,
            article_id,
        )
    )


# ============================================================
# ARTICLES — UNPUBLISH
# ============================================================

@router.post(
    "/articles/{article_id}/unpublish",
    response_model=SuperadminArticleDetailResponse,
)
def unpublish_article(
    article_id: UUID,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    client = current_user.client

    _get_article(
        client,
        article_id,
    )

    (
        client
        .table("articles")
        .update(
            {
                "status": "UNPUBLISHED",
                "scheduled_at": None,
                "updated_by": str(
                    current_user.user.id
                ),
            }
        )
        .eq("id", str(article_id))
        .execute()
    )

    return _map_article(
        _get_article(
            client,
            article_id,
        )
    )


# ============================================================
# ARTICLES — SCHEDULE
# ============================================================

@router.post(
    "/articles/{article_id}/schedule",
    response_model=SuperadminArticleDetailResponse,
)
def schedule_article(
    article_id: UUID,
    payload: SuperadminArticleStatusUpdate,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    if payload.scheduled_at is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422,
            detail="scheduled_at is required",
        )

    client = current_user.client

    _get_article(
        client,
        article_id,
    )

    (
        client
        .table("articles")
        .update(
            {
                "status": "SCHEDULED",
                "scheduled_at": (
                    payload.scheduled_at.isoformat()
                ),
                "updated_by": str(
                    current_user.user.id
                ),
            }
        )
        .eq("id", str(article_id))
        .execute()
    )

    return _map_article(
        _get_article(
            client,
            article_id,
        )
    )


# ============================================================
# ARTICLES — ARCHIVE
# ============================================================

@router.post(
    "/articles/{article_id}/archive",
    response_model=SuperadminArticleDetailResponse,
)
def archive_article(
    article_id: UUID,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    client = current_user.client

    _get_article(
        client,
        article_id,
    )

    (
        client
        .table("articles")
        .update(
            {
                "status": "ARCHIVED",
                "scheduled_at": None,
                "updated_by": str(
                    current_user.user.id
                ),
            }
        )
        .eq("id", str(article_id))
        .execute()
    )

    return _map_article(
        _get_article(
            client,
            article_id,
        )
    )


# ============================================================
# ARTICLES — AUTHOR'S PICKS
# ============================================================

@router.patch(
    "/articles/{article_id}/author-pick",
    response_model=SuperadminArticleDetailResponse,
)
def update_author_pick(
    article_id: UUID,
    payload: SuperadminAuthorPickUpdate,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    client = current_user.client

    _get_article(
        client,
        article_id,
    )

    if (
        payload.is_author_pick
        and payload.author_pick_order is None
    ):
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422,
            detail=(
                "author_pick_order is required "
                "when enabling Author's Pick"
            ),
        )

    (
        client
        .table("articles")
        .update(
            {
                "is_author_pick": (
                    payload.is_author_pick
                ),
                "author_pick_order": (
                    payload.author_pick_order
                    if payload.is_author_pick
                    else None
                ),
                "updated_by": str(
                    current_user.user.id
                ),
            }
        )
        .eq("id", str(article_id))
        .execute()
    )

    return _map_article(
        _get_article(
            client,
            article_id,
        )
    )


# ============================================================
# CATEGORIES — LIST
# ============================================================

@router.get(
    "/categories",
    response_model=list[SuperadminCategoryResponse],
)
def list_categories(
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    response = (
        current_user.client
        .table("categories")
        .select(CATEGORY_SELECT)
        .order("display_order")
        .execute()
    )

    return response.data or []


# ============================================================
# CATEGORIES — CREATE
# ============================================================

@router.post(
    "/categories",
    response_model=SuperadminCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    payload: SuperadminCategoryCreate,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    response = (
        current_user.client
        .table("categories")
        .insert(
            {
                "name": payload.name.strip(),
                "slug": payload.slug.strip(),
                "description": payload.description,
                "display_order": (
                    payload.display_order
                ),
                "is_active": payload.is_active,
            }
        )
        .select(CATEGORY_SELECT)
        .single()
        .execute()
    )

    return response.data


# ============================================================
# CATEGORIES — UPDATE
# ============================================================

@router.patch(
    "/categories/{category_id}",
    response_model=SuperadminCategoryResponse,
)
def update_category(
    category_id: UUID,
    payload: SuperadminCategoryUpdate,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    client = current_user.client

    _get_category(
        client,
        category_id,
    )

    updates = {}

    if payload.name is not None:
        updates["name"] = payload.name.strip()

    if payload.slug is not None:
        updates["slug"] = payload.slug.strip()

    if payload.description is not None:
        updates["description"] = (
            payload.description
        )

    if payload.display_order is not None:
        updates["display_order"] = (
            payload.display_order
        )

    if payload.is_active is not None:
        updates["is_active"] = payload.is_active

    if not updates:
        return _get_category(
            client,
            category_id,
        )

    response = (
        client
        .table("categories")
        .update(updates)
        .eq("id", str(category_id))
        .select(CATEGORY_SELECT)
        .single()
        .execute()
    )

    return response.data


# ============================================================
# CATEGORIES — DELETE
# ============================================================

@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_category(
    category_id: UUID,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    client = current_user.client

    _get_category(
        client,
        category_id,
    )

    (
        client
        .table("categories")
        .delete()
        .eq("id", str(category_id))
        .execute()
    )

    return None


# ============================================================
# HOME MANAGEMENT
# ============================================================

@router.get(
    "/home",
    response_model=SuperadminHomeResponse,
)
def get_home_configuration(
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    client = current_user.client

    author_picks_response = (
        client
        .table("articles")
        .select(ARTICLE_SELECT)
        .eq("is_author_pick", True)
        .order("author_pick_order")
        .execute()
    )

    categories_response = (
        client
        .table("categories")
        .select(CATEGORY_SELECT)
        .eq("is_active", True)
        .order("display_order")
        .execute()
    )

    return {
        "author_picks": [
            _map_article(article)
            for article in (
                author_picks_response.data or []
            )
        ],
        "active_categories": (
            categories_response.data or []
        ),
    }
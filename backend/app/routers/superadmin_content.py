from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi import HTTPException

from app.core.exceptions import AuthorizationError, NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.superadmin_content import (
    SuperadminArticleBlockCreate,
    SuperadminArticleBlockReorder,
    SuperadminArticleBlockResponse,
    SuperadminArticleBlockUpdate,
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
from app.services.audit import record_audit


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


ARTICLE_BLOCK_SELECT = """
    id,
    article_id,
    block_type,
    display_order,
    media_id,
    quiz_id,
    opinion_id,
    external_url,
    created_at,
    updated_at,
    article_block_translations (
        id,
        language_code,
        text_content,
        caption,
        created_at,
        updated_at
    ),
    media_assets (
        id,
        storage_path,
        media_type,
        mime_type
    )
"""


ALLOWED_BLOCK_TYPES = {
    "TEXT",
    "IMAGE",
    "PODCAST",
    "QUIZ",
    "OPINION",
}


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


def _map_block(data: dict) -> dict:
    translation = _normalise_translation(
        data.get("article_block_translations")
    )

    return {
        "id": data["id"],
        "article_id": data["article_id"],
        "block_type": data["block_type"],
        "display_order": data["display_order"],
        "media_id": data.get("media_id"),
        "quiz_id": data.get("quiz_id"),
        "opinion_id": data.get("opinion_id"),
        "external_url": data.get("external_url"),
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
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid article type: {value}",
        )


def _validate_block_type(
    value: str,
) -> None:
    if value not in ALLOWED_BLOCK_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid article block type: {value}",
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


def _get_article_block(
    client,
    article_id: UUID,
    block_id: UUID,
):
    response = (
        client
        .table("article_blocks")
        .select(ARTICLE_BLOCK_SELECT)
        .eq("id", str(block_id))
        .eq("article_id", str(article_id))
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise NotFoundError(
            "Article block not found"
        )

    return response.data


def _validate_media_reference(
    client,
    media_id: UUID,
) -> None:
    response = (
        client
        .table("media_assets")
        .select("id")
        .eq("id", str(media_id))
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise NotFoundError(
            "Media asset not found"
        )


def _validate_quiz_reference(
    client,
    article_id: UUID,
    quiz_id: UUID,
) -> None:
    response = (
        client
        .table("quizzes")
        .select("id")
        .eq("id", str(quiz_id))
        .eq("article_id", str(article_id))
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise NotFoundError(
            "Quiz not found for this article"
        )


def _validate_opinion_reference(
    client,
    article_id: UUID,
    opinion_id: UUID,
) -> None:
    response = (
        client
        .table("opinion_questions")
        .select("id")
        .eq("id", str(opinion_id))
        .eq("article_id", str(article_id))
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise NotFoundError(
            "Opinion question not found for this article"
        )


def _validate_block_payload(
    block_type: str,
    media_id: UUID | None,
    quiz_id: UUID | None,
    opinion_id: UUID | None,
    external_url,
    text_content: str | None,
) -> None:
    _validate_block_type(block_type)

    if block_type == "TEXT":
        if (
            media_id is not None
            or quiz_id is not None
            or opinion_id is not None
            or external_url is not None
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "TEXT blocks cannot reference "
                    "media, quiz, opinion, or external_url"
                ),
            )

        if not text_content:
            raise HTTPException(
                status_code=422,
                detail="TEXT blocks require text_content",
            )

    elif block_type == "IMAGE":
        if media_id is None:
            raise HTTPException(
                status_code=422,
                detail="IMAGE blocks require media_id",
            )

        if (
            quiz_id is not None
            or opinion_id is not None
            or external_url is not None
            or text_content is not None
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "IMAGE blocks may only reference "
                    "media_id and optional caption"
                ),
            )

    elif block_type == "PODCAST":
        if (
            media_id is not None
            or quiz_id is not None
            or opinion_id is not None
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "PODCAST blocks cannot reference "
                    "media, quiz, or opinion"
                ),
            )

        if external_url is None:
            raise HTTPException(
                status_code=422,
                detail="PODCAST blocks require external_url",
            )

        if not text_content:
            raise HTTPException(
                status_code=422,
                detail="PODCAST blocks require text_content",
            )

    elif block_type == "QUIZ":
        if quiz_id is None:
            raise HTTPException(
                status_code=422,
                detail="QUIZ blocks require quiz_id",
            )

        if (
            media_id is not None
            or opinion_id is not None
            or external_url is not None
            or text_content is not None
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "QUIZ blocks may only reference quiz_id"
                ),
            )

    elif block_type == "OPINION":
        if opinion_id is None:
            raise HTTPException(
                status_code=422,
                detail="OPINION blocks require opinion_id",
            )

        if (
            media_id is not None
            or quiz_id is not None
            or external_url is not None
            or text_content is not None
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "OPINION blocks may only reference "
                    "opinion_id"
                ),
            )


def _validate_block_references(
    client,
    article_id: UUID,
    media_id: UUID | None,
    quiz_id: UUID | None,
    opinion_id: UUID | None,
) -> None:
    if media_id is not None:
        _validate_media_reference(
            client,
            media_id,
        )

    if quiz_id is not None:
        _validate_quiz_reference(
            client,
            article_id,
            quiz_id,
        )

    if opinion_id is not None:
        _validate_opinion_reference(
            client,
            article_id,
            opinion_id,
        )


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

    article_id = UUID(str(article["id"]))

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_CREATED",
        entity_type="ARTICLE",
        entity_id=article_id,
        metadata={
            "article_type": payload.article_type,
            "status": payload.status,
            "category_id": str(payload.category_id),
            "cover_media_id": (
                str(payload.cover_media_id)
                if payload.cover_media_id
                else None
            ),
            "translation_language": (
                payload.translation.language_code
            ),
        },
    )

    return _map_article(
        _get_article(
            current_user.client,
            article_id,
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

    existing_article = _get_article(
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

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_UPDATED",
        entity_type="ARTICLE",
        entity_id=article_id,
        metadata={
            "article_fields": list(updates.keys()),
            "translation_updated": (
                payload.translation is not None
            ),
            "previous_status": existing_article.get(
                "status"
            ),
        },
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

    client = current_user.client

    article = _get_article(
        client,
        article_id,
    )

    (
        client
        .table("articles")
        .delete()
        .eq("id", str(article_id))
        .execute()
    )

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_DELETED",
        entity_type="ARTICLE",
        entity_id=article_id,
        metadata={
            "previous_status": article.get("status"),
            "category_id": article.get("category_id"),
        },
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

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_PUBLISHED",
        entity_type="ARTICLE",
        entity_id=article_id,
        metadata={
            "previous_status": article.get("status"),
        },
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

    article = _get_article(
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

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_UNPUBLISHED",
        entity_type="ARTICLE",
        entity_id=article_id,
        metadata={
            "previous_status": article.get("status"),
        },
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
        raise HTTPException(
            status_code=422,
            detail="scheduled_at is required",
        )

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

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_SCHEDULED",
        entity_type="ARTICLE",
        entity_id=article_id,
        metadata={
            "previous_status": article.get("status"),
            "scheduled_at": (
                payload.scheduled_at.isoformat()
            ),
        },
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

    article = _get_article(
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

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_ARCHIVED",
        entity_type="ARTICLE",
        entity_id=article_id,
        metadata={
            "previous_status": article.get("status"),
        },
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

    article = _get_article(
        client,
        article_id,
    )

    if (
        payload.is_author_pick
        and payload.author_pick_order is None
    ):
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

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_AUTHOR_PICK_UPDATED",
        entity_type="ARTICLE",
        entity_id=article_id,
        metadata={
            "previous_is_author_pick": article.get(
                "is_author_pick",
                False,
            ),
            "previous_author_pick_order": article.get(
                "author_pick_order"
            ),
            "is_author_pick": payload.is_author_pick,
            "author_pick_order": (
                payload.author_pick_order
                if payload.is_author_pick
                else None
            ),
        },
    )

    return _map_article(
        _get_article(
            client,
            article_id,
        )
    )


# ============================================================
# ARTICLE BLOCKS — LIST
# ============================================================

@router.get(
    "/articles/{article_id}/blocks",
    response_model=list[SuperadminArticleBlockResponse],
)
def list_article_blocks(
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

    response = (
        client
        .table("article_blocks")
        .select(ARTICLE_BLOCK_SELECT)
        .eq("article_id", str(article_id))
        .order("display_order")
        .execute()
    )

    return [
        _map_block(block)
        for block in (response.data or [])
    ]


# ============================================================
# ARTICLE BLOCKS — DETAIL
# ============================================================

@router.get(
    "/articles/{article_id}/blocks/{block_id}",
    response_model=SuperadminArticleBlockResponse,
)
def get_article_block(
    article_id: UUID,
    block_id: UUID,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    block = _get_article_block(
        current_user.client,
        article_id,
        block_id,
    )

    return _map_block(block)


# ============================================================
# ARTICLE BLOCKS — CREATE
# ============================================================

@router.post(
    "/articles/{article_id}/blocks",
    response_model=SuperadminArticleBlockResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_article_block(
    article_id: UUID,
    payload: SuperadminArticleBlockCreate,
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

    _validate_block_payload(
        block_type=payload.block_type,
        media_id=payload.media_id,
        quiz_id=payload.quiz_id,
        opinion_id=payload.opinion_id,
        external_url=payload.external_url,
        text_content=payload.text_content,
    )

    _validate_block_references(
        client=client,
        article_id=article_id,
        media_id=payload.media_id,
        quiz_id=payload.quiz_id,
        opinion_id=payload.opinion_id,
    )

    block_response = (
        client
        .table("article_blocks")
        .insert(
            {
                "article_id": str(article_id),
                "block_type": payload.block_type,
                "display_order": payload.display_order,
                "media_id": (
                    str(payload.media_id)
                    if payload.media_id
                    else None
                ),
                "quiz_id": (
                    str(payload.quiz_id)
                    if payload.quiz_id
                    else None
                ),
                "opinion_id": (
                    str(payload.opinion_id)
                    if payload.opinion_id
                    else None
                ),
                "external_url": (
                    str(payload.external_url)
                    if payload.external_url
                    else None
                ),
            }
        )
        .select(ARTICLE_BLOCK_SELECT)
        .single()
        .execute()
    )

    block = block_response.data

    (
        client
        .table("article_block_translations")
        .insert(
            {
                "article_block_id": block["id"],
                "language_code": "en",
                "text_content": payload.text_content,
                "caption": payload.caption,
            }
        )
        .execute()
    )

    block_id = UUID(str(block["id"]))

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_BLOCK_CREATED",
        entity_type="ARTICLE_BLOCK",
        entity_id=block_id,
        metadata={
            "article_id": str(article_id),
            "block_type": payload.block_type,
            "display_order": payload.display_order,
            "media_id": (
                str(payload.media_id)
                if payload.media_id
                else None
            ),
            "quiz_id": (
                str(payload.quiz_id)
                if payload.quiz_id
                else None
            ),
            "opinion_id": (
                str(payload.opinion_id)
                if payload.opinion_id
                else None
            ),
            "external_url": (
                str(payload.external_url)
                if payload.external_url
                else None
            ),
        },
    )

    return _map_block(
        _get_article_block(
            client,
            article_id,
            block_id,
        )
    )


# ============================================================
# ARTICLE BLOCKS — UPDATE
# ============================================================

@router.patch(
    "/articles/{article_id}/blocks/{block_id}",
    response_model=SuperadminArticleBlockResponse,
)
def update_article_block(
    article_id: UUID,
    block_id: UUID,
    payload: SuperadminArticleBlockUpdate,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    client = current_user.client

    existing = _get_article_block(
        client,
        article_id,
        block_id,
    )

    block_type = existing["block_type"]

    media_id = (
        payload.media_id
        if payload.media_id is not None
        else existing.get("media_id")
    )

    quiz_id = (
        payload.quiz_id
        if payload.quiz_id is not None
        else existing.get("quiz_id")
    )

    opinion_id = (
        payload.opinion_id
        if payload.opinion_id is not None
        else existing.get("opinion_id")
    )

    external_url = (
        payload.external_url
        if payload.external_url is not None
        else existing.get("external_url")
    )

    existing_translation = _normalise_translation(
        existing.get("article_block_translations")
    )

    text_content = (
        payload.text_content
        if payload.text_content is not None
        else (
            existing_translation.get("text_content")
            if existing_translation
            else None
        )
    )

    caption = (
        payload.caption
        if payload.caption is not None
        else (
            existing_translation.get("caption")
            if existing_translation
            else None
        )
    )

    _validate_block_payload(
        block_type=block_type,
        media_id=media_id,
        quiz_id=quiz_id,
        opinion_id=opinion_id,
        external_url=external_url,
        text_content=text_content,
    )

    _validate_block_references(
        client=client,
        article_id=article_id,
        media_id=media_id,
        quiz_id=quiz_id,
        opinion_id=opinion_id,
    )

    block_updates = {}

    if payload.display_order is not None:
        block_updates["display_order"] = (
            payload.display_order
        )

    if payload.media_id is not None:
        block_updates["media_id"] = str(
            payload.media_id
        )

    if payload.quiz_id is not None:
        block_updates["quiz_id"] = str(
            payload.quiz_id
        )

    if payload.opinion_id is not None:
        block_updates["opinion_id"] = str(
            payload.opinion_id
        )

    if payload.external_url is not None:
        block_updates["external_url"] = str(
            payload.external_url
        )

    if block_updates:
        (
            client
            .table("article_blocks")
            .update(block_updates)
            .eq("id", str(block_id))
            .eq("article_id", str(article_id))
            .execute()
        )

    translation_updates = {
        "text_content": text_content,
        "caption": caption,
    }

    translation_query = (
        client
        .table("article_block_translations")
        .update(translation_updates)
        .eq(
            "article_block_id",
            str(block_id),
        )
        .eq(
            "language_code",
            "en",
        )
    )

    translation_response = (
        translation_query
        .execute()
    )

    if not translation_response.data:
        (
            client
            .table("article_block_translations")
            .insert(
                {
                    "article_block_id": str(block_id),
                    "language_code": "en",
                    "text_content": text_content,
                    "caption": caption,
                }
            )
            .execute()
        )

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_BLOCK_UPDATED",
        entity_type="ARTICLE_BLOCK",
        entity_id=block_id,
        metadata={
            "article_id": str(article_id),
            "block_type": block_type,
            "updated_fields": list(block_updates.keys()),
            "translation_updated": True,
        },
    )

    return _map_block(
        _get_article_block(
            client,
            article_id,
            block_id,
        )
    )


# ============================================================
# ARTICLE BLOCKS — DELETE
# ============================================================

@router.delete(
    "/articles/{article_id}/blocks/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_article_block(
    article_id: UUID,
    block_id: UUID,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    _require_superadmin(current_user)

    client = current_user.client

    block = _get_article_block(
        client,
        article_id,
        block_id,
    )

    (
        client
        .table("article_blocks")
        .delete()
        .eq("id", str(block_id))
        .eq("article_id", str(article_id))
        .execute()
    )

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_BLOCK_DELETED",
        entity_type="ARTICLE_BLOCK",
        entity_id=block_id,
        metadata={
            "article_id": str(article_id),
            "block_type": block.get("block_type"),
            "display_order": block.get("display_order"),
        },
    )

    return None


# ============================================================
# ARTICLE BLOCKS — REORDER
# ============================================================

@router.patch(
    "/articles/{article_id}/blocks/reorder",
    response_model=list[SuperadminArticleBlockResponse],
)
def reorder_article_blocks(
    article_id: UUID,
    payload: SuperadminArticleBlockReorder,
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

    if not payload.items:
        raise HTTPException(
            status_code=422,
            detail="At least one block is required",
        )

    block_ids = [
        item.block_id
        for item in payload.items
    ]

    if len(block_ids) != len(set(block_ids)):
        raise HTTPException(
            status_code=422,
            detail="Duplicate block_id values are not allowed",
        )

    display_orders = [
        item.display_order
        for item in payload.items
    ]

    if len(display_orders) != len(
        set(display_orders)
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "Duplicate display_order values "
                "are not allowed"
            ),
        )

    existing_response = (
        client
        .table("article_blocks")
        .select("id, display_order")
        .eq("article_id", str(article_id))
        .execute()
    )

    existing_blocks = (
        existing_response.data or []
    )

    existing_ids = {
        UUID(str(block["id"]))
        for block in existing_blocks
    }

    requested_ids = set(block_ids)

    if requested_ids != existing_ids:
        raise HTTPException(
            status_code=422,
            detail=(
                "Reorder payload must contain "
                "every block belonging to the article "
                "exactly once"
            ),
        )

    for index, item in enumerate(payload.items):
        (
            client
            .table("article_blocks")
            .update(
                {
                    "display_order": -(
                        index + 1
                    )
                }
            )
            .eq("id", str(item.block_id))
            .eq("article_id", str(article_id))
            .execute()
        )

    for item in payload.items:
        (
            client
            .table("article_blocks")
            .update(
                {
                    "display_order": item.display_order
                }
            )
            .eq("id", str(item.block_id))
            .eq("article_id", str(article_id))
            .execute()
        )

    record_audit(
        actor_user_id=current_user.user.id,
        action="ARTICLE_BLOCKS_REORDERED",
        entity_type="ARTICLE",
        entity_id=article_id,
        metadata={
            "block_order": [
                {
                    "block_id": str(item.block_id),
                    "display_order": item.display_order,
                }
                for item in payload.items
            ],
        },
    )

    response = (
        client
        .table("article_blocks")
        .select(ARTICLE_BLOCK_SELECT)
        .eq("article_id", str(article_id))
        .order("display_order")
        .execute()
    )

    return [
        _map_block(block)
        for block in (response.data or [])
    ]


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
        .execute()
    )

    category = response.data
    category_id = UUID(str(category["id"]))

    record_audit(
        actor_user_id=current_user.user.id,
        action="CATEGORY_CREATED",
        entity_type="CATEGORY",
        entity_id=category_id,
        metadata={
            "name": payload.name.strip(),
            "slug": payload.slug.strip(),
            "display_order": payload.display_order,
            "is_active": payload.is_active,
        },
    )

    return category


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

    existing = _get_category(
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
        return existing

    response = (
        client
        .table("categories")
        .update(updates)
        .eq("id", str(category_id))
        .select(CATEGORY_SELECT)
        .single()
        .execute()
    )

    record_audit(
        actor_user_id=current_user.user.id,
        action="CATEGORY_UPDATED",
        entity_type="CATEGORY",
        entity_id=category_id,
        metadata={
            "updated_fields": list(updates.keys()),
            "previous_values": {
                key: existing.get(key)
                for key in updates.keys()
            },
            "new_values": updates,
        },
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

    category = _get_category(
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

    record_audit(
        actor_user_id=current_user.user.id,
        action="CATEGORY_DELETED",
        entity_type="CATEGORY",
        entity_id=category_id,
        metadata={
            "name": category.get("name"),
            "slug": category.get("slug"),
            "is_active": category.get("is_active"),
        },
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
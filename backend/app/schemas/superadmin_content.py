from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================
# COMMON
# ============================================================

class SuperadminCategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SuperadminCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=200)
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    display_order: int = Field(
        default=0,
        ge=0,
    )
    is_active: bool = True


class SuperadminCategoryUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    display_order: int | None = Field(
        default=None,
        ge=0,
    )
    is_active: bool | None = None


# ============================================================
# ARTICLE
# ============================================================

class SuperadminArticleTranslation(BaseModel):
    id: UUID
    language_code: str
    title: str
    subtitle: str | None
    summary: str | None
    slug: str
    created_at: datetime
    updated_at: datetime


class SuperadminArticleTranslationInput(BaseModel):
    language_code: str
    title: str = Field(min_length=1, max_length=500)
    subtitle: str | None = Field(
        default=None,
        max_length=1000,
    )
    summary: str | None = Field(
        default=None,
        max_length=5000,
    )
    slug: str = Field(min_length=1, max_length=300)


class SuperadminArticleCreate(BaseModel):
    category_id: UUID
    article_type: str = "STANDARD"
    status: str = "DRAFT"
    cover_media_id: UUID | None = None
    published_at: datetime | None = None
    scheduled_at: datetime | None = None

    translation: SuperadminArticleTranslationInput


class SuperadminArticleUpdate(BaseModel):
    category_id: UUID | None = None
    article_type: str | None = None
    cover_media_id: UUID | None = None
    published_at: datetime | None = None
    scheduled_at: datetime | None = None

    translation: SuperadminArticleTranslationInput | None = None


class SuperadminArticleStatusUpdate(BaseModel):
    scheduled_at: datetime | None = None


class SuperadminAuthorPickUpdate(BaseModel):
    is_author_pick: bool
    author_pick_order: int | None = Field(
        default=None,
        ge=0,
    )


class SuperadminArticleListItem(BaseModel):
    id: UUID
    category_id: UUID
    article_type: str
    status: str
    cover_media_id: UUID | None
    created_by: UUID | None
    updated_by: UUID | None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None
    scheduled_at: datetime | None

    is_author_pick: bool
    author_pick_order: int | None

    category: SuperadminCategoryResponse | None
    translation: SuperadminArticleTranslation | None


class SuperadminArticleDetailResponse(
    SuperadminArticleListItem
):
    pass


# ============================================================
# HOME
# ============================================================

class SuperadminHomeResponse(BaseModel):
    author_picks: list[SuperadminArticleListItem]
    active_categories: list[SuperadminCategoryResponse]
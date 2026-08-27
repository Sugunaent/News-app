from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ArticleCategory(BaseModel):
    id: UUID
    name: str
    slug: str


class ArticleListItem(BaseModel):
    id: UUID
    slug: str
    title: str
    subtitle: str | None
    summary: str | None
    article_type: str
    category: ArticleCategory
    published_at: datetime | None


class ArticleListResponse(BaseModel):
    items: list[ArticleListItem]


class ArticleMedia(BaseModel):
    id: UUID
    storage_path: str
    media_type: str
    mime_type: str


class ArticleTextBlock(BaseModel):
    id: UUID
    type: str
    display_order: int
    text: str | None


class ArticleImageBlock(BaseModel):
    id: UUID
    type: str
    display_order: int
    caption: str | None
    media: ArticleMedia


class ArticleDetailResponse(BaseModel):
    id: UUID
    slug: str
    title: str
    subtitle: str | None
    summary: str | None
    article_type: str
    category: ArticleCategory
    published_at: datetime | None
    blocks: list[ArticleTextBlock | ArticleImageBlock]

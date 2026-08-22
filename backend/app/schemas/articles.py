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
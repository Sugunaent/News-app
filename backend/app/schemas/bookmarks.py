from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class BookmarkResponse(BaseModel):
    id: UUID
    user_id: UUID
    article_id: UUID
    created_at: datetime


class BookmarkListResponse(BaseModel):
    items: list[BookmarkResponse]

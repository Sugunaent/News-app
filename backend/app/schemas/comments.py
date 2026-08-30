from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class CommentAuthor(BaseModel):
    id: UUID
    display_name: str | None


class CommentResponse(BaseModel):
    id: UUID
    article_id: UUID
    user_id: UUID
    content: str
    author: CommentAuthor
    created_at: datetime
    updated_at: datetime


class CommentListResponse(BaseModel):
    items: list[CommentResponse]


class CommentModerationResponse(BaseModel):
    id: UUID
    is_hidden: bool
    deleted_at: datetime | None
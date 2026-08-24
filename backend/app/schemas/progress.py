from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ReadingProgressUpdate(BaseModel):
    progress_percentage: float = Field(ge=0, le=100)
    last_block_id: UUID | None = None
    last_position: float | None = None


class ReadingProgressResponse(BaseModel):
    article_id: UUID
    progress_percentage: float
    last_block_id: UUID | None
    last_position: float | None
    started_at: datetime
    last_read_at: datetime
    completed_at: datetime | None